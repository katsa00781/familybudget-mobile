import { supabase } from '../lib/supabase';

export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test authentication
    const { data: user, error: userError } = await supabase.auth.getUser();
    console.log('Current user:', user, 'Error:', userError);
    
    // Test profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    console.log('Profiles test:', profiles, 'Error:', profilesError);
    
    // Test budget_plans table
    const { data: budgets, error: budgetsError } = await supabase
      .from('budget_plans')
      .select('*')
      .limit(1);
    console.log('Budget plans test:', budgets, 'Error:', budgetsError);
    
    // Test income_plans table
    const { data: incomes, error: incomesError } = await supabase
      .from('income_plans')
      .select('*')
      .limit(1);
    console.log('Income plans test:', incomes, 'Error:', incomesError);
    
    // Test savings_goals table
    const { data: savings, error: savingsError } = await supabase
      .from('savings_goals')
      .select('*')
      .limit(1);
    console.log('Savings goals test:', savings, 'Error:', savingsError);
    
    return {
      user: user?.user,
      profiles,
      budgets,
      incomes,
      savings,
      errors: {
        userError,
        profilesError,
        budgetsError,
        incomesError,
        savingsError
      }
    };
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return { error };
  }
};
