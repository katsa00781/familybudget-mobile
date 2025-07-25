import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

// Típusok
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

// OpenAI GPT-4 Vision API típusok
interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }> | string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 🎯 Fő feldolgozó függvény - CSAK GPT-4 Vision
export const processReceiptImage = async (imageUri: string): Promise<ReceiptData> => {
  console.log('🚀 GPT-4 Vision receipt feldolgozás indítása...');
  
  // GPT-4 Vision (egyetlen API)
  try {
    const gptResult = await processWithGPT4Vision(imageUri);
    if (gptResult.items.length > 0) {
      console.log('✅ GPT-4 Vision sikeres feldolgozás:', gptResult.items.length, 'termék');
      return gptResult;
    } else {
      console.warn('⚠️ GPT-4 Vision nem talált termékeket');
      return generateMockData();
    }
  } catch (error) {
    console.error('❌ GPT-4 Vision hiba:', error);
    console.log('📝 Fallback mock adatok használata');
    return generateMockData();
  }
};

// � GPT-4 Vision feldolgozás - LEGPONTOSABB magyar nyugtákhoz
const processWithGPT4Vision = async (imageUri: string): Promise<ReceiptData> => {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API kulcs hiányzik');
  }

  console.log('🧠 GPT-4 Vision API hívás magyar nyugta elemzéshez...');

  // Kép base64 konvertálása
  const base64Image = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Olcsóbb verzió
      messages: [
        {
          role: 'system',
          content: `Te egy magyar nyugta elemző szakértő vagy. Elemezd a képet és adj vissza JSON formátumban a nyugta adatait.

VÁLASZ FORMÁTUM (kötelező):
{
  "items": [
    {
      "name": "TERMÉK NÉV",
      "quantity": 1,
      "unit": "db",
      "price": 45000,
      "category": "Kategória"
    }
  ],
  "total": 45000,
  "store": "Üzlet név",
  "date": "2025.07.25"
}

SZABÁLYOK:
- Ár MINDIG fillérben (450 Ft = 45000)
- Magyar termékneveket NAGY BETŰVEL
- Kategóriák: Tejtermékek, Pékáruk, Hús és hal, Zöldség és gyümölcs, Édességek, Italok, Háztartás, Egyéb
- Csak JSON-t adj vissza, semmi mást!`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Elemezd ezt a magyar nyugtát és add vissza JSON formátumban az adatokat. Figyeld az árakat és termékneveket!'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high' // Nagy pontosság
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1 // Konzisztens eredményekért
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API hiba: ${response.status} ${response.statusText}`);
  }

  const data: OpenAIResponse = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('OpenAI API nem adott vissza választ');
  }

  const content = data.choices[0].message.content;
  console.log('🧠 GPT-4 Vision válasz:', content);

  // JSON parse és validáció
  try {
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}') + 1;
    const jsonStr = content.substring(jsonStart, jsonEnd);
    
    const parsedData = JSON.parse(jsonStr);
    
    // Adatok validálása és konvertálása
    const items: ReceiptItem[] = (parsedData.items || []).map((item: any, index: number) => ({
      id: `gpt4_${index}_${Date.now()}`,
      name: optimizeProductName(item.name || 'Ismeretlen termék'),
      quantity: item.quantity || 1,
      unit: item.unit || 'db',
      price: Math.max(item.price || 0, 10), // Min 10 fillér
      category: item.category || 'Egyéb',
      checked: false
    }));

    if (items.length === 0) {
      throw new Error('Nincs feldolgozható termék');
    }

    const result: ReceiptData = {
      items,
      total: parsedData.total || items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      date: parsedData.date || new Date().toLocaleDateString('hu-HU'),
      store: parsedData.store || 'Ismeretlen üzlet'
    };

    console.log(`✅ GPT-4 Vision parsing: ${result.items.length} termék, ${result.total} fillér`);
    return result;
    
  } catch (parseError) {
    console.error('❌ GPT-4 Vision JSON parse hiba:', parseError);
    throw new Error('GPT-4 Vision válasz feldolgozási hiba');
  }
};

// �🤖 Mindee AI feldolgozás - OPTIMALIZÁLT
const processWithMindeeAI = async (imageUri: string): Promise<ReceiptData> => {
  const apiKey = process.env.EXPO_PUBLIC_MINDEE_API_KEY;
  if (!apiKey) {
    throw new Error('Mindee API kulcs hiányzik');
  }

  console.log('🤖 Mindee AI Receipt API hívás...');

  // Kép előfeldolgozás
  const base64Image = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

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
    throw new Error(`Mindee API hiba: ${response.status}`);
  }

  const data: MindeeReceiptResponse = await response.json();
  
  if (data.api_request.status !== 'success') {
    throw new Error(`Mindee API státusz hiba: ${data.api_request.status}`);
  }

  return parseMindeeData(data);
};

// 📊 Mindee adatok feldolgozás - JAVÍTOTT PONTOSSÁG
const parseMindeeData = (data: MindeeReceiptResponse): ReceiptData => {
  const prediction = data.document.inference.prediction;
  const items: ReceiptItem[] = [];

  console.log('📊 Mindee line items:', prediction.line_items?.length || 0);

  if (prediction.line_items && prediction.line_items.length > 0) {
    prediction.line_items.forEach((item, index) => {
      if (item.description && item.total_amount && item.total_amount > 0) {
        
        // 🔧 Termék név optimalizálás
        const cleanName = optimizeProductName(item.description);
        if (cleanName.length < 2) return; // Túl rövid nevek kihagyása

        // 💰 Ár optimalizálás
        const price = Math.round((item.total_amount || 0) * 100); // Fillérben
        if (price < 10) return; // Túl olcsó termékek kihagyása

        // 📏 Mennyiség és mértékegység
        const quantity = item.quantity || 1;
        const unit = extractUnitFromName(item.description) || 'db';

        const receiptItem: ReceiptItem = {
          id: `mindee_${index}_${Date.now()}`,
          name: cleanName,
          quantity: quantity,
          unit: unit,
          price: price,
          category: smartCategoryDetection(cleanName),
          checked: false
        };

        items.push(receiptItem);
        console.log(`✅ [${index + 1}] ${receiptItem.name}: ${receiptItem.price} Ft`);
      }
    });
  }

  // Ha nincs line item, próbáljunk egyéb adatokat
  if (items.length === 0) {
    console.warn('⚠️ Mindee nem talált termékeket');
    throw new Error('Nincs feldolgozható termék');
  }

  // Összeg és egyéb adatok
  const total = prediction.total_amount?.value 
    ? Math.round(prediction.total_amount.value * 100)
    : items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return {
    items,
    total,
    date: formatReceiptDate(prediction.date?.value) || new Date().toLocaleDateString('hu-HU'),
    store: prediction.supplier_name?.value || 'Ismeretlen üzlet'
  };
};

// 🧠 Intelligens termék név optimalizálás
const optimizeProductName = (name: string): string => {
  if (!name) return '';

  let optimized = name.trim().toUpperCase();

  // 🔧 Gyakori OCR hibák javítása MAGYAR termékekhez
  const hungarianFixes = {
    // Betű-szám hibák
    '0': 'O', '5': 'S', '1': 'I', '8': 'B', '6': 'G', '2': 'Z', '3': 'E',
    
    // Magyar termékek specifikus javítások  
    'TEJF0L': 'TEJFÖL', 'K3NYÉR': 'KENYÉR', 'P4RADICSOM': 'PARADICSOM',
    'H4GYMA': 'HAGYMA', 'S4JT': 'SAJT', 'J0GHURT': 'JOGHURT',
    'CS1RKE': 'CSIRKE', '5ONKA': 'SONKA', 'SZ4LÁMI': 'SZALÁMI',
    '4LMA': 'ALMA', 'B4NÁN': 'BANÁN', 'N4RANCS': 'NARANCS',
    'TO1ÁS': 'TOJÁS', 'V4J': 'VAJ', 'R3PA': 'RÉPA',
    
    // Gyakori boltok javítása
    'TESK0': 'TESCO', '4LDI': 'ALDI', 'L1DL': 'LIDL',
    '5PAR': 'SPAR', 'C8A': 'CBA', 'CO0P': 'COOP'
  };

  // Javítások alkalmazása
  Object.entries(hungarianFixes).forEach(([wrong, correct]) => {
    optimized = optimized.replace(new RegExp(wrong, 'g'), correct);
  });

  // Tisztítás
  optimized = optimized
    .replace(/[^A-ZÁÉÍÓÖŐÚÜŰ0-9\s]/g, '') // Csak betűk, számok, szóköz
    .replace(/\d+[.,]?\d*\s*(KG|G|DKG|DB|L|DL|ML|CSOMAG|DOBOZ)/gi, '') // Mértékegységek eltávolítása
    .replace(/\b(AKCIÓ|AKCIÓS|KEDVEZMÉNY|LEÁRAZ)\b/gi, '') // Akciós szavak
    .replace(/\s+/g, ' ') // Dupla szóközök
    .trim();

  return optimized;
};

// 🎯 Intelligens kategória felismerés
const smartCategoryDetection = (productName: string): string => {
  const name = productName.toLowerCase();

  const categories = {
    'Tejtermékek': ['tej', 'sajt', 'túró', 'joghurt', 'vaj', 'tejföl', 'tejszín', 'kefir'],
    'Pékáruk': ['kenyér', 'kifli', 'zsemle', 'kalács', 'briós', 'bagett', 'péksütemény'],
    'Hús és hal': ['hús', 'csirke', 'sertés', 'marha', 'sonka', 'szalámi', 'kolbász', 'hal'],
    'Zöldség és gyümölcs': ['alma', 'banán', 'narancs', 'paradicsom', 'hagyma', 'krumpli', 'répa', 'saláta'],
    'Édességek': ['csokoládé', 'cukor', 'méz', 'bonbon', 'keksz', 'sütemény'],
    'Italok': ['víz', 'üdítő', 'tea', 'kávé', 'sör', 'bor', 'juice'],
    'Háztartás': ['mosószer', 'tisztítószer', 'papír', 'mosogatószer', 'szappan']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }

  return 'Egyéb';
};

// 📏 Mértékegység kinyerése
const extractUnitFromName = (name: string): string | null => {
  const units = ['kg', 'g', 'dkg', 'l', 'dl', 'ml', 'db', 'csomag', 'doboz', 'üveg'];
  const nameLower = name.toLowerCase();
  
  for (const unit of units) {
    if (nameLower.includes(unit)) {
      return unit;
    }
  }
  
  return null;
};

// 📅 Dátum formázás
const formatReceiptDate = (dateString: string | null): string | null => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU');
  } catch {
    return dateString;
  }
};

// 🔍 Google Vision fallback (egyszerűsített)
const processWithGoogleVision = async (imageUri: string): Promise<ReceiptData> => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error('Google Vision API kulcs hiányzik');
  }

  // Google Vision implementáció megtartása egyszerűsítve
  console.log('🔍 Google Vision fallback...');
  throw new Error('Google Vision átmenetileg nem elérhető');
};

// 📝 Mock adatok generálása
const generateMockData = (): ReceiptData => {
  return {
    items: [
      {
        id: 'mock_1',
        name: 'KENYÉR',
        quantity: 1,
        unit: 'db',
        price: 45000,
        category: 'Pékáruk',
        checked: false
      },
      {
        id: 'mock_2',
        name: 'TEJ',
        quantity: 1,
        unit: 'l',
        price: 39900,
        category: 'Tejtermékek',
        checked: false
      }
    ],
    total: 84900,
    date: new Date().toLocaleDateString('hu-HU'),
    store: 'Teszt Üzlet'
  };
};

// Export alapértelmezett függvény
export default processReceiptImage;

// 📄 JSON export/import funkciók a kompatibilitásért
export const exportToJSON = (receiptData: ReceiptData): string => {
  return JSON.stringify(receiptData, null, 2);
};

export const importFromJSON = (jsonString: string): ReceiptData => {
  try {
    const data = JSON.parse(jsonString);
    
    // Alapvető validáció
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Érvénytelen JSON formátum: items hiányzik');
    }
    
    return {
      items: data.items.map((item: any, index: number) => ({
        id: item.id || `imported_${index}_${Date.now()}`,
        name: item.name || 'Ismeretlen termék',
        quantity: item.quantity || 1,
        unit: item.unit || 'db',
        price: item.price || 0,
        category: item.category || 'Egyéb',
        checked: item.checked || false
      })),
      total: data.total || 0,
      date: data.date || new Date().toLocaleDateString('hu-HU'),
      store: data.store || 'Ismeretlen üzlet'
    };
  } catch (error) {
    console.error('❌ JSON import hiba:', error);
    throw new Error('Nem sikerült importálni a JSON adatokat');
  }
};

// Legacy kompatibilitás
export const processReceiptWithOCR = processReceiptImage;
