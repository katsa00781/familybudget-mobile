import React, { useState, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
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
}

export default function ShoppingScreen() {
  const { user } = useAuth();
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [selectedItems, setSelectedItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isShoppingModalVisible, setIsShoppingModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedStore, setSelectedStore] = useState('Tesco');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Mock adatok a kategóriákhoz
  const categoryData = [
    {
      name: 'Pékáruk',
      count: 15,
      items: [
        { id: '1', name: 'Fehér kenyér', price: 250 },
        { id: '2', name: 'Teljes kiőrlésű kenyér', price: 320 },
        { id: '3', name: 'Croissant', price: 180 },
      ]
    },
    {
      name: 'Tejtermékek',
      count: 22,
      items: [
        { id: '4', name: 'Tej 2.8%', price: 350 },
        { id: '5', name: 'Joghurt natúr', price: 200 },
        { id: '6', name: 'Trappista sajt', price: 800 },
      ]
    },
    {
      name: 'Hús és hal',
      count: 18,
      items: [
        { id: '7', name: 'Csirkemell', price: 1200 },
        { id: '8', name: 'Sertéskaraj', price: 900 },
        { id: '9', name: 'Lazac filé', price: 2500 },
      ]
    }
  ];

  // Gyakori termékek
  const frequentProducts = [
    { id: '1', name: 'Tej', price: 350 },
    { id: '2', name: 'Kenyér', price: 250 },
    { id: '3', name: 'Tojás', price: 400 },
    { id: '4', name: 'Vaj', price: 500 },
    { id: '5', name: 'Sajt', price: 800 },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Mock data for development
        const mockData: ShoppingList[] = [
          {
            id: '1',
            user_id: 'mock-user-id',
            name: 'Heti nagybevásárlás',
            date: '2025-01-15',
            items: [
              { id: '1', name: 'Kenyér', quantity: 2, unit: 'db', price: 450, category: 'Pékáru', checked: false },
              { id: '2', name: 'Tej', quantity: 1, unit: 'liter', price: 350, category: 'Tejtermék', checked: false },
              { id: '3', name: 'Alma', quantity: 1, unit: 'kg', price: 400, category: 'Gyümölcs', checked: false },
            ],
            total_amount: 1200,
            completed: false,
            created_at: '2025-01-15T10:00:00Z',
          },
          {
            id: '2',
            user_id: 'mock-user-id',
            name: 'Tisztítószerek',
            date: '2025-01-14',
            items: [
              { id: '4', name: 'Mosogatószer', quantity: 1, unit: 'db', price: 800, category: 'Háztartási cikk', checked: false },
              { id: '5', name: 'WC papír', quantity: 8, unit: 'tekercs', price: 1200, category: 'Háztartási cikk', checked: false },
            ],
            total_amount: 2000,
            completed: false,
            created_at: '2025-01-14T15:30:00Z',
          },
        ];

        setShoppingLists(mockData);
      } catch (error) {
        console.error('Error loading shopping lists:', error);
        Alert.alert('Hiba', 'Nem sikerült betölteni a listákat');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const createShoppingList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Hiba', 'Kérlek add meg a lista nevét!');
      return;
    }

    try {
      setIsLoading(true);
      
      const newList: ShoppingList = {
        id: Date.now().toString(),
        user_id: 'mock-user-id',
        name: newListName.trim(),
        date: new Date().toISOString().split('T')[0],
        items: [],
        total_amount: 0,
        completed: false,
        created_at: new Date().toISOString(),
      };

      setShoppingLists(prev => [newList, ...prev]);
      setNewListName('');
      setIsCreateModalVisible(false);
      
      Alert.alert('Siker', 'A bevásárlólista sikeresen létrehozva!');
      
    } catch (error) {
      console.error('Error creating shopping list:', error);
      Alert.alert('Hiba', 'Nem sikerült létrehozni a listát');
    } finally {
      setIsLoading(false);
    }
  };

  const selectShoppingList = (list: ShoppingList) => {
    setSelectedList(list);
    setSelectedItems(list.items.map(item => ({ ...item })));
    setIsShoppingModalVisible(true);
  };

  const toggleItemCheck = (itemId: string) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, checked: !item.checked }
          : item
      )
    );
  };

  const updateItemPrice = (itemId: string, price: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, price }
          : item
      )
    );
  };

  const completeShoppingList = () => {
    if (!selectedList) return;

    const updatedList = {
      ...selectedList,
      items: selectedItems,
      total_amount: selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      completed: selectedItems.every(item => item.checked)
    };

    setShoppingLists(prev => 
      prev.map(list => 
        list.id === selectedList.id ? updatedList : list
      )
    );

    setIsShoppingModalVisible(false);
    setSelectedList(null);
    
    Alert.alert('Siker', 'Bevásárlás befejezve!');
  };

  const renderStoreOption = (store: string, icon: string) => (
    <TouchableOpacity
      key={store}
      style={[
        styles.storeOption,
        selectedStore === store && styles.selectedStoreOption
      ]}
      onPress={() => setSelectedStore(store)}
    >
      <Ionicons name={icon as any} size={24} color={selectedStore === store ? 'white' : '#14B8A6'} />
      <Text style={[
        styles.storeText,
        selectedStore === store && styles.selectedStoreText
      ]}>
        {store}
      </Text>
    </TouchableOpacity>
  );

  const renderCategorySection = (categoryData: any) => (
    <View key={categoryData.name} style={styles.categorySection}>
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={() => toggleCategory(categoryData.name)}
      >
        <Text style={styles.categoryName}>{categoryData.name}</Text>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryCount}>{categoryData.count}</Text>
          <Ionicons 
            name={expandedCategories.includes(categoryData.name) ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>
      </TouchableOpacity>
      
      {expandedCategories.includes(categoryData.name) && (
        <View style={styles.categoryItems}>
          {categoryData.items.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              style={styles.categoryItem}
              onPress={() => addProductToList(item)}
            >
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price} Ft</Text>
              <Ionicons name="add-circle" size={24} color="#14B8A6" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderFrequentProduct = (product: any) => (
    <TouchableOpacity
      key={product.id}
      style={styles.frequentProduct}
      onPress={() => addProductToList(product)}
    >
      <View style={styles.productImage}>
        <Ionicons name="cube" size={24} color="#14B8A6" />
      </View>
      <Text style={styles.productName}>{product.name}</Text>
      <Text style={styles.productPrice}>{product.price} Ft</Text>
    </TouchableOpacity>
  );

  const renderShoppingListItem = ({ item: list }: { item: ShoppingList }) => (
    <TouchableOpacity
      style={[styles.listCard, list.completed && styles.completedListCard]}
      onPress={() => selectShoppingList(list)}
    >
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{list.name}</Text>
        {list.completed && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="white" />
            <Text style={styles.completedText}>Kész</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.listDate}>{new Date(list.date).toLocaleDateString('hu-HU')}</Text>
      
      <View style={styles.listStats}>
        <Text style={styles.listProgress}>
          {list.items.filter(item => item.checked).length}/{list.items.length} termék
        </Text>
        <Text style={styles.listTotal}>
          {list.total_amount.toLocaleString()} Ft
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderShoppingItem = ({ item }: { item: ShoppingItem }) => (
    <View style={[styles.shoppingItem, item.checked && styles.checkedShoppingItem]}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => toggleItemCheck(item.id)}
      >
        <View style={[styles.checkbox, item.checked && styles.checkedCheckbox]}>
          {item.checked && <Ionicons name="checkmark" size={16} color="white" />}
        </View>
      </TouchableOpacity>
      
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, item.checked && styles.checkedItemName]}>
          {item.name}
        </Text>
        <Text style={styles.itemDetails}>
          {item.quantity} {item.unit} • {item.category}
        </Text>
      </View>
      
      <View style={styles.priceContainer}>
        <TextInput
          style={styles.priceInput}
          value={item.price?.toString() || ''}
          onChangeText={(text) => updateItemPrice(item.id, parseFloat(text) || 0)}
          placeholder="Ár"
          keyboardType="numeric"
          returnKeyType="done"
        />
        <Text style={styles.currencyText}>Ft</Text>
      </View>
    </View>
  );

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(cat => cat !== categoryName)
        : [...prev, categoryName]
    );
  };

  const addProductToList = (product: any) => {
    Alert.alert('Termék hozzáadva', `${product.name} hozzáadva a listához`);
  };

  const openAddModal = () => {
    setIsAddModalVisible(true);
  };

  const handleJSONUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        Alert.alert('Siker', 'JSON fájl sikeresen feltöltve!');
        setIsAddModalVisible(false);
      }
    } catch (error) {
      Alert.alert('Hiba', 'Nem sikerült feltölteni a fájlt');
    }
  };

  const handleBarcodePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Hiba', 'Kamera engedély szükséges');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        Alert.alert('Siker', 'Vonalkód felvétel kész!');
        setIsAddModalVisible(false);
      }
    } catch (error) {
      Alert.alert('Hiba', 'Nem sikerült képet készíteni');
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#22D3EE', '#14B8A6', '#22C55E']}
        style={styles.container}
      >
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
    <LinearGradient
      colors={['#22D3EE', '#14B8A6', '#22C55E']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bevásárlás</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddModal}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Store Selection */}
        <View style={styles.storeSelection}>
          <Text style={styles.sectionTitle}>Válassz boltot:</Text>
          <View style={styles.storeGrid}>
            {renderStoreOption('Tesco', 'storefront')}
            {renderStoreOption('Lidl', 'storefront')}
            {renderStoreOption('Auchan', 'storefront')}
          </View>
        </View>

        {/* Frequent Products */}
        <View style={styles.frequentSection}>
          <Text style={styles.sectionTitle}>Gyakori termékek</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.frequentGrid}>
              {frequentProducts.map(renderFrequentProduct)}
            </View>
          </ScrollView>
        </View>

        {/* Category Sections */}
        <ScrollView style={styles.categoriesContainer}>
          {categoryData.map(renderCategorySection)}
        </ScrollView>

        {/* Shopping Lists */}
        <View style={styles.listsSection}>
          <View style={styles.listsSectionHeader}>
            <Text style={styles.sectionTitle}>Bevásárlólisták</Text>
            <TouchableOpacity
              style={styles.createListButton}
              onPress={() => setIsCreateModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createListText}>Új lista</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={shoppingLists}
            keyExtractor={(item) => item.id}
            renderItem={renderShoppingListItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listsContainer}
          />
        </View>

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
                <Text style={styles.modalTitle}>Új bevásárlólista</Text>
                <TouchableOpacity
                  onPress={() => setIsCreateModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Lista neve..."
                value={newListName}
                onChangeText={setNewListName}
                autoFocus
              />
              
              <TouchableOpacity
                style={styles.modalCreateButton}
                onPress={createShoppingList}
                disabled={!newListName.trim()}
              >
                <Text style={styles.modalCreateText}>Lista létrehozása</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Add Product Modal */}
        <Modal
          visible={isAddModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsAddModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Termék hozzáadása</Text>
                <TouchableOpacity
                  onPress={() => setIsAddModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.addOptions}>
                <TouchableOpacity
                  style={styles.addOption}
                  onPress={handleJSONUpload}
                >
                  <Ionicons name="document" size={32} color="#14B8A6" />
                  <Text style={styles.addOptionText}>JSON fájl feltöltése</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.addOption}
                  onPress={handleBarcodePhoto}
                >
                  <Ionicons name="camera" size={32} color="#14B8A6" />
                  <Text style={styles.addOptionText}>Vonalkód fotó</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Shopping Modal */}
        <Modal
          visible={isShoppingModalVisible}
          animationType="slide"
          transparent={false}
        >
          <LinearGradient
            colors={['#22D3EE', '#14B8A6', '#22C55E']}
            style={styles.container}
          >
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.shoppingHeader}>
                <TouchableOpacity
                  onPress={() => setIsShoppingModalVisible(false)}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.shoppingTitle}>
                  {selectedList?.name}
                </Text>
                <TouchableOpacity
                  onPress={completeShoppingList}
                  style={styles.completeButton}
                >
                  <Ionicons name="checkmark-done" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.shoppingStats}>
                <Text style={styles.shoppingStatsText}>
                  {selectedItems.filter(item => item.checked).length}/{selectedItems.length} termék • {' '}
                  {selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} Ft
                </Text>
              </View>

              <FlatList
                data={selectedItems}
                keyExtractor={(item) => item.id}
                renderItem={renderShoppingItem}
                style={styles.shoppingList}
                contentContainerStyle={styles.shoppingListContent}
              />
            </SafeAreaView>
          </LinearGradient>
        </Modal>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeSelection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  storeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storeOption: {
    backgroundColor: 'white',
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedStoreOption: {
    backgroundColor: '#14B8A6',
  },
  storeText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#14B8A6',
  },
  selectedStoreText: {
    color: 'white',
  },
  frequentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  frequentGrid: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  frequentProduct: {
    backgroundColor: 'white',
    width: 100,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 40,
    height: 40,
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  categoriesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  categorySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: 12,
    color: 'white',
    marginRight: 8,
    backgroundColor: '#14B8A6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '600',
  },
  categoryItems: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    color: '#14B8A6',
    fontWeight: '600',
    marginRight: 12,
  },
  listsSection: {
    paddingTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  listsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  createListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createListText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  listsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listCard: {
    backgroundColor: 'white',
    width: 200,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedListCard: {
    opacity: 0.7,
    borderWidth: 2,
    borderColor: '#10B981',
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
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  completedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  listDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  listStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listProgress: {
    fontSize: 14,
    color: '#14B8A6',
    fontWeight: '500',
  },
  listTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
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
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalCreateButton: {
    backgroundColor: '#14B8A6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCreateText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  addOption: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
  },
  addOptionText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  shoppingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  shoppingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  completeButton: {
    padding: 4,
  },
  shoppingStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  shoppingStatsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  shoppingList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  shoppingListContent: {
    paddingBottom: 20,
  },
  shoppingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkedShoppingItem: {
    opacity: 0.6,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  itemInfo: {
    flex: 1,
  },
  checkedItemName: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: 'right',
    width: 80,
  },
  currencyText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
});
