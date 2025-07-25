# OCR Receipt Scanner - Fejlesztői Dokumentáció

## Áttekintés

Az OCR Receipt Scanner funkció lehetővé teszi a vásárlási blokkok automatikus feldolgozását és bevásárlólistává alakítását. Jelenleg mock adatokkal működik, de könnyedén integrálható valós OCR szolgáltatásokkal.

## Architektúra

### Fájlstruktúra

```
lib/
  receiptOCR.ts          # OCR feldolgozó logika
screens/
  ShoppingScreen.tsx     # Felhasználói interfész
```

### Fő Komponensek

1. **receiptOCR.ts** - OCR feldolgozó modul
2. **ShoppingScreen.tsx** - UI és kamera integráció
3. **Camera Integration** - expo-image-picker használata
4. **Modal System** - Receipt feldolgozás UI

## OCR Modul (lib/receiptOCR.ts)

### Fő Funkciók

#### `processReceiptImage(imageUri: string): Promise<ReceiptData>`
- **Bemenet:** Kép URI
- **Kimenet:** Feldolgozott receipt adatok
- **Jelenleg:** Mock implementáció
- **Jövő:** Valós OCR API hívás

#### `parseReceiptText(text: string): ReceiptData`
- **Bemenet:** OCR által felismert szöveg
- **Kimenet:** Strukturált termékadatok
- **Funkció:** Szöveg parsing és termék kategorizálás

#### `exportToJSON(receiptData: ReceiptData): string`
- **Bemenet:** Receipt adatok
- **Kimenet:** JSON string
- **Funkció:** Adatok exportálása

#### `importFromJSON(jsonString: string): ReceiptData`
- **Bemenet:** JSON string
- **Kimenet:** Receipt adatok
- **Funkció:** JSON adatok importálása

### Adatstruktúrák

```typescript
interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category: string;
  checked: boolean;
}

interface ReceiptData {
  items: ReceiptItem[];
  total: number;
  date?: string;
  store?: string;
}
```

## Valós OCR Integráció

### Google Cloud Vision API

```typescript
// Jelenlegi mock helyett:
export const processReceiptImage = async (imageUri: string): Promise<ReceiptData> => {
  try {
    // 1. Kép base64 konvertálása
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 2. Google Vision API hívás
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION' }]
          }]
        })
      }
    );

    const data = await response.json();
    const detectedText = data.responses[0].fullTextAnnotation.text;

    // 3. Szöveg feldolgozása
    return parseReceiptText(detectedText);
    
  } catch (error) {
    console.error('OCR hiba:', error);
    throw new Error('Nem sikerült feldolgozni a receipt képet');
  }
};
```

### Azure Computer Vision

```typescript
export const processReceiptImageAzure = async (imageUri: string): Promise<ReceiptData> => {
  try {
    const imageBlob = await fetch(imageUri).then(r => r.blob());
    
    const response = await fetch(
      `${AZURE_ENDPOINT}/vision/v3.2/read/analyze`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_API_KEY,
          'Content-Type': 'application/octet-stream'
        },
        body: imageBlob
      }
    );

    const operationLocation = response.headers.get('operation-location');
    
    // Polling az eredményért
    let result;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const resultResponse = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': AZURE_API_KEY }
      });
      result = await resultResponse.json();
    } while (result.status === 'running');

    const text = result.analyzeResult.readResults
      .map(page => page.lines.map(line => line.text).join('\n'))
      .join('\n');

    return parseReceiptText(text);
    
  } catch (error) {
    console.error('Azure OCR hiba:', error);
    throw new Error('Nem sikerült feldolgozni a receipt képet');
  }
};
```

## Termék Kategorizálás

### Kategória Mapping

```typescript
const PRODUCT_CATEGORIES: { [key: string]: string } = {
  // Kulcsszavak -> Kategóriák mapping
  'kenyér': 'Pékáruk',
  'tej': 'Tejtermékek',
  'hús': 'Hús és hal',
  // ... további mappingek
};
```

### Intelligens Kategorizálás

Jövőbeli fejlesztések:
- **Machine Learning** alapú kategorizálás
- **Bolt-specifikus** termékadatbázis
- **Barcode** felismerés és termékadatbázis lookup

## Hibaelhárítás és Logging

### Error Handling

```typescript
try {
  const receiptData = await processReceiptImage(imageUri);
  // Sikeres feldolgozás
} catch (error) {
  if (error.message.includes('OCR')) {
    // OCR specifikus hiba
    Alert.alert('OCR Hiba', 'Próbáld jobb fényben újra');
  } else if (error.message.includes('Network')) {
    // Hálózati hiba
    Alert.alert('Kapcsolat', 'Ellenőrizd az internetkapcsolatot');
  } else {
    // Általános hiba
    Alert.alert('Hiba', 'Nem várt hiba történt');
  }
}
```

### Logging

```typescript
// Fejlesztési logging
console.log('OCR Started:', imageUri);
console.log('OCR Result:', receiptData);
console.log('Parsed Items:', receiptData.items.length);

// Termelési analytics
analytics.track('receipt_scanned', {
  items_count: receiptData.items.length,
  total_amount: receiptData.total,
  store: receiptData.store,
  processing_time: processingTime
});
```

## Teljesítmény Optimalizáció

### Kép Preprocessing

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

const preprocessImage = async (imageUri: string) => {
  // Kép átméretezése OCR optimalizáláshoz
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      { resize: { width: 1024 } }, // Optimális szélesség
      { rotate: 0 },               // Rotáció korrekció
    ],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  
  return result.uri;
};
```

### Caching

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// OCR eredmények cache-elése
const cacheOCRResult = async (imageHash: string, result: ReceiptData) => {
  await AsyncStorage.setItem(`ocr_${imageHash}`, JSON.stringify(result));
};

const getCachedOCRResult = async (imageHash: string): Promise<ReceiptData | null> => {
  const cached = await AsyncStorage.getItem(`ocr_${imageHash}`);
  return cached ? JSON.parse(cached) : null;
};
```

## Tesztelés

### Unit Tesztek

```typescript
// __tests__/receiptOCR.test.ts
import { parseReceiptText, determineCategory } from '../lib/receiptOCR';

describe('receiptOCR', () => {
  test('parseReceiptText should extract products correctly', () => {
    const mockText = `
TESCO HYPERMARKET
2025.07.25 14:30
FEHÉR KENYÉR          250 Ft
TEJ 2.8% 1L          350 Ft
ÖSSZESEN:           600 Ft
`;
    
    const result = parseReceiptText(mockText);
    
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(600);
    expect(result.store).toBe('TESCO');
  });

  test('determineCategory should categorize products correctly', () => {
    expect(determineCategory('FEHÉR KENYÉR')).toBe('Pékáruk');
    expect(determineCategory('TEJ 2.8%')).toBe('Tejtermékek');
  });
});
```

### Integration Tesztek

```typescript
// Kamera és OCR integráció tesztelése
describe('Receipt Scanner Integration', () => {
  test('should handle camera permission denial', async () => {
    // Mock camera permission denial
    jest.spyOn(ImagePicker, 'requestCameraPermissionsAsync')
        .mockResolvedValue({ granted: false });
    
    // Test hogy megfelelően kezeli-e a hiba
  });
});
```

## Deployment Checklist

### Valós OCR Integráció Előtt

- [ ] **API kulcsok** beállítása
- [ ] **Rate limiting** implementálása
- [ ] **Error handling** finomhangolása
- [ ] **Teljesítmény tesztelés** különböző képminőségekkel
- [ ] **Adatvédelmi** megfelelőség ellenőrzése
- [ ] **Backup OCR szolgáltatás** beállítása

### Production Ready

- [ ] **Analytics** integráció
- [ ] **A/B tesztelés** setup
- [ ] **Felhasználói feedback** gyűjtése
- [ ] **Dokumentáció** frissítése
- [ ] **Support team** felkészítése

## Környezeti Változók

```bash
# .env fájl
GOOGLE_VISION_API_KEY=your_google_api_key_here
AZURE_COMPUTER_VISION_KEY=your_azure_key_here
AZURE_COMPUTER_VISION_ENDPOINT=your_azure_endpoint_here

# OCR szolgáltatás választása
OCR_PROVIDER=google # vagy 'azure', 'aws', 'mock'
```

## API Költségek

### Google Vision API
- **Text Detection:** $1.50 / 1000 kép
- **Havi ingyenes:** 1000 kép

### Azure Computer Vision
- **OCR:** $1.00 / 1000 kép  
- **Havi ingyenes:** 5000 kép

### Költségoptimalizálás
- **Kép preprocessing** a feltöltés előtt
- **Rezultátum caching** ismételt feldolgozás elkerülésére
- **Batch processing** ahol lehetséges

---

## Következő Fejlesztési Lépések

1. **Valós OCR API** integráció (Google Vision prioritás)
2. **Felhasználói visszajelzés** gyűjtése és AI tanítás
3. **Barcode scanner** hozzáadása termék azonosításhoz
4. **Multi-language** támogatás (angol, német receipt-ek)
5. **Offline OCR** lehetőség helyi feldolgozásra
6. **Smart suggestions** termékek gyorsabb hozzáadásához
