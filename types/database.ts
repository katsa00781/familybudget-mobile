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

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number; // Changed from average_price to price to match web app database
  barcode?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  shopping_list_id?: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit: string;
  estimated_price: number;
  actual_price?: number;
  category: string;
  checked: boolean;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  family_id?: string;
  name: string;
  description?: string;
  date: string; // Fixed: use 'date' instead of 'shopping_date' to match actual database
  store_name?: string;
  items: ShoppingItem[];
  total_amount: number; // Fixed: use 'total_amount' instead of 'estimated_total' to match actual database
  actual_total?: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
}
