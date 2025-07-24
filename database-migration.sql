-- Mobilalkalmazás adatbázis frissítése a webes projekt alapján
-- Futtasd ezt a Supabase SQL Editor-ban

-- 1. Profiles tábla frissítése családi csoportosításhoz
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS family_id UUID DEFAULT gen_random_uuid();

-- 2. Salary calculations tábla létrehozása
CREATE TABLE IF NOT EXISTS salary_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Alapadatok
    alapber INTEGER NOT NULL,
    ledolgozott_napok DECIMAL(5,2) NOT NULL,
    ledolgozott_orak DECIMAL(5,2) NOT NULL,
    
    -- Szabadság és túlóra
    szabadsag_napok DECIMAL(5,2) NOT NULL DEFAULT 0,
    szabadsag_orak DECIMAL(5,2) NOT NULL DEFAULT 0,
    tulora_orak DECIMAL(5,2) NOT NULL DEFAULT 0,
    muszakpotlek_orak DECIMAL(5,2) NOT NULL DEFAULT 0,
    unnepnapi_orak DECIMAL(5,2) NOT NULL DEFAULT 0,
    betegszabadsag_napok DECIMAL(5,2) NOT NULL DEFAULT 0,
    kikuldes_napok DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- Egyéb juttatások
    gyed_mellett INTEGER NOT NULL DEFAULT 0,
    formaruha_kompenzacio INTEGER NOT NULL DEFAULT 0,
    csaladi_adokedvezmeny INTEGER NOT NULL DEFAULT 0,
    
    -- Számított értékek
    brutto_ber INTEGER NOT NULL,
    netto_ber INTEGER NOT NULL,
    szja INTEGER NOT NULL DEFAULT 0,
    tb_jarulék INTEGER NOT NULL DEFAULT 0,
    szoc_hozzajarulas INTEGER NOT NULL DEFAULT 0,
    teljes_munkaltaroi_koltseg INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS engedélyezése salary_calculations táblán
ALTER TABLE salary_calculations ENABLE ROW LEVEL SECURITY;

-- 4. Policies hozzáadása
CREATE POLICY "Users can manage their family salary calculations" 
ON salary_calculations 
FOR ALL 
USING (
    auth.uid() = family_member_id 
    OR auth.uid() IN (
        SELECT p.id 
        FROM profiles p 
        WHERE p.family_id = (
            SELECT profiles.family_id 
            FROM profiles 
            WHERE profiles.id = salary_calculations.family_member_id
        )
    )
);

-- 5. Update trigger hozzáadása salary_calculations táblához
CREATE TRIGGER update_salary_calculations_updated_at 
    BEFORE UPDATE ON salary_calculations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Automatikus profil létrehozás trigger frissítése
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, family_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        gen_random_uuid()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Budget plans tábla létrehozása (opcionális, későbbi fejlesztéshez)
CREATE TABLE IF NOT EXISTS budget_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    total_income INTEGER DEFAULT 0,
    total_expenses INTEGER DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key reference profiles tábla family_id mezőjéhez
    CONSTRAINT fk_budget_plans_family_id 
        FOREIGN KEY (family_id) 
        REFERENCES profiles(family_id) 
        ON DELETE CASCADE
);

-- 8. RLS engedélyezése budget_plans táblán
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;

-- 9. Budget plans policy
CREATE POLICY "Users can manage their family budget plans" 
ON budget_plans 
FOR ALL 
USING (
    family_id = (SELECT family_id FROM profiles WHERE id = auth.uid())
);

-- 10. Budget plans update trigger
CREATE TRIGGER update_budget_plans_updated_at 
    BEFORE UPDATE ON budget_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Meglévő táblák frissítése family_id használatához (ha szükséges)
-- Transactions tábla family_id indexszel
CREATE INDEX IF NOT EXISTS idx_transactions_family_id ON transactions(family_id);

-- Categories tábla family_id indexszel  
CREATE INDEX IF NOT EXISTS idx_categories_family_id ON categories(family_id);

-- Salary calculations indexek
CREATE INDEX IF NOT EXISTS idx_salary_calculations_family_member_id ON salary_calculations(family_member_id);
CREATE INDEX IF NOT EXISTS idx_salary_calculations_created_at ON salary_calculations(created_at);

-- Profiles family_id index
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);
