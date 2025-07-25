import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { ReceiptData as ImportedReceiptData, ReceiptItem as ImportedReceiptItem, GoogleVisionResponse } from '../types/receipt';

// Kompatibilitás érdekében megtartjuk a helyi típusokat is
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

// Google Vision API kulcs elérése
const getGoogleVisionApiKey = (): string | null => {
  return process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || null;
};

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

// Mértékegységek leképezése
const UNITS: { [key: string]: string } = {
  'kg': 'kg',
  'kilo': 'kg', 
  'kilogramm': 'kg',
  'g': 'g',
  'gr': 'g',
  'gramm': 'g',
  'dkg': 'dkg',
  'dekagramm': 'dkg',
  'l': 'l',
  'liter': 'l',
  'dl': 'dl',
  'deciliter': 'dl',
  'ml': 'ml',
  'milliliter': 'ml',
  'db': 'db',
  'darab': 'db',
  'drb': 'db',
  'csomag': 'csomag',
  'csom': 'csomag',
  'doboz': 'doboz',
  'dob': 'doboz',
  'üveg': 'üveg',
  'tk': 'tk',
  'tekercs': 'tekercs',
  'szál': 'szál',
  'szelet': 'szelet'
};

// Mock implementáció fejlesztéshez
export const processReceiptImage = async (imageUri: string): Promise<ReceiptData> => {
  console.log('Mock OCR feldolgozás...', imageUri);
  
  // Szimuláljunk valós receipt adatokat
  const mockReceipts = [
    {
      items: [
        {
          id: '1',
          name: 'KENYÉR FEHÉR',
          quantity: 1,
          unit: 'db',
          price: 289,
          category: 'Pékáruk',
          checked: false
        },
        {
          id: '2', 
          name: 'TEJ UHT 2,8% 1L',
          quantity: 1,
          unit: 'l',
          price: 359,
          category: 'Tejtermékek',
          checked: false
        },
        {
          id: '3',
          name: 'SONKA SZELETEK',
          quantity: 1,
          unit: 'csomag',
          price: 1299,
          category: 'Hús és hal',
          checked: false
        },
        {
          id: '4',
          name: 'ALMA GOLDEN 1KG',
          quantity: 1,
          unit: 'kg',
          price: 449,
          category: 'Zöldség és gyümölcs',
          checked: false
        }
      ],
      total: 2396,
      date: new Date().toLocaleDateString('hu-HU'),
      store: 'TESCO EXPRESSZ'
    }
  ];

  // Random receipt választása
  const randomReceipt = mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
  
  return randomReceipt;
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
};

// Google Vision API feldolgozó
export const processReceiptWithGoogleVision = async (imageUri: string): Promise<ReceiptData> => {
  const apiKey = getGoogleVisionApiKey();
  
  if (!apiKey) {
    console.warn('Google Vision API kulcs hiányzik, fallback mock használata');
    return processReceiptImage(imageUri);
  }

  try {
    console.log('Google Vision OCR feldolgozás indítása...');
    
    // Kép base64 konvertálása
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Google Vision API hívás
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
                {
                  type: 'DOCUMENT_TEXT_DETECTION', 
                  maxResults: 1,
                }
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Vision API hiba: ${response.status} ${response.statusText}`);
    }

    const data: GoogleVisionResponse = await response.json();
    
    // Hibakezelés
    if (data.responses?.[0]?.error) {
      const error = data.responses[0].error;
      throw new Error(`Google Vision API hiba: ${error.message}`);
    }
    
    // Szöveg kinyerése
    if (data.responses?.[0]?.fullTextAnnotation?.text) {
      const detectedText = data.responses[0].fullTextAnnotation.text;
      console.log('Felismert szöveg:', detectedText);
      
      // Magyar receipt parsing
      return parseHungarianReceiptText(detectedText);
    } else {
      console.warn('Nem sikerült szöveget felismerni, fallback használata');
      return processReceiptImage(imageUri);
    }
    
  } catch (error) {
    console.error('Google Vision OCR hiba:', error);
    
    // Fallback mock implementációra
    console.warn('Google Vision hiba, fallback mock használata');
    return processReceiptImage(imageUri);
  }
};

// Magyar receipt szöveg elemzése és strukturálása
const parseHungarianReceiptText = (text: string): ReceiptData => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const items: ReceiptItem[] = [];
  let total = 0;
  let store = '';
  let date = '';
  
  // Üzlet név keresése (általában az első sorokban)
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i].toUpperCase();
    if (line.includes('TESCO') || line.includes('ALDI') || line.includes('LIDL') || 
        line.includes('SPAR') || line.includes('CBA') || line.includes('COOP')) {
      store = lines[i];
      break;
    }
  }
  
  // Dátum keresése (YYYY.MM.DD vagy DD.MM.YYYY formátum)
  const dateRegex = /(\d{4}\.\d{2}\.\d{2}|\d{2}\.\d{2}\.\d{4})/;
  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      date = dateMatch[0];
      break;
    }
  }
  
  // Végösszeg keresése
  const totalRegex = /(?:VÉGÖSSZEG|ÖSSZESEN|TOTAL|FIZETENDŐ).*?(\d{1,3}(?:\.\d{3})*|\d+)\s*Ft/i;
  for (const line of lines) {
    const totalMatch = line.match(totalRegex);
    if (totalMatch) {
      total = parseInt(totalMatch[1].replace(/\./g, ''));
      break;
    }
  }
  
  // Termékek keresése - ár Ft-tal végződő sorok
  const itemRegex = /^(.*?)\s+(\d{1,3}(?:\.\d{3})*|\d+)\s*Ft\s*$/;
  
  for (const line of lines) {
    const itemMatch = line.match(itemRegex);
    if (itemMatch) {
      const productName = itemMatch[1].trim();
      const price = parseInt(itemMatch[2].replace(/\./g, ''));
      
      // Kizárjuk a nem termék sorokat
      if (!productName.match(/VÉGÖSSZEG|ÖSSZESEN|TOTAL|KÉSZPÉNZ|KÁRTYA|VISSZAJÁRÓ|FIZETENDŐ/i)) {
        items.push({
          id: Math.random().toString(36).substr(2, 9),
          name: productName,
          quantity: 1,
          unit: 'db',
          price: price,
          category: determineCategory(productName),
          checked: false
        });
      }
    }
  }
  
  // Ha nem találtunk végösszeget, számoljuk ki a tételekből
  if (total === 0) {
    total = items.reduce((sum, item) => sum + item.price, 0);
  }
  
  return {
    items,
    total,
    date: date || new Date().toLocaleDateString('hu-HU'),
    store: store || 'Ismeretlen üzlet'
  };
};

/**
 * Főfunkció: automatikus OCR provider választással
 */
export const processReceiptWithOCR = async (imageUri: string): Promise<ReceiptData> => {
  try {
    const apiKey = getGoogleVisionApiKey();
    
    if (apiKey) {
      console.log('Google Vision API használata...');
      const result = await processReceiptWithGoogleVision(imageUri);
      
      // Ellenőrizzük az eredményt
      if (!result || !result.items) {
        console.warn('Google Vision API hibás eredményt adott, fallback használata');
        return processReceiptImage(imageUri);
      }
      
      return result;
    } else {
      console.log('Mock OCR használata (Google Vision API kulcs hiányzik)...');
      return processReceiptImage(imageUri);
    }
  } catch (error) {
    console.error('processReceiptWithOCR hiba:', error);
    
    // Fallback mindig működjön
    console.log('Fallback mock OCR használata...');
    return processReceiptImage(imageUri);
  }
};
