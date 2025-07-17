import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Auth context mock for development
const useAuth = () => {
  // Statikus mock user objektum a végtelen renderelés elkerülésére
  const mockUser = { id: 'mock-user-id' };
  return {
    user: mockUser,
  };
};

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

export default function ShoppingScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isChecklistModalVisible, setIsChecklistModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('db');
  const [tempItems, setTempItems] = useState<ShoppingItem[]>([]);

  // Bevásárlólisták betöltése
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Mock data for development
        const mockData: ShoppingList[] = [
          {
            id: '1',
            user_id: 'mock-user-id', // Statikus user ID
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
            user_id: 'mock-user-id', // Statikus user ID
            name: 'Tisztítószerek',
            date: '2025-01-14',
            items: [
              { id: '4', name: 'Mosószer', quantity: 1, unit: 'doboz', price: 1200, category: 'Tisztítószer', checked: false },
              { id: '5', name: 'Öblítő', quantity: 1, unit: 'liter', price: 800, category: 'Tisztítószer', checked: false },
            ],
            total_amount: 2000,
            completed: false,
            created_at: '2025-01-14T15:30:00Z',
          },
        ];
        
        setShoppingLists(mockData);
      } catch (error) {
        console.error('Hiba a bevásárlólisták betöltésekor:', error);
        Alert.alert('Hiba', 'Nem sikerült betölteni a bevásárlólistákat!');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []); // Csak egyszer fut le az alkalmazás indításakor

  // Új lista létrehozása
  const createNewList = async () => {
    if (!user || !newListName.trim()) {
      Alert.alert('Hiba', 'Add meg a lista nevét!');
      return;
    }

    try {
      setIsLoading(true);
      const newList: ShoppingList = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: user.id,
        name: newListName.trim(),
        date: new Date().toISOString().split('T')[0],
        items: tempItems,
        total_amount: 0,
        completed: false,
        created_at: new Date().toISOString(),
      };

      setShoppingLists(prev => [newList, ...prev]);
      setNewListName('');
      setTempItems([]);
      setIsCreateModalVisible(false);
      Alert.alert('Siker', 'Bevásárlólista létrehozva!');
    } catch (error) {
      console.error('Hiba az új lista létrehozásakor:', error);
      Alert.alert('Hiba', 'Nem sikerült létrehozni a listát!');
    } finally {
      setIsLoading(false);
    }
  };

  // Termék hozzáadása az ideiglenes listához
  const addItem = () => {
    if (!searchTerm.trim()) {
      Alert.alert('Hiba', 'Add meg a termék nevét!');
      return;
    }

    const newItem: ShoppingItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: searchTerm.trim(),
      quantity: 1,
      unit: selectedUnit,
      category: selectedCategory || 'Egyéb',
      checked: false,
    };

    setTempItems(prev => [...prev, newItem]);
    setSearchTerm('');
    setSelectedCategory('');
  };

  // Checklist megnyitása
  const openChecklist = (list: ShoppingList) => {
    setSelectedList(list);
    setIsChecklistModalVisible(true);
  };

  // Termék bejelölése/kijelölése
  const toggleItem = async (itemId: string) => {
    if (!selectedList) return;

    const updatedItems = selectedList.items.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    const checkedItem = updatedItems.find(item => item.id === itemId);
    
    // Ha most jelöltük be és van ára, mentjük a vásárlási tranzakcióba
    if (checkedItem?.checked && checkedItem.price) {
      console.log(`Termék megvásárolva: ${checkedItem.name} - ${checkedItem.price} Ft`);
      // Itt történne a shopping_transactions táblába mentés
    }

    const updatedList = { ...selectedList, items: updatedItems };
    setSelectedList(updatedList);
    
    // Helyi state frissítése
    setShoppingLists(prev => prev.map(l => 
      l.id === selectedList.id ? updatedList : l
    ));
  };

  // Ár beállítása
  const setItemPrice = (itemId: string, price: string) => {
    if (!selectedList) return;

    const priceNum = parseFloat(price) || 0;
    const updatedItems = selectedList.items.map(item => 
      item.id === itemId ? { ...item, price: priceNum } : item
    );

    const updatedList = { ...selectedList, items: updatedItems };
    setSelectedList(updatedList);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getListProgress = (list: ShoppingList) => {
    const checkedCount = list.items.filter(item => item.checked).length;
    return `${checkedCount}/${list.items.length}`;
  };

  const calculateTotal = (items: ShoppingItem[]) => {
    return items.reduce((sum, item) => {
      if (item.checked && item.price) {
        return sum + (item.price * item.quantity);
      }
      return sum;
    }, 0);
  };

  const renderShoppingListItem = ({ item: list }: { item: ShoppingList }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => openChecklist(list)}
    >
      <View style={styles.listItemHeader}>
        <Text style={styles.listItemTitle}>{list.name}</Text>
        <Text style={styles.listItemDate}>
          {new Date(list.date).toLocaleDateString('hu-HU')}
        </Text>
      </View>
      <View style={styles.listItemFooter}>
        <Text style={styles.listItemProgress}>
          {getListProgress(list)} termék
        </Text>
        <Text style={styles.listItemTotal}>
          {formatCurrency(calculateTotal(list.items))}
        </Text>
      </View>
      {list.completed && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>Kész</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderChecklistItem = ({ item }: { item: ShoppingItem }) => (
    <View style={[styles.checklistItem, item.checked && styles.checkedItem]}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => toggleItem(item.id)}
      >
        <Ionicons
          name={item.checked ? 'checkbox' : 'checkbox-outline'}
          size={24}
          color={item.checked ? '#10B981' : '#6B7280'}
        />
      </TouchableOpacity>
      
      <View style={styles.itemDetails}>
        <Text style={[styles.itemName, item.checked && styles.checkedText]}>
          {item.name}
        </Text>
        <Text style={styles.itemInfo}>
          {item.quantity} {item.unit} • {item.category}
        </Text>
      </View>

      <TextInput
        style={styles.priceInput}
        placeholder="Ár"
        value={item.price?.toString() || ''}
        onChangeText={(text) => setItemPrice(item.id, text)}
        keyboardType="numeric"
      />
    </View>
  );

  const removeTempItem = (itemId: string) => {
    setTempItems(prev => prev.filter(item => item.id !== itemId));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Betöltés...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Shopping Lists */}
      {shoppingLists.length === 0 ? (
        <View style={styles.flex1}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Bevásárlólisták</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setIsCreateModalVisible(true)}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Még nincsenek bevásárlólistáid</Text>
            <Text style={styles.emptySubtext}>
              Hozz létre egyet a + gombbal!
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={shoppingLists}
          renderItem={renderShoppingListItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={styles.content}
          ListHeaderComponent={() => (
            <View style={styles.header}>
              <Text style={styles.title}>Bevásárlólisták</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setIsCreateModalVisible(true)}
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Create List Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setIsCreateModalVisible(false);
                setTempItems([]);
                setNewListName('');
              }}
            >
              <Text style={styles.modalCancel}>Mégse</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Új bevásárlólista</Text>
            <TouchableOpacity onPress={createNewList}>
              <Text style={styles.modalSave}>Mentés</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Lista neve"
              value={newListName}
              onChangeText={setNewListName}
            />

            <View style={styles.addItemSection}>
              <Text style={styles.sectionTitle}>Termékek hozzáadása</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Termék neve"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />

              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Kategória"
                  value={selectedCategory}
                  onChangeText={setSelectedCategory}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Egység"
                  value={selectedUnit}
                  onChangeText={setSelectedUnit}
                />
              </View>

              <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
                <Text style={styles.addItemButtonText}>Hozzáadás</Text>
              </TouchableOpacity>
            </View>

            {/* Temporary Items */}
            {tempItems.map((item) => (
              <View key={item.id} style={styles.tempItem}>
                <View style={styles.tempItemContent}>
                  <View>
                    <Text style={styles.tempItemName}>{item.name}</Text>
                    <Text style={styles.tempItemInfo}>
                      {item.quantity} {item.unit} • {item.category}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeTempItem(item.id)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {/* Checklist Modal */}
      <Modal
        visible={isChecklistModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsChecklistModalVisible(false)}>
              <Text style={styles.modalCancel}>Bezárás</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedList?.name || 'Bevásárlólista'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {selectedList && (
            <View style={styles.checklistContainer}>
              <View style={styles.checklistHeader}>
                <Text style={styles.checklistTotal}>
                  Összesen: {formatCurrency(calculateTotal(selectedList.items))}
                </Text>
                <Text style={styles.checklistProgress}>
                  {getListProgress(selectedList)} termék kész
                </Text>
              </View>

              <FlatList
                data={selectedList.items}
                renderItem={renderChecklistItem}
                keyExtractor={(item) => item.id}
                style={styles.checklistItems}
              />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  flex1: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#10B981',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  listItemDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  listItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemProgress: {
    fontSize: 14,
    color: '#6B7280',
  },
  listItemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  completedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  completedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    color: '#6B7280',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSave: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 50,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  addItemSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  addItemButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addItemButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tempItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  tempItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tempItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  tempItemInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  checklistContainer: {
    flex: 1,
  },
  checklistHeader: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  checklistTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  checklistProgress: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  checklistItems: {
    flex: 1,
    padding: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkedItem: {
    backgroundColor: '#F0FDF4',
  },
  checkbox: {
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  itemInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 14,
  },
});
