import * as FileSystem from 'expo-file-system/legacy';

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
  date: string;
  store: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
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

// 📚 Adaptív tanulás - felhasználói javítások tárolása
const LEARNING_STORAGE_KEY = 'receipt_learning_examples';
let learningExamples = [];

// Fájl elérési útvonal dinamikus meghatározása
const getLearningFilePath = () => {
  return `${FileSystem.documentDirectory}${LEARNING_STORAGE_KEY}.json`;
};

// Tanulási példák betöltése fájlból
const loadLearningExamples = async () => {
  try {
    const filePath = getLearningFilePath();
    console.log(`📁 Tanulási fájl elérési út: ${filePath}`);
    
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      const stored = await FileSystem.readAsStringAsync(filePath, {
        encoding: 'utf8',
      });
      learningExamples = JSON.parse(stored);
      console.log(`📚 ${learningExamples.length} tanulási példa betöltve fájlból`);
    } else {
      console.log(`📝 Tanulási fájl még nem létezik: ${filePath}`);
      learningExamples = [];
    }
  } catch (error) {
    console.error('❌ Hiba a tanulási példák betöltésekor:', error);
    learningExamples = [];
  }
};

// Tanulási példák mentése fájlba
const saveLearningExamples = async () => {
  try {
    const filePath = getLearningFilePath();
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(learningExamples), {
      encoding: 'utf8',
    });
    console.log(`📚 ${learningExamples.length} tanulási példa mentve fájlba: ${filePath}`);
  } catch (error) {
    console.error('❌ Hiba a tanulási példák mentésekor:', error);
  }
};

// Inicializálás betöltéskor
loadLearningExamples();

// Tanulási példa hozzáadása
export const addLearningExample = async (originalResult: ReceiptData, correctedResult: ReceiptData) => {
  // Betöltjük a legfrissebb adatokat
  await loadLearningExamples();
  
  learningExamples.push({
    original: originalResult,
    corrected: correctedResult,
    timestamp: new Date().toISOString()
  });
  
  // Csak az utolsó 10 példát tartjuk meg
  if (learningExamples.length > 10) {
    learningExamples.shift();
  }
  
  // Mentjük AsyncStorage-ba
  await saveLearningExamples();
  
  console.log(`📚 Új tanulási példa hozzáadva. Összesen: ${learningExamples.length}`);
};

// Tanulási statisztikák lekérése
export const getLearningStats = async () => {
  // Betöltjük a legfrissebb adatokat
  await loadLearningExamples();
  
  console.log(`📊 Statisztikák lekérése: ${learningExamples.length} példa találva`);
  
  return {
    totalExamples: learningExamples.length,
    recentExamples: learningExamples.slice(-5),
    commonCorrections: analyzeCommonCorrections()
  };
};

// Debug: Teszt adatok hozzáadása
export const addTestLearningData = async () => {
  const testData = [
    {
      original: {
        items: [{ name: 'K3NY3R', quantity: 1, unit: 'db', price: 450, category: 'Pékáruk' }],
        total: 450,
        date: '2025.09.21',
        store: 'TEST'
      },
      corrected: {
        items: [{ name: 'KENYÉR', quantity: 1, unit: 'db', price: 450, category: 'Pékáruk' }],
        total: 450,
        date: '2025.09.21',
        store: 'TEST'
      },
      timestamp: new Date().toISOString()
    },
    {
      original: {
        items: [{ name: 'T3JF0L', quantity: 1, unit: 'db', price: 350, category: 'Tejtermékek' }],
        total: 350,
        date: '2025.09.21',
        store: 'TEST'
      },
      corrected: {
        items: [{ name: 'TEJFÖL', quantity: 1, unit: 'db', price: 350, category: 'Tejtermékek' }],
        total: 350,
        date: '2025.09.21',
        store: 'TEST'
      },
      timestamp: new Date().toISOString()
    }
  ];
  
  learningExamples = testData;
  await saveLearningExamples();
  console.log(`🧪 ${testData.length} teszt tanulási példa hozzáadva`);
};

// Gyakori javítások elemzése
const analyzeCommonCorrections = () => {
  const corrections = {};
  learningExamples.forEach(example => {
    example.original.items.forEach((originalItem, index) => {
      const correctedItem = example.corrected.items[index];
      if (correctedItem && originalItem.name !== correctedItem.name) {
        const key = `${originalItem.name} → ${correctedItem.name}`;
        corrections[key] = (corrections[key] || 0) + 1;
      }
    });
  });
  return corrections;
};

// Dinamikus példák generálása a prompthoz
const generateLearningPrompt = async (): Promise<string> => {
  // Betöltjük a legfrissebb példákat
  await loadLearningExamples();
  
  if (learningExamples.length === 0) return '';
  
  const recentExamples = learningExamples.slice(-3); // Utolsó 3 példa
  let promptSection = '\n\n🎓 TANULÁSI PÉLDÁK (gyakori javítások):\n';
  
  recentExamples.forEach((example, index) => {
    promptSection += `
PÉLDA ${index + 1}:
Eredeti felismerés: "${example.original.items[0]?.name || 'N/A'}"
Javított verzió: "${example.corrected.items[0]?.name || 'N/A'}"
`;
  });
  
  return promptSection + '\nEzek alapján javítsd a felismerést!\n';
};
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
  console.log('📁 Kép URI:', imageUri);

  try {
    // Kép base64 konvertálása - legacy API használata
    console.log('🔄 Base64 konvertálás indítása...');
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });
    
    console.log('✅ Base64 konverzió sikeres, hossz:', base64Image.length);

    // Tanulási példák betöltése a prompt generálásához
    const learningPrompt = await generateLearningPrompt();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Te egy profi magyar nyugta elemző vagy! Nagyon fontosak a magyar kifejezések és a bolt adatai!

PÉLDA VÁLASZ:
{
  "items": [
    {
      "name": "FÉLBARNA KENYÉR",
      "quantity": 1,
      "unit": "db",
      "price": 450,
      "category": "Pékáruk"
    },
    {
      "name": "TARTÓS TEJ 2,8%",
      "quantity": 2,
      "unit": "l",
      "price": 798,
      "category": "Tejtermékek"
    }
  ],
  "total": 1248,
  "store": "TESCO ÁRUHÁZ",
  "date": "2025.09.21"
}

🇭🇺 MAGYAR NYUGTA ELEMZÉSI SZABÁLYOK:
- Terméknevek: Teljes magyar neveket használj (pl: FÉLBARNA KENYÉR, TARTÓS TEJ 2,8%, FRISS SAJT)
- Árak: Forintban add meg az árakat! (450 Ft = 450, NE 45000!)
- Bolt név: A nyugta tetején lévő üzlet nevét pontosan írd ki (TESCO, ALDI, LIDL, CBA, PENNY, AUCHAN stb.)
- OCR javítások: 0→O, 3→E, 4→A, 5→S, 6→G, 1→I, 7→T, 8→B
- Magyar kategóriák: Tejtermékek, Pékáruk, Hús és hal, Zöldség és gyümölcs, Édességek és snack, Italok, Háztartási cikkek, Fagyasztott termékek, Dohányáruk, Gyógyszer és egészség, Kozmetikum, Állateledel, Egyéb
- Dátum: YYYY.MM.DD formátumban
- Magyaros terméknevek példák: 
  * TEJFÖL 20%, FŐZŐTEJ 2,8%, RÁNTOTTA MIX, ÉLESZTŐ KOCKA
  * FÉLBARNA KENYÉR, TOAST KENYÉR, ZSEMLE
  * TRAPPISTA SAJT, MAGYAR KOLBÁSZ, CSIRKEMELL
  * ALMA IDARED, PARADICSOM, HAGYMA
  * COCA-COLA, MINERALVÍZ, SÖR HEINEKEN
  * TISZTÍTÓSZER, MOSÓPOR, WC PAPÍR

FONTOS: Csak tiszta JSON válasz, semmi más szöveg!${learningPrompt}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Elemezd figyelmesen ezt a magyar nyugtát! Fontos a bolt neve, pontos terméknevek magyarul és helyes árak forintban. Javítsd az OCR hibákat a tanulási példák alapján!'
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
        max_tokens: 3000,
        temperature: 0.05 // Még konzisztensebb eredményekért
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
        price: Math.max(item.price || 0, 1), // Min 1 Ft
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
        store: (parsedData.store || 'Ismeretlen üzlet').toUpperCase().trim() // Egységes nagy betűs formátum
      };

      console.log(`✅ GPT-4 Vision parsing: ${result.items.length} termék, ${result.total} Ft összesen, Bolt: ${result.store}`);
      return result;
      
    } catch (parseError) {
      console.error('❌ GPT-4 Vision JSON parse hiba:', parseError);
      console.log('❌ Eredeti válasz:', content);
      throw new Error('GPT-4 Vision válasz feldolgozási hiba: ' + parseError);
    }
    
  } catch (error) {
    console.error('❌ GPT-4 Vision teljes hiba:', error);
    throw error;
  }
};

// 📝 Mock adatok generálása (fallback)
const generateMockData = (): ReceiptData => {
  return {
    items: [
      {
        id: 'mock_1',
        name: 'FÉLBARNA KENYÉR',
        quantity: 1,
        unit: 'db',
        price: 450, // 450 Ft
        category: 'Pékáruk',
        checked: false
      },
      {
        id: 'mock_2',
        name: 'TARTÓS TEJ 2,8%',
        quantity: 1,
        unit: 'l',
        price: 399, // 399 Ft
        category: 'Tejtermékek',
        checked: false
      },
      {
        id: 'mock_3',
        name: 'TRAPPISTA SAJT',
        quantity: 1,
        unit: 'kg',
        price: 2990, // 2990 Ft
        category: 'Tejtermékek',
        checked: false
      }
    ],
    total: 3839, // 3839 Ft
    date: new Date().toLocaleDateString('hu-HU'),
    store: 'TESCO ÁRUHÁZ'
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
