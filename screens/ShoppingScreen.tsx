import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { Product } from '../types/database';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  category: string;
  checked: boolean;
}

interface ShoppingList {
  id: string;
  user_id: string;
  name: string;
  date: string;
  items: ShoppingItem[];
  total_amount: number;
  completed: boolean;
  created_at: string;
  updated_at?: string;
}

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const ShoppingScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productSearchText, setProductSearchText] = useState('');
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [selectedItems, setSelectedItems] = useState<ShoppingItem[]>([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isShoppingModalVisible, setIsShoppingModalVisible] = useState(false);
  const [isAddItemModalVisible, setIsAddItemModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('db');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Általános');
  const [showPredefinedProducts, setShowPredefinedProducts] = useState(false);
  const [newListProducts, setNewListProducts] = useState<Product[]>([]);
  const [newListProductSearch, setNewListProductSearch] = useState('');
  const [filteredNewListProducts, setFilteredNewListProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Összes');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);

  // Predefined categories
  const categories = [
    'Összes', 'Tejtermékek', 'Pékáruk', 'Húsok', 'Zöldségek', 'Gyümölcsök', 
    'Italok', 'Fagyasztott', 'Konzervek', 'Tisztítószerek', 'Egyéb'
  ];

  const units = ['db', 'kg', 'liter', 'csomag', 'doboz'];

  // Load data function
  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Load shopping lists with specific columns to match database schema
      const { data: listsData, error: listsError } = await supabase
        .from('shopping_lists')
        .select('id, user_id, name, date, items, total_amount, completed, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Load products with specific columns - use price instead of average_price
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, unit, price, created_at')
        .order('name', { ascending: true });

      // Handle shopping lists
      if (listsError) {
        console.error('Error loading shopping lists:', listsError);
        console.log('Lists error details:', listsError.message);
        // Only use mock data if there's a connection error, not if table is empty
        setShoppingLists([]);
      } else {
        // Transform database data to match our interface
        const transformedLists: ShoppingList[] = (listsData || []).map(list => ({
          ...list,
          items: Array.isArray(list.items) ? list.items : [], // Parse items from JSONB
        }));
        setShoppingLists(transformedLists);
      }

      // Handle products - prioritize real data
      if (productsError) {
        console.error('Error loading products:', productsError);
        console.log('Products error details:', productsError.message);
        Alert.alert('Figyelem', 'Nem sikerült betölteni a terméklistát az adatbázisból. Ellenőrizd a kapcsolatot!');
        // Empty array instead of mock data to force using real database
        setProducts([]);
        setFilteredProducts([]);
      } else {
        console.log('Products loaded from database:', productsData?.length || 0);
        // Transform database data to match our interface
        const transformedProducts: Product[] = (productsData || []).map(product => ({
          ...product,
          updated_at: product.created_at, // Use created_at if updated_at doesn't exist
        }));
        setProducts(transformedProducts);
        setFilteredProducts(transformedProducts);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Hiba', 'Kapcsolati hiba történt az adatbázissal');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Filter products based on search text and category
  useEffect(() => {
    let filtered = products;
    
    // Filter by category
    if (selectedCategory !== 'Összes') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filter by search text
    if (productSearchText.trim() !== '') {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(productSearchText.toLowerCase()) ||
        product.category.toLowerCase().includes(productSearchText.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  }, [productSearchText, products, selectedCategory]);

  // Filter products for new list creation based on search text and category
  useEffect(() => {
    let filtered = products;
    
    // Filter by category
    if (selectedCategory !== 'Összes') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filter by search text
    if (newListProductSearch.trim() === '') {
      setFilteredNewListProducts(filtered.slice(0, 10)); // Show first 10 products by default
    } else {
      const searchFiltered = filtered.filter(product =>
        product.name.toLowerCase().includes(newListProductSearch.toLowerCase()) ||
        product.category.toLowerCase().includes(newListProductSearch.toLowerCase())
      );
      setFilteredNewListProducts(searchFiltered.slice(0, 10)); // Limit to 10 results
    }
  }, [newListProductSearch, products, selectedCategory]);

  // Edit existing shopping list
  const editShoppingList = (list: ShoppingList) => {
    setIsEditMode(true);
    setEditingList(list);
    setNewListName(list.name);
    setNewListProducts([]); // Reset products, user can add new ones
    setNewListProductSearch('');
    setIsCreateModalVisible(true);
  };

  // Update existing shopping list
  const updateShoppingList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Hiba', 'Kérlek add meg a lista nevét!');
      return;
    }

    if (!user || !editingList) {
      Alert.alert('Hiba', 'Be kell jelentkezned a mentéshez!');
      return;
    }

    try {
      // Calculate new total from selected products
      const newTotal = newListProducts.reduce((sum, product) => sum + product.price, 0);
      
      // Create updated items list - combine existing items with new products
      const newItems = [
        ...editingList.items, // Keep existing items
        ...newListProducts.map(product => ({
          id: generateId(),
          name: product.name,
          quantity: 1,
          unit: product.unit,
          price: product.price,
          category: product.category,
          checked: false,
        }))
      ];
      
      // Calculate updated total
      const updatedTotal = editingList.total_amount + Math.round(newTotal);
      
      // Create update object for Supabase
      const updateData = {
        name: newListName.trim(),
        items: newItems,
        total_amount: updatedTotal,
      };

      const { error } = await supabase
        .from('shopping_lists')
        .update(updateData)
        .eq('id', editingList.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating shopping list:', error);
        Alert.alert('Hiba', `Adatbázis hiba: ${error.message}`);
      } else {
        Alert.alert('Siker', 'A bevásárlólista sikeresen frissítve!');
      }

      // Update local state
      const updatedList: ShoppingList = {
        ...editingList,
        name: newListName.trim(),
        items: newItems,
        total_amount: updatedTotal,
        updated_at: new Date().toISOString(),
      };

      setShoppingLists(prev => 
        prev.map(list => 
          list.id === editingList.id ? updatedList : list
        )
      );

      // Reset form
      setNewListName('');
      setNewListProducts([]);
      setNewListProductSearch('');
      setIsEditMode(false);
      setEditingList(null);
      setIsCreateModalVisible(false);
      
    } catch (error) {
      console.error('Error updating shopping list:', error);
      Alert.alert('Hiba', 'Nem sikerült frissíteni a listát');
    }
  };
  const createShoppingList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Hiba', 'Kérlek add meg a lista nevét!');
      return;
    }

    if (!user) {
      Alert.alert('Hiba', 'Be kell jelentkezned a mentéshez!');
      return;
    }

    try {
      setLoading(true);
      
      // Calculate estimated total from selected products
      const estimatedTotal = newListProducts.reduce((sum, product) => sum + product.price, 0);
      
      // Create list object for Supabase with web app structure
      const listForSupabase = {
        user_id: user.id,
        name: newListName.trim(),
        date: new Date().toISOString().split('T')[0],
        items: newListProducts.map(product => ({
          id: generateId(),
          name: product.name,
          quantity: 1,
          unit: product.unit,
          price: product.price,
          category: product.category,
          checked: false,
        })),
        total_amount: Math.round(estimatedTotal),
        completed: false,
        created_at: new Date().toISOString(),
      };

      // Try to save to database
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([listForSupabase])
        .select();

      if (error) {
        console.error('Error creating shopping list:', error);
        Alert.alert('Hiba', `Adatbázis hiba: ${error.message}`);
        return;
      }

      Alert.alert('Siker', 'A bevásárlólista sikeresen létrehozva!');

      // Add to local state
      if (data && data[0]) {
        const newList: ShoppingList = {
          ...data[0],
          items: data[0].items,
        };
        setShoppingLists(prev => [newList, ...prev]);
      }

      // Reset form
      setNewListName('');
      setNewListProducts([]);
      setNewListProductSearch('');
      setIsEditMode(false);
      setEditingList(null);
      setIsCreateModalVisible(false);
      
    } catch (error) {
      console.error('Error creating shopping list:', error);
      Alert.alert('Hiba', 'Nem sikerült létrehozni a listát');
    } finally {
      setLoading(false);
    }
  };

  // Select shopping list for shopping mode
  const selectShoppingList = (list: ShoppingList) => {
    setSelectedList(list);
    setSelectedItems([...list.items]);
    setIsShoppingModalVisible(true);
  };

  // Toggle item check status
  const toggleItemCheck = (itemId: string) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, checked: !item.checked }
          : item
      )
    );
  };

  // Update item actual price
  const updateItemPrice = (itemId: string, price: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, price: price }
          : item
      )
    );
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) return; // Don't allow zero or negative quantities
    
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity: quantity }
          : item
      )
    );
  };

  // Add product to new list during creation
  const addProductToNewList = (product: Product) => {
    // Check if product is already in the list
    const existingProduct = newListProducts.find(p => p.id === product.id);
    if (existingProduct) {
      Alert.alert('Info', 'Ez a termék már hozzá van adva a listához');
      return;
    }

    setNewListProducts(prev => [...prev, product]);
    setNewListProductSearch(''); // Clear search after adding
    Alert.alert('Siker', `${product.name} hozzáadva a listához!`);
  };

  // Remove product from new list during creation
  const removeProductFromNewList = (productId: string) => {
    setNewListProducts(prev => prev.filter(p => p.id !== productId));
  };
  const addProductToList = (product: Product, quantity: number = 1) => {
    const newItem: ShoppingItem = {
      id: generateId(),
      name: product.name,
      quantity: quantity,
      unit: product.unit,
      price: product.price,
      category: product.category,
      checked: false,
    };

    setSelectedItems(prev => [...prev, newItem]);
    Alert.alert('Siker', `${product.name} hozzáadva a listához!`);
  };

  // Add new item to selected list
  const addItemToList = () => {
    if (!newItemName.trim()) {
      Alert.alert('Hiba', 'Kérlek add meg a termék nevét!');
      return;
    }

    const newItem: ShoppingItem = {
      id: generateId(),
      name: newItemName.trim(),
      quantity: parseInt(newItemQuantity) || 1,
      unit: newItemUnit,
      price: parseFloat(newItemPrice) || 0,
      category: newItemCategory,
      checked: false,
    };

    setSelectedItems(prev => [...prev, newItem]);
    
    // Reset form
    setNewItemName('');
    setNewItemQuantity('1');
    setNewItemPrice('');
    setIsAddItemModalVisible(false);
    
    Alert.alert('Siker', 'Termék hozzáadva a listához!');
  };

  // Add predefined product to list (legacy - now we use database products)
  const addPredefinedProduct = (product: { name: string; category: string; unit: string; price: number }) => {
    const newItem: ShoppingItem = {
      id: generateId(),
      name: product.name,
      quantity: 1,
      unit: product.unit,
      price: product.price,
      category: product.category,
      checked: false,
    };

    setSelectedItems(prev => [...prev, newItem]);
    Alert.alert('Siker', `${product.name} hozzáadva a listához!`);
  };

  // Remove item from list
  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Complete shopping
  const completeShoppingList = async () => {
    if (!selectedList || !user) return;

    try {
      const actualTotal = selectedItems.reduce((sum, item) => 
        sum + ((item.price || 0) * (item.quantity || 1)), 0
      );

      // Create update object with only the fields that exist in the database
      const updateData = {
        total_amount: Math.round(actualTotal),
        completed: selectedItems.every(item => item.checked),
        items: selectedItems, // Update items in JSONB column
      };

      const { error } = await supabase
        .from('shopping_lists')
        .update(updateData)
        .eq('id', selectedList.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating shopping list:', error);
        Alert.alert('Hiba', `Adatbázis hiba: ${error.message}`);
      } else {
        Alert.alert('Siker', 'Bevásárlás befejezve!');
      }

      // Update local state
      const updatedList: ShoppingList = {
        ...selectedList,
        items: selectedItems,
        total_amount: Math.round(actualTotal),
        completed: selectedItems.every(item => item.checked),
        updated_at: new Date().toISOString(),
      };

      setShoppingLists(prev => 
        prev.map(list => 
          list.id === selectedList.id ? updatedList : list
        )
      );

      setIsShoppingModalVisible(false);
      setSelectedList(null);
      
    } catch (error) {
      console.error('Error completing shopping:', error);
      Alert.alert('Hiba', 'Nem sikerült befejezni a bevásárlást');
    }
  };

  // Delete shopping list
  const deleteShoppingList = async (listId: string) => {
    if (!user) return;

    Alert.alert(
      'Lista törlése',
      'Biztosan törölni szeretnéd ezt a bevásárlólistát?',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shopping_lists')
                .delete()
                .eq('id', listId)
                .eq('user_id', user.id);

              if (error) {
                console.error('Error deleting shopping list:', error);
              }

              // Update local state
              setShoppingLists(prev => prev.filter(list => list.id !== listId));
              Alert.alert('Siker', 'Lista sikeresen törölve!');
              
            } catch (error) {
              console.error('Error deleting shopping list:', error);
              Alert.alert('Hiba', 'Nem sikerült törölni a listát');
            }
          },
        },
      ]
    );
  };

  // Format currency
  const formatCurrency = (amount: number | undefined): string => {
    const safeAmount = amount || 0;
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(safeAmount);
  };

  // Render legacy predefined product item (for backward compatibility)
  const renderPredefinedProduct = (product: { name: string; category: string; unit: string; price: number }) => (
    <TouchableOpacity
      key={product.name}
      style={styles.predefinedProduct}
      onPress={() => addPredefinedProduct(product)}
    >
      <Text style={styles.productName}>{product.name}</Text>
      <Text style={styles.productCategory}>{product.category}</Text>
      <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
    </TouchableOpacity>
  );

  // Render shopping list item
  const renderShoppingListItem = ({ item: list }: { item: ShoppingList }) => (
    <TouchableOpacity
      style={[styles.listCard, list.completed && styles.completedListCard]}
      onPress={() => selectShoppingList(list)}
    >
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{list.name}</Text>
        <View style={styles.listActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => editShoppingList(list)}
          >
            <Ionicons name="pencil" size={16} color="#14B8A6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteShoppingList(list.id)}
          >
            <Ionicons name="trash" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      {list.completed && (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="white" />
          <Text style={styles.completedText}>Kész</Text>
        </View>
      )}
      
      <Text style={styles.listDate}>
        {new Date(list.date).toLocaleDateString('hu-HU')}
      </Text>
      
      <View style={styles.listStats}>
        <Text style={styles.listProgress}>
          {list.items.filter(item => item.checked).length}/{list.items.length} termék
        </Text>
        <Text style={styles.listTotal}>
          {formatCurrency(list.total_amount || 0)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render shopping item in shopping mode
  const renderShoppingItem = ({ item }: { item: ShoppingItem }) => (
    <View style={[styles.shoppingItem, item.checked && styles.checkedShoppingItem]}>
      {/* Header Row - Checkbox, Name, Delete Button */}
      <View style={styles.itemHeaderRow}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => toggleItemCheck(item.id)}
        >
          <View style={[styles.checkbox, item.checked && styles.checkedCheckbox]}>
            {item.checked && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
        </TouchableOpacity>
        
        <View style={styles.itemTitleSection}>
          <Text style={[styles.itemName, item.checked && styles.checkedItemName]}>
            {item.name}
          </Text>
          <Text style={styles.itemDetails}>
            {item.unit} • {item.category}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeItem(item.id)}
        >
          <Ionicons name="close" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Controls Row - Quantity, Price */}
      <View style={styles.itemControlsRow}>
        {/* Quantity Controls */}
        <View style={styles.quantitySection}>
          <Text style={styles.controlLabel}>Mennyiség:</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateItemQuantity(item.id, (item.quantity || 1) - 1)}
            >
              <Ionicons name="remove" size={16} color="#666" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity || 1}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateItemQuantity(item.id, (item.quantity || 1) + 1)}
            >
              <Ionicons name="add" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={styles.controlLabel}>Ár:</Text>
          <View style={styles.priceContainer}>
            <TextInput
              style={styles.priceInput}
              value={item.price ? item.price.toString() : ''}
              onChangeText={(text) => updateItemPrice(item.id, parseFloat(text) || 0)}
              placeholder={'0'}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.currencyText}>Ft</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Betöltés...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bevásárlás</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsCreateModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Store Selection */}
          <View style={styles.storeSelectionContainer}>
            <Text style={styles.sectionTitle}>Bevásárlás</Text>
            
            {/* Debug info */}
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Termékek betöltve: {products.length} db
              </Text>
              {products.length === 0 && (
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={loadData}
                >
                  <Ionicons name="refresh" size={16} color="#14B8A6" />
                  <Text style={styles.refreshButtonText}>Termékek újratöltése</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Shopping Lists */}
          <View style={styles.listsSection}>
            <View style={styles.listsSectionHeader}>
              <Text style={styles.sectionTitle}>Bevásárlólisták</Text>
              <Text style={styles.listCount}>{shoppingLists.length} lista</Text>
            </View>
            
            {shoppingLists.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="basket" size={64} color="rgba(255, 255, 255, 0.5)" />
                <Text style={styles.emptyStateText}>Még nincs bevásárlólistád</Text>
                <Text style={styles.emptyStateSubtext}>
                  Hozz létre egyet a jobb felső sarokban található + gombbal
                </Text>
              </View>
            ) : (
              <FlatList
                data={shoppingLists}
                keyExtractor={(item) => item.id}
                renderItem={renderShoppingListItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listsContainer}
              />
            )}
          </View>
        </ScrollView>

        {/* Create List Modal */}
        <Modal
          visible={isCreateModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsCreateModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditMode ? 'Lista szerkesztése' : 'Új bevásárlólista'}
                </Text>
                <TouchableOpacity onPress={() => {
                  setIsCreateModalVisible(false);
                  setIsEditMode(false);
                  setEditingList(null);
                  setNewListName('');
                  setNewListProducts([]);
                  setNewListProductSearch('');
                }}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Lista neve"
                value={newListName}
                onChangeText={setNewListName}
              />

              {/* Product Search and Add Section */}
              <View style={styles.predefinedSection}>
                <View style={styles.predefinedHeader}>
                  <Text style={styles.predefinedTitle}>Termékek hozzáadása</Text>
                  <Text style={styles.productCountText}>
                    {newListProducts.length} termék kiválasztva
                  </Text>
                </View>
                
                {/* Category Filter */}
                <View style={styles.categoryFilter}>
                  <Text style={styles.categoryFilterTitle}>Kategória szűrő:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categoryGrid}>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryOption,
                            selectedCategory === category && styles.selectedCategoryOption
                          ]}
                          onPress={() => setSelectedCategory(category)}
                        >
                          <Text style={[
                            styles.categoryText,
                            selectedCategory === category && styles.selectedCategoryText
                          ]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Search Input */}
                <TextInput
                  style={styles.searchInput}
                  placeholder="Keresés termékek között..."
                  value={newListProductSearch}
                  onChangeText={setNewListProductSearch}
                />

                {/* Selected Products */}
                {newListProducts.length > 0 && (
                  <View style={styles.selectedProductsSection}>
                    <Text style={styles.selectedProductsTitle}>Kiválasztott termékek:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.selectedProductsGrid}>
                        {newListProducts.map((product) => (
                          <View key={product.id} style={styles.selectedProduct}>
                            <TouchableOpacity
                              style={styles.removeSelectedProduct}
                              onPress={() => removeProductFromNewList(product.id)}
                            >
                              <Ionicons name="close-circle" size={16} color="#EF4444" />
                            </TouchableOpacity>
                            <Text style={styles.selectedProductName}>{product.name}</Text>
                            <Text style={styles.selectedProductPrice}>{formatCurrency(product.price)}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Search Results */}
                {newListProductSearch.trim() !== '' && (
                  <View style={styles.searchResultsSection}>
                    {filteredNewListProducts.length > 0 ? (
                      <FlatList
                        data={filteredNewListProducts}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item: product }) => (
                          <TouchableOpacity
                            style={styles.searchResultItem}
                            onPress={() => addProductToNewList(product)}
                          >
                            <View style={styles.productInfo}>
                              <Text style={styles.productItemName}>{product.name}</Text>
                              <Text style={styles.productItemCategory}>{product.category}</Text>
                              <Text style={styles.productItemDetails}>
                                {product.unit} • {formatCurrency(product.price)}
                              </Text>
                            </View>
                            <Ionicons name="add-circle" size={24} color="#14B8A6" />
                          </TouchableOpacity>
                        )}
                        style={styles.searchResultsList}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                      />
                    ) : (
                      <View style={styles.noResultsState}>
                        <Text style={styles.noResultsText}>Nincs találat</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Quick suggestions when search is empty */}
                {newListProductSearch.trim() === '' && products.length > 0 && (
                  <View style={styles.quickSuggestionsSection}>
                    <Text style={styles.quickSuggestionsTitle}>
                      {selectedCategory === 'Összes' ? 'Javasolt termékek:' : `${selectedCategory} kategória:`}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.predefinedGrid}>
                        {filteredNewListProducts.map((product) => (
                          <TouchableOpacity
                            key={product.id}
                            style={styles.quickProduct}
                            onPress={() => addProductToNewList(product)}
                          >
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {products.length === 0 && (
                  <View style={styles.emptyProductsState}>
                    <Text style={styles.emptyProductsText}>
                      Termékek betöltése...
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.createButton}
                onPress={isEditMode ? updateShoppingList : createShoppingList}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name={isEditMode ? "save" : "add"} size={20} color="white" />
                    <Text style={styles.createButtonText}>
                      {isEditMode ? 'Lista mentése' : 'Lista létrehozása'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Shopping Mode Modal */}
        <Modal
          visible={isShoppingModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsShoppingModalVisible(false)}
        >
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.shoppingHeader}>
                <TouchableOpacity onPress={() => setIsShoppingModalVisible(false)}>
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.shoppingTitle}>{selectedList?.name}</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    style={styles.headerButton}
                    onPress={() => {
                      setProductSearchText(''); // Clear search when opening modal
                      setIsAddItemModalVisible(true);
                    }}
                  >
                    <Ionicons name="add" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.shoppingSummary}>
                <Text style={styles.summaryText}>
                  {selectedItems.filter(item => item.checked).length}/{selectedItems.length} termék
                </Text>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalText}>
                    {formatCurrency(
                      selectedItems.reduce((sum, item) => 
                        sum + ((item.price || 0) * (item.quantity || 1)), 0
                      )
                    )}
                  </Text>
                  <Text style={styles.totalSubtext}>
                    Becsült: {formatCurrency(
                      selectedItems.reduce((sum, item) => 
                        sum + ((item.price || 0) * (item.quantity || 1)), 0
                      )
                    )}
                  </Text>
                </View>
              </View>

              {/* Quick Add Products Section */}
              <View style={styles.predefinedSection}>
                <View style={styles.predefinedHeader}>
                  <Text style={styles.predefinedTitle}>Gyors hozzáadás</Text>
                  {products.length > 0 && (
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setShowPredefinedProducts(!showPredefinedProducts)}
                    >
                      <Text style={styles.toggleButtonText}>
                        {showPredefinedProducts ? 'Elrejt' : 'Mutat'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {products.length === 0 ? (
                  <View style={styles.emptyProductsState}>
                    <Text style={styles.emptyProductsText}>
                      Nincs elérhető termék az adatbázisban
                    </Text>
                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={loadData}
                    >
                      <Ionicons name="refresh" size={16} color="#14B8A6" />
                      <Text style={styles.refreshButtonText}>Újratöltés</Text>
                    </TouchableOpacity>
                  </View>
                ) : showPredefinedProducts && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={{ marginHorizontal: 20 }}
                  >
                    <View style={styles.predefinedGrid}>
                      {products.slice(0, 10).map((product) => (
                        <TouchableOpacity
                          key={product.id}
                          style={styles.quickProduct}
                          onPress={() => addProductToList(product)}
                        >
                          <Text style={styles.productName}>{product.name}</Text>
                          <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>

              <FlatList
                data={selectedItems}
                keyExtractor={(item) => item.id}
                renderItem={renderShoppingItem}
                style={styles.shoppingList}
                contentContainerStyle={styles.shoppingListContent}
              />

              <View style={styles.shoppingFooter}>
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={completeShoppingList}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.completeButtonText}>Bevásárlás befejezése</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Modal>

        {/* Add Item Modal */}
        <Modal
          visible={isAddItemModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsAddItemModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Termék hozzáadása</Text>
                <TouchableOpacity onPress={() => {
                  setIsAddItemModalVisible(false);
                  setProductSearchText('');
                }}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Quick Add from Database */}
              <View style={styles.quickAddSection}>
                <Text style={styles.sectionTitle}>Gyors hozzáadás terméklistából:</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Keresés termékek között..."
                  value={productSearchText}
                  onChangeText={setProductSearchText}
                />

                {productSearchText.trim() !== '' && (
                  <FlatList
                    data={filteredProducts.slice(0, 5)} // Limit to 5 results
                    keyExtractor={(item) => item.id}
                    renderItem={({ item: product }) => (
                      <TouchableOpacity
                        style={styles.quickAddProductItem}
                        onPress={() => {
                          addProductToList(product);
                          setIsAddItemModalVisible(false);
                          setProductSearchText('');
                        }}
                      >
                        <View style={styles.productInfo}>
                          <Text style={styles.productItemName}>{product.name}</Text>
                          <Text style={styles.productItemCategory}>{product.category}</Text>
                          <Text style={styles.productItemDetails}>
                            {product.unit} • {formatCurrency(product.price)}
                          </Text>
                        </View>
                        <Ionicons name="add-circle" size={24} color="#14B8A6" />
                      </TouchableOpacity>
                    )}
                    style={styles.quickAddResults}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>VAGY</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Manual Add */}
              <View style={styles.manualAddSection}>
                <Text style={styles.sectionTitle}>Kézi hozzáadás:</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Termék neve"
                  value={newItemName}
                  onChangeText={setNewItemName}
                />

                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Mennyiség"
                    value={newItemQuantity}
                    onChangeText={setNewItemQuantity}
                    keyboardType="numeric"
                  />
                  <View style={[styles.input, styles.halfInput, styles.pickerContainer]}>
                    <Text style={styles.pickerValue}>{newItemUnit}</Text>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Becsült ár (Ft)"
                  value={newItemPrice}
                  onChangeText={setNewItemPrice}
                  keyboardType="numeric"
                />

                <View style={[styles.input, styles.pickerContainer]}>
                  <Text style={styles.pickerValue}>{newItemCategory}</Text>
                </View>

                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={addItemToList}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.addItemButtonText}>Kézi hozzáadás</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  storeSelectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  storeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  storeOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  selectedStoreOption: {
    backgroundColor: '#14B8A6',
  },
  storeText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  selectedStoreText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listsSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  listsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listCount: {
    fontSize: 14,
    color: '#666',
  },
  listsContainer: {
    paddingVertical: 8,
  },
  listCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedListCard: {
    opacity: 0.7,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  completedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  listDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '500',
    marginBottom: 8,
  },
  listStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  listProgress: {
    fontSize: 12,
    color: '#666',
  },
  listTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  pickerContainer: {
    justifyContent: 'center',
  },
  pickerValue: {
    fontSize: 16,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addItemButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  addItemButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shoppingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  shoppingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  shoppingSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  totalText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  shoppingList: {
    flex: 1,
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
  },
  shoppingListContent: {
    padding: 16,
  },
  shoppingItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  checkedShoppingItem: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitleSection: {
    flex: 1,
    marginLeft: 12,
  },
  itemControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingLeft: 36, // Align with title (checkbox width + margin)
  },
  quantitySection: {
    flex: 1,
    marginRight: 16,
  },
  priceSection: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  checkedItemName: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  estimatedPrice: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '500',
  },
  actualPrice: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    width: 60,
    textAlign: 'center',
  },
  currencyText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  removeButton: {
    padding: 4,
  },
  shoppingFooter: {
    padding: 20,
  },
  completeButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  predefinedProduct: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: 'bold',
  },
  predefinedSection: {
    marginBottom: 16,
  },
  predefinedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  predefinedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#14B8A6',
    borderRadius: 6,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  predefinedGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  quickProduct: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 8,
    width: 100,
    borderWidth: 1,
    borderColor: '#14B8A6',
    alignItems: 'center',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  productItemCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productItemDetails: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '500',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 8,
  },
  emptyProductsState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyProductsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#14B8A6',
    gap: 4,
  },
  refreshButtonText: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '500',
  },
  debugInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  productCountText: {
    fontSize: 12,
    color: '#14B8A6',
    fontWeight: '500',
  },
  selectedProductsSection: {
    marginBottom: 16,
  },
  selectedProductsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedProductsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  selectedProduct: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    padding: 8,
    width: 100,
    borderWidth: 1,
    borderColor: '#14B8A6',
    alignItems: 'center',
    position: 'relative',
  },
  removeSelectedProduct: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 8,
    zIndex: 1,
  },
  selectedProductName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  selectedProductPrice: {
    fontSize: 10,
    color: '#14B8A6',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchResultsSection: {
    marginBottom: 16,
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noResultsState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  quickSuggestionsSection: {
    marginBottom: 16,
  },
  quickSuggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  listActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  categoryFilter: {
    marginBottom: 15,
  },
  categoryFilterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryOption: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedCategoryOption: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quantityButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'white',
    borderRadius: 4,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  quickAddSection: {
    marginBottom: 16,
  },
  manualAddSection: {
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  quickAddResults: {
    maxHeight: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickAddProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
});

export default ShoppingScreen;
