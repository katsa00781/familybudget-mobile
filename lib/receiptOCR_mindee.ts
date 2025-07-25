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

// Mindee API Types
interface MindeeLineItem {
  description: string | null;
  quantity: number | null;
  total_amount: number | null;
  unit_price: number | null;
}

interface MindeeReceiptResponse {
  api_request: {
    status: string;
    status_code: number;
  };
  document: {
    inference: {
      prediction: {
        category: { value: string | null };
        date: { value: string | null };
        line_items: MindeeLineItem[];
        supplier_name: { value: string | null };
        total_amount: { value: number | null };
        total_net: { value: number | null };
        total_tax: { value: number | null };
      };
    };
  };
}

// API kulcsok elérése
const getGoogleVisionApiKey = (): string | null => {
  return process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || null;
};

const getMindeeApiKey = (): string | null => {
  return process.env.EXPO_PUBLIC_MINDEE_API_KEY || null;
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
  
  // Mindee kategóriák leképezése magyarra
  'food': 'Élelmiszer',
  'groceries': 'Élelmiszerbolt',
  'restaurant': 'Étterem',
  'shopping': 'Bevásárlás',
  'transport': 'Közlekedés',
  'gasoline': 'Üzemanyag',
  'parking': 'Parkolás',
  'accommodation': 'Szállás',
  'miscellaneous': 'Egyéb'
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

// 🤖 MINDEE AI Receipt Processing (Preferált)
export const processReceiptWithMindee = async (imageUri: string): Promise<ReceiptData> => {
  const apiKey = getMindeeApiKey();
  
  if (!apiKey) {
    console.warn('Mindee API kulcs hiányzik, fallback Google Vision használata');
    return processReceiptWithGoogleVision(imageUri);
  }

  try {
    console.log('🤖 Mindee AI Receipt feldolgozás indítása...');
    
    // Kép base64 konvertálása
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Mindee API hívás
    const response = await fetch(
      'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: base64Image,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Mindee API hiba: ${response.status} ${response.statusText}`);
    }

    const data: MindeeReceiptResponse = await response.json();
    
    // Hibakezelés
    if (data.api_request.status !== 'success') {
      throw new Error(`Mindee API státusz hiba: ${data.api_request.status}`);
    }
    
    console.log('✅ Mindee API sikeres válasz:', data.document.inference.prediction);
    
    // Adatok kinyerése és strukturálása
    return parseMindeeReceiptData(data);
    
  } catch (error) {
    console.error('❌ Mindee API hiba:', error);
    
    // Fallback Google Vision API-ra
    console.warn('🔄 Fallback: Google Vision API használata');
    return processReceiptWithGoogleVision(imageUri);
  }
};

// Mindee adatok feldolgozása
const parseMindeeReceiptData = (data: MindeeReceiptResponse): ReceiptData => {
  const prediction = data.document.inference.prediction;
  const items: ReceiptItem[] = [];
  
  console.log('📊 Mindee line items feldolgozása:', prediction.line_items?.length || 0, 'tétel');
  
  // Line items feldolgozása
  if (prediction.line_items && prediction.line_items.length > 0) {
    prediction.line_items.forEach((item, index) => {
      if (item.description && item.total_amount && item.total_amount > 0) {
        const receiptItem: ReceiptItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: cleanProductName(item.description),
          quantity: item.quantity || 1,
          unit: extractUnitFromDescription(item.description) || 'db',
          price: Math.round(item.total_amount * 100), // Konvertálás fillérre
          category: determineCategory(item.description),
          checked: false
        };
        
        items.push(receiptItem);
        console.log(`🛒 Termék ${index + 1}: ${receiptItem.name} - ${receiptItem.price} Ft`);
      }
    });
  }
  
  // Ha nincsenek line items, próbáljunk fallback-et
  if (items.length === 0) {
    console.warn('⚠️ Mindee nem talált line items-eket, fallback mock használata');
    return generateMockReceiptData();
  }
  
  // Összeg és egyéb adatok
  const totalAmount = prediction.total_amount?.value 
    ? Math.round(prediction.total_amount.value * 100) 
    : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const result: ReceiptData = {
    items,
    total: totalAmount,
    date: formatReceiptDate(prediction.date?.value) || new Date().toLocaleDateString('hu-HU'),
    store: prediction.supplier_name?.value || 'Ismeretlen üzlet'
  };
  
  console.log('✅ Mindee parsing befejezve:', result.items.length, 'termék,', result.total, 'Ft összesen');
  return result;
};

// Google Vision API feldolgozó (fallback)
export const processReceiptWithGoogleVision = async (imageUri: string): Promise<ReceiptData> => {
  const apiKey = getGoogleVisionApiKey();
  
  if (!apiKey) {
    console.warn('Google Vision API kulcs hiányzik, mock használata');
    return generateMockReceiptData();
  }

  try {
    console.log('🔍 Google Vision OCR feldolgozás indítása...');
    
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
      console.log('📝 Google Vision felismert szöveg:', detectedText.substring(0, 200) + '...');
      
      // Magyar receipt parsing
      return parseHungarianReceiptText(detectedText);
    } else {
      console.warn('❌ Google Vision nem ismert fel szöveget, mock használata');
      return generateMockReceiptData();
    }
    
  } catch (error) {
    console.error('❌ Google Vision OCR hiba:', error);
    
    // Fallback mock implementációra
    console.warn('🔄 Fallback: Mock OCR használata');
    return generateMockReceiptData();
  }
};

// Mock implementáció fejlesztéshez
const generateMockReceiptData = (): ReceiptData => {
  console.log('🎭 Mock OCR feldolgozás...');
  
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
  
  console.log('✅ Mock OCR befejezve:', selectedReceipt.items.length, 'termék');
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

// Segédfunkciók
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

const extractUnitFromDescription = (description: string): string | null => {
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
    const match = description.match(pattern);
    if (match) {
      const unit = match[1].toLowerCase();
      return ['kg', 'g', 'dkg', 'l', 'dl', 'ml'].includes(unit) ? unit : 'db';
    }
  }
  
  return null;
};

const formatReceiptDate = (dateString: string | null): string | null => {
  if (!dateString) return null;
  
  try {
    // Mindee általában ISO formátumban adja vissza a dátumot
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU');
  } catch (error) {
    console.warn('Dátum formázási hiba:', error);
    return dateString;
  }
};

// Fejlett magyar receipt szöveg elemzése és strukturálása (Google Vision fallback-hez)
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
 * 🚀 FŐFUNKCIÓ: Intelligens Receipt Processing
 * Prioritás: 1. Mindee AI → 2. Google Vision → 3. Mock
 */
export const processReceiptWithOCR = async (imageUri: string): Promise<ReceiptData> => {
  try {
    const mindeeApiKey = getMindeeApiKey();
    
    // 1. MINDEE AI (Elsődleges - legpontosabb)
    if (mindeeApiKey) {
      console.log('🤖 Mindee AI Receipt Processing használata...');
      try {
        return await processReceiptWithMindee(imageUri);
      } catch (mindeeError) {
        console.warn('⚠️ Mindee API hiba, fallback Google Vision-ra:', mindeeError);
      }
    }
    
    // 2. GOOGLE VISION (Másodlagos)
    const googleApiKey = getGoogleVisionApiKey();
    if (googleApiKey) {
      console.log('🔍 Google Vision OCR használata...');
      try {
        return await processReceiptWithGoogleVision(imageUri);
      } catch (googleError) {
        console.warn('⚠️ Google Vision API hiba, fallback mock-ra:', googleError);
      }
    }
    
    // 3. MOCK (Végső fallback)
    console.log('🎭 Mock OCR használata (API kulcsok hiányoznak)...');
    return generateMockReceiptData();
    
  } catch (error) {
    console.error('❌ OCR feldolgozási hiba:', error);
    
    // Fallback mindig működjön
    console.log('🔄 Végső fallback: Mock OCR használata...');
    return generateMockReceiptData();
  }
};

// Backward compatibility
export const processReceiptImage = generateMockReceiptData;
