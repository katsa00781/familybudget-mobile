# 📈 Személyes Infláció Követés

## 🎯 Áttekintés

A személyes infláció követés funkció lehetővé teszi a felhasználók számára, hogy nyomon kövessék a gyakran vásárolt termékek áremelkedését és szemmel tartsák a személyes költségvetésükre gyakorolt hatást.

## 🔧 Működés

### 1. **Adatbázis Struktúra**

#### `ProductPriceHistory` tábla (tervezet)
```sql
CREATE TABLE product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  product_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL, -- Kereséshez normalizált név
  category TEXT,
  unit TEXT NOT NULL,
  price DECIMAL NOT NULL,
  store_name TEXT,
  purchase_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index a gyors kereséshez
CREATE INDEX idx_product_price_history_user_product 
ON product_price_history(user_id, normalized_name, purchase_date);
```

### 2. **Infláció Számítás**

#### **Termék Szintű Infláció**
- Első és utolsó vásárlási ár összehasonlítása
- Százalékos áremelkedés számítása
- Költés súlyozás figyelembevétele

#### **Kategória Szintű Infláció**
- Kategóriánkénti átlagos áremelkedés
- Kiadások súlyozása a nagyobb hatás kimutatásához

#### **Havi Trend Követés**
- Hónapok közötti áremelkedések
- Közös termékek alapján történő összehasonlítás

### 3. **UI Komponensek**

#### **Inflációs Áttekintés**
- Összesített személyes infláció ráta
- Grafikus megjelenítés (felfelé/lefelé nyíl)

#### **Top Áremelkedések**
- 5 legnagyobb áremelkedésű termék
- Előző és jelenlegi ár megjelenítése
- Százalékos és abszolút változás

#### **Kategóriák Szerint**
- Kategóriánkénti infláció ráta
- Összes kiadás kategóriánként

#### **Havi Trend**
- Utolsó 6 hónap inflációs trendje
- Hónap-hónap összehasonlítás

## 🚀 Implementálás Lépései

### 1. **Adatbázis Bővítés**
```sql
-- Futtatandó Supabase SQL-ben
CREATE TABLE product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  product_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL,
  price DECIMAL NOT NULL,
  store_name TEXT,
  purchase_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_price_history_user_product 
ON product_price_history(user_id, normalized_name, purchase_date);
```

### 2. **Automatikus Ár Rögzítés**
A ShoppingScreen.tsx-ben meg kell hívni egy függvényt, amely minden vásárlás után rögzíti az árakat:

```typescript
const recordPriceHistory = async (items: ShoppingItem[], storeName?: string) => {
  if (!user) return;

  const priceHistory = items.map(item => ({
    user_id: user.id,
    product_name: item.name,
    normalized_name: item.name.toLowerCase().trim(),
    category: item.category,
    unit: item.unit,
    price: item.actual_price || item.estimated_price,
    store_name: storeName,
    purchase_date: new Date().toISOString().split('T')[0]
  }));

  await supabase
    .from('product_price_history')
    .insert(priceHistory);
};
```

### 3. **Infláció Adatok Betöltése**
A StatisticsScreen.tsx már tartalmazza a szükséges logikát az infláció számításához.

## 📊 Használati Esetek

### **Heti Bevásárlás Követés**
- Rendszeres termékek árváltozásának nyomon követése
- Budgettervezés infláció figyelembevételével

### **Bolt Összehasonlítás**
- Különböző boltok árainak összehasonlítása
- Legjobb ár-érték arány megtalálása

### **Szezonális Trendek**
- Szezonális áremelkedések észlelése
- Optimális vásárlási időpontok meghatározása

## 🎨 Design Elemek

### **Színkódolás**
- 🔴 **Piros (#FF6B6B)**: Áremelkedés
- 🟢 **Zöld (#4ECDC4)**: Árcsökkenés
- ⚪ **Fehér/Szürke**: Semleges információk

### **Ikonok**
- 📈 `trending-up`: Áremelkedés
- 📉 `trending-down`: Árcsökkenés
- 📊 `analytics`: Általános statisztika
- 💰 `cash`: Pénzügyi információk

## 🔮 Jövőbeli Funkciók

1. **Előrejelzés**: AI alapú áremelkedés előrejelzés
2. **Riasztások**: Jelentős áremelkedés esetén push notification
3. **Összehasonlítás**: Országos átlaggal való összehasonlítás
4. **Export**: Infláció adatok exportálása
5. **Grafikon**: Interaktív áremelkedési grafikonok

## ⚠️ Megjegyzések

- A funkció működéséhez legalább 2 vásárlás szükséges ugyanabból a termékből
- Az infláció számítás csak a felhasználó saját adatain alapul
- Az árak összehasonlítása termék név és mértékegység alapján történik
