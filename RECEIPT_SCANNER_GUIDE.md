# OCR Blokk Scanner Használati Útmutató

## Funkció Áttekintés

Az OCR (Optical Character Recognition) blokk scanner funkció lehetővé teszi, hogy lefényképezd a bevásárlás utáni blokkodat, és az automatikusan felismerje a termékeket, árakat és létrehozzon belőle egy bevásárlólistát.

## Hogyan Használd

### 1. Blokk Scanner Indítása

1. Nyisd meg a **Bevásárlás** képernyőt
2. A jobb felső sarokban találod a **"Blokk"** gombot egy kamera ikonnal
3. Érintsd meg a gombot a scanner indításához

### 2. Fénykép Készítése

1. Engedélyezd a kamera hozzáférést, ha kéri
2. A kamera megnyílik
3. Helyezd a blokkot jól megvilágított helyre
4. Ügyelj rá, hogy:
   - A blokk teljes egészében látható legyen
   - Ne legyen árnyék rajta
   - A szöveg jól olvasható legyen
   - Tartsd egyenesen a telefont
5. Készíts fényképet

### 3. Eredmény Ellenőrzése

A fénykép készítése után az alkalmazás:
1. **Feldolgozza** a képet (2-3 másodperc)
2. **Megjeleníti** a felismert adatokat:
   - Bolt neve (ha felismerhető)
   - Vásárlás dátuma
   - Összeg
   - Termékek listája mennyiséggel és árral

### 4. Adatok Importálása

Az eredmény ellenőrzése után választhatsz:

**Importálás listába:**
- Automatikusan létrehoz egy új bevásárlólistát
- A lista neve: "Blokk import - [Bolt neve]"
- Minden felismert termék hozzáadódik a megfelelő kategóriával

**JSON Export:**
- Exportálja az adatokat JSON formátumban
- Használható későbbi importáláshoz vagy adatkezeléshez

## Támogatott Boltok

A rendszer felismeri a következő boltok blokkjait:
- **TESCO** (minden típus)
- **ALDI**
- **LIDL** 
- **PENNY**
- **SPAR**
- **CBA**
- **COOP**

## Termék Kategorizálás

A felismert termékeket automatikusan kategorizálja:

- **Pékáruk:** kenyér, croissant, kifli
- **Tejtermékek:** tej, sajt, joghurt, vaj, tojás
- **Hús és hal:** csirke, sertés, marha, hal, sonka
- **Zöldség és gyümölcs:** alma, banán, paradicsom, krumpli
- **Italok:** víz, üdítő, sör, bor, kávé, tea
- **Fűszer és öntet:** só, bors, szósz, ketchup
- **Tisztálkodás:** sampon, tusfürdő, fogkrém
- **Háztartás:** mosószer, WC papír, mosogatószer
- **Egyéb:** minden más termék

## Mértékegység Felismerés

A rendszer felismeri a következő mértékegységeket:
- **Súly:** kg, g, dkg
- **Térfogat:** l, dl, ml
- **Darab:** db, darab, szál, csomag, doboz, üveg

## Tippek a Legjobb Eredményhez

### Fénykép Minőség
- **Jó megvilágítás:** Természetes fény vagy erős lámpa
- **Éles kép:** Ne mozogj a fénykép során
- **Teljes blokk:** Az egész blokk legyen látható
- **Egyenes tartás:** Ne ferdén tartsd a telefont

### Blokk Állapot
- **Sima felület:** Simítsd ki a gyűrődéseket
- **Tiszta blokk:** Távolíts el folyadékfoltokat
- **Friss nyomtatás:** A régi, elmosódott blokkok nehezebben olvashatók

### Mit Kerülj
- **Rossz megvilágítás:** Árnyék vagy túl sötét
- **Elmosódott szöveg:** Régi vagy nedves blokk
- **Részleges kép:** A blokk egy része levágva
- **Ferde szög:** Oldalról vagy ferdén készített kép

## Hibaelhárítás

### "Kamera engedély szükséges"
1. Menj a telefon **Beállításokba**
2. Válaszd az **Alkalmazások** vagy **Apps** menüt
3. Keresd meg a **Family Budget** alkalmazást
4. Engedélyezd a **Kamera** hozzáférést

### "Nem sikerült feldolgozni a képet"
- **Próbáld újra** jobb megvilágítással
- **Ellenőrizd** hogy a blokk szövege jól látható-e
- **Készíts új fényképet** közelebbről

### "Kevés termék felismerve"
- A blokk **minőségén** múlik
- **Régi** vagy **elmosódott** blokkok nehezebben feldolgozhatók
- Próbáld **közelebb** tartani a telefont

### Hibás terméknevek
- Az OCR nem 100%-ban pontos
- **Ellenőrizd** az eredményeket
- **Módosíthatod** a termékneveket a lista szerkesztésével

## JSON Formátum

Ha JSON exportot választasz, a következő formátumot kapod:

```json
{
  "metadata": {
    "exportDate": "2025-07-25T15:30:00.000Z",
    "store": "TESCO",
    "receiptDate": "2025.07.25",
    "totalAmount": 5250,
    "itemCount": 9
  },
  "items": [
    {
      "name": "FEHÉR KENYÉR",
      "quantity": 1,
      "unit": "db",
      "price": 250,
      "category": "Pékáruk",
      "subtotal": 250
    },
    {
      "name": "TEJ 2.8% 1L",
      "quantity": 1,
      "unit": "l",
      "price": 350,
      "category": "Tejtermékek", 
      "subtotal": 350
    }
  ]
}
```

## Adatvédelem és Biztonság

- **Fényképek tárolása:** A fényképek CSAK helyben kerülnek feldolgozásra
- **Nincs feltöltés:** Képek nem kerülnek külső szerverre
- **Automatikus törlés:** A feldolgozás után a képek törlődnek
- **Csak termékadatok:** Csak a termékneveket, árakat és mennyiségeket tároljuk

## Fejlesztés alatt

Jelenleg **mock (teszt) adatokkal** működik a funkció. A közeljövőben:
- **Valós OCR motor** integrálása (Google Vision API)
- **Pontosabb** termékfelismerés
- **Több bolt** támogatása
- **Gyorsabb** feldolgozás

---

Ha problémád van a funkcióval, írj a fejlesztői csapatnak a visszajelzés funkción keresztül!
