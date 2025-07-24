# Családi Költségvetés - Mobilalkalmazás

## Web Projekt Integráció

A mobilalkalmazás a webes family budget projekt alapján lett továbbfejlesztve, amely tartalmazza a magyar bérkalkulációs rendszert és a családalapú költségvetés-kezelést.

### Új funkciók a web projektből:

#### 1. 🧮 Magyar Bérkalkulátor
- **Alapbér kalkuláció** magyar fizetési elemekkel
- **Túlóra és pótlékok** számítása (150%, 200%)
- **SZJA és TB járulék** automatikus számítása (15%, 18.5%)
- **Családi adókedvezmény** támogatása
- **Munkáltatói költségek** (szociális hozzájárulási adó: 13.5%)

#### 2. 👨‍👩‍👧‍👦 Család-alapú Csoportosítás
- **Családi profil** automatikus generálása
- **Közös költségvetés** kezelése
- **Családtagok kezelése** egy family_id alatt

#### 3. 🔒 Biztonság
- **Row Level Security (RLS)** minden táblán
- **Család-alapú hozzáférés-kezelés**
- **Automatikus profil létrehozás** regisztrációkor

## Telepítési Lépések

### 1. Adatbázis Frissítése
Futtasd a `database-migration.sql` fájlt a Supabase SQL Editor-ban:
```sql
-- A teljes migráció script fut automatikusan
```

### 2. Környezeti Változók
Ellenőrizd, hogy a `.env` fájl tartalmazza:
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Függőségek Telepítése
```bash
npm install
# vagy
yarn install
```

### 4. Alkalmazás Indítása
```bash
npx expo start
```

## Új Képernyők

### SalaryScreen.tsx
- **Bérkalkulációs űrlap** magyar adózási szabályokkal
- **Mentett kalkulációk** listája
- **Validáció** minimálbér és egyéb korlátokkal
- **Formázott megjelenítés** magyar forintban

## Fájlstruktúra Változások

```
types/
├── database.ts (frissítve - family_id hozzáadva)
├── salary.ts (új - bérkalkulációs típusok)

lib/
├── supabase.ts (meglévő)
├── salaryCalculator.ts (új - kalkulációs logika)

screens/
├── SalaryScreen.tsx (új - bérkalkulátor)
├── (egyéb meglévő képernyők)

navigation/
├── AppNavigator.tsx (frissítve - új fül hozzáadva)
```

## Adatbázis Séma

### Új Táblák

#### salary_calculations
```sql
- id (UUID)
- family_member_id (UUID -> profiles.id)
- alapber (INTEGER)
- ledolgozott_napok (DECIMAL)
- ledolgozott_orak (DECIMAL)
- tulora_orak (DECIMAL)
- brutto_ber (INTEGER)
- netto_ber (INTEGER)
- szja (INTEGER)
- tb_jarulék (INTEGER)
- created_at, updated_at
```

#### Frissített profiles tábla
```sql
- family_id (UUID) - családi csoportosításhoz
- phone, address, birth_date - kiegészítő mezők
- avatar_url, bio - profil információk
```

## Használat

### Bérkalkuláció
1. Nyisd meg a **Bérkalkulátor** fület
2. Töltsd ki az alapadatokat (alapbér, ledolgozott órák)
3. Add meg a túlórákat és pótlékokat (opcionális)
4. Állítsd be a családi adókedvezményt
5. Mentsd el a kalkulációt

### Családi Költségvetés
- A felhasználók automatikusan egy családi csoportba kerülnek
- A családtagok láthatják egymás bérkalkulációit (ha ugyanabban a családban vannak)
- A költségvetési tervezés család szinten történik

## Fejlesztési Megjegyzések

### Magyar Bérkalkuláció Szabályai
- **SZJA**: 15% (kedvezmények levonása után)
- **TB járulék**: 18.5% (bruttó bérből)
- **Szociális hozzájárulási adó**: 13.5% (munkáltatói)
- **Túlórapótlék**: 150% (első 8 óra után)
- **Ünnepnapi pótlék**: 200%

### Validációs Szabályok
- Minimálbér ellenőrzése (2024: 266,800 Ft)
- Maximális túlóra: 200 óra/hó
- Ledolgozott napok: 1-31 nap
- Ledolgozott órák: 1-744 óra/hó

### Jövőbeli Fejlesztések
- **Költségvetési tervek** (budget_plans tábla már létrehozva)
- **Család menedzsment** (családtagok hozzáadása/eltávolítása)
- **Bérkalkuláció export** (PDF/Excel)
- **Statisztikák és grafikonok** (éves/havi összesítések)

## Troubleshooting

### Adatbázis Kapcsolat
Ha nem működik a Supabase kapcsolat:
1. Ellenőrizd a környezeti változókat
2. Futtasd újra a migrációs scriptet
3. Ellenőrizd a RLS policy-kat

### Kalkulációs Hibák
Ha hibás az számítás:
1. Ellenőrizd a `TAX_RATES` konstansokat
2. Validáld a beviteli adatokat
3. Nézd meg a konzol hibaüzeneteket

### Navigációs Problémák
Ha nem jelenik meg az új fül:
1. Töröld a cache-t (`npx expo r -c`)
2. Ellenőrizd az import útvonalakat
3. Indítsd újra a Metro bundler-t
