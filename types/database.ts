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
  user_id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
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
  name: string;
  date: string; // YYYY-MM-DD
  total_amount: number;
  items: string; // JSON string
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShoppingStatistics {
  id: string;
  user_id: string;
  shopping_date: string; // YYYY-MM-DD
  product_name: string;
  product_category?: string;
  brand?: string;
  store_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  created_at?: string;
}

export interface ProductPriceHistory {
  id: string;
  user_id: string;
  product_name: string;
  normalized_name: string; // Kereséshez normalizált név
  category: string;
  unit: string;
  price: number;
  store_name?: string;
  purchase_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface InflationStats {
  product_name: string;
  category: string;
  unit: string;
  current_price: number;
  previous_price: number;
  price_change: number;
  price_change_percent: number;
  first_purchase_date: string;
  last_purchase_date: string;
  purchase_frequency: number; // Hányszor vásárolta az adott időszakban
  total_spent: number;
}
