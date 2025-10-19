// Keep existing imports and code before the style fix...
import React, { useState, useEffect, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
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
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { processReceiptImage, addLearningExample, getLearningStats, addTestLearningData, ReceiptData } from '../lib/receiptOCR_clean';

// Fix kategóriák listája
const PRODUCT_CATEGORIES = [
  'Egyéb',
  'Tejtermékek',
  'Hús és hal', 
  'Zöldség és gyümölcs',
  'Pékáruk',
  'Fagyasztott termékek',
  'Konzerv és üveges',
  'Szárazáruk és tészták',
  'Üdítők',
  'Alkoholos italok',
  'Édességek és snack',
  'Háztartási cikkek',
  'Tisztálkodási szerek',
  'Gyógyszer és egészség',
  'Bébiápolás',
  'Kisállat ellátás'
];

export default function ShoppingScreen() {
  // Navigation and route
  const route = useRoute();
  
  // Auth context
  const { user } = useAuth();
  
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
  
  // Termék név javaslatok state-ek
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Keep all existing functions and logic...
  useEffect(() => {
    if (user?.id) {
      loadShoppingLists();
      loadProducts();
    }
  }, [user?.id]);

  // OCR adatok kezelése navigáció esetén
  useEffect(() => {
    const params = route.params as any;
    const ocrData = params?.ocrData;
    const capturedImageUri = params?.capturedImageUri;
    
    console.log('🔍 Route params check:', { 
      ocrData: !!ocrData, 
      capturedImageUri: !!capturedImageUri,
      params: JSON.stringify(params)
    });
    
    if (ocrData) {
      console.log('📊 OCR adatok érkeztek navigációból:', ocrData);
      setOriginalOCRResult(ocrData);
      setPreviewItems(ocrData.items);
      setPreviewStoreName(ocrData.store || '');
      
      // Modal megjelenítése kis delay-jel a navigáció után
      setTimeout(() => {
        console.log('🎭 Modal megjelenítése 500ms delay után');
        setIsPreviewModalVisible(true);
        console.log('🎭 OCR előnézet modal megnyitva navigációból');
      }, 500);
    }
  }, [route.params]);

  const loadShoppingLists = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsedLists = data.map(list => ({
        ...list,
        items: typeof list.items === 'string' ? JSON.parse(list.items) : list.items
      }));

      setLists(parsedLists);
    } catch (error) {
      console.error('Error loading shopping lists:', error);
      Alert.alert('Hiba', 'Nem sikerült betölteni a bevásárló listákat');
    }
  };

  const loadProducts = async () => {
    try {
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
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Hiba', 'Nem sikerült betölteni a termékeket');
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
          total_amount: newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
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

      const formattedItems = items.map((item, index) => ({
        id: `${Date.now()}_${index}`,
        name: item.name || 'Névtelen termék',
        quantity: parseInt(item.quantity) || 1,
        unit: item.unit || 'db',
        price: parseFloat(item.price) || 0,
        category: item.category || 'Egyéb',
        checked: false
      }));

      // Automatikusan mentjük a listát
      const listName = storeName ? `${storeName} - ${new Date().toLocaleDateString('hu-HU')}` : `Importált lista - ${new Date().toLocaleDateString('hu-HU')}`;

      const { error } = await supabase
        .from('shopping_lists')
        .insert({
          user_id: user?.id,
          name: listName,
          items: JSON.stringify(formattedItems),
          total_amount: formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        });

      if (error) throw error;

      // Termékek mentése az adatbázisba
      for (const item of formattedItems) {
        const { error: productError } = await supabase
          .from('products')
          .upsert({
            name: item.name,
            category: item.category,
            unit: item.unit,
            price: item.price
          }, {
            onConflict: 'name'
          });

        if (productError) {
          console.warn('Error saving product:', productError);
        }
      }

      loadShoppingLists();
      loadProducts();
      setIsImportModalVisible(false);
      Alert.alert('Siker', `A ${listName} lista sikeresen importálva!`);
    } catch (error) {
      console.error('Error importing receipt data:', error);
      Alert.alert('Hiba', 'Nem sikerült importálni az adatokat');
    } finally {
      setIsLoading(false);
    }
  };

  // Függvény a hasonló terméknevek kereséséhez
  const findSimilarProducts = async (productName) => {
    if (!user?.id || !productName || productName.length < 2) return [];

    try {
      const { data: existingProducts } = await supabase
        .from('products')
        .select('name, category, unit, price')
        .eq('user_id', user.id);

      if (!existingProducts) return [];

      // Hasonlóság alapú szűrés
      const similar = existingProducts.filter(product => {
        const name1 = productName.toLowerCase().trim();
        const name2 = product.name.toLowerCase().trim();
        
        // Egyezés vizsgálat különböző módszerekkel
        return (
          name2.includes(name1) || 
          name1.includes(name2) ||
          calculateSimilarity(name1, name2) > 0.6
        );
      });

      // Egyedi nevek visszaadása, csökkenő hasonlóság szerint rendezve
      const uniqueProducts = Array.from(
        new Map(similar.map(p => [p.name, p])).values()
      );
      
      return uniqueProducts.slice(0, 5); // Max 5 javaslat
    } catch (error) {
      console.error('Hiba a hasonló termékek keresésekor:', error);
      return [];
    }
  };

  // Egyszerű hasonlóság számítás (Levenshtein távolság alapú)
  const calculateSimilarity = (str1, str2) => {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
  };

  // OCR eredmények teljes feldolgozása
  const processOCRResults = async (ocrItems, storeName) => {
    if (!user?.id) {
      Alert.alert('Hiba', 'Nincs bejelentkezett felhasználó');
      return;
    }

    try {
      setIsLoading(true);
      
      // OCR elemek feldolgozása hasonló termékek keresésével
      const formattedItems = [];
      
      for (let index = 0; index < ocrItems.length; index++) {
        const item = ocrItems[index];
        const productName = item.name || 'Névtelen termék';
        
        // Hasonló termékek keresése a már létező adatbázisban
        const similarProducts = await findSimilarProducts(productName);
        
        // Ha van hasonló termék, használjuk az első találat nevét és adatait
        let standardizedName = productName;
        let standardizedCategory = item.category || 'Egyéb';
        let standardizedUnit = item.unit || 'db';
        
        if (similarProducts.length > 0) {
          const bestMatch = similarProducts[0];
          standardizedName = bestMatch.name;
          standardizedCategory = bestMatch.category || item.category || 'Egyéb';
          standardizedUnit = bestMatch.unit || item.unit || 'db';
          
          console.log(`🔗 Hasonló termék találat: "${productName}" -> "${standardizedName}"`);
        }
        
        formattedItems.push({
          id: `ocr_${Date.now()}_${index}`,
          name: standardizedName,
          originalName: productName, // Eredeti OCR név megőrzése
          quantity: parseInt(item.quantity) || 1,
          unit: standardizedUnit,
          price: parseFloat(item.price) || 0,
          category: standardizedCategory,
          checked: true, // OCR eredmények alapértelmezetten kipipálva (megvásárolt)
          similarProducts: similarProducts // Javaslatok tárolása a szerkesztéshez
        });
      }

      // 1. Hozzáadás a jelenlegi lista elemeihez
      setNewItems(prevItems => [...prevItems, ...formattedItems]);

      // 2. Termékek mentése az adatbázisba (ha még nincsenek)
      console.log('💾 Termékek mentése az adatbázisba...');
      for (const item of formattedItems) {
        try {
          const { error: productError } = await supabase
            .from('products')
            .upsert({
              name: item.name,
              category: item.category,
              unit: item.unit,
              price: item.price,
              user_id: user.id // Felhasználóhoz kapcsolás
            }, {
              onConflict: 'name,user_id'
            });

          if (productError) {
            console.warn('⚠️ Termék mentési hiba:', productError);
          } else {
            console.log('✅ Termék mentve:', item.name);
          }
        } catch (productError) {
          console.warn('⚠️ Termék mentési kivétel:', productError);
        }
      }

      // 3. Vásárlási statisztikák készítése (termékenkénti bontásban)
      const receiptDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formátum
      
      console.log('📊 Vásárlási statisztikák mentése...');
      const statisticsRecords = formattedItems.map(item => ({
        user_id: user.id,
        shopping_date: receiptDate,
        product_name: item.name,
        product_category: item.category,
        store_name: storeName || 'Ismeretlen bolt',
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }));

      try {
        const { error: statsError } = await supabase
          .from('shopping_statistics')
          .insert(statisticsRecords);

        if (statsError) {
          console.warn('⚠️ Statisztika mentési hiba:', statsError);
        } else {
          console.log('✅ Vásárlási statisztikák mentve:', statisticsRecords.length, 'termék');
        }
      } catch (statsError) {
        console.warn('⚠️ Statisztika mentési kivétel:', statsError);
      }

      // 4. Termékár történet frissítése (inflációkövetéshez)
      console.log('📈 Termékár történet frissítése...');
      const priceHistoryRecords = formattedItems.map(item => ({
        user_id: user.id,
        product_name: item.name,
        normalized_name: item.name.toLowerCase().replace(/\s+/g, '_'),
        category: item.category,
        unit: item.unit,
        price: item.price,
        store_name: storeName || 'Ismeretlen bolt',
        purchase_date: receiptDate
      }));

      try {
        const { error: priceHistoryError } = await supabase
          .from('product_price_history')
          .insert(priceHistoryRecords);

        if (priceHistoryError) {
          console.warn('⚠️ Árhistória mentési hiba:', priceHistoryError);
        } else {
          console.log('✅ Termékár történet frissítve:', priceHistoryRecords.length, 'termék');
        }
      } catch (priceHistoryError) {
        console.warn('⚠️ Árhistória mentési kivétel:', priceHistoryError);
      }

      // 5. Termékadatbázis és listák frissítése
      await loadProducts();
      
      const totalAmount = formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      Alert.alert(
        'Siker!', 
        `${formattedItems.length} termék hozzáadva és feldolgozva!\n` +
        `💰 Összesen: ${totalAmount.toLocaleString('hu-HU')} Ft\n` +
        `🏪 Bolt: ${storeName || 'Ismeretlen'}\n` +
        `📊 Statisztikák és árhistória frissítve`
      );

    } catch (error) {
      console.error('❌ OCR eredmény feldolgozási hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült feldolgozni az OCR eredményeket');
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
      processReceiptImageLocal(result.assets[0].uri);
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
      processReceiptImageLocal(result.assets[0].uri);
    }
  };

  const processReceiptImageLocal = async (imageUri: string) => {
    try {
      setIsLoading(true);
      Alert.alert('OCR feldolgozás', 'Nyugta feldolgozása folyamatban...');
      
      const receiptData: ReceiptData = await processReceiptImage(imageUri);
      
      if (receiptData && receiptData.items.length > 0) {
        console.log('🔍 OCR eredmény feldolgozás kezdése...');
        setOriginalOCRResult(receiptData); // Eredeti OCR eredmény tárolása
        console.log('✅ Original OCR result set');
        
        setPreviewItems(receiptData.items);
        console.log('✅ Preview items set:', receiptData.items.length, 'items');
        
        setPreviewStoreName(receiptData.store);
        console.log('✅ Preview store name set:', receiptData.store);
        
        setIsPreviewModalVisible(true);
        console.log('🎭 Preview modal visible = TRUE');
        
        console.log(`✅ OCR eredmény: ${receiptData.items.length} termék felismerve (${receiptData.store})`);
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

  // Bevásárlási statisztikák lekérése (adatbázisból)
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
      // Adatbázisból lekérjük a shopping_statistics adatokat
      const { data, error } = await supabase
        .from('shopping_statistics')
        .select('*')
        .eq('user_id', user?.id)
        .order('shopping_date', { ascending: false });

      if (error) throw error;

      console.log('📊 ShoppingScreen statisztika adatok betöltve:', data?.length || 0, 'tétel');

      if (!data || data.length === 0) {
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

      // Termékenkénti összesítés mennyiség alapján
      const itemFrequency = {};
      let totalItems = 0;
      let totalAmount = 0;
      const uniqueLists = new Set();
      const storeFrequency = {};
      const categoryStats = {};

      data.forEach(item => {
        // Lista számlálás
        uniqueLists.add(item.shopping_list_id);
        
        // Összegek
        totalAmount += item.total_price || 0;
        totalItems += item.quantity || 0;

        // Termék gyakoriság (mennyiség alapján, nem ár alapján!)
        const itemName = item.product_name || 'Ismeretlen';
        itemFrequency[itemName] = (itemFrequency[itemName] || 0) + (item.quantity || 0);

        // Kategória statisztikák
        const category = item.product_category || 'Egyéb';
        if (!categoryStats[category]) {
          categoryStats[category] = { count: 0, totalValue: 0 };
        }
        categoryStats[category].count += (item.quantity || 0);
        categoryStats[category].totalValue += (item.total_price || 0);
      });

      const totalLists = uniqueLists.size;

      // Leggyakoribb termékek (mennyiség szerint, nem ár szerint!)
      const mostBoughtItems = Object.entries(itemFrequency)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      const averageListValue = totalLists > 0 ? Math.round(totalAmount / totalLists) : 0;

      // Debug információ
      console.log('📊 ShoppingScreen adatbázis statisztika debug:');
      console.log('- Total items (mennyiség alapján):', totalItems);
      console.log('- Item frequency sample:', Object.entries(itemFrequency).slice(0, 3));
      console.log('- Most bought (top 3):', mostBoughtItems.slice(0, 3));

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
  };  // Tanulási statisztikák megjelenítése
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

  const completeShoppingList = async (listId) => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ completed: true })
        .eq('id', listId);

      if (error) throw error;

      Alert.alert('Siker', 'Bevásárlás befejezve!');
      loadShoppingLists();
    } catch (error) {
      console.error('Error completing shopping list:', error);
      Alert.alert('Hiba', 'Nem sikerült befejezni a bevásárlást');
    }
  };

  const renderSavedList = ({ item: list }) => {
    const completedItems = list.items.filter(item => item.checked).length;
    const totalItems = list.items.length;
    const isCompleted = list.completed;

    return (
      <View style={[styles.savedListContainer, isCompleted && styles.completedListContainer]}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderContent}>
            <Text style={styles.listTitle}>
              {list.name}
              {isCompleted && <Text style={styles.completedBadge}> ✅</Text>}
            </Text>
            <Text style={styles.listDate}>
              {new Date(list.created_at).toLocaleDateString('hu-HU')}
            </Text>
            <Text style={styles.listTotal}>
              Összesen: {list.total_amount}Ft
            </Text>
            <Text style={styles.listProgress}>
              Haladás: {completedItems}/{totalItems} termék
            </Text>
          </View>
          <View style={styles.listActions}>
            {!isCompleted && completedItems > 0 && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => completeShoppingList(list.id)}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
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
              onPress={() => !isCompleted && updateListItem(list.id, item.id, { checked: !item.checked })}
              disabled={isCompleted}
            >
              <Ionicons
                name={item.checked ? "checkbox" : "square-outline"}
                size={20}
                color={item.checked ? "#667eea" : "rgba(255, 255, 255, 0.7)"}
              />
            </TouchableOpacity>
            <View style={styles.itemInfo}>
              <Text style={[styles.savedItemName, item.checked && styles.checkedItem, isCompleted && styles.completedItemName]}>
                {item.name}
              </Text>
              <Text style={[styles.savedItemDetails, isCompleted && styles.completedItemDetails]}>
                {item.quantity} {item.unit} • {item.price}Ft
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

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

        {/* Kategória választás badge-ekkel */}
        <View style={styles.categorySection}>
          <Text style={styles.categorySectionTitle}>Kategória</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollView}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {PRODUCT_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  currentItem.category === category && styles.selectedCategoryChip
                ]}
                onPress={() => setCurrentItem({...currentItem, category: category})}
              >
                <Text style={[
                  styles.categoryChipText,
                  currentItem.category === category && styles.selectedCategoryChipText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
                  
                  // OCR elemek feldolgozása és mentése
                  await processOCRResults(previewItems, previewStoreName);
                  
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
                    <View style={styles.productInputContainer}>
                      <TextInput
                        style={styles.textInput}
                        value={editName}
                        onChangeText={async (text) => {
                          console.log('📝 Név változtatás:', text);
                          setEditName(text);
                          
                          // Javaslatok keresése, ha legalább 2 karakter van
                          if (text.length >= 2) {
                            const suggestions = await findSimilarProducts(text);
                            setNameSuggestions(suggestions);
                            setShowNameSuggestions(suggestions.length > 0);
                          } else {
                            setShowNameSuggestions(false);
                            setNameSuggestions([]);
                          }
                        }}
                        onFocus={() => {
                          // Ha van név és van javaslat, mutassuk meg
                          if (editName.length >= 2 && nameSuggestions.length > 0) {
                            setShowNameSuggestions(true);
                          }
                        }}
                        placeholder="Termék neve"
                        autoFocus={true}
                        returnKeyType="next"
                      />
                      
                      {/* Termék név javaslatok */}
                      {showNameSuggestions && nameSuggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                          {nameSuggestions.map((product, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.suggestionItem}
                              onPress={() => {
                                setEditName(product.name);
                                setEditCategory(product.category || editCategory);
                                setEditUnit(product.unit || editUnit);
                                if (product.price > 0) {
                                  setEditPrice(product.price.toString());
                                }
                                setShowNameSuggestions(false);
                                console.log('✅ Javaslat kiválasztva:', product.name);
                              }}
                            >
                              <View style={styles.suggestionContent}>
                                <Text style={styles.suggestionName}>{product.name}</Text>
                                <Text style={styles.suggestionDetails}>
                                  {product.category} • {product.price > 0 ? `${product.price} Ft/` : ''}{product.unit}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            style={[styles.suggestionItem, { backgroundColor: 'rgba(0,0,0,0.05)' }]}
                            onPress={() => setShowNameSuggestions(false)}
                          >
                            <Text style={styles.suggestionDetails}>Bezárás</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
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
                    <View style={styles.categoryBadgesContainer}>
                      {PRODUCT_CATEGORIES.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryBadge,
                            editCategory === category && styles.selectedCategoryBadge
                          ]}
                          onPress={() => {
                            console.log('🏷️ Kategória kiválasztva:', category);
                            setEditCategory(category);
                          }}
                        >
                          <Text style={[
                            styles.categoryBadgeText,
                            editCategory === category && styles.selectedCategoryBadgeText
                          ]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
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
  pickerContainer: {
    borderWidth: 2,
    borderColor: '#8B5FBF',
    borderRadius: 8,
    backgroundColor: 'white',
    overflow: 'hidden',
    minHeight: 50,
    marginVertical: 4,
  },
  picker: {
    height: 50,
    backgroundColor: 'white',
    color: '#333',
    fontSize: 16,
  },
  pickerItem: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  categoryPickerContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  categoryPickerWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  categoryPicker: {
    height: 44,
    color: 'white',
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
  // Completed shopping list styles
  completedListContainer: {
    opacity: 0.7,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  completedBadge: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  listProgress: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedItemName: {
    opacity: 0.7,
  },
  completedItemDetails: {
    opacity: 0.7,
  },
  // Category badge styles
  categoryBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 95, 191, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 95, 191, 0.3)',
    marginBottom: 8,
    marginRight: 8,
  },
  selectedCategoryBadge: {
    backgroundColor: '#8B5FBF',
    borderColor: '#8B5FBF',
  },
  categoryBadgeText: {
    fontSize: 14,
    color: '#8B5FBF',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedCategoryBadgeText: {
    color: 'white',
    fontWeight: '600',
  },
  // New list category styles
  categorySection: {
    marginVertical: 15,
  },
  categorySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  categoryScrollView: {
    maxHeight: 100,
  },
  categoryScrollContent: {
    paddingHorizontal: 4,
    alignItems: 'flex-start',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginRight: 10,
    minWidth: 60,
  },
  selectedCategoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'white',
  },
  categoryChipText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedCategoryChipText: {
    color: '#667eea',
    fontWeight: '600',
  },
});
