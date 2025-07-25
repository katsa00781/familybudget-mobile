import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category: string;
  checked: boolean;
}

export interface ReceiptData {
  items: ReceiptItem[];
  total: number;
  date?: string;
  store?: string;
}

// Gyakori termék kategóriák magyarul
const PRODUCT_CATEGORIES: { [key: string]: string } = {
  // Alapvető élelmiszerek
  'kenyér': 'Pékáruk',
  'tej': 'Tejtermékek',
  'sajt': 'Tejtermékek',
  'joghurt': 'Tejtermékek',
  'vaj': 'Tejtermékek',
  'tojás': 'Tejtermékek',
  'hús': 'Hús és hal',
  'csirke': 'Hús és hal',
  'sertés': 'Hús és hal',
  'marha': 'Hús és hal',
  'hal': 'Hús és hal',
  'sonka': 'Hús és hal',
  'kolbász': 'Hús és hal',
  'szalámi': 'Hús és hal',
  
  // Zöldségek, gyümölcsök
  'alma': 'Zöldség és gyümölcs',
  'banán': 'Zöldség és gyümölcs',
  'narancs': 'Zöldség és gyümölcs',
  'citrom': 'Zöldség és gyümölcs',
  'paradicsom': 'Zöldség és gyümölcs',
  'hagyma': 'Zöldség és gyümölcs',
  'krumpli': 'Zöldség és gyümölcs',
  'burgonya': 'Zöldség és gyümölcs',
  'répa': 'Zöldség és gyümölcs',
  'saláta': 'Zöldség és gyümölcs',
  'paprika': 'Zöldség és gyümölcs',
  'uborka': 'Zöldség és gyümölcs',
  
  // Konzervek és befőttek
  'konzerv': 'Konzerv és befőtt',
  'befőtt': 'Konzerv és befőtt',
  'szósz': 'Fűszer és öntet',
  'ketchup': 'Fűszer és öntet',
  'majonéz': 'Fűszer és öntet',
  'mustár': 'Fűszer és öntet',
  
  // Italok
  'víz': 'Italok',
  'üdítő': 'Italok',
  'coca': 'Italok',
  'pepsi': 'Italok',
  'fanta': 'Italok',
  'sprite': 'Italok',
  'sör': 'Italok',
  'bor': 'Italok',
  'kávé': 'Italok',
  'tea': 'Italok',
  
  // Alapanyagok
  'liszt': 'Alapanyag',
  'cukor': 'Alapanyag',
  'só': 'Fűszer és öntet',
  'bors': 'Fűszer és öntet',
  'olaj': 'Alapanyag',
  'rizs': 'Alapanyag',
  'tészta': 'Alapanyag',
  
  // Tisztálkodás
  'sampon': 'Tisztálkodás',
  'tusfürdő': 'Tisztálkodás',
  'fogkrém': 'Tisztálkodás',
  'mosószer': 'Háztartás',
  'öblítő': 'Háztartás',
  'mosogatószer': 'Háztartás',
  'wc': 'Háztartás',
  'papír': 'Háztartás',
  
  // Alapértelmezett
  'default': 'Egyéb'
};

// Gyakori mértékegységek felismerése
const UNITS: { [key: string]: string } = {
  'kg': 'kg',
  'g': 'g',
  'dkg': 'dkg',
  'l': 'l',
  'dl': 'dl',
  'ml': 'ml',
  'db': 'db',
  'csomag': 'csomag',
  'doboz': 'doboz',
  'üveg': 'üveg',
  'szál': 'szál',
  'darab': 'db',
  'liter': 'l',
  'kilogramm': 'kg',
  'gramm': 'g'
};

// Mock OCR funkció - valós implementációban Google Vision API vagy hasonló
export const processReceiptImage = async (imageUri: string): Promise<ReceiptData> => {
  try {
    // Ideiglenesen egy mock válasszal dolgozunk
    // Valós implementációban itt hívnánk egy OCR API-t
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Szimuláljuk a feldolgozási időt
    
    // Mock receipt data - ezt lecserélnéd valós OCR eredménnyel
    const mockReceiptText = `
TESCO HYPERMARKET
2025.07.25 14:30

FEHÉR KENYÉR          250 Ft
TEJ 2.8% 1L          350 Ft
TRAPPISTA SAJT       800 Ft
CSIRKEMELL 1KG      1200 Ft
ALMA 2KG             600 Ft
COCA COLA 2L         450 Ft
LISZT 1KG            300 Ft
TOJÁS 10DB           400 Ft
WC PAPÍR 8TK         900 Ft

ÖSSZESEN:           5250 Ft
`;

    return parseReceiptText(mockReceiptText);
    
    // Valós implementáció például:
    // const response = await fetch('https://vision.googleapis.com/v1/images:annotate?key=YOUR_API_KEY', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     requests: [{
    //       image: { content: base64Image },
    //       features: [{ type: 'TEXT_DETECTION' }]
    //     }]
    //   })
    // });
    // const data = await response.json();
    // return parseReceiptText(data.responses[0].fullTextAnnotation.text);
    
  } catch (error) {
    console.error('OCR hiba:', error);
    throw new Error('Nem sikerült feldolgozni a receipt képet');
  }
};

// Receipt szöveg feldolgozása és parsing
export const parseReceiptText = (text: string): ReceiptData => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const items: ReceiptItem[] = [];
  let total = 0;
  let store = '';
  let date = '';
  
  // Üzlet neve keresése
  const storePatterns = ['TESCO', 'ALDI', 'LIDL', 'PENNY', 'SPAR', 'CBA', 'COOP'];
  for (const line of lines.slice(0, 5)) {
    for (const pattern of storePatterns) {
      if (line.toUpperCase().includes(pattern)) {
        store = pattern;
        break;
      }
    }
    if (store) break;
  }
  
  // Dátum keresése (YYYY.MM.DD vagy DD.MM.YYYY formátum)
  const dateRegex = /(\d{4}\.\d{1,2}\.\d{1,2}|\d{1,2}\.\d{1,2}\.\d{4})/;
  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      date = dateMatch[0];
      break;
    }
  }
  
  // Termékek és árak keresése
  for (const line of lines) {
    // Ár pattern: szám + "Ft" a sor végén
    const priceMatch = line.match(/(\d{1,3}(?:\s*\d{3})*)\s*Ft\s*$/i);
    if (priceMatch) {
      const price = parseInt(priceMatch[1].replace(/\s/g, ''));
      
      // Ha ez az összeg sor, akkor kihagyjuk
      if (line.toUpperCase().includes('ÖSSZESEN') || 
          line.toUpperCase().includes('TOTAL') ||
          line.toUpperCase().includes('FIZETENDO') ||
          line.toUpperCase().includes('VÉGÖSSZEG')) {
        total = price;
        continue;
      }
      
      // Termék név kinyerése (minden ami az ár előtt van)
      const productPart = line.substring(0, line.lastIndexOf(priceMatch[0])).trim();
      if (productPart.length > 0) {
        const item = parseProductLine(productPart, price);
        if (item) {
          items.push(item);
        }
      }
    }
  }
  
  // Ha nincs explicit összeg, számítsuk ki
  if (total === 0) {
    total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  return {
    items,
    total,
    date,
    store
  };
};

// Egyedi termék sor feldolgozása
const parseProductLine = (productText: string, price: number): ReceiptItem | null => {
  if (!productText || productText.length < 2) return null;
  
  let name = productText;
  let quantity = 1;
  let unit = 'db';
  
  // Mennyiség és mértékegység keresése
  const quantityPatterns = [
    /(\d+(?:\.\d+)?)\s*(kg|g|dkg|l|dl|ml|db|darab|doboz|csomag|üveg|szál)/gi,
    /(\d+(?:\.\d+)?)\s*(kilogramm|gramm|liter)/gi
  ];
  
  for (const pattern of quantityPatterns) {
    const match = productText.match(pattern);
    if (match) {
      const fullMatch = match[0];
      const quantityMatch = fullMatch.match(/(\d+(?:\.\d+)?)/);
      const unitMatch = fullMatch.match(/(kg|g|dkg|l|dl|ml|db|darab|doboz|csomag|üveg|szál|kilogramm|gramm|liter)/i);
      
      if (quantityMatch && unitMatch) {
        quantity = parseFloat(quantityMatch[1]);
        unit = UNITS[unitMatch[1].toLowerCase()] || unitMatch[1].toLowerCase();
        
        // Termék név tisztítása (mennyiség eltávolítása)
        name = productText.replace(fullMatch, '').trim();
        break;
      }
    }
  }
  
  // Kategória meghatározása
  const category = determineCategory(name);
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: cleanProductName(name),
    quantity,
    unit,
    price,
    category,
    checked: false
  };
};

// Kategória meghatározása a termék neve alapján
const determineCategory = (productName: string): string => {
  const nameLower = productName.toLowerCase();
  
  for (const [keyword, category] of Object.entries(PRODUCT_CATEGORIES)) {
    if (keyword !== 'default' && nameLower.includes(keyword)) {
      return category;
    }
  }
  
  return PRODUCT_CATEGORIES.default;
};

// Termék név tisztítása
const cleanProductName = (name: string): string => {
  return name
    .replace(/^\W+|\W+$/g, '') // Kezdő és záró speciális karakterek eltávolítása
    .replace(/\s+/g, ' ') // Többszörös szóközök egyetlen szóközre
    .trim()
    || 'Ismeretlen termék';
};

// JSON export funkció
export const exportToJSON = (receiptData: ReceiptData): string => {
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      store: receiptData.store,
      receiptDate: receiptData.date,
      totalAmount: receiptData.total,
      itemCount: receiptData.items.length
    },
    items: receiptData.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      category: item.category,
      subtotal: item.price * item.quantity
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
};

// JSON import funkció
export const importFromJSON = (jsonString: string): ReceiptData => {
  try {
    const data = JSON.parse(jsonString);
    
    return {
      items: data.items.map((item: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'db',
        price: item.price || 0,
        category: item.category || 'Egyéb',
        checked: false
      })),
      total: data.metadata?.totalAmount || 0,
      date: data.metadata?.receiptDate,
      store: data.metadata?.store
    };
  } catch (error) {
    throw new Error('Hibás JSON formátum');
  }
};
