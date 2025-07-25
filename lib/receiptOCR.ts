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

// Fejlett OCR funkció - több receipt formátum támogatással
export const processReceiptImage = async (imageUri: string): Promise<ReceiptData> => {
  try {
    // Szimuláljuk a feldolgozási időt
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Több különböző mock receipt variáció
    const mockReceipts = [
      // TESCO receipt
      `TESCO EXPRESSZ
Példa utca 12, Budapest
2025.07.25 15:42

KENYÉR FEHÉR          289 Ft
TEJ UHT 2,8% 1L       359 Ft
SONKA SZELETEK        1299 Ft
ALMA GOLDEN 1KG       449 Ft
COCA COLA 0,5L        189 Ft
JOGHURT NATÚR         199 Ft
TOJÁS M 10DB          429 Ft

VÉGÖSSZEG:           3213 Ft
KÉSZPÉNZ:            3213 Ft
VISSZAJÁRÓ:             0 Ft`,

      // ALDI receipt
      `ALDI
Budapest, Váci út 45
Tel: +36-1-234-5678

2025.07.25    16:15

BAGETT                 129 Ft
TEJFÖL 200G            179 Ft
CSIRKECOMB 1KG         899 Ft
BANÁN 1KG              399 Ft
KENYÉR TELJES KIŐ      259 Ft
PARADICSOMPÜRÉ         149 Ft

ÖSSZESEN:             2014 Ft`,

      // LIDL receipt
      `LIDL Magyarország
Kossuth L. u. 89
1234 Budapest

Dátum: 2025-07-25
Idő: 17:30

LISZT BL-55 1KG        179 Ft
MARGARIN 500G          299 Ft
CUKOR 1KG              189 Ft
SALÁTA MIX             229 Ft
KOLBÁSZ HÁZI           789 Ft
KEFIR 500ML            139 Ft

FIZETENDŐ:            1824 Ft
BANKKÁRTYA:           1824 Ft`,

      // PENNY receipt  
      `PENNY MARKET
Rákóczi út 123
Budapest 1234

25.07.2025  18:45

VÖR. PAPRIKA 500G      189 Ft
RIZS HOSSZÚ 1KG        249 Ft
OLÍVAOLAJ 500ML        599 Ft
SAJT GOUDA 200G        449 Ft
KEKSZ HÁZTARTÁSI       129 Ft
SZÁJ. KRÉKER           169 Ft

TOTAL:                1784 Ft`
    ];
    
    // Véletlenszerűen választunk egy receipt típust
    const randomReceipt = mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
    
    // A választott receipt-et feldolgozzuk
    return parseReceiptText(randomReceipt);
    
  } catch (error) {
    console.error('OCR hiba:', error);
    throw new Error('Nem sikerült feldolgozni a receipt képet');
  }
};

// Receipt szöveg feldolgozása és parsing - fejlesztett verzió
export const parseReceiptText = (text: string): ReceiptData => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const items: ReceiptItem[] = [];
  let total = 0;
  let store = '';
  let date = '';
  
  // Bővített üzlet felismerés
  const storePatterns = [
    'TESCO', 'ALDI', 'LIDL', 'PENNY', 'SPAR', 'CBA', 'COOP', 
    'AUCHAN', 'REAL', 'INTERSPAR', 'METRO', 'ROSSMANN',
    'DM', 'MÜLLER', 'OBI', 'PRAKTIKER', 'DECATHLON'
  ];
  
  // Első 6 sorban keressük az üzlet nevét
  for (const line of lines.slice(0, 6)) {
    const upperLine = line.toUpperCase();
    for (const pattern of storePatterns) {
      if (upperLine.includes(pattern)) {
        store = pattern;
        break;
      }
    }
    if (store) break;
  }
  
  // Fejlesztett dátum felismerés
  const datePatterns = [
    /(\d{4}[-\.\/]\d{1,2}[-\.\/]\d{1,2})/,  // 2025-07-25, 2025.07.25, 2025/07/25
    /(\d{1,2}[-\.\/]\d{1,2}[-\.\/]\d{4})/,  // 25-07-2025, 25.07.2025, 25/07/2025
    /(\d{4}\s*\.\s*\d{1,2}\s*\.\s*\d{1,2})/, // 2025. 07. 25
    /(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4})/  // 25. 07. 2025
  ];
  
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const dateMatch = line.match(pattern);
      if (dateMatch) {
        date = dateMatch[0].trim();
        break;
      }
    }
    if (date) break;
  }
  
  // Termékek és árak keresése - fejlesztett pattern matching
  for (const line of lines) {
    // Több ár formátum támogatása
    const pricePatterns = [
      /(\d{1,3}(?:[\s\.]\d{3})*)\s*Ft\s*$/i,     // 1.234 Ft, 1 234 Ft
      /(\d{1,6})\s*Ft\s*$/i,                      // 1234 Ft
      /(\d{1,3}(?:,\d{3})*)\s*Ft\s*$/i          // 1,234 Ft
    ];
    
    let priceMatch = null;
    let price = 0;
    
    for (const pattern of pricePatterns) {
      priceMatch = line.match(pattern);
      if (priceMatch) {
        // Számok tisztítása és konvertálása
        const priceStr = priceMatch[1].replace(/[\s\.,]/g, '');
        price = parseInt(priceStr);
        break;
      }
    }
    
    if (priceMatch && price > 0) {
      // Összeg sorok felismerése - bővített kulcsszavak
      const totalKeywords = [
        'ÖSSZESEN', 'TOTAL', 'FIZETENDO', 'FIZETENDŐ', 'VÉGÖSSZEG',
        'SUBTOTAL', 'SUM', 'OSSZEG', 'FIZET'
      ];
      
      const upperLine = line.toUpperCase();
      const isTotal = totalKeywords.some(keyword => upperLine.includes(keyword));
      
      if (isTotal) {
        total = price;
        continue;
      }
      
      // Termék név kinyerése (minden ami az ár előtt van)
      const productPart = line.substring(0, line.lastIndexOf(priceMatch[0])).trim();
      if (productPart.length > 2) {
        const item = parseProductLine(productPart, price);
        if (item) {
          items.push(item);
        }
      }
    }
  }
  
  // Ha nincs explicit összeg, számítsuk ki
  if (total === 0 && items.length > 0) {
    total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  // Ha nincs felismert üzlet, próbáljunk meg egyet találni a szövegből
  if (!store && lines.length > 0) {
    const firstLine = lines[0].toUpperCase();
    if (firstLine.includes('MARKET') || firstLine.includes('SHOP')) {
      store = firstLine.split(' ')[0] || 'ÜZLET';
    } else {
      store = 'ISMERETLEN ÜZLET';
    }
  }
  
  return {
    items,
    total,
    date,
    store: store || 'ÜZLET'
  };
};

// Egyedi termék sor feldolgozása - fejlesztett verzió
const parseProductLine = (productText: string, price: number): ReceiptItem | null => {
  if (!productText || productText.length < 2) return null;
  
  let name = productText.trim();
  let quantity = 1;
  let unit = 'db';
  
  // Termék név tisztítása - felesleges karakterek eltávolítása
  name = name.replace(/^\s*[-*•]\s*/, ''); // Leading bullets/dashes
  name = name.replace(/\s+/g, ' ').trim(); // Multiple spaces
  
  // Fejlesztett mennyiség és mértékegység keresése
  const quantityPatterns = [
    /(\d+(?:[,\.]\d+)?)\s*(kg|kilo|kilogramm)\b/gi,
    /(\d+(?:[,\.]\d+)?)\s*(g|gr|gramm)\b/gi,
    /(\d+(?:[,\.]\d+)?)\s*(dkg|dekagramm)\b/gi,
    /(\d+(?:[,\.]\d+)?)\s*(l|liter)\b/gi,
    /(\d+(?:[,\.]\d+)?)\s*(dl|deciliter)\b/gi,
    /(\d+(?:[,\.]\d+)?)\s*(ml|milliliter)\b/gi,
    /(\d+)\s*(db|darab|drb)\b/gi,
    /(\d+)\s*(csomag|csom)\b/gi,
    /(\d+)\s*(doboz|dob)\b/gi,
    /(\d+)\s*(üveg|tk|tekercs)\b/gi,
    /(\d+)\s*(szál|szelet)\b/gi
  ];
  
  for (const pattern of quantityPatterns) {
    const match = name.match(pattern);
    if (match) {
      const fullMatch = match[0];
      quantity = parseFloat(match[1].replace(',', '.'));
      unit = UNITS[match[2].toLowerCase()] || match[2].toLowerCase();
      
      // Termék név tisztítása (mennyiség eltávolítása)
      name = name.replace(fullMatch, '').trim();
      break;
    }
  }
  
  // Termék név további tisztítása
  name = name.replace(/\s+$/, ''); // Trailing spaces
  name = name.replace(/\s{2,}/g, ' '); // Multiple spaces
  
  // Ha túl rövid a név, ne adjuk hozzá
  if (name.length < 2) return null;
  
  // Kategória meghatározása fejlesztett algoritmussal
  const category = determineCategory(name);
  
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: name.toUpperCase(), // Konzisztens nagybetűs formátum
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
  
  return 'Egyéb';
};// Termék név tisztítása
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
