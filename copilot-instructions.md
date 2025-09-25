# Copilot Instructions - Családi Költségvetés Mobil App

## Projekt Áttekintés
Ez egy React Native/Expo alapú családi költségvetés kezelő alkalmazás, amely Supabase backend-et használ és iOS platformra van optimalizálva.

## Technológiai Stack
- **Frontend**: React Native + Expo SDK 54.0.9
- **Backend**: Supabase (PostgreSQL database)
- **Authentikáció**: Supabase Auth
- **Nyelv**: TypeScript
- **Platform**: iOS (Xcode build support)
- **Navigation**: React Navigation 6
- **AI**: OpenAI GPT-4 (receipt OCR és elemzés)

## Projekt Struktúra
```
/
├── screens/           # Képernyők
├── components/        # Újrafelhasználható komponensek
├── context/          # React Context (Auth, stb.)
├── lib/              # Utility függvények, Supabase client
├── types/            # TypeScript típusdefiníciók
├── navigation/       # Navigációs konfiguráció
├── assets/           # Képek, ikonok
├── ios/              # iOS natív projekt fájlok
└── database/         # SQL séma és migrációk
```

## Adatbázis Séma (Supabase)
- `shopping_lists`: Bevásárlólisták (JSON items mező)
- `users`: Felhasználói adatok
- `user_profiles`: Kiterjesztett profil információk

## Főbb Funkciók
1. **OCR Bevásárlás**: Nyugta szkennelés és automatikus feldolgozás
2. **Bevásárlólisták**: Létrehozás, szerkesztés, kezelés
3. **Statisztikák**: Kategória, havi, termék és bolt statisztikák
4. **Infláció követés**: Személyes infláció számítás termékárak alapján
5. **Profil kezelés**: Felhasználói beállítások

## Fejlesztési Irányelvek

### Kódolási Szabályok
- TypeScript használata mindenhez
- Funkcionális komponensek React Hooks-kal
- Supabase-hez mindig try-catch hibakezelés
- Console.log-ok csak fejlesztés alatt, production-ben eltávolítandók
- Hungarian nyelvű UI szövegek

### Adatbázis Művelet Minták
```typescript
// Helyes Supabase lekérdezés
const { data, error } = await supabase
  .from('shopping_lists')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Database error:', error);
  Alert.alert('Hiba', 'Nem sikerült betölteni az adatokat');
  return;
}
```

### Hibakezelés
- Mindig graceful error handling
- Alert.alert használata user-friendly hibaüzenetekhez
- Console.error részletes hibák fejlesztőknek
- Loading és error state-ek kezelése

### UI/UX Elvek
- Material Design inspiráció
- Responsive design iOS eszközökre
- Dark/Light theme support
- SafeAreaView használata
- Accessibility támogatás

## Környezeti Változók (.env)
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

## Build és Deployment

### iOS Build
```bash
# Függőségek telepítése
npm install

# iOS projekt generálása
npx expo prebuild --platform ios

# CocoaPods telepítése
cd ios && pod install

# Xcode-ban megnyitás
open ios/CsaldiKltsgvets.xcworkspace
```

### Development
```bash
# Development szerver indítása
npx expo start

# iOS szimulátor
npx expo start --ios
```

## Gyakori Problémák és Megoldások

### StatisticsScreen Adatfeldolgozás
- A `shopping_lists` táblából kell olvasni, nem `shopping_statistics`-ból
- JSON.parse() szükséges az `items` mező feldolgozásához
- `created_at` mező használata `shopping_date` helyett

### OCR Integráció
- OpenAI GPT-4 Vision API használata
- Strukturált JSON válasz kérése
- Magyar terméknevek felismerése
- Hibakezelés hiányzó API key esetén

### iOS Specific
- `react-native-safe-area-context` használata SafeAreaView helyett
- CocoaPods verziók kompatibilitása
- Xcode projekt beállítások ellenőrzése

## Tesztelési Irányelvek
- Minden új funkció tesztelése iOS szimulátorban
- Adatbázis műveletek tesztelése valós adatokkal
- OCR tesztelése különböző nyugtákkal
- Offline működés tesztelése

## Git Workflow
- Feature branch-ek használata
- Descriptive commit üzenetek
- `main` branch védett
- iOS build fájlok commitálása szükséges

## Biztonsági Szempontok
- API kulcsok környezeti változókban
- Supabase RLS (Row Level Security) használata
- Felhasználói adatok titkosítása
- OAuth token-ek biztonságos kezelése

## Performance Optimalizáció
- FlatList használata nagy listák esetén
- useMemo/useCallback hooks optimalizációhoz
- Lazy loading képekhez
- Debounced search implementáció

## További Dokumentáció
- `SHOPPING_STATISTICS.md` - Statisztikák részletes dokumentációja
- `OCR_IMPLEMENTATION_SUMMARY.md` - OCR funkció dokumentáció
- `database-migration.sql` - Adatbázis séma

---

**Megjegyzés**: Ez a dokumentum a projekt aktuális állapotát tükrözi (2025.09.25). Új funkciók hozzáadásakor frissíteni szükséges.