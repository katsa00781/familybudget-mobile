# Shopping Statistics Implementation

## Áttekintés

A bevásárlási statisztikák rendszer részletes elemzést nyújt a vásárlási szokásokról időszak, kategória és termék alapján.

## Adatbázis Módosítások

### 1. Új Tábla: shopping_statistics

```sql
-- Futtasd le a shopping_statistics tábla létrehozásához:
-- /database/create_shopping_statistics.sql
```

A tábla a következő adatokat tárolja:
- **user_id**: A vásárló felhasználó
- **shopping_list_id**: Hivatkozás a bevásárlólistára
- **shopping_date**: A vásárlás dátuma
- **product_name**: A termék neve
- **product_category**: A termék kategóriája
- **quantity**: A vásárolt mennyiség
- **unit**: A mértékegység
- **unit_price**: Az egységár
- **total_price**: A teljes ár (quantity * unit_price)

### 2. TypeScript Típusok

A `types/database.ts` fájlban hozzá lett adva a `ShoppingStatistics` interfész.

## Funkciók

### 1. Automatikus Statisztikai Adatok Mentése

A `ShoppingScreen.tsx` `createShoppingList` függvénye most automatikusan menti:
- Minden egyes termék vásárlási adatait
- Részletes időbélyegeket
- Kategóriaspecifikus adatokat
- Árstatisztikákat

### 2. Statisztikai Jelentések

A `ShoppingStatisticsScreen.tsx` komponens megjeleníti:
- **Összesített adatok**: Teljes költés, termékek száma, átlagár
- **Top kategóriák**: Legtöbbet költött kategóriák
- **Top termékek**: Leggyakrabban vásárolt termékek
- **Havi trendek**: Költési minták időben

### 3. Teljesítmény Optimalizálás

- Indexek a gyors lekérdezésekhez
- RLS (Row Level Security) a biztonságért
- Hatékony aggregációs lekérdezések

## Használat

### Supabase Migrációs Lépések

1. Jelentkezz be a Supabase Dashboard-ba
2. Menj a "SQL Editor" részhez
3. Futtasd le a `create_shopping_statistics.sql` tartalmat
4. Ellenőrizd, hogy a tábla létrejött-e a "Table Editor"-ban

### Alkalmazás Tesztelése

1. Hozz létre új bevásárlólistát termékekkel
2. Ellenőrizd a `shopping_statistics` táblában az automatikusan mentett adatokat
3. Használd a `ShoppingStatisticsScreen` komponenst az elemzésekhez

## Előnyök

### Felhasználói Előnyök
- **Költségkontroll**: Részletes betekintés a vásárlási szokásokba
- **Trend Analysis**: Havi/heti költési minták követése
- **Kategória Elemzés**: Melyik kategóriában költünk a legtöbbet
- **Termék Prioritás**: Leggyakrabban vásárolt termékek azonosítása

### Technikai Előnyök
- **Skalábilitas**: Nagy mennyiségű adat hatékony kezelése
- **Biztonság**: RLS biztonsági szintekkel
- **Teljesítmény**: Optimalizált indexekkel
- **Karbantarthatóság**: Tiszta adatmodell és típusok

## Jövőbeli Fejlesztések

1. **Grafikus Megjelenítés**: Diagramok és chartok
2. **Exportálás**: CSV/PDF jelentések
3. **Költségvetés Riasztások**: Túllépés figyelmeztetések
4. **Szezonális Elemzés**: Éves minták azonosítása
5. **Családi Összesítők**: Többfelhasználós statisztikák

## Adatbázis Séma Vizualizáció

```
shopping_lists (1) -----> (N) shopping_statistics
      |                          |
      |                          |
   user_id                   user_id
      |                          |
      v                          v
   auth.users <------------------+
```

## API Használat

### Statisztikai Lekérdezés Példa

```typescript
const { data, error } = await supabase
  .from('shopping_statistics')
  .select('*')
  .eq('user_id', user.id)
  .gte('shopping_date', startDate)
  .order('shopping_date', { ascending: false });
```

### Kategória Összesítő

```sql
SELECT 
  product_category,
  SUM(total_price) as category_total,
  COUNT(*) as item_count,
  AVG(unit_price) as avg_price
FROM shopping_statistics 
WHERE user_id = $1 
  AND shopping_date >= $2
GROUP BY product_category
ORDER BY category_total DESC;
```
