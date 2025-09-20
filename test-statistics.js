// Teszt script a shopping_statistics tábla ellenőrzéséhez
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Hiányzó környezeti változók!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testShoppingStatistics() {
  try {
    // Próbáljuk meg lekérdezni a shopping_statistics táblát
    const { data, error } = await supabase
      .from('shopping_statistics')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Hiba a shopping_statistics tábla lekérdezésekor:', error);
      console.log('\nA táblát létre kell hozni a Supabase-ben!');
      
      console.log('\nSQL a tábla létrehozásához:');
      console.log(`
CREATE TABLE shopping_statistics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    shopping_list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
    shopping_date date NOT NULL,
    product_name text NOT NULL,
    product_category text,
    quantity numeric NOT NULL DEFAULT 1,
    unit text DEFAULT 'db',
    unit_price numeric NOT NULL,
    total_price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index-ek létrehozása
CREATE INDEX idx_shopping_statistics_user_id ON shopping_statistics(user_id);
CREATE INDEX idx_shopping_statistics_date ON shopping_statistics(shopping_date);
CREATE INDEX idx_shopping_statistics_category ON shopping_statistics(product_category);

-- RLS policy-k
ALTER TABLE shopping_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shopping statistics" ON shopping_statistics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping statistics" ON shopping_statistics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping statistics" ON shopping_statistics
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping statistics" ON shopping_statistics
    FOR DELETE USING (auth.uid() = user_id);
      `);
    } else {
      console.log('✅ A shopping_statistics tábla elérhető!');
      console.log('Rekordok száma:', data?.length || 0);
    }
  } catch (err) {
    console.error('Váratlan hiba:', err);
  }
}

testShoppingStatistics();
