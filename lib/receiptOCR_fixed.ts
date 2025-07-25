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
          name: 'BANÁN',
          quantity: 0.5,
          unit: 'kg',
          price: 450,
          category: 'Zöldség és gyümölcs',
          checked: false
        },
        {
          id: '4',
          name: 'CSIRKEMELL FILÉ',
          quantity: 0.8,
          unit: 'kg',
          price: 1200,
          category: 'Hús és hal',
          checked: false
        }
      ],
      total: 2298,
      date: new Date().toLocaleDateString('hu-HU'),
      store: 'TESCO'
    }
  ];
  
  // Véletlenszerűen választunk egy mock receipt-et
  const selectedReceipt = mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
  
  console.log('Mock OCR befejezve:', selectedReceipt.items.length, 'termék');
  return selectedReceipt;
};

// Kategória meghatározása termék név alapján
const determineCategory = (productName: string): string => {
  const lowerName = productName.toLowerCase();
  
  for (const [keyword, category] of Object.entries(PRODUCT_CATEGORIES)) {
    if (lowerName.includes(keyword)) {
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

// Fejlett magyar receipt szöveg elemzése és strukturálása
const parseHungarianReceiptText = (text: string): ReceiptData => {
  console.log('🔍 Receipt text feldolgozás kezdése:', text.substring(0, 200) + '...');
  
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  console.log('📝 Összesen sorok:', lines.length);
  
  const items: ReceiptItem[] = [];
  let total = 0;
  let store = '';
  let date = '';
  
  // 🏪 Üzlet név keresése - bővített lista
  const storePatterns = [
    /TESCO|ALDI|LIDL|SPAR|CBA|COOP|PENNY|AUCHAN|INTERSPAR|MATCH|REÁL/i,
    /ROSSMANN|DM|MÜLLER|BUDAPEST BANK|OTP|ERSTE/i
  ];
  
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    for (const pattern of storePatterns) {
      if (pattern.test(line)) {
        store = line;
        console.log('🏪 Üzlet megtalálva:', store);
        break;
      }
    }
    if (store) break;
  }
  
  // 📅 Dátum keresése - többféle formátum
  const datePatterns = [
    /(\d{4}\.\d{2}\.\d{2})/,                    // 2025.07.25
    /(\d{2}\.\d{2}\.\d{4})/,                    // 25.07.2025
    /(\d{4}-\d{2}-\d{2})/,                      // 2025-07-25
    /(\d{2}\/\d{2}\/\d{4})/,                    // 25/07/2025
    /(\d{2}\.\s*\d{2}\.\s*\d{4})/               // 25. 07. 2025
  ];
  
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const dateMatch = line.match(pattern);
      if (dateMatch) {
        date = dateMatch[1].replace(/\s+/g, '');
        console.log('📅 Dátum megtalálva:', date);
        break;
      }
    }
    if (date) break;
  }
  
  // 💰 Végösszeg keresése - fejlett regex
  const totalPatterns = [
    /(?:VÉGÖSSZEG|ÖSSZESEN|TOTAL|FIZETENDŐ|SUBTOTAL|ÖSSZ\.?)\s*:?\s*(\d{1,3}(?:[.,\s]\d{3})*|\d+)[,.]?(\d{1,2})?\s*(?:Ft|HUF|EUR)?/i,
    /(?:KÁRTY[AÁ]|KÉSZPÉNZ|BANKKÁRTYA)\s*:?\s*(\d{1,3}(?:[.,\s]\d{3})*|\d+)[,.]?(\d{1,2})?\s*(?:Ft|HUF)?/i,
    /(\d{1,3}(?:[.,\s]\d{3})*|\d+)[,.]?(\d{1,2})?\s*(?:Ft|HUF)\s*(?:VÉGÖSSZEG|ÖSSZESEN|TOTAL|FIZETENDŐ)/i
  ];
  
  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const totalMatch = line.match(pattern);
      if (totalMatch) {
        let amount = totalMatch[1].replace(/[.,\s]/g, '');
        if (totalMatch[2]) {
          // Ha van tizedesjegy rész
          amount = amount + totalMatch[2];
        }
        total = parseInt(amount);
        console.log('💰 Végösszeg megtalálva:', total, 'Ft (soronként:', line + ')');
        break;
      }
    }
    if (total > 0) break;
  }
  
  // 🛒 Termékek keresése - fejlett algoritmus
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Kihagyjuk a nem releváns sorokat
    if (skipLine(line)) continue;
    
    // Többféle termék-ár pattern
    const productPatterns = [
      // Standard: "TERMÉK NÉV    123 Ft"
      /^(.+?)\s+(\d{1,3}(?:[.,\s]\d{3})*|\d+)[,.]?(\d{1,2})?\s*(?:Ft|HUF|EUR)?\s*$/i,
      // Mennyiségekkel: "ALMA 1kg x 450Ft    450 Ft"
      /^(.+?)\s+\d+[.,]?\d*\s*(?:kg|g|dkg|db|l|dl|ml|csomag)\s*x?\s*\d+\s*Ft?\s+(\d{1,3}(?:[.,\s]\d{3})*|\d+)\s*(?:Ft|HUF)?\s*$/i,
      // Akciós: "TERMÉK    AKCIÓ 450    450 Ft"
      /^(.+?)\s+(?:AKCIÓ|AKCI[OÓ]S?|KEDVEZM[EÉ]NY)\s*\d*\s*(\d{1,3}(?:[.,\s]\d{3})*|\d+)\s*(?:Ft|HUF)?\s*$/i,
      // Egyszerű: "TERMÉK 450"
      /^([A-ZÁÉÍÓÖŐÚÜŰ][A-ZÁÉÍÓÖŐÚÜŰ\s]{2,})\s+(\d{1,3}(?:[.,\s]\d{3})*|\d+)\s*$/i
    ];
    
    for (const pattern of productPatterns) {
      const match = line.match(pattern);
      if (match) {
        let productName = match[1].trim();
        let priceStr = match[2];
        
        // Ár tisztítása
        const cleanPrice = parseInt(priceStr.replace(/[.,\s]/g, ''));
        
        // Termék név tisztítása
        productName = cleanProductName(productName);
        
        // Validáció: elfogadható termék név és ár
        if (isValidProduct(productName, cleanPrice)) {
          const item: ReceiptItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: productName,
            quantity: extractQuantity(line),
            unit: extractUnit(line),
            price: cleanPrice,
            category: determineCategory(productName),
            checked: false
          };
          
          items.push(item);
          console.log('🛒 Termék hozzáadva:', productName, '-', cleanPrice, 'Ft');
        }
        break;
      }
    }
  }
  
  // Ha nem találtunk végösszeget, számoljuk ki a tételekből
  if (total === 0 && items.length > 0) {
    total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    console.log('💰 Végösszeg számítva tételekből:', total, 'Ft');
  }
  
  console.log('✅ Parsing befejezve:', items.length, 'termék,', total, 'Ft összesen');
  
  return {
    items,
    total,
    date: date || new Date().toLocaleDateString('hu-HU'),
    store: store || 'Ismeretlen üzlet'
  };
};

// Segédfunkciók a fejlett parsinghoz
const skipLine = (line: string): boolean => {
  const skipPatterns = [
    /^[\-\=\*\+\s]*$/,                                    // Csak elválasztó karakterek
    /^\d{1,2}:\d{2}$/,                                    // Időformátum
    /^[\d\s\-\(\)]+$/,                                    // Csak számok és speciális karakterek
    /NYUGTA|SZÁMLA|INVOICE|RECEIPT/i,                     // Dokumentum típus
    /KÖSZÖNJÜK|THANK\s*YOU|VISZLÁT/i,                     // Záró szövegek
    /ADÓSZÁM|TAX\s*NUMBER|VAT/i,                          // Adóinformációk
    /BOLTI?\s*VEZETŐ|KASSZA|PÉNZTÁR/i,                    // Üzleti információk
    /^\s*[\d\-\s]{10,}\s*$/,                             // Hosszú számsorok (vonalkód, stb.)
    /KEDVEZMÉNY.*%|DISCOUNT.*%/i,                         // Kedvezmény információk önállóan
    /^\s*[A-Z]{1,3}\s*$/,                                // Nagybetűs rövidítések
    /FIZETÉSI?\s*MÓD|PAYMENT\s*METHOD/i                   // Fizetési mód fejlécek
  ];
  
  return skipPatterns.some(pattern => pattern.test(line));
};

const cleanProductName = (name: string): string => {
  return name
    .replace(/^\W+|\W+$/g, '')                            // Kezdő/záró speciális karakterek
    .replace(/\s+/g, ' ')                                 // Többszörös szóközök
    .replace(/\d+[.,]?\d*\s*(?:kg|g|dkg|db|l|dl|ml|csomag|csom|doboz|üveg|szál|szelet)\b/gi, '') // Mennyiségek eltávolítása
    .replace(/\b(?:AKCIÓ|AKCIÓS|KEDVEZMÉNY)\b/gi, '')     // Akciós címkék eltávolítása
    .replace(/\s{2,}/g, ' ')                              // Dupla szóközök javítása
    .trim()
    .toUpperCase();
};

const isValidProduct = (name: string, price: number): boolean => {
  // Minimális név hossz
  if (name.length < 3) return false;
  
  // Ár validáció (10 Ft - 50,000 Ft között)
  if (price < 10 || price > 50000) return false;
  
  // Nem terméknevek kizárása
  const invalidNames = [
    /^[\d\s\-\.\,\(\)]+$/,                               // Csak számok
    /ÖSSZESEN|TOTAL|SUBTOTAL|VÉGÖSSZEG/i,               // Összeg sorok
    /KÉSZPÉNZ|KÁRTYA|BANKKÁRTYA|CASH|CARD/i,            // Fizetési módok
    /VISSZAJÁRÓ|CHANGE|VÁLTÓ/i,                         // Visszajáró
    /ADÓSZÁM|TAX|VAT|ÁFA/i,                             // Adóinformációk
    /NYUGTA|SZÁMLA|RECEIPT|INVOICE/i,                   // Dokumentum típusok
    /^[A-Z]{1,2}\d*$/,                                  // Rövid kódok
    /DÁTUM|DATE|IDŐ|TIME/i                              // Dátum/idő címkék
  ];
  
  return !invalidNames.some(pattern => pattern.test(name));
};

const extractQuantity = (line: string): number => {
  // Mennyiség keresése a sorban
  const quantityPatterns = [
    /(\d+[.,]?\d*)\s*(?:kg|g|dkg|l|dl|ml|db|darab|csomag|doboz|üveg|szál|szelet)/i,
    /(\d+[.,]?\d*)\s*x/i
  ];
  
  for (const pattern of quantityPatterns) {
    const match = line.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
  }
  
  return 1; // Alapértelmezett mennyiség
};

const extractUnit = (line: string): string => {
  const unitPatterns = [
    /(kg|kilogram)/i,
    /(g|gramm)/i,
    /(dkg|dekagram)/i,
    /(l|liter)/i,
    /(dl|deciliter)/i,
    /(ml|milliliter)/i,
    /(db|darab)/i,
    /(csomag|csom)/i,
    /(doboz|dob)/i,
    /(üveg)/i,
    /(szál)/i,
    /(szelet)/i
  ];
  
  for (const pattern of unitPatterns) {
    const match = line.match(pattern);
    if (match) {
      const unit = match[1].toLowerCase();
      return ['kg', 'g', 'dkg', 'l', 'dl', 'ml'].includes(unit) ? unit : 'db';
    }
  }
  
  return 'db';
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
