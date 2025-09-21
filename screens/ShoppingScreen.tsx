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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

export default function ShoppingScreen() {
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

  // Keep all existing functions and logic...
  useEffect(() => {
    loadShoppingLists();
    loadProducts();
  }, []);

  const loadShoppingLists = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
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

      console.log(`Loaded ${data.length} products, deduplicated to ${uniqueProducts.length}`);
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
          name: newListName,
          items: JSON.stringify(newItems),
          total_price: newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
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
          name: listName,
          items: JSON.stringify(formattedItems),
          total_price: formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
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
      // Itt implementálhatjuk az OCR funkciót
      Alert.alert('Fejlesztés alatt', 'A szövegfelismerés funkció hamarosan elérhető');
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
          total_price: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
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
    <View style={styles.savedListContainer}>
      <View style={styles.listHeader}>
        <View style={styles.listHeaderContent}>
          <Text style={styles.listTitle}>{list.name}</Text>
          <Text style={styles.listDate}>
            {new Date(list.created_at).toLocaleDateString('hu-HU')}
          </Text>
          <Text style={styles.listTotal}>
            Összesen: {list.total_price}Ft
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteList(list.id)}
        >
          <Ionicons name="trash" size={20} color="#ff4444" />
        </TouchableOpacity>
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
            onPress={takePhoto}
          >
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.buttonText}>Fotó</Text>
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
              renderItem={({ item }) => (
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
                onPress={() => {
                  const jsonData = JSON.stringify(previewItems);
                  importReceiptData(jsonData, previewStoreName);
                  setIsPreviewModalVisible(false);
                  setImportJsonData('');
                  setImportStoreName('');
                  setPreviewItems([]);
                  setPreviewStoreName('');
                }}
              >
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.previewConfirmButtonText}>Mentés</Text>
              </TouchableOpacity>
            </View>
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
});
