import 'react-native-get-random-values';
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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import processReceiptImage, { ReceiptData, ReceiptItem } from '../lib/receiptOCR';

// Types
interface Product {
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

interface ShoppingList {
  id: string;
  user_id: string;
  name: string;
  date: string;
  total_amount: number;
  items: ReceiptItem[];
  completed: boolean;
  created_at: string;
  updated_at: string;
}

const ShoppingScreen: React.FC = () => {
  const { user } = useAuth();
  
  // State variables
  const [products, setProducts] = useState<Product[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('db');
  const [newItemCategory, setNewItemCategory] = useState('Egyéb');
  const [listName, setListName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState(false);
  const [isShoppingModalVisible, setIsShoppingModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ReceiptItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'lists' | 'products'>('new');

  // Categories
  const categories = [
    'Tejtermékek', 'Pékáruk', 'Húsáruk', 'Zöldség-Gyümölcs',
    'Édesség', 'Ital', 'Háztartás', 'Egyéb'
  ];

  // Load data on component mount
  useEffect(() => {
    if (user) {
      loadProducts();
      loadShoppingLists();
    }
  }, [user]);

  // Generate unique ID
  const generateId = () => {
    return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  };

  // Load products
  const loadProducts = async () => {
    if (!user) return;

    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const transformedProducts: Product[] = (productsData || []).map(product => ({
        id: product.id,
        user_id: product.user_id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        price: product.price,
        description: product.description,
        created_at: product.created_at,
        updated_at: product.updated_at
      }));

      setProducts(transformedProducts);
    } catch (error) {
      console.error('Termékek betöltési hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült betölteni a termékeket');
    }
  };

  // Load shopping lists
  const loadShoppingLists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedLists = (data || []).map(list => ({
        id: list.id,
        user_id: list.user_id,
        name: list.name,
        date: list.date,
        total_amount: list.total_amount || 0,
        items: parseListItems(list.items),
        completed: list.completed || false,
        created_at: list.created_at,
        updated_at: list.updated_at
      }));

      setShoppingLists(transformedLists);
    } catch (error) {
      console.error('Listák betöltési hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült betölteni a listákat');
    }
  };

  // Parse list items from JSON string
  const parseListItems = (itemsString: string): ReceiptItem[] => {
    try {
      if (!itemsString) return [];
      
      const parsed = JSON.parse(itemsString);
      if (!Array.isArray(parsed)) return [];
      
      return parsed.map((item, index) => ({
        id: item.id || generateId(),
        name: item.name || 'Ismeretlen termék',
        quantity: item.quantity || 1,
        unit: item.unit || 'db',
        price: item.price || 0,
        category: item.category || 'Egyéb',
        checked: item.checked || false
      }));
    } catch (error) {
      console.error('Lista elemek parse hiba:', error);
      return [];
    }
  };

  // Create shopping list
  const createShoppingList = async () => {
    if (!user || !listName.trim()) {
      Alert.alert('Hiba', 'Kérjük, adjon meg nevet a listának!');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Hiba', 'A lista nem lehet üres!');
      return;
    }

    setIsLoading(true);
    try {
      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const listData = {
        user_id: user.id,
        name: listName.trim(),
        date: new Date().toISOString().split('T')[0],
        total_amount: totalAmount,
        items: JSON.stringify(items),
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([listData])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Siker',
        `"${listName}" bevásárlólista mentve!\nTermékek: ${items.length} db\nÖsszesen: ${totalAmount.toLocaleString('hu-HU')} Ft`,
        [
          {
            text: 'OK',
            onPress: () => {
              setListName('');
              setItems([]);
              loadShoppingLists();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Lista mentési hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült menteni a listát: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add item to current list
  const addItemToList = () => {
    if (!newItemName.trim()) {
      Alert.alert('Hiba', 'A termék neve kötelező!');
      return;
    }

    const newItem: ReceiptItem = {
      id: generateId(),
      name: newItemName.trim(),
      quantity: parseInt(newItemQuantity) || 1,
      unit: newItemUnit,
      price: parseFloat(newItemPrice) || 0,
      category: newItemCategory,
      checked: false
    };

    setItems([...items, newItem]);
    
    // Reset form
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQuantity('1');
    setNewItemUnit('db');
    setNewItemCategory('Egyéb');
  };

  // Remove item from list
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Toggle item check
  const toggleItemCheck = (itemId: string) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ));
  };

  // Update item price
  const updateItemPrice = (itemId: string, price: number) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, price } : item
    ));
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  // Add product to new list
  const addProductToList = (product: Product, quantity: number = 1) => {
    const newItem: ReceiptItem = {
      id: generateId(),
      name: product.name,
      quantity,
      unit: product.unit,
      price: product.price,
      category: product.category,
      checked: false
    };

    setItems([...items, newItem]);
    setIsProductModalVisible(false);
  };

  // Take receipt photo
  const takeReceiptPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Hiba', 'Kamera engedély szükséges!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processReceipt(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Kamera hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült a kép készítése');
    }
  };

  // Process receipt image
  const processReceipt = async (imageUri: string) => {
    setIsLoading(true);
    try {
      console.log('Receipt feldolgozás kezdése...');
      const receiptData = await processReceiptImage(imageUri);
      
      if (receiptData.items.length > 0) {
        // Import items to current list
        const importedItems = receiptData.items.map(item => ({
          ...item,
          id: generateId(),
          checked: false
        }));
        
        setItems([...items, ...importedItems]);
        
        Alert.alert(
          'Siker',
          `${receiptData.items.length} termék importálva a blokkról!\nÜzlet: ${receiptData.store || 'Ismeretlen'}\nÖsszesen: ${receiptData.total.toLocaleString('hu-HU')} Ft`
        );
      } else {
        Alert.alert('Figyelem', 'Nem sikerült termékeket felismerni a blokkon');
      }
    } catch (error) {
      console.error('Receipt feldolgozási hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült feldolgozni a blokkot');
    } finally {
      setIsLoading(false);
      setIsReceiptModalVisible(false);
    }
  };

  // Select shopping list for shopping mode
  const selectShoppingList = (list: ShoppingList) => {
    setSelectedList(list);
    setSelectedItems([...list.items]);
    setIsShoppingModalVisible(true);
  };

  // Toggle item in shopping mode
  const toggleShoppingItem = (itemId: string) => {
    setSelectedItems(selectedItems.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ));
  };

  // Complete shopping
  const completeShoppingList = async () => {
    if (!selectedList || !user) return;

    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ 
          completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedList.id)
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Siker', 'Bevásárlás befejezve!');
      setIsShoppingModalVisible(false);
      loadShoppingLists();
    } catch (error) {
      console.error('Befejezési hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült befejezni a bevásárlást');
    }
  };

  // Delete shopping list
  const deleteShoppingList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', user?.id);

      if (error) throw error;

      loadShoppingLists();
      Alert.alert('Siker', 'Lista törölve');
    } catch (error) {
      console.error('Törlési hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült törölni a listát');
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(), loadShoppingLists()]);
    setRefreshing(false);
  }, [user]);

  // Render item
  const renderItem = ({ item }: { item: ReceiptItem }) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity 
        style={[styles.itemCheckbox, item.checked && styles.itemChecked]}
        onPress={() => toggleItemCheck(item.id)}
      >
        {item.checked && <Ionicons name="checkmark" size={16} color="white" />}
      </TouchableOpacity>
      
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
          {item.name}
        </Text>
        <Text style={styles.itemDetails}>
          {item.quantity} {item.unit} • {item.category}
        </Text>
      </View>
      
      <View style={styles.itemActions}>
        <Text style={styles.itemPrice}>
          {(item.price * item.quantity).toLocaleString('hu-HU')} Ft
        </Text>
        <TouchableOpacity onPress={() => removeItem(item.id)}>
          <Ionicons name="trash-outline" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render product
  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productItem}
      onPress={() => addProductToList(item)}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDetails}>
          {item.category} • {item.unit} • {item.price.toLocaleString('hu-HU')} Ft
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
    </TouchableOpacity>
  );

  // Render shopping list
  const renderShoppingList = ({ item }: { item: ShoppingList }) => (
    <View style={[styles.listItem, item.completed && styles.listItemCompleted]}>
      <TouchableOpacity 
        style={styles.listContent}
        onPress={() => selectShoppingList(item)}
      >
        <View>
          <Text style={styles.listName}>{item.name}</Text>
          <Text style={styles.listDetails}>
            {item.items.length} termék • {item.date} • {item.total_amount.toLocaleString('hu-HU')} Ft
          </Text>
        </View>
        {item.completed && (
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            'Lista törlése',
            `Biztosan törölni szeretné a "${item.name}" listát?`,
            [
              { text: 'Mégse', style: 'cancel' },
              { text: 'Törlés', style: 'destructive', onPress: () => deleteShoppingList(item.id) }
            ]
          );
        }}
      >
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  // Render new list tab
  const renderNewListTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* List name input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Lista neve</Text>
        <TextInput
          style={styles.textInput}
          value={listName}
          onChangeText={setListName}
          placeholder="Bevásárlólista neve..."
          placeholderTextColor="#999"
        />
      </View>

      {/* Add item form */}
      <View style={styles.addItemContainer}>
        <Text style={styles.sectionTitle}>Új termék hozzáadása</Text>
        
        <View style={styles.inputRow}>
          <View style={[styles.inputContainer, { flex: 2 }]}>
            <Text style={styles.label}>Termék neve</Text>
            <TextInput
              style={styles.textInput}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Termék neve..."
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
            <Text style={styles.label}>Ár (Ft)</Text>
            <TextInput
              style={styles.textInput}
              value={newItemPrice}
              onChangeText={setNewItemPrice}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.label}>Mennyiség</Text>
            <TextInput
              style={styles.textInput}
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              placeholder="1"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
            <Text style={styles.label}>Egység</Text>
            <TextInput
              style={styles.textInput}
              value={newItemUnit}
              onChangeText={setNewItemUnit}
              placeholder="db"
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={[styles.inputContainer, { flex: 2, marginLeft: 10 }]}>
            <Text style={styles.label}>Kategória</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    newItemCategory === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setNewItemCategory(category)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    newItemCategory === category && styles.categoryButtonTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addItemToList}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Hozzáadás</Text>
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.productButton]}
          onPress={() => setIsProductModalVisible(true)}
        >
          <Ionicons name="list" size={20} color="white" />
          <Text style={styles.actionButtonText}>Termékek</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.receiptButton]}
          onPress={() => setIsReceiptModalVisible(true)}
        >
          <Ionicons name="camera" size={20} color="white" />
          <Text style={styles.actionButtonText}>Blokk</Text>
        </TouchableOpacity>
      </View>

      {/* Current list items */}
      {items.length > 0 && (
        <View style={styles.currentListContainer}>
          <Text style={styles.sectionTitle}>
            Jelenlegi lista ({items.length} termék)
          </Text>
          <Text style={styles.totalAmount}>
            Összesen: {totalAmount.toLocaleString('hu-HU')} Ft
          </Text>
          
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            style={styles.itemsList}
          />
          
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={createShoppingList}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="white" />
                <Text style={styles.saveButtonText}>Lista mentése</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  // Render lists tab
  const renderListsTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={shoppingLists}
        renderItem={renderShoppingList}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Még nincsenek bevásárlólistáid</Text>
          </View>
        }
      />
    </View>
  );

  // Render products tab
  const renderProductsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Termék keresése..."
          placeholderTextColor="#999"
        />
      </View>
      
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Még nincsenek mentett termékeid</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4CAF50', '#45a049']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🛒 Bevásárlás</Text>
      </LinearGradient>

      {/* Tab navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
          onPress={() => setActiveTab('new')}
        >
          <Ionicons 
            name="add-circle-outline" 
            size={20} 
            color={activeTab === 'new' ? '#4CAF50' : '#999'} 
          />
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
            Új lista
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'lists' && styles.activeTab]}
          onPress={() => setActiveTab('lists')}
        >
          <Ionicons 
            name="list-outline" 
            size={20} 
            color={activeTab === 'lists' ? '#4CAF50' : '#999'} 
          />
          <Text style={[styles.tabText, activeTab === 'lists' && styles.activeTabText]}>
            Listáim
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.activeTab]}
          onPress={() => setActiveTab('products')}
        >
          <Ionicons 
            name="cube-outline" 
            size={20} 
            color={activeTab === 'products' ? '#4CAF50' : '#999'} 
          />
          <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
            Termékek
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      {activeTab === 'new' && renderNewListTab()}
      {activeTab === 'lists' && renderListsTab()}
      {activeTab === 'products' && renderProductsTab()}

      {/* Product selection modal */}
      <Modal
        visible={isProductModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Termékek hozzáadása</Text>
            <TouchableOpacity onPress={() => setIsProductModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Termék keresése..."
              placeholderTextColor="#999"
            />
          </View>
          
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={item => item.id}
            style={styles.modalList}
          />
        </SafeAreaView>
      </Modal>

      {/* Receipt capture modal */}
      <Modal
        visible={isReceiptModalVisible}
        animationType="slide"
        transparent
      >
        <View style={styles.receiptModalContainer}>
          <View style={styles.receiptModalContent}>
            <Text style={styles.receiptModalTitle}>Blokk beolvasása</Text>
            <Text style={styles.receiptModalText}>
              Válassz egy opciót a blokk beolvasásához
            </Text>
            
            <TouchableOpacity 
              style={styles.receiptModalButton}
              onPress={takeReceiptPhoto}
            >
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.receiptModalButtonText}>Fénykép készítése</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.receiptModalButton, styles.receiptModalButtonSecondary]}
              onPress={() => setIsReceiptModalVisible(false)}
            >
              <Text style={styles.receiptModalButtonTextSecondary}>Mégse</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shopping mode modal */}
      <Modal
        visible={isShoppingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Bevásárlás: {selectedList?.name}
            </Text>
            <TouchableOpacity onPress={() => setIsShoppingModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.shoppingProgress}>
            <Text style={styles.shoppingProgressText}>
              {selectedItems.filter(item => item.checked).length} / {selectedItems.length} termék
            </Text>
          </View>
          
          <FlatList
            data={selectedItems}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.shoppingItem, item.checked && styles.shoppingItemChecked]}
                onPress={() => toggleShoppingItem(item.id)}
              >
                <View style={[styles.itemCheckbox, item.checked && styles.itemChecked]}>
                  {item.checked && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} {item.unit} • {(item.price * item.quantity).toLocaleString('hu-HU')} Ft
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
            style={styles.modalList}
          />
          
          <TouchableOpacity 
            style={styles.completeButton}
            onPress={completeShoppingList}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.completeButtonText}>Bevásárlás befejezése</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Feldolgozás...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  addItemContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
    gap: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 5,
  },
  productButton: {
    backgroundColor: '#2196F3',
  },
  receiptButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  currentListContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  itemsList: {
    maxHeight: 300,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 15,
    gap: 5,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 15,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemCompleted: {
    opacity: 0.7,
  },
  listContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  listDetails: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  productItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalList: {
    flex: 1,
    padding: 15,
  },
  receiptModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    alignItems: 'center',
  },
  receiptModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  receiptModalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  receiptModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
    width: '100%',
  },
  receiptModalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  receiptModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  receiptModalButtonTextSecondary: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  shoppingProgress: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shoppingProgressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  shoppingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shoppingItemChecked: {
    opacity: 0.7,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    margin: 15,
    borderRadius: 8,
    gap: 5,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
});

export default ShoppingScreen;
