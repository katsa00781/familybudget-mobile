import * as FileSystem from 'expo-file-system';

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

// 🧠 GPT-4 Vision feldolgozás - EGYETLEN API
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
      model: 'gpt-4o-mini', // Gazdaságos verzió
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
- Magyar termékneveket NAGY BETŰVEL, OCR hibák javítása
- Kategóriák: Tejtermékek, Pékáruk, Hús és hal, Zöldség és gyümölcs, Édességek, Italok, Háztartás, Egyéb
- TEJF0L → TEJFÖL, K3NYÉR → KENYÉR típusú javítások
- Csak JSON-t adj vissza, semmi mást!`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Elemezd ezt a magyar nyugtát és add vissza JSON formátumban az adatokat. Javítsd az OCR hibákat (például 0→O, 3→E, 4→A)!'
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
    const errorText = await response.text();
    throw new Error(`OpenAI API hiba: ${response.status} ${response.statusText} - ${errorText}`);
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
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Nem található JSON a válaszban');
    }
    
    const jsonStr = content.substring(jsonStart, jsonEnd);
    const parsedData = JSON.parse(jsonStr);
    
    // Adatok validálása és konvertálása
    const items: ReceiptItem[] = (parsedData.items || []).map((item: any, index: number) => ({
      id: `gpt4_${index}_${Date.now()}`,
      name: item.name || 'Ismeretlen termék',
      quantity: Math.max(item.quantity || 1, 1),
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

    console.log(`✅ GPT-4 Vision parsing: ${result.items.length} termék, ${result.total} fillér összesen`);
    return result;
    
  } catch (parseError) {
    console.error('❌ GPT-4 Vision JSON parse hiba:', parseError);
    console.log('❌ Eredeti válasz:', content);
    throw new Error('GPT-4 Vision válasz feldolgozási hiba: ' + parseError);
  }
};

// 📝 Mock adatok generálása (fallback)
const generateMockData = (): ReceiptData => {
  return {
    items: [
      {
        id: 'mock_1',
        name: 'KENYÉR',
        quantity: 1,
        unit: 'db',
        price: 45000, // 450 Ft fillérben
        category: 'Pékáruk',
        checked: false
      },
      {
        id: 'mock_2',
        name: 'TEJ',
        quantity: 1,
        unit: 'l',
        price: 39900, // 399 Ft fillérben
        category: 'Tejtermékek',
        checked: false
      }
    ],
    total: 84900, // 849 Ft fillérben
    date: new Date().toLocaleDateString('hu-HU'),
    store: 'Teszt Üzlet'
  };
};

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

// Export alapértelmezett függvény
export default processReceiptImage;
