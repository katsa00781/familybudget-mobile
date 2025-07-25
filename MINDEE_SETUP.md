# 🤖 Mindee Receipt OCR API Setup

## Miért Mindee?

A **Mindee Receipt OCR API** a legfejlettebb AI-alapú nyugta feldolgozó szolgáltatás, amely:

- ✅ **Strukturált adatkinyerés**: Automatikusan felismeri termékeket, árakat, mennyiségeket
- ✅ **Magyar támogatás**: Hivatalosan támogatott régió Magyarország
- ✅ **Line items**: Precíz terméksor felismerés
- ✅ **Automatikus kategorizálás**: Intelligens expense kategóriák
- ✅ **Deep Learning**: Modern AI-alapú feldolgozás
- ✅ **99%+ pontosság**: Sokkal jobb mint az általános OCR-ek

## API Kulcs Beszerzése

### 1. Regisztráció
1. Látogass el a [Mindee Platform](https://platform.mindee.com/signup)-ra
2. Regisztrálj ingyenes fiókot
3. Erősítsd meg az email címed

### 2. API Kulcs Létrehozása
1. Jelentkezz be a [Mindee Dashboard](https://platform.mindee.com/)-ra
2. Navigálj a **Settings** → **API Keys** menüpontba
3. Kattints a **Create API Key** gombra
4. Add meg a kulcs nevét (pl. "FamilyBudget Mobile")
5. Másold ki a generált API kulcsot

### 3. API Kulcs Beállítása
Helyettesítsd be a `.env` és `.env.local` fájlokban:

```bash
EXPO_PUBLIC_MINDEE_API_KEY=your-actual-api-key-here
```

## Árazás 💰

### Ingyenes Tier
- **250 feldolgozás/hó** ingyenesen
- Tökéletes személyes használatra
- Nincs hitelkártya szükséges

### Fizetős Tier (ha szükséges)
- **$0.10/document** (≈ 30 Ft/nyugta)
- Automatikus skálázás
- Enterprise támogatás

## Támogatott Funkciók

### 📊 Automatikus Adatkinyerés
- **Terméksorok**: név, mennyiség, egységár, összeg
- **Üzlet információk**: név, cím, telefon
- **Dátum és idő**: precíz felismerés
- **Összegek**: nettó, bruttó, ÁFA
- **Kategóriák**: food, shopping, transport, stb.

### 🌍 Támogatott Országok
- **Magyarország** ✅ (oficálisan támogatott)
- Európa: 25+ ország
- Észak-Amerika, Ázsia, stb.

### 📄 Támogatott Formátumok
- **Képek**: JPG, PNG, WEBP
- **PDF**: Egy vagy többoldalas
- **Mobil fotók**: Optimalizált feldolgozás

## Implementáció

### Intelligens Fallback System
```typescript
1. 🤖 Mindee AI Receipt Processing (Elsődleges)
   ↓ (hiba esetén)
2. 🔍 Google Vision OCR (Másodlagos)
   ↓ (hiba esetén)
3. 🎭 Mock Data (Fejlesztési fallback)
```

### Használat
```typescript
import { processReceiptWithOCR } from './lib/receiptOCR';

const result = await processReceiptWithOCR(imageUri);
// Automatikusan használja a legjobb elérhető API-t
```

## Előnyök a Google Vision-höz képest

| Feature | Google Vision | Mindee Receipt |
|---------|---------------|----------------|
| **Receipt specifikus** | ❌ | ✅ |
| **Strukturált output** | ❌ | ✅ |
| **Line items** | ❌ | ✅ |
| **Magyar optimalizáció** | ⚠️ | ✅ |
| **Kategorizálás** | ❌ | ✅ |
| **Árak felismerése** | ⚠️ | ✅ |
| **Setup komplexitás** | Közepes | Egyszerű |

## Tesztelés

### Működési Ellenőrzés
1. Indítsd el az appot
2. Navigálj a Shopping screen-re  
3. Készíts fotót egy magyar nyugtáról
4. Nézd meg a konzol logokat:
   - `🤖 Mindee AI Receipt Processing használata...` ✅
   - `✅ Mindee API sikeres válasz` ✅
   - `📊 Mindee line items feldolgozása: X tétel` ✅

### Fallback Tesztelése
Ha hibás API kulcsot adsz meg, automatikusan Google Vision-ra vált át.

## Troubleshooting

### "Mindee API kulcs hiányzik"
- Ellenőrizd a `.env` fájlban az `EXPO_PUBLIC_MINDEE_API_KEY` értékét
- Indítsd újra az Expo szervert

### "Mindee API hiba: 401"
- Hibás API kulcs
- Ellenőrizd a Mindee Dashboard-on

### "Mindee API hiba: 403"
- API kulcs jogosultság hiba
- Ellenőrizd, hogy a Receipt OCR API aktiválva van-e

### "Mindee API hiba: 429"
- Elfogyott a havi kvóta (250 feldolgozás)
- Várd meg a következő hónapot vagy válts fizetős tier-re

### "Mindee API hiba: 400"
- Hibás request formátum
- Ellenőrizd a base64 kódolást

### API Kulcs Tesztelése
```bash
# Egyszerű teszt parancssorból:
curl -X POST "https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict" \
  -H "Authorization: Token YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"document": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="}'
```

### Logok Ellenőrzése
Az app konzoljában keress ezeket:
- `🤖 Mindee AI Receipt Processing használata...` ✅
- `❌ Mindee API hiba: XXX` - hibakódok

## Eredmény

A Mindee AI Receipt Processing **sokkal pontosabban** fogja felismerni:
- 🛒 Termékneveket (KENYÉR, TEJ, BANÁN, stb.)
- 💰 Árakat és mennyiségeket  
- 🏪 Üzlet neveket
- 📅 Dátumokat
- 🗂️ Automatikus kategóriákat

**Várt javulás**: 60-70% → 95%+ pontosság magyar nyugtáknál! 🇭🇺
