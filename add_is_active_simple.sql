-- Add is_active column to budget_plans table
ALTER TABLE public.budget_plans 
ADD COLUMN is_active BOOLEAN DEFAULT false;