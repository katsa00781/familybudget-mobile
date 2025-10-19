-- Add is_active column to income_plans table
ALTER TABLE income_plans 
ADD COLUMN is_active BOOLEAN DEFAULT false;

-- Set the most recent income plan as active for each user
WITH latest_income AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM income_plans
  ORDER BY user_id, created_at DESC
)
UPDATE income_plans 
SET is_active = true 
FROM latest_income 
WHERE income_plans.id = latest_income.id;