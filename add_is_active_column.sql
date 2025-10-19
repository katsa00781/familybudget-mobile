-- Add is_active column to budget_plans table
-- This script adds the ability to mark one budget as active per user

-- 1. Add is_active column to budget_plans table
ALTER TABLE public.budget_plans 
ADD COLUMN is_active BOOLEAN DEFAULT false;

-- 2. Add comment to explain the column
COMMENT ON COLUMN public.budget_plans.is_active IS 'Indicates if this budget plan is currently active for the user. Only one budget should be active per user at a time.';

-- 3. Create index for better performance when querying active budgets
CREATE INDEX idx_budget_plans_user_active 
ON public.budget_plans (user_id, is_active) 
WHERE is_active = true;

-- 4. Optional: Create a function to ensure only one active budget per user
CREATE OR REPLACE FUNCTION ensure_single_active_budget()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new/updated record is being set to active
    IF NEW.is_active = true THEN
        -- Set all other budgets for this user to inactive
        UPDATE public.budget_plans 
        SET is_active = false 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically maintain single active budget per user
CREATE TRIGGER trigger_ensure_single_active_budget
    BEFORE INSERT OR UPDATE ON public.budget_plans
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_budget();

-- 6. Optional: Set the most recent budget as active for each user who doesn't have an active budget
WITH latest_budgets AS (
    SELECT DISTINCT ON (user_id) 
        id, 
        user_id,
        created_at
    FROM public.budget_plans 
    WHERE user_id NOT IN (
        SELECT user_id 
        FROM public.budget_plans 
        WHERE is_active = true
    )
    ORDER BY user_id, created_at DESC
)
UPDATE public.budget_plans 
SET is_active = true 
WHERE id IN (SELECT id FROM latest_budgets);

-- 7. Verify the changes
-- Uncomment the following lines to check the results:

-- SELECT 
--     user_id,
--     name,
--     is_active,
--     created_at
-- FROM public.budget_plans 
-- ORDER BY user_id, created_at DESC;

-- SELECT 
--     user_id,
--     COUNT(*) as total_budgets,
--     COUNT(*) FILTER (WHERE is_active = true) as active_budgets
-- FROM public.budget_plans 
-- GROUP BY user_id;