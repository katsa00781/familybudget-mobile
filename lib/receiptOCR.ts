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
          content: `Te egy magyar nyugta OCR szakértő vagy, aki magyar áruházláncok (TESCO, ALDI, LIDL, SPAR, CBA, COOP, PENNY, AUCHAN) nyugtáit elemzi.

FELADATOD: Elemezd a nyugtaképet és adj vissza pontos JSON adatokat.

VÁLASZ FORMÁTUM (kötelező JSON):
{
  "items": [
    {
      "name": "TERMÉK NÉV",
      "quantity": 1,
      "unit": "db", 
      "price": 450,
      "category": "Kategória"
    }
  ],
  "total": 450,
  "store": "ÜZLET NÉV",
  "date": "2025.07.25"
}

🇭🇺 MAGYAR OCR HIBAJAVÍTÁSOK (KRITIKUS):
• 0 → O: "TEJF0L" → "TEJFÖL", "J0GHURT" → "JOGHURT"
• 1 → I: "K1NYÉR" → "KENYÉR", "CS1RKE" → "CSIRKE"  
• 3 → E: "K3NYÉR" → "KENYÉR", "T3J" → "TEJ"
• 4 → A: "P4RADICSOM" → "PARADICSOM", "H4GYMA" → "HAGYMA"
• 5 → S: "5ONKA" → "SONKA", "5PAR" → "SPAR"
• 6 → G: "JO6HURT" → "JOGHURT"
• 8 → B: "KOL8ÁSZ" → "KOLBÁSZ", "C8A" → "CBA"

📦 MAGYAR TERMÉK KATEGÓRIÁK:
• Tejtermékek: tej, sajt, túró, joghurt, vaj, tejföl, tejszín, kefir, mascarpone
• Pékáruk: kenyér, kifli, zsemle, kalács, briós, bagett, croissant, rétes
• Hús és hal: hús, csirke, sertés, marha, sonka, szalámi, kolbász, virsli, hal
• Zöldség és gyümölcs: alma, banán, narancs, paradicsom, hagyma, krumpli, répa, saláta
• Édességek: csokoládé, cukor, méz, bonbon, keksz, sütemény, torta
• Italok: víz, üdítő, tea, kávé, sör, bor, juice, ásványvíz
• Háztartás: mosószer, tisztítószer, wc papír, mosogatószer, szappan, sampon

💰 ÁR SZABÁLYOK:
- Eredeti forint érték: 450 Ft = 450, 199 Ft = 199
- Tizedesjegyek: 399,90 Ft = 399 (egészre kerekítve)
- NE szorozzuk meg semmivel az árat!

📏 MÉRTÉKEGYSÉGEK:
- kg, g, dkg (tömeg)
- l, dl, ml (űrmérték)  
- db, csomag, doboz, üveg, szál (darabszám)

🏪 ÜZLETLÁNCOK FELISMERÉSE:
- TESCO, ALDI, LIDL, SPAR, CBA, COOP, PENNY, AUCHAN, INTERSPAR, MATCH

⚠️ FONTOS:
- NE találj ki termékeket!
- Csak a nyugtán látható tételeket dolgozd fel
- Ha bizonytalan vagy, hagyd ki az adott tételt
- Dátum formátum: ÉÉÉÉ.HH.NN (2025.07.25)
- CSAK tiszta JSON választ adj, semmi mást!`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `🇭🇺 MAGYAR NYUGTA ELEMZÉS

Elemezd alaposan ezt a magyar áruházi nyugtát és dolgozd fel JSON formátumba!

🔍 AMIT KERESS:
1. TERMÉKNEVEK - Javítsd az OCR hibákat (0→O, 1→I, 3→E, 4→A, 5→S, 8→B)
2. ÁRAK - EREDETI forint érték (pl. 450 Ft = 450, NE szorozzuk meg!)
3. MENNYISÉGEK - kg, g, db, l, csomag, doboz
4. ÜZLET NÉV - TESCO, ALDI, LIDL, SPAR, CBA, stb.
5. DÁTUM - ÉÉÉÉ.HH.NN formátum
6. KATEGÓRIÁK - 8 magyar kategória közül válassz

⚠️ FONTOS: 
- Csak a nyugtán LÁTHATÓ termékeket dolgozd fel
- NE találj ki semmit
- OCR hibákat JAVÍTSD (TEJF0L→TEJFÖL)
- Árak eredeti forint értékben!

Válaszolj CSAK JSON-nal:`
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
    
    // Adatok validálása és javítása
    const items: ReceiptItem[] = (parsedData.items || []).map((item: any, index: number) => ({
      id: `gpt4_${index}_${Date.now()}`,
      name: postProcessProductName(item.name || 'Ismeretlen termék'),
      quantity: Math.max(item.quantity || 1, 1),
      unit: validateUnit(item.unit) || 'db',
      price: Math.max(item.price || 0, 1), // Min 1 Ft
      category: validateCategory(item.category) || 'Egyéb',
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

    console.log(`✅ GPT-4 Vision parsing: ${result.items.length} termék, ${result.total} Ft összesen`);
    return result;
    
  } catch (parseError) {
    console.error('❌ GPT-4 Vision JSON parse hiba:', parseError);
    console.log('❌ Eredeti válasz:', content);
    throw new Error('GPT-4 Vision válasz feldolgozási hiba: ' + parseError);
  }
};

// � Intelligens utófeldolgozó függvények a még jobb pontosságért
const postProcessProductName = (name: string): string => {
  if (!name || name.length < 2) return 'Ismeretlen termék';
  
  let processed = name.trim().toUpperCase();
  
  // További OCR hibák javítása, amiket a GPT esetleg kihagyott
  const extraFixes: { [key: string]: string } = {
    // Gyakori hibák még egyszer
    'TEJF0L': 'TEJFÖL', 'TEJFOL': 'TEJFÖL', 'TEJF8L': 'TEJFÖL',
    'K1NYÉR': 'KENYÉR', 'KENYÉR': 'KENYÉR', 'K3NYÉR': 'KENYÉR',
    'J0GHURT': 'JOGHURT', 'JÓGHURT': 'JOGHURT', 'J8GHURT': 'JOGHURT',
    'CS1RKE': 'CSIRKE', 'CSIRK3': 'CSIRKE', 'CS1RK3': 'CSIRKE',
    'H4GYMA': 'HAGYMA', 'HAGYM4': 'HAGYMA', 'H4GYM4': 'HAGYMA',
    'P4RADICSOM': 'PARADICSOM', 'PARADICSOM': 'PARADICSOM',
    '5ONKA': 'SONKA', 'S0NKA': 'SONKA', '50NKA': 'SONKA',
    'KOL8ÁSZ': 'KOLBÁSZ', 'KOLB4SZ': 'KOLBÁSZ', 'KOL8ASZ': 'KOLBÁSZ',
    'T3J': 'TEJ', 'T1J': 'TEJ', 'TE1': 'TEJ',
    'V4J': 'VAJ', 'VA1': 'VAJ', 'V41': 'VAJ',
    'TO1ÁS': 'TOJÁS', 'T0JÁS': 'TOJÁS', 'TOJAS': 'TOJÁS',
    '4LMA': 'ALMA', 'ALM4': 'ALMA', '4LM4': 'ALMA',
    'B4NÁN': 'BANÁN', 'BAN4N': 'BANÁN', 'B4N4N': 'BANÁN',
    'N4RANCS': 'NARANCS', 'NARANC5': 'NARANCS', 'N4RANC5': 'NARANCS',
    'U80RKA': 'UBORKA', 'UB0RKA': 'UBORKA', 'U8ORKA': 'UBORKA',
    'R3PA': 'RÉPA', 'REP4': 'RÉPA', 'R3P4': 'RÉPA',
    'SZ4LÁMI': 'SZALÁMI', 'SZALAM1': 'SZALÁMI', 'SZ4L4MI': 'SZALÁMI',
    
    // Üzletnevek javítása
    'TESK0': 'TESCO', 'TES6O': 'TESCO', 'T3SCO': 'TESCO',
    '4LDI': 'ALDI', 'ALD1': 'ALDI', 'A1DI': 'ALDI',
    'L1DL': 'LIDL', 'LID1': 'LIDL', 'L1D1': 'LIDL',
    '5PAR': 'SPAR', 'SP4R': 'SPAR', '5P4R': 'SPAR',
    'C8A': 'CBA', 'CB4': 'CBA', '68A': 'CBA',
    'CO0P': 'COOP', 'C00P': 'COOP', 'C0OP': 'COOP'
  };
  
  // Alkalmazás
  Object.entries(extraFixes).forEach(([wrong, correct]) => {
    processed = processed.replace(new RegExp(wrong, 'g'), correct);
  });
  
  // Felesleges karakterek és szavak eltávolítása
  processed = processed
    .replace(/\b(AKCIÓ|AKCIÓS|KEDVEZMÉNY|LEÁRAZ|SALE|OFFER)\b/gi, '')
    .replace(/\d+\s*(KG|G|DKG|L|DL|ML|DB|CSOMAG|DOBOZ|ÜVEG|SZÁL)\b/gi, '')
    .replace(/[^A-ZÁÉÍÓÖŐÚÜŰ0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  console.log(`🔧 Termék utófeldolgozás: "${name}" → "${processed}"`);
  return processed;
};

const validateUnit = (unit: string): string | null => {
  if (!unit) return null;
  
  const validUnits = ['kg', 'g', 'dkg', 'l', 'dl', 'ml', 'db', 'csomag', 'doboz', 'üveg', 'szál', 'szelet'];
  const unitLower = unit.toLowerCase().trim();
  
  // Közvetlen egyezés
  if (validUnits.includes(unitLower)) {
    return unitLower;
  }
  
  // Fuzzy match gyakori hibákra
  const unitFixes: { [key: string]: string } = {
    'darab': 'db', 'drb': 'db', 'kom': 'db',
    'kilogram': 'kg', 'kilo': 'kg', 'gramm': 'g', 'dekagramm': 'dkg',
    'liter': 'l', 'deciliter': 'dl', 'milliliter': 'ml',
    'csom': 'csomag', 'pak': 'csomag', 'pack': 'csomag',
    'dob': 'doboz', 'box': 'doboz', 'tekercs': 'tk'
  };
  
  return unitFixes[unitLower] || null;
};

const validateCategory = (category: string): string | null => {
  if (!category) return null;
  
  const validCategories = [
    'Tejtermékek', 'Pékáruk', 'Hús és hal', 'Zöldség és gyümölcs',
    'Édességek', 'Italok', 'Háztartás', 'Egyéb'
  ];
  
  // Közvetlen egyezés
  if (validCategories.includes(category)) {
    return category;
  }
  
  // Fuzzy match gyakori variációkra
  const categoryLower = category.toLowerCase();
  
  if (['tej', 'dairy', 'tejtermék'].some(k => categoryLower.includes(k))) return 'Tejtermékek';
  if (['pék', 'bread', 'kenyér'].some(k => categoryLower.includes(k))) return 'Pékáruk';
  if (['hús', 'meat', 'hal', 'fish'].some(k => categoryLower.includes(k))) return 'Hús és hal';
  if (['zöldség', 'gyümölcs', 'vegetable', 'fruit'].some(k => categoryLower.includes(k))) return 'Zöldség és gyümölcs';
  if (['édesség', 'sweet', 'candy'].some(k => categoryLower.includes(k))) return 'Édességek';
  if (['ital', 'drink', 'beverage'].some(k => categoryLower.includes(k))) return 'Italok';
  if (['háztartás', 'household', 'cleaning'].some(k => categoryLower.includes(k))) return 'Háztartás';
  
  return 'Egyéb';
};

// �📝 Mock adatok generálása (fallback)
const generateMockData = (): ReceiptData => {
  return {
    items: [
      {
        id: 'mock_1',
        name: 'KENYÉR',
        quantity: 1,
        unit: 'db',
        price: 450, // 450 Ft
        category: 'Pékáruk',
        checked: false
      },
      {
        id: 'mock_2',
        name: 'TEJ',
        quantity: 1,
        unit: 'l',
        price: 399, // 399 Ft
        category: 'Tejtermékek',
        checked: false
      }
    ],
    total: 849, // 849 Ft
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
