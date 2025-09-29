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

Használd a legfrissebb verziókat a függőségekből, és kövesd a legjobb gyakorlatokat a React Native fejlesztésben.

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

### Főbb Táblák
- `shopping_lists`: Bevásárlólisták (JSON items mező)
- `shopping_statistics`: Vásárlási statisztikák (termékenkénti bontásban)
- `profiles`: Felhasználói profilok és családi kapcsolatok
- `products`: Termék katalógus
- `product_price_history`: Termékárak történetének követése

### Teljes Adatbázis Séma

```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.budget_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  budget_data jsonb NOT NULL,
  total_amount integer NOT NULL DEFAULT 0,
  name character varying DEFAULT 'Költségvetés'::character varying,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budget_plans_pkey PRIMARY KEY (id),
  CONSTRAINT budget_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.income_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL DEFAULT 'Bevételi terv'::character varying,
  description text,
  monthly_income integer NOT NULL DEFAULT 0,
  additional_incomes jsonb DEFAULT '[]'::jsonb,
  total_income integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT income_plans_pkey PRIMARY KEY (id),
  CONSTRAINT income_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.investment_portfolio (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  symbol character varying NOT NULL,
  investment_type character varying NOT NULL CHECK (investment_type::text = ANY (ARRAY['stock'::character varying::text, 'bond'::character varying::text, 'etf'::character varying::text, 'crypto'::character varying::text])),
  quantity numeric NOT NULL,
  average_price numeric NOT NULL,
  current_price numeric,
  currency character varying DEFAULT 'HUF'::character varying,
  purchase_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT investment_portfolio_pkey PRIMARY KEY (id),
  CONSTRAINT investment_portfolio_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.investment_price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  symbol character varying NOT NULL,
  price numeric NOT NULL,
  currency character varying DEFAULT 'HUF'::character varying,
  date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT investment_price_history_pkey PRIMARY KEY (id)
);

CREATE TABLE public.product_price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  product_name text NOT NULL,
  normalized_name text NOT NULL,
  category text,
  unit text NOT NULL,
  price numeric NOT NULL,
  store_name text,
  purchase_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_price_history_pkey PRIMARY KEY (id),
  CONSTRAINT product_price_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  brand character varying,
  category character varying NOT NULL,
  store_name character varying,
  price integer,
  unit character varying NOT NULL DEFAULT 'db'::character varying,
  barcode character varying,
  sku character varying,
  description text,
  image_url text,
  available boolean DEFAULT true,
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  display_name text,
  phone text,
  address text,
  birth_date date,
  avatar_url text,
  bio text,
  family_id uuid DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.recipe_ingredients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  name character varying NOT NULL,
  quantity numeric NOT NULL,
  unit character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id)
);

CREATE TABLE public.recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  prep_time integer,
  servings integer DEFAULT 1,
  image_url text,
  instructions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipes_pkey PRIMARY KEY (id),
  CONSTRAINT recipes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.salary_calculations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL,
  alapber integer NOT NULL,
  ledolgozott_napok numeric NOT NULL,
  ledolgozott_orak numeric NOT NULL,
  szabadsag_napok numeric NOT NULL DEFAULT 0,
  szabadsag_orak numeric NOT NULL DEFAULT 0,
  tulora_orak numeric NOT NULL DEFAULT 0,
  muszakpotlek_orak numeric NOT NULL DEFAULT 0,
  unnepnapi_orak numeric NOT NULL DEFAULT 0,
  betegszabadsag_napok numeric NOT NULL DEFAULT 0,
  kikuldes_napok numeric NOT NULL DEFAULT 0,
  gyed_mellett integer NOT NULL DEFAULT 0,
  formaruha_kompenzacio integer NOT NULL DEFAULT 0,
  csaladi_adokedvezmeny integer NOT NULL DEFAULT 0,
  brutto_ber integer NOT NULL,
  netto_ber integer NOT NULL,
  szja integer NOT NULL DEFAULT 0,
  tb_jarulék integer NOT NULL DEFAULT 0,
  szoc_hozzajarulas integer NOT NULL DEFAULT 0,
  teljes_munkaltaroi_koltseg integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  additional_incomes jsonb DEFAULT '[]'::jsonb,
  name text,
  munkarend_napok numeric DEFAULT 20.0,
  CONSTRAINT salary_calculations_pkey PRIMARY KEY (id),
  CONSTRAINT salary_calculations_family_member_id_fkey FOREIGN KEY (family_member_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.savings_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  target_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  color character varying DEFAULT '#3B82F6'::character varying,
  category character varying DEFAULT 'general'::character varying,
  CONSTRAINT savings_goals_pkey PRIMARY KEY (id),
  CONSTRAINT savings_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.savings_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  savings_goal_id uuid NOT NULL,
  amount numeric NOT NULL,
  transaction_type character varying DEFAULT 'deposit'::character varying CHECK (transaction_type::text = ANY (ARRAY['deposit'::character varying::text, 'withdrawal'::character varying::text])),
  description text,
  transaction_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT savings_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT savings_transactions_savings_goal_id_fkey FOREIGN KEY (savings_goal_id) REFERENCES public.savings_goals(id)
);

CREATE TABLE public.shopping_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL DEFAULT 'Bevásárlólista'::character varying,
  date date NOT NULL DEFAULT CURRENT_DATE,
  items jsonb DEFAULT '[]'::jsonb,
  total_amount integer NOT NULL DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shopping_lists_pkey PRIMARY KEY (id),
  CONSTRAINT shopping_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.shopping_statistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shopping_list_id uuid,
  shopping_date date NOT NULL,
  product_name text NOT NULL,
  product_category text,
  brand text,
  store_name text,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'db'::text,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shopping_statistics_pkey PRIMARY KEY (id),
  CONSTRAINT shopping_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT shopping_statistics_shopping_list_id_fkey FOREIGN KEY (shopping_list_id) REFERENCES public.shopping_lists(id)
);
```

### Fontos Megjegyzések a Táblákhoz
- **shopping_lists.items**: JSON array formátumban tárolja a termékeket
- **shopping_statistics**: Minden termék vásárlás külön rekordként kerül ide
- **product_price_history**: Inflációkövetéshez használjuk
- **profiles.family_id**: Családi kapcsolatok kezelése
- **salary_calculations**: Magyar fizetésszámítási logika

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