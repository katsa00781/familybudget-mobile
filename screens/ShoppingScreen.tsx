// Keep existing imports and code before the style fix...
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, ensureValidSession } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import processReceiptImageOCR, { addLearningExample, getLearningStats, addTestLearningData } from '../lib/receiptOCR_clean';

export default function ShoppingScreen() {
  // Auth context
  const { user } = useAuth();
  
  // Helper function to ensure valid session before API calls
  const withValidSession = async (operation: () => Promise<any>) => {
    try {
      const session = await ensureValidSession();
      if (!session) {
        Alert.alert('Hiba', 'A bejelentkezési munkamenet lejárt. Kérjük, jelentkezzen be újra.');
        return null;
      }
      return await operation();
    } catch (error) {
      console.error('Session validation error:', error);
      Alert.alert('Hiba', 'Hálózati kapcsolat hiba. Ellenőrizze az internetkapcsolatot.');
      return null;
    }
  };
  
  // Keep all existing state and functions as they are...
  const [activeTab, setActiveTab] = useState('new');
  const [newListName, setNewListName] = useState('');
  const [newItems, setNewItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({ name: '', quantity: 1, unit: 'db', price: 0, category: 'Egyéb' });
  const [lists, setLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [importJsonData, setImportJsonData] = useState('');
  const [importStoreName, setImportStoreName] = useState('');
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewStoreName, setPreviewStoreName] = useState('');
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // OCR szerkesztéshez
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [originalOCRResult, setOriginalOCRResult] = useState(null); // Eredeti OCR eredmény tárolása
  const [isEditModalVisible, setIsEditModalVisible] = useState(false); // Explicit flag a szerkesztő modalhoz
  
  // Helyi szerkesztési state-ek
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editUnit, setEditUnit] = useState('db');
  const [editPrice, setEditPrice] = useState('0');
  const [editCategory, setEditCategory] = useState('Egyéb');

  // Keep all existing functions and logic...
  useEffect(() => {
    if (user?.id) {
      loadShoppingLists();
      loadProducts();
    }
  }, [user?.id]);

  const loadShoppingLists = async () => {
    if (!user?.id) return;
    
    const result = await withValidSession(async () => {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user?.id)
        .eq('completed', false) // Csak aktív (nem befejezett) listák
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsedLists = data.map(list => ({
        ...list,
        items: typeof list.items === 'string' ? JSON.parse(list.items) : list.items
      }));

      setLists(parsedLists);
      return parsedLists;
    });

    if (result === null) {
      console.error('Failed to load shopping lists due to session issues');
    }
  };

  const loadProducts = async () => {
    const result = await withValidSession(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      // Deduplicate products by name
      const uniqueProducts = data.reduce((acc, product) => {
        const existing = acc.find(p => p.name.toLowerCase() === product.name.toLowerCase());
        if (!existing) {
          acc.push(product);
        }
        return acc;
      }, []);

      setProducts(uniqueProducts);
      return uniqueProducts;
    });

    if (result === null) {
      console.error('Failed to load products due to session issues');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([loadShoppingLists(), loadProducts()]).finally(() => {
      setRefreshing(false);
    });
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Suggestions for product name input
  const productSuggestions = products.filter(product =>
    currentItem.name.length > 0 && 
    product.name.toLowerCase().includes(currentItem.name.toLowerCase()) &&
    product.name.toLowerCase() !== currentItem.name.toLowerCase()
  ).slice(0, 5); // Csak az első 5 találat

  const selectProductFromSuggestion = (product) => {
    setCurrentItem({
      ...currentItem,
      name: product.name,
      unit: product.unit,
      price: product.price,
      category: product.category
    });
    setShowSuggestions(false);
  };

  const addItem = () => {
    if (!currentItem.name.trim()) {
      Alert.alert('Hiba', 'Kérjük, adja meg a termék nevét');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      ...currentItem,
      checked: false
    };

    setNewItems([...newItems, newItem]);
    setCurrentItem({ name: '', quantity: 1, unit: 'db', price: 0, category: 'Egyéb' });
  };

  const removeItem = (id) => {
    setNewItems(newItems.filter(item => item.id !== id));
  };

  const toggleItem = (id) => {
    setNewItems(newItems.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const saveList = async () => {
    if (!user?.id) {
      Alert.alert('Hiba', 'Nincs bejelentkezett felhasználó');
      return;
    }

    if (!newListName.trim()) {
      Alert.alert('Hiba', 'Kérjük, adja meg a lista nevét');
      return;
    }

    if (newItems.length === 0) {
      Alert.alert('Hiba', 'Kérjük, adjon hozzá legalább egy terméket');
      return;
    }

    try {
      const { error } = await supabase
        .from('shopping_lists')
        .insert({
          user_id: user?.id,
          name: newListName,
          items: JSON.stringify(newItems),
          total_amount: newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          completed: false // Tervezési fázis - még nem vásároltunk
        });

      if (error) throw error;

      setNewListName('');
      setNewItems([]);
      loadShoppingLists();
      Alert.alert('Siker', 'A lista sikeresen mentve!');
    } catch (error) {
      console.error('Error saving list:', error);
      Alert.alert('Hiba', 'Nem sikerült menteni a listát');
    }
  };

  const deleteList = async (id) => {
    Alert.alert(
      'Törlés megerősítése',
      'Biztosan törölni szeretné ezt a listát?',
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
                .eq('id', id);

              if (error) throw error;
              loadShoppingLists();
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Hiba', 'Nem sikerült törölni a listát');
            }
          }
        }
      ]
    );
  };

  const completeList = async (listId) => {
    Alert.alert(
      'Lista befejezése',
      'Befejezted a bevásárlást? A lista készre lesz jelölve.',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Kész',
          style: 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shopping_lists')
                .update({ completed: true })
                .eq('id', listId);

              if (error) throw error;

              loadShoppingLists();
              Alert.alert('Siker', 'A bevásárlás befejezve! Most feldolgozhatod a blokkot.');
            } catch (error) {
              console.error('Error completing list:', error);
              Alert.alert('Hiba', 'Nem sikerült befejezni a listát');
            }
          }
        }
      ]
    );
  };

  const addProductToList = (product) => {
    const newItem = {
      id: Date.now().toString(),
      name: product.name,
      quantity: 1,
      unit: product.unit || 'db',
      price: product.price || 0,
      category: product.category || 'Egyéb',
      checked: false
    };

    setNewItems([...newItems, newItem]);
    setIsProductModalVisible(false);
  };

  const importReceiptData = async (jsonData, storeName) => {
    if (!user?.id) {
      Alert.alert('Hiba', 'Nincs bejelentkezett felhasználó');
      return;
    }

    try {
      setIsLoading(true);
      const items = JSON.parse(jsonData);

      if (!Array.isArray(items)) {
        throw new Error('A JSON adat nem egy tömb');
      }

      const purchaseDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      let savedItems = 0;
      let updatedProducts = 0;

      // Minden terméket feldolgozunk
      for (const item of items) {
        const itemName = item.name || 'Névtelen termék';
        const itemQuantity = parseInt(item.quantity) || 1;
        const itemUnit = item.unit || 'db';
        const itemPrice = parseFloat(item.price) || 0;
        const itemCategory = item.category || 'Egyéb';
        const unitPrice = itemQuantity > 0 ? itemPrice / itemQuantity : itemPrice;

        try {
          // 1. Mentés shopping_statistics táblába (minden vásárlás külön rekord)
          const { error: statsError } = await supabase
            .from('shopping_statistics')
            .insert({
              user_id: user.id,
              shopping_date: purchaseDate,
              product_name: itemName,
              product_category: itemCategory,
              brand: null, // Ha van a JSON-ben, később hozzáadhatjuk
              store_name: storeName || 'Ismeretlen bolt',
              quantity: itemQuantity,
              unit: itemUnit,
              unit_price: unitPrice,
              total_price: itemPrice
            });

          if (statsError) {
            console.warn('Error saving to shopping_statistics:', statsError);
          } else {
            savedItems++;
          }

          // 2. Termék mentése/frissítése products táblában (legdrágább ár logikával)
          // Először lekérjük a meglévő terméket
          const { data: existingProduct, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('name', itemName)
            .eq('user_id', user.id)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.warn('Error fetching existing product:', fetchError);
            continue;
          }

          const productData = {
            user_id: user.id,
            name: itemName,
            category: itemCategory,
            unit: itemUnit,
            price: Math.round(unitPrice), // Egységár egészre kerekítve
            store_name: storeName || 'Ismeretlen bolt',
            last_seen_at: new Date().toISOString()
          };

          if (existingProduct) {
            // Ha létezik, csak akkor frissítjük, ha ez drágább
            if (unitPrice > (existingProduct.price || 0)) {
              const { error: updateError } = await supabase
                .from('products')
                .update({
                  price: Math.round(unitPrice),
                  store_name: storeName || existingProduct.store_name,
                  last_seen_at: new Date().toISOString()
                })
                .eq('id', existingProduct.id);

              if (updateError) {
                console.warn('Error updating product:', updateError);
              } else {
                updatedProducts++;
              }
            }
          } else {
            // Új termék beszúrása
            const { error: insertError } = await supabase
              .from('products')
              .insert(productData);

            if (insertError) {
              console.warn('Error inserting new product:', insertError);
            } else {
              updatedProducts++;
            }
          }

        } catch (itemError) {
          console.error('Error processing item:', itemName, itemError);
        }
      }

      // Termékek újratöltése hogy a felhasználó lássa az új termékeket
      loadProducts();
      setIsImportModalVisible(false);
      
      Alert.alert(
        'Sikeres feldolgozás!', 
        `Statisztika: ${savedItems} tétel mentve\nTermékek: ${updatedProducts} termék frissítve/hozzáadva\n\nMost már használhatod ezeket a termékeket a bevásárlólistáidban!`
      );
    } catch (error) {
      console.error('Error importing receipt data:', error);
      Alert.alert('Hiba', 'Nem sikerült importálni az adatokat: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const previewImportData = () => {
    try {
      const items = JSON.parse(importJsonData);
      
      if (!Array.isArray(items)) {
        throw new Error('A JSON adat nem egy tömb');
      }

      const formattedItems = items.map((item, index) => ({
        id: `${Date.now()}_${index}`,
        name: item.name || 'Névtelen termék',
        quantity: parseInt(item.quantity) || 1,
        unit: item.unit || 'db',
        price: parseFloat(item.price) || 0,
        category: item.category || 'Egyéb',
        checked: false
      }));

      setPreviewItems(formattedItems);
      setPreviewStoreName(importStoreName);
      setIsImportModalVisible(false);
      setIsPreviewModalVisible(true);
    } catch (error) {
      Alert.alert('Hiba', 'Érvénytelen JSON formátum');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hiba', 'Kamerához való hozzáférés szükséges');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      processReceiptImage(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hiba', 'Fotótárhoz való hozzáférés szükséges');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      processReceiptImage(result.assets[0].uri);
    }
  };

  const processReceiptImage = async (imageUri: string) => {
    try {
      setIsLoading(true);
      Alert.alert('OCR feldolgozás', 'Nyugta feldolgozása folyamatban...');
      
      const receiptData = await processReceiptImageOCR(imageUri);
      
      if (receiptData && receiptData.items.length > 0) {
        setOriginalOCRResult(receiptData); // Eredeti OCR eredmény tárolása
        setPreviewItems(receiptData.items);
        setPreviewStoreName(receiptData.store);
        setIsPreviewModalVisible(true);
        const storeInfo = receiptData.store ? ` (${receiptData.store})` : '';
        Alert.alert('Siker!', `${receiptData.items.length} termék felismerve a nyugtáról${storeInfo}`);
      } else {
        Alert.alert('Hiba', 'Nem sikerült termékeket felismerni a képről');
      }
    } catch (error) {
      console.error('OCR hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült feldolgozni a képet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Termék szerkesztése az OCR előnézetben
  const editPreviewItem = (item, index) => {
    console.log('🔧 Szerkesztés megkezdése:', item.name, 'index:', index);
    console.log('🔧 Teljes item:', JSON.stringify(item));
    console.log('🔍 Modal render check - isEditModalVisible ELŐTTE:', isEditModalVisible);
    
    // ELŐSZÖR bezárjuk a preview modal-t
    setIsPreviewModalVisible(false);
    
    setEditingItem({ ...item });
    setEditingItemIndex(index);
    
    // Helyi state-ek beállítása
    setEditName(item.name || '');
    setEditQuantity(item.quantity?.toString() || '1');
    setEditUnit(item.unit || 'db');
    setEditPrice(item.price?.toString() || '0');
    setEditCategory(item.category || 'Egyéb');
    
    // Kis delay után nyitjuk meg a szerkesztő modal-t
    setTimeout(() => {
      setIsEditModalVisible(true);
      console.log('🔧 Szerkesztő modal megnyitás delay után');
    }, 300);
    
    console.log('🔧 State-ek beállítva:');
    console.log('   editingItem:', { ...item });
    console.log('   editingItemIndex:', index);
    console.log('   editName:', item.name || '');
    console.log('   Preview modal bezárva, szerkesztő modal hamarosan nyílik');
  };

  // Szerkesztett termék mentése
  const saveEditedItem = () => {
    console.log('🔧 Termék mentése megkezdve');
    if (editingItemIndex >= 0 && editingItem) {
      const updatedItem = {
        ...editingItem,
        name: editName,
        quantity: parseInt(editQuantity) || 1,
        unit: editUnit,
        price: parseFloat(editPrice) || 0,
        category: editCategory
      };
      
      const updatedItems = [...previewItems];
      updatedItems[editingItemIndex] = updatedItem;
      setPreviewItems(updatedItems);
      
      // State-ek törlése
      setEditingItem(null);
      setEditingItemIndex(-1);
      setIsEditModalVisible(false);
      setEditName('');
      setEditQuantity('1');
      setEditUnit('db');
      setEditPrice('0');
      setEditCategory('Egyéb');
      
      // Vissza a preview modal-hoz
      setTimeout(() => {
        setIsPreviewModalVisible(true);
        console.log('🔧 Termék mentve, visszatérés a preview modal-hoz');
      }, 300);
      
      console.log('🔧 Termék sikeresen mentve');
    }
  };

  // Szerkesztés megszakítása
  const cancelEditItem = () => {
    console.log('🔧 Szerkesztés megszakítása');
    setEditingItem(null);
    setEditingItemIndex(-1);
    setIsEditModalVisible(false);
    setEditName('');
    setEditQuantity('1');
    setEditUnit('db');
    setEditPrice('0');
    setEditCategory('Egyéb');
    
    // Vissza a preview modal-hoz
    setTimeout(() => {
      setIsPreviewModalVisible(true);
      console.log('🔧 Visszatérés a preview modal-hoz');
    }, 300);
  };

  // Bevásárlási statisztikák lekérése
  const getShoppingStats = async () => {
    if (!user?.id) {
      return {
        totalLists: 0,
        totalItems: 0,
        totalAmount: 0,
        mostBoughtItems: [],
        averageListValue: 0,
        storeFrequency: {},
        categoryStats: {}
      };
    }

    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      const parsedLists = data.map(list => ({
        ...list,
        items: typeof list.items === 'string' ? JSON.parse(list.items) : list.items
      }));

      // Statisztikák számítása
      const totalLists = parsedLists.length;
      let totalItems = 0;
      let totalAmount = 0;
      const itemFrequency = {};
      const storeFrequency = {};
      const categoryStats = {};

      parsedLists.forEach(list => {
        totalAmount += list.total_amount || 0;
        
        // Bolt gyakoriság (ha van store név a lista nevében)
        const listName = list.name || '';
        const storeNames = ['TESCO', 'ALDI', 'LIDL', 'CBA', 'PENNY', 'AUCHAN', 'SPAR'];
        storeNames.forEach(store => {
          if (listName.toUpperCase().includes(store)) {
            storeFrequency[store] = (storeFrequency[store] || 0) + 1;
          }
        });

        if (list.items && Array.isArray(list.items)) {
          list.items.forEach(item => {
            totalItems++;
            
            // Termék gyakoriság
            const itemName = item.name || 'Ismeretlen';
            itemFrequency[itemName] = (itemFrequency[itemName] || 0) + (item.quantity || 1);
            
            // Kategória statisztikák
            const category = item.category || 'Egyéb';
            if (!categoryStats[category]) {
              categoryStats[category] = { count: 0, totalValue: 0 };
            }
            categoryStats[category].count += (item.quantity || 1);
            categoryStats[category].totalValue += ((item.price || 0) * (item.quantity || 1));
          });
        }
      });

      // Leggyakoribb termékek (top 10)
      const mostBoughtItems = Object.entries(itemFrequency)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count: count as number }));

      const averageListValue = totalLists > 0 ? Math.round(totalAmount / totalLists) : 0;

      return {
        totalLists,
        totalItems,
        totalAmount: Math.round(totalAmount),
        mostBoughtItems,
        averageListValue,
        storeFrequency,
        categoryStats
      };
    } catch (error) {
      console.error('❌ Hiba a bevásárlási statisztikák lekérésekor:', error);
      throw error;
    }
  };

  // Tanulási statisztikák megjelenítése
  const showLearningStats = async () => {
    try {
      console.log('🔍 Statisztikák lekérése indítása...');
      const stats = await getLearningStats();
      console.log('📊 Statisztikák lekérve:', stats);
      
      const { totalExamples, recentExamples, commonCorrections } = stats;
      
      let message = `📊 Tanulási statisztikák:\n\n`;
      message += `🔢 Összes példa: ${totalExamples}\n\n`;
      
      if (recentExamples.length > 0) {
        message += `📋 Legutóbbi példák:\n`;
        recentExamples.forEach((example, index) => {
          const originalName = example.original?.items?.[0]?.name || 'N/A';
          const correctedName = example.corrected?.items?.[0]?.name || 'N/A';
          message += `${index + 1}. ${originalName} → ${correctedName}\n`;
        });
        message += `\n`;
      }
      
      const correctionEntries = Object.entries(commonCorrections);
      if (correctionEntries.length > 0) {
        message += `🔧 Gyakori javítások:\n`;
        correctionEntries.forEach(([correction, count]) => {
          message += `${correction} (${count}x)\n`;
        });
      } else if (totalExamples === 0) {
        message += `📝 Még nincsenek tanulási példák.\n\n`;
        message += `💡 Próbáld ki: Használj OCR-t egy nyugtán, majd szerkeszd a felismert termékeket!`;
      } else {
        message += `📝 Még nincsenek gyakori javítások.`;
      }
      
      Alert.alert('📚 Tanulási Statisztikák', message, [
        { text: 'OK', style: 'default' },
        { 
          text: '🧪 Teszt adatok', 
          style: 'default',
          onPress: async () => {
            await addTestLearningData();
            Alert.alert('Siker', 'Teszt tanulási adatok hozzáadva!');
          }
        }
      ]);
    } catch (error) {
      console.error('❌ Hiba a statisztikák lekérésekor:', error);
      Alert.alert('Hiba', `Nem sikerült betölteni a statisztikákat:\n${error.message}`);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const response = await fetch(file.uri);
        const jsonData = await response.text();
        setImportJsonData(jsonData);
        setIsImportModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Hiba', 'Nem sikerült betölteni a fájlt');
    }
  };

  const updateListItem = async (listId, itemId, updates) => {
    try {
      const list = lists.find(l => l.id === listId);
      if (!list) return;

      const updatedItems = list.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );

      const { error } = await supabase
        .from('shopping_lists')
        .update({
          items: JSON.stringify(updatedItems),
          total_amount: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        })
        .eq('id', listId);

      if (error) throw error;
      loadShoppingLists();
    } catch (error) {
      console.error('Error updating list item:', error);
    }
  };

  // Render functions
  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => addProductToList(item)}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDetails}>
          {item.category} • {item.price}Ft/{item.unit}
        </Text>
      </View>
      <Ionicons name="add-circle" size={24} color="#667eea" />
    </TouchableOpacity>
  );

  const renderNewListItem = ({ item }) => (
    <View style={styles.listItem}>
      <TouchableOpacity
        style={styles.itemCheckbox}
        onPress={() => toggleItem(item.id)}
      >
        <Ionicons
          name={item.checked ? "checkbox" : "square-outline"}
          size={24}
          color={item.checked ? "#667eea" : "#999"}
        />
      </TouchableOpacity>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, item.checked && styles.checkedItem]}>
          {item.name}
        </Text>
        <Text style={styles.itemDetails}>
          {item.quantity} {item.unit} • {item.price}Ft • {item.category}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeItem(item.id)}
      >
        <Ionicons name="trash" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  const renderSavedList = ({ item: list }) => (
    <View style={[styles.savedListContainer, list.completed && styles.completedListContainer]}>
      <View style={styles.listHeader}>
        <View style={styles.listHeaderContent}>
          <Text style={[styles.listTitle, list.completed && styles.completedListTitle]}>
            {list.completed ? '✅ ' : ''}{list.name}
          </Text>
          <Text style={styles.listDate}>
            {new Date(list.created_at).toLocaleDateString('hu-HU')}
            {list.completed && ' • Befejezve'}
          </Text>
          <Text style={styles.listTotal}>
            Összesen: {list.total_amount}Ft
          </Text>
        </View>
        <View style={styles.listActions}>
          {!list.completed && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => completeList(list.id)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteList(list.id)}
          >
            <Ionicons name="trash" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Lista elemek map-pel, nem FlatList-tel a görgethetőség miatt */}
      {list.items.map((item, index) => (
        <View key={`${list.id}-${index}`} style={styles.savedListItem}>
          <TouchableOpacity
            style={styles.itemCheckbox}
            onPress={() => updateListItem(list.id, item.id, { checked: !item.checked })}
          >
            <Ionicons
              name={item.checked ? "checkbox" : "square-outline"}
              size={20}
              color={item.checked ? "#667eea" : "rgba(255, 255, 255, 0.7)"}
            />
          </TouchableOpacity>
          <View style={styles.itemInfo}>
            <Text style={[styles.savedItemName, item.checked && styles.checkedItem]}>
              {item.name}
            </Text>
            <Text style={styles.savedItemDetails}>
              {item.quantity} {item.unit} • {item.price}Ft
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  // Render new list tab
  const renderNewListTab = () => (
    <ScrollView 
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.newListHeader}>
        <TextInput
          style={styles.listNameInput}
          value={newListName}
          onChangeText={setNewListName}
          placeholder="Lista neve..."
          placeholderTextColor="rgba(255, 255, 255, 0.6)"
        />
      </View>

      <View style={styles.addItemContainer}>
        <View style={styles.productInputContainer}>
          <TextInput
            style={styles.itemInput}
            value={currentItem.name}
            onChangeText={(text) => {
              setCurrentItem({...currentItem, name: text});
              setShowSuggestions(text.length > 0);
            }}
            onFocus={() => setShowSuggestions(currentItem.name.length > 0)}
            onBlur={() => {
              // Késleltetett elrejtés, hogy a suggestion-re lehessen kattintani
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder="Termék neve..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
          />
          
          {/* Product Suggestions Dropdown */}
          {showSuggestions && productSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {productSuggestions.map((product, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => selectProductFromSuggestion(product)}
                >
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionName}>{product.name}</Text>
                    <Text style={styles.suggestionDetails}>
                      {product.category} • {product.price} Ft/{product.unit}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.itemDetailsRow}>
          <TextInput
            style={styles.quantityInput}
            value={currentItem.quantity.toString()}
            onChangeText={(text) => setCurrentItem({...currentItem, quantity: parseInt(text) || 1})}
            placeholder="Db"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.unitInput}
            value={currentItem.unit}
            onChangeText={(text) => setCurrentItem({...currentItem, unit: text})}
            placeholder="Egység"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
          />
          <TextInput
            style={styles.priceInput}
            value={currentItem.price.toString()}
            onChangeText={(text) => setCurrentItem({...currentItem, price: parseFloat(text) || 0})}
            placeholder="Ár"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addItem}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Hozzáadás</Text>
        </TouchableOpacity>
      </View>

      {/* Termékek listája - map használata FlatList helyett a ScrollView-ban */}
      <View style={styles.itemsList}>
        {newItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyText}>Még nincsenek termékek a listában</Text>
          </View>
        ) : (
          newItems.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <TouchableOpacity
                style={styles.itemCheckbox}
                onPress={() => toggleItem(item.id)}
              >
                <Ionicons
                  name={item.checked ? "checkbox" : "square-outline"}
                  size={24}
                  color={item.checked ? "#667eea" : "#999"}
                />
              </TouchableOpacity>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, item.checked && styles.checkedItem]}>
                  {item.name}
                </Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} {item.unit} • {item.price}Ft • {item.category}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeItem(item.id)}
              >
                <Ionicons name="trash" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.actionButtons}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setIsImportModalVisible(true)}
          >
            <Ionicons name="download" size={20} color="white" />
            <Text style={styles.buttonText}>Import</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={showLearningStats}
          >
            <Ionicons name="stats-chart" size={20} color="white" />
            <Text style={styles.buttonText}>Statisztika</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setIsProductModalVisible(true)}
          >
            <Ionicons name="cube" size={20} color="white" />
            <Text style={styles.buttonText}>Termékek</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={takePhoto}
          >
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.buttonText}>Fotó</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={pickFromGallery}
          >
            <Ionicons name="images" size={20} color="white" />
            <Text style={styles.buttonText}>Fotótár</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={saveList}
          >
            <Ionicons name="save" size={20} color="white" />
            <Text style={styles.buttonText}>Mentés</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  // Render lists tab
  const renderListsTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={lists}
        keyExtractor={item => item.id.toString()}
        renderItem={renderSavedList}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="white"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent} // Tartalom stílus hozzáadása
        removeClippedSubviews={false} // Jobb görgetés biztosítása
        initialNumToRender={10} // Több elem renderelése egyszerre
        maxToRenderPerBatch={5}
        windowSize={10}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyText}>Még nincsenek mentett listák</Text>
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
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Ionicons name="basket" size={24} color="white" />
            </View>
            <Text style={styles.headerTitle}>Bevásárlás</Text>
          </View>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('hu-HU', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </Text>
        </View>

        {/* Tab navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'new' && styles.activeTab]}
            onPress={() => setActiveTab('new')}
          >
            <Ionicons 
              name="add-circle-outline" 
              size={20} 
              color={activeTab === 'new' ? '#667eea' : 'rgba(255, 255, 255, 0.6)'} 
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
              color={activeTab === 'lists' ? '#667eea' : 'rgba(255, 255, 255, 0.6)'} 
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
              color={activeTab === 'products' ? '#667eea' : 'rgba(255, 255, 255, 0.6)'} 
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
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.modalContainer}
          >
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Termékek</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsProductModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
                <TextInput
                  style={styles.searchInput}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Termék keresése..."
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.modalContent}>
                <FlatList
                  data={filteredProducts}
                  keyExtractor={item => item.id}
                  renderItem={renderProduct}
                  style={styles.productsList}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Modal>

        {/* Import modal */}
        <Modal
          visible={isImportModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>JSON Import</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsImportModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.importContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Üzlet neve (opcionális)</Text>
                <TextInput
                  style={styles.storeNameInput}
                  value={importStoreName}
                  onChangeText={setImportStoreName}
                  placeholder="pl. Tesco, Lidl..."
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>JSON adatok</Text>
                <TextInput
                  style={styles.jsonInput}
                  value={importJsonData}
                  onChangeText={setImportJsonData}
                  placeholder='[{"name":"Termék","quantity":1,"unit":"db","price":100,"category":"Kategória"}]'
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={8}
                />
              </View>

              <View style={styles.importButtons}>
                <TouchableOpacity
                  style={styles.fileButton}
                  onPress={pickDocument}
                >
                  <Ionicons name="document" size={20} color="white" />
                  <Text style={styles.buttonText}>Fájl választása</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={previewImportData}
                  disabled={!importJsonData}
                >
                  <Ionicons name="eye" size={20} color="white" />
                  <Text style={styles.buttonText}>Előnézet</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Preview modal */}
        <Modal
          visible={isPreviewModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {previewStoreName ? `${previewStoreName} - Előnézet` : 'Import előnézet'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsPreviewModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.previewInfo}>
              {previewItems.length} termék • Összesen: {previewItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}Ft
            </Text>

            <FlatList
              data={previewItems}
              renderItem={({ item, index }) => (
                <View style={styles.previewItem}>
                  <View style={styles.previewItemInfo}>
                    <Text style={styles.previewItemName}>{item.name}</Text>
                    <Text style={styles.previewItemDetail}>
                      <Text style={styles.previewDetailLabel}>Mennyiség: </Text>
                      {item.quantity} {item.unit}
                    </Text>
                    <Text style={styles.previewItemDetail}>
                      <Text style={styles.previewDetailLabel}>Ár: </Text>
                      {item.price}Ft
                    </Text>
                    <Text style={styles.previewItemDetail}>
                      <Text style={styles.previewDetailLabel}>Kategória: </Text>
                      {item.category || 'Egyéb'}
                    </Text>
                    <Text style={styles.previewItemDetail}>
                      <Text style={styles.previewDetailLabel}>Egység: </Text>
                      {item.unit || 'db'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.editPreviewButton}
                    onPress={() => editPreviewItem(item, index)}
                  >
                    <Ionicons name="create-outline" size={20} color="#8B5FBF" />
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
              style={styles.previewList}
              showsVerticalScrollIndicator={false}
            />
            
            <View style={styles.previewButtonsContainer}>
              <TouchableOpacity 
                style={[styles.previewButton, styles.previewCancelButton]}
                onPress={() => {
                  setIsPreviewModalVisible(false);
                  setIsImportModalVisible(true); // Vissza az import modalhoz
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#666" />
                <Text style={styles.previewCancelButtonText}>Szerkesztés</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.previewButton, styles.previewConfirmButton]}
                onPress={async () => {
                  // Ha van eredeti OCR eredmény és módosítás történt, tanuljunk belőle
                  if (originalOCRResult && JSON.stringify(originalOCRResult.items) !== JSON.stringify(previewItems)) {
                    const correctedResult = {
                      items: previewItems,
                      total: previewItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                      date: originalOCRResult.date,
                      store: previewStoreName
                    };
                    await addLearningExample(originalOCRResult, correctedResult);
                    console.log('📚 Felhasználói javítás hozzáadva a tanulási példákhoz');
                    
                    // Debug info
                    const stats = await getLearningStats();
                    console.log('📊 Tanulási statisztikák:', stats);
                  }
                  
                  const jsonData = JSON.stringify(previewItems);
                  importReceiptData(jsonData, previewStoreName);
                  setIsPreviewModalVisible(false);
                  setImportJsonData('');
                  setImportStoreName('');
                  setPreviewItems([]);
                  setPreviewStoreName('');
                  setOriginalOCRResult(null); // Eredeti eredmény törlése
                }}
              >
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.previewConfirmButtonText}>Mentés</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Edit Item Modal */}
        <Modal
          visible={isEditModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Termék szerkesztése</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  console.log('🔧 Modal bezárás');
                  cancelEditItem();
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

              {editingItem ? (
                <ScrollView style={styles.editForm}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Termék neve</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editName}
                      onChangeText={(text) => {
                        console.log('📝 Név változtatás:', text);
                        setEditName(text);
                      }}
                      placeholder="Termék neve"
                      autoFocus={true}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                      <Text style={styles.label}>Mennyiség</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editQuantity}
                        onChangeText={(text) => {
                          console.log('📊 Mennyiség változtatás:', text);
                          setEditQuantity(text);
                        }}
                        placeholder="1"
                        keyboardType="numeric"
                        returnKeyType="next"
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                      <Text style={styles.label}>Egység</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editUnit}
                        onChangeText={(text) => {
                          console.log('📏 Egység változtatás:', text);
                          setEditUnit(text);
                        }}
                        placeholder="db"
                        returnKeyType="next"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Ár (Ft)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editPrice}
                      onChangeText={(text) => {
                        console.log('💰 Ár változtatás:', text);
                        setEditPrice(text);
                      }}
                      placeholder="0"
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Kategória</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editCategory}
                      onChangeText={(text) => {
                        console.log('🏷️ Kategória változtatás:', text);
                        setEditCategory(text);
                      }}
                      placeholder="Egyéb"
                      returnKeyType="done"
                    />
                  </View>

                  <View style={styles.editButtonsContainer}>
                    <TouchableOpacity 
                      style={[styles.editButton, styles.editCancelButton]}
                      onPress={cancelEditItem}
                    >
                      <Text style={styles.editCancelButtonText}>Mégse</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.editButton, styles.editSaveButton]}
                      onPress={saveEditedItem}
                    >
                      <Text style={styles.editSaveButtonText}>Mentés</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text>Betöltés...</Text>
                </View>
              )}
            </SafeAreaView>
        </Modal>

        {/* Loading overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Feldolgozás...</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#667eea',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20, // Alsó padding hozzáadása
  },
  flatListContent: {
    paddingBottom: 20, // Extra padding alul
    flexGrow: 1, // Tartalom növekedésének biztosítása
  },
  // New list styles
  newListHeader: {
    marginBottom: 20,
  },
  listNameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  addItemContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  itemInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: 'white',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  itemDetailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quantityInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  unitInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  priceInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  addButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  itemsList: {
    marginBottom: 20,
    marginTop: 10,
    // flex és height eltávolítva a ScrollView használat miatt
  },
  listItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20, // Nagyobb padding
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12, // Nagyobb margin
    minHeight: 70, // Minimum magasság biztosítása
  },
  itemCheckbox: {
    marginRight: 16, // Nagyobb margin
    padding: 4, // Touch target növelése
  },
  itemInfo: {
    flex: 1,
    paddingVertical: 4, // Vertikális padding hozzáadása
  },
  itemName: {
    fontSize: 17, // Nagyobb betűméret
    fontWeight: '600',
    color: 'white',
    marginBottom: 6, // Nagyobb margin
    lineHeight: 22, // Sor magasság hozzáadása
  },
  itemDetails: {
    fontSize: 15, // Nagyobb betűméret
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20, // Sor magasság hozzáadása
  },
  checkedItem: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  removeButton: {
    padding: 12, // Nagyobb touch target
    marginLeft: 8, // Kis margin hozzáadása
  },
  actionButtons: {
    gap: 12,
    marginBottom: 20,
    marginTop: 10, // Kis felső margin hozzáadása
    flexShrink: 0, // Ne zsugorodjon be
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Saved lists styles
  savedListContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    minHeight: 120, // Minimum magasság biztosítása
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20, // Nagyobb padding
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 80, // Minimum magasság a fejléchez
  },
  listHeaderContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  listDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  listTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  deleteButton: {
    padding: 8,
  },
  savedListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16, // Nagyobb padding
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    minHeight: 60, // Minimum magasság biztosítása minden elemhez
  },
  savedItemName: {
    fontSize: 16,
    color: 'white',
    marginBottom: 4, // Kis margin növelése
    fontWeight: '500', // Font súly hozzáadása
  },
  savedItemDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18, // Sor magasság hozzáadása
  },
  // Products styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    marginLeft: 12,
  },
  productsList: {
    flex: 1,
  },
  productItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  closeButton: {
    padding: 8,
  },
  importContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  storeNameInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  jsonInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 120,
    textAlignVertical: 'top',
  },
  importButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  fileButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Preview modal styles
  previewInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  previewList: {
    flex: 1,
  },
  previewItem: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  previewItemInfo: {
    flex: 1,
  },
  previewItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewItemDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewDetailLabel: {
    fontWeight: '600',
    color: '#333',
  },
  previewButtonsContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  previewCancelButton: {
    backgroundColor: '#f0f0f0',
  },
  previewCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  previewConfirmButton: {
    backgroundColor: '#4CAF50',
  },
  previewConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Common styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  // Product suggestions styles
  productInputContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1001,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  suggestionDetails: {
    fontSize: 14,
    color: '#666',
  },
  // Edit preview button
  editPreviewButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 95, 191, 0.1)',
    marginLeft: 12,
  },
  // Edit form styles
  editForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#8B5FBF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#333',
    minHeight: 44,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    paddingVertical: 20,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  editCancelButton: {
    backgroundColor: 'rgba(102, 102, 102, 0.1)',
    borderWidth: 1,
    borderColor: '#666',
  },
  editSaveButton: {
    backgroundColor: '#8B5FBF',
  },
  editCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  editSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedListContainer: {
    opacity: 0.7,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  completedListTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
