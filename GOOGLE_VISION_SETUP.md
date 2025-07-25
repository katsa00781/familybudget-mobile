# Google Vision OCR API Integráció

## Setup útmutató

### 1. Google Cloud Console beállítás
1. Google Cloud Console-ban új projekt létrehozása
2. Vision API engedélyezése
3. Service Account kulcs létrehozása
4. API key beszerzése

### 2. Implementáció

```typescript
// Valós Google Vision OCR implementáció
const processReceiptWithGoogleVision = async (imageUri: string): Promise<ReceiptData> => {
  try {
    // Kép base64 konvertálása
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Google Vision API hívás
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
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
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    
    if (data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
      const detectedText = data.responses[0].fullTextAnnotation.text;
      return parseReceiptText(detectedText);
    } else {
      throw new Error('Nem sikerült szöveget felismerni a képről');
    }
  } catch (error) {
    console.error('Google Vision OCR hiba:', error);
    throw new Error('OCR feldolgozási hiba');
  }
};
```

### 3. Environment változók
```
GOOGLE_VISION_API_KEY=your_api_key_here
```

### 4. Aktiválás
A `lib/receiptOCR.ts` fájlban cseréld le a mock implementációt erre.

## Alternatívák

### Azure Computer Vision
- Microsoft Azure Computer Vision API
- Jó magyar nyelv támogatás

### AWS Textract
- Amazon Textract szolgáltatás  
- Kifejezetten receipt/document feldolgozásra optimalizált

### Offline megoldások
- React Native ML Kit
- Tesseract.js offline OCR

## Költségek

### Google Vision API
- Első 1000 kérés/hónap: Ingyenes
- Utána: $1.50 / 1000 kérés

### Azure Computer Vision
- Első 5000 kérés/hónap: Ingyenes
- Utána: $1.00 / 1000 kérés
