# 📱 Családi Költségvetés - Mobile App

Modern React Native mobilalkalmazás a családi költségvetés kezelésére és megtakarítási célok ny## 💰 Készíts okos pénzügyi döntéseket a Családi Költségvetés alkalmazássalmon követésére.

## ✨ Főbb funkciók

- 👥 **Felhasználó kezelés**: Biztonságos regisztráció és bejelentkezés Supabase autentikációval
- 💰 **Költségvetés tervezés**: Havi bevételek és kiadások nyomon követése
- 🎯 **Megtakarítási célok**: Célok beállítása és előrehaladás követése
- 📊 **Pénzügyi áttekintés**: Egyenleg és statisztikák megjelenítése
- 🛒 **Bevásárlólisták**: Vásárlási tervezés és költség becslés
- � **OCR Receipt Scanner**: Blokkok fényképezése és automatikus termék felismerés
- �📈 **Tranzakciók**: Részletes pénzügyi tranzakció történet  
- 🎨 **Modern UI**: Tiszta, intuitív felhasználói felület magyar nyelven

## 🚀 Gyors indítás

### Előfeltételek

- Node.js 18+
- npm vagy yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app mobilon (teszteléshez)

### Telepítés

```bash
# Repository klónozása
git clone https://github.com/katsa00781/familybudget-mobile.git
cd familybudget-mobile

# Függőségek telepítése
npm install

# Környezeti változók beállítása
cp .env.example .env
# Szerkeszd a .env fájlt a saját Supabase adataiddal

# AuthContext beállítása fejlesztéshez
cp context/AuthContext.example.tsx context/AuthContext.tsx
# Szerkeszd az AuthContext.tsx fájlt a teszt felhasználóddal (opcionális)

# Alkalmazás indítása
npm start
```

### ⚠️ Fontos biztonsági megjegyzés

Az `AuthContext.tsx` fájl automatikus bejelentkezést tartalmaz fejlesztési célokra. **SOHA ne commitold ezt a fájlt éles adatokkal!**

1. A `context/AuthContext.tsx` fájl automatikusan ignorálva van a git által
2. Használd a `context/AuthContext.example.tsx` template-et új környezet beállításához
3. Éles környezetben távolítsd el az auto-login funkciót

# Függőségek telepítése
npm install

# Környezeti változók beállítása
cp .env.example .env
# Szerkeszd a .env fájlt és add meg a Supabase adatokat

# Alkalmazás indítása
npm start
```

### Platform-specifikus indítás

```bash
npm run ios     # iOS szimulátor
npm run android # Android emulátor  
npm run web     # Web böngészőben
```

## ⚙️ Konfiguráció

### Supabase beállítás

1. Hozz létre egy új projektet a [Supabase](https://supabase.com) oldalon
2. Másold át a `.env.example` fájlt `.env` néven
3. Töltsd ki a következő értékeket:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Adatbázis séma

Az alkalmazás automatikusan létrehozza a szükséges táblákat első futtatáskor.

### Projekt struktúra

```plaintext
├── screens/          # Képernyő komponensek
├── navigation/       # Navigációs konfiguráció
├── context/          # React Context (Auth)
├── src/
│   ├── types/        # TypeScript típus definíciók
│   ├── services/     # API szolgáltatások
│   ├── config/       # Alkalmazás konfiguráció
│   └── hooks/        # Custom React hooks
├── assets/           # Képek és egyéb statikus fájlok
└── lib/              # Segédeszközök és utilities
```

## �️ Technológiai stack

- **Frontend**: React Native 0.79.5
- **Framework**: Expo SDK 53
- **Nyelv**: TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Autentikáció**: Supabase Auth
- **Navigáció**: React Navigation v7
- **Ikonok**: Expo Vector Icons
- **Státusz kezelés**: React hooks + Context

## 🎨 Dizájn

- **Szín paletta**: Teal (#1cc8e3) fő szín, modern árnyalatokkal
- **Tipográfia**: System fonts optimális teljesítményért
- **UI/UX**: Tiszta, minimalista design magyar felhasználóknak
- **Reszponzivitás**: Támogatott különböző képernyő méretek

## 📱 Képernyők

1. **Bejelentkezés/Regisztráció**: Biztonságos felhasználói autentikáció
2. **Főoldal**: Pénzügyi áttekintés és gyors műveletek
3. **Költségvetés**: Bevételek, kiadások és megtakarítási célok
4. **Bevásárlólisták**: Vásárlás tervezés és költségek
5. **Megtakarítások**: Célok követése és előrehaladás
6. **Profil**: Felhasználói beállítások

## 🔐 Biztonság

- Titkosított autentikáció Supabase-szel
- Biztonságos API kommunikáció
- Környezeti változók védelme
- Row Level Security (RLS) az adatbázisban

## 🤝 Közreműködés

1. Fork-old a repository-t
2. Hozz létre egy feature branch-et (`git checkout -b feature/UjFunkció`)
3. Commit-old a változásokat (`git commit -m 'Új funkció hozzáadása'`)
4. Push-old a branch-et (`git push origin feature/UjFunkció`)
5. Nyiss egy Pull Request-et

## 📄 Licenc

Ez a projekt MIT licenc alatt áll. Lásd a [LICENSE](LICENSE) fájlt a részletekért.

## 📞 Kapcsolat

- **Fejlesztő**: Kácsor Zsolt
- **GitHub**: [@katsa00781](https://github.com/katsa00781)
- **Repository**: [familybudget-mobile](https://github.com/katsa00781/familybudget-mobile)

---

## � Készíts okos pénzügyi döntéseket a Családi Költségvetés alkalmazással!
