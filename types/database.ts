export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  phone?: string;
  address?: string;
  birth_date?: string;
  avatar_url?: string;
  bio?: string;
  family_id: string; // Családi csoportosításhoz
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface Category {
  id: string;
  family_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  type: 'income' | 'expense';
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  family_id: string;
  category_id: string;
  user_id: string;
  amount: number;
  description?: string;
  date: string;
  created_at: string;
  updated_at: string;
}
