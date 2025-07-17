import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://eguhipjgnhbajbmnrskm.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndWhpcGpnbmhiYWpibW5yc2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTk4NTIsImV4cCI6MjA2NjI3NTg1Mn0.hpjxrevjJr-vU2cDMuDVm6x8TD5k1_ZNZIJmAj0IPVg';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (first 20 chars):', supabaseAnonKey.substring(0, 20));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
