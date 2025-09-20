-- Create shopping_statistics table for detailed analytics
CREATE TABLE IF NOT EXISTS shopping_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    shopping_date DATE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_category VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(50) NOT NULL DEFAULT 'db',
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopping_statistics_user_id ON shopping_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_statistics_shopping_list_id ON shopping_statistics(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_statistics_date ON shopping_statistics(shopping_date);
CREATE INDEX IF NOT EXISTS idx_shopping_statistics_category ON shopping_statistics(product_category);
CREATE INDEX IF NOT EXISTS idx_shopping_statistics_product ON shopping_statistics(product_name);

-- RLS (Row Level Security) policies
ALTER TABLE shopping_statistics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own statistics
CREATE POLICY "Users can view own shopping statistics" ON shopping_statistics
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own statistics
CREATE POLICY "Users can insert own shopping statistics" ON shopping_statistics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own statistics
CREATE POLICY "Users can update own shopping statistics" ON shopping_statistics
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own statistics
CREATE POLICY "Users can delete own shopping statistics" ON shopping_statistics
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON shopping_statistics TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE shopping_statistics IS 'Detailed shopping statistics for analytics and tracking spending patterns';
COMMENT ON COLUMN shopping_statistics.user_id IS 'User who made the purchase';
COMMENT ON COLUMN shopping_statistics.shopping_list_id IS 'Reference to the shopping list';
COMMENT ON COLUMN shopping_statistics.shopping_date IS 'Date when the shopping was done';
COMMENT ON COLUMN shopping_statistics.product_name IS 'Name of the purchased product';
COMMENT ON COLUMN shopping_statistics.product_category IS 'Category of the product (e.g., élelmiszer, tisztítószer)';
COMMENT ON COLUMN shopping_statistics.quantity IS 'Quantity purchased';
COMMENT ON COLUMN shopping_statistics.unit IS 'Unit of measurement (db, kg, liter, etc.)';
COMMENT ON COLUMN shopping_statistics.unit_price IS 'Price per unit';
COMMENT ON COLUMN shopping_statistics.total_price IS 'Total price for this item (quantity * unit_price)';
