import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface BudgetItem {
  id: string;
  category: string;
  type: 'Szükséglet' | 'Vágyak' | 'Megtakarítás' | '';
  subcategory: string;
  amount: number;
}

interface BudgetCategory {
  name: string;
  items: BudgetItem[];
}

interface SavedBudget {
  id: string;
  user_id: string;
  budget_data: BudgetItem[];
  total_amount: number;
  name?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

interface IncomePlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  monthly_income: number;
  additional_incomes: { id: string; name: string; amount: number }[];
  total_income: number;
  created_at: string;
  updated_at?: string;
}

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const createInitialBudgetData = (): BudgetCategory[] => [
  {
    name: 'Autó',
    items: [
      { id: generateId(), category: 'Autó', type: 'Szükséglet', subcategory: 'Üzemanyag', amount: 30000 },
      { id: generateId(), category: 'Autó', type: '', subcategory: 'Utazás', amount: 0 },
      { id: generateId(), category: 'Autó', type: '', subcategory: 'Szervíz', amount: 0 },
    ]
  },
  {
    name: 'Szórakozás',
    items: [
      { id: generateId(), category: 'Szórakozás', type: 'Vágyak', subcategory: 'Játék és Egyéb', amount: 0 },
      { id: generateId(), category: 'Szórakozás', type: '', subcategory: 'Szórakozás', amount: 50000 }
    ]
  },
  {
    name: 'Háztartás',
    items: [
      { id: generateId(), category: 'Háztartás', type: 'Szükséglet', subcategory: 'Élelmiszer', amount: 150000 },
      { id: generateId(), category: 'Háztartás', type: '', subcategory: 'Otthon', amount: 30000 }
    ]
  },
  {
    name: 'Hitel',
    items: [
      { id: generateId(), category: 'Hitel', type: 'Szükséglet', subcategory: 'Lakáshitel', amount: 120000 },
      { id: generateId(), category: 'Hitel', type: '', subcategory: 'Autóhitel', amount: 80000 }
    ]
  },
  {
    name: 'Rezsi',
    items: [
      { id: generateId(), category: 'Rezsi', type: 'Szükséglet', subcategory: 'Rezsi', amount: 80000 }
    ]
  },
  {
    name: 'Megtakarítás',
    items: [
      { id: generateId(), category: 'Megtakarítás', type: 'Megtakarítás', subcategory: 'Állampapír', amount: 0 },
      { id: generateId(), category: 'Megtakarítás', type: '', subcategory: 'Részvény', amount: 0 }
    ]
  },
  {
    name: 'Egészség',
    items: [
      { id: generateId(), category: 'Egészség', type: 'Szükséglet', subcategory: 'Gyógyszer', amount: 0 },
      { id: generateId(), category: 'Egészség', type: '', subcategory: 'Orvos', amount: 0 }
    ]
  },
  {
    name: 'Egyéb',
    items: [
      { id: generateId(), category: 'Egyéb', type: 'Vágyak', subcategory: 'Szépségápolás', amount: 0 },
      { id: generateId(), category: 'Egyéb', type: '', subcategory: 'Egyéb', amount: 20000 }
    ]
  }
];

const BudgetScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>(createInitialBudgetData());
  const [savedBudgets, setSavedBudgets] = useState<SavedBudget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [budgetDescription, setBudgetDescription] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [expectedIncome, setExpectedIncome] = useState<number>(0);
  const [incomePlans, setIncomePlans] = useState<IncomePlan[]>([]);
  const [selectedIncomeId, setSelectedIncomeId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{categoryIndex: number, itemIndex: number} | null>(null);

  // Felhasználó és adatok betöltése
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Mentett költségvetések betöltése
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (budgetError) {
        console.warn('Budget plans error:', budgetError);
      }

      // Bevételi tervek betöltése
      const { data: incomeData, error: incomeError } = await supabase
        .from('income_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (incomeError) {
        console.warn('Income plans error:', incomeError);
      }

      setSavedBudgets(budgetData || []);
      setIncomePlans(incomeData || []);

      // Ha van mentett költségvetés, betöltjük az elsőt
      if (budgetData && budgetData.length > 0) {
        loadBudget(budgetData[0]);
      }

      // Ha van bevételi terv, beállítjuk az elvárható jövedelmet
      if (incomeData && incomeData.length > 0) {
        setExpectedIncome(incomeData[0].total_income || 0);
        setSelectedIncomeId(incomeData[0].id);
      }

    } catch (error) {
      console.error('Hiba az adatok betöltésekor:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBudget = (budget: SavedBudget) => {
    if (budget.budget_data) {
      // Konvertáljuk vissza kategóriás formátumra
      const categoryMap: { [key: string]: BudgetItem[] } = {};
      
      budget.budget_data.forEach(item => {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = [];
        }
        categoryMap[item.category].push(item);
      });

      const categories: BudgetCategory[] = Object.entries(categoryMap).map(([name, items]) => ({
        name,
        items
      }));

      setBudgetData(categories);
      setSelectedBudgetId(budget.id);
      setBudgetName(budget.name || '');
      setBudgetDescription(budget.description || '');
    }
  };

  // Összesítések számítása
  const calculateTotals = useCallback(() => {
    const allItems = budgetData.flatMap(category => category.items);
    const total = allItems.reduce((sum, item) => sum + item.amount, 0);
    
    const szuksegletTotal = allItems
      .filter(item => item.type === 'Szükséglet')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const vagyakTotal = allItems
      .filter(item => item.type === 'Vágyak')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const megtakaritasTotal = allItems
      .filter(item => item.type === 'Megtakarítás')
      .reduce((sum, item) => sum + item.amount, 0);

    return { total, szuksegletTotal, vagyakTotal, megtakaritasTotal };
  }, [budgetData]);

  // Összeg módosítása
  const updateAmount = (categoryIndex: number, itemIndex: number, newAmount: string) => {
    const amount = parseInt(newAmount.replace(/\s/g, '')) || 0;
    
    setBudgetData(prev => prev.map((category, catIdx) => 
      catIdx === categoryIndex 
        ? {
            ...category,
            items: category.items.map((item, itemIdx) => 
              itemIdx === itemIndex ? { ...item, amount } : item
            )
          }
        : category
    ));
  };

  // Tétel név módosítása
  const updateItemName = (categoryIndex: number, itemIndex: number, newName: string) => {
    setBudgetData(prev => prev.map((category, catIdx) => 
      catIdx === categoryIndex 
        ? {
            ...category,
            items: category.items.map((item, itemIdx) => 
              itemIdx === itemIndex ? { ...item, subcategory: newName } : item
            )
          }
        : category
    ));
  };

  // Tétel típus módosítása
  const updateItemType = (categoryIndex: number, itemIndex: number, newType: 'Szükséglet' | 'Vágyak' | 'Megtakarítás' | '') => {
    setBudgetData(prev => prev.map((category, catIdx) => 
      catIdx === categoryIndex 
        ? {
            ...category,
            items: category.items.map((item, itemIdx) => 
              itemIdx === itemIndex ? { ...item, type: newType } : item
            )
          }
        : category
    ));
  };

  // Új tétel hozzáadása
  const addItem = (categoryIndex: number) => {
    const newData = [...budgetData];
    const category = newData[categoryIndex];
    const newItem: BudgetItem = {
      id: generateId(),
      category: category.name,
      type: '',
      subcategory: 'Új tétel',
      amount: 0
    };
    newData[categoryIndex].items.push(newItem);
    setBudgetData(newData);
  };

  // Tétel eltávolítása
  const removeItem = (categoryIndex: number, itemIndex: number) => {
    const newData = [...budgetData];
    newData[categoryIndex].items.splice(itemIndex, 1);
    setBudgetData(newData);
  };

  // Kategória összegzése
  const getCategoryTotal = (category: BudgetCategory) => {
    return category.items.reduce((sum, item) => sum + item.amount, 0);
  };

  // Költségvetés mentése
  const saveBudget = async () => {
    if (!user) {
      Alert.alert('Hiba', 'Be kell jelentkezned a mentéshez!');
      return;
    }

    setIsLoading(true);
    try {
      const allItems = budgetData.flatMap(category => category.items);
      const { total } = calculateTotals();

      const budgetToSave = {
        user_id: user.id,
        budget_data: allItems,
        total_amount: total,
        name: budgetName || `Költségvetés ${new Date().toLocaleDateString('hu-HU')}`,
        description: budgetDescription || null
      };

      let data, error;

      if (selectedBudgetId) {
        // Meglévő költségvetés frissítése
        const updateResult = await supabase
          .from('budget_plans')
          .update(budgetToSave)
          .eq('id', selectedBudgetId)
          .select();
        
        data = updateResult.data;
        error = updateResult.error;
        
        if (!error) {
          Alert.alert('Siker', 'Költségvetés sikeresen frissítve!');
        }
      } else {
        // Új költségvetés létrehozása
        const insertResult = await supabase
          .from('budget_plans')
          .insert({
            ...budgetToSave,
            created_at: new Date().toISOString()
          })
          .select();
        
        data = insertResult.data;
        error = insertResult.error;
        
        if (!error && data && data.length > 0) {
          Alert.alert('Siker', 'Új költségvetés sikeresen elmentve!');
          setSelectedBudgetId(data[0].id);
        }
      }

      if (error) {
        console.error('Hiba a mentés során:', error);
        Alert.alert('Hiba', 'Nem sikerült elmenteni a költségvetést');
      } else {
        // Adatok újra betöltése
        loadData();
        setShowSaveModal(false);
      }

    } catch (error) {
      console.error('Hiba a mentés során:', error);
      Alert.alert('Hiba', 'Nem sikerült elmenteni a költségvetést');
    } finally {
      setIsLoading(false);
    }
  };

  // Új költségvetés létrehozása
  const createNewBudget = () => {
    Alert.alert(
      'Új költségvetés',
      'Szeretnél új költségvetést létrehozni? Az aktuális módosítások elvesznek.',
      [
        {
          text: 'Mégse',
          style: 'cancel',
        },
        {
          text: 'Új költségvetés',
          style: 'destructive',
          onPress: () => {
            // Reset minden adat
            setBudgetData(createInitialBudgetData());
            setSelectedBudgetId('');
            setBudgetName('');
            setBudgetDescription('');
            Alert.alert('Új költségvetés', 'Új költségvetés létrehozva! Ne felejts el menteni.');
          },
        },
      ]
    );
  };

  // Költségvetés törlése
  const deleteBudget = async () => {
    if (!selectedBudgetId || !user) {
      Alert.alert('Hiba', 'Nincs kiválasztott költségvetés törölhető!');
      return;
    }

    Alert.alert(
      'Költségvetés törlése',
      'Biztosan törölni szeretnéd ezt a költségvetést? Ez a művelet nem vonható vissza.',
      [
        {
          text: 'Mégse',
          style: 'cancel',
        },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const { error } = await supabase
                .from('budget_plans')
                .delete()
                .eq('id', selectedBudgetId)
                .eq('user_id', user.id);

              if (error) {
                console.error('Hiba a törlés során:', error);
                Alert.alert('Hiba', 'Nem sikerült törölni a költségvetést');
              } else {
                Alert.alert('Siker', 'Költségvetés sikeresen törölve!');
                // Reset minden adat
                setBudgetData(createInitialBudgetData());
                setSelectedBudgetId('');
                setBudgetName('');
                setBudgetDescription('');
                setShowSaveModal(false);
                // Adatok újra betöltése
                loadData();
              }
            } catch (error) {
              console.error('Hiba a törlés során:', error);
              Alert.alert('Hiba', 'Nem sikerült törölni a költségvetést');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Format currency helper function
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Szükséglet': return '#10B981';
      case 'Vágyak': return '#F59E0B';
      case 'Megtakarítás': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'autó': return 'car';
      case 'szórakozás': return 'game-controller';
      case 'háztartás': return 'home';
      case 'hitel': return 'card';
      case 'rezsi': return 'flash';
      case 'megtakarítás': return 'wallet';
      case 'egészség': return 'medical';
      case 'egyéb': return 'ellipsis-horizontal';
      default: return 'list';
    }
  };

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

  const { total, szuksegletTotal, vagyakTotal, megtakaritasTotal } = calculateTotals();
  const balance = expectedIncome - total;

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Költségvetés</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.newBudgetButton}
              onPress={() => createNewBudget()}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.newBudgetText}>Új</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setShowSaveModal(true)}
            >
              <Ionicons name="save" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Budget Selector */}
          {savedBudgets.length > 0 && (
            <View style={styles.budgetSelectorContainer}>
              <Text style={styles.budgetSelectorTitle}>Költségvetés:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.budgetSelector}>
                {savedBudgets.map((budget) => (
                  <TouchableOpacity
                    key={budget.id}
                    style={[
                      styles.budgetOption,
                      selectedBudgetId === budget.id && styles.activeBudgetOption
                    ]}
                    onPress={() => loadBudget(budget)}
                  >
                    <Text style={[
                      styles.budgetOptionText,
                      selectedBudgetId === budget.id && styles.activeBudgetOptionText
                    ]}>
                      {budget.name}
                    </Text>
                    <Text style={styles.budgetOptionAmount}>
                      {formatCurrency(budget.total_amount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { backgroundColor: balance >= 0 ? '#10B981' : '#EF4444' }]}>
              <Text style={styles.summaryTitle}>Egyenleg</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(balance)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.halfCard, { backgroundColor: '#14B8A6' }]}>
                <Text style={styles.summaryTitle}>Bevétel</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(expectedIncome)}</Text>
              </View>
              <View style={[styles.summaryCard, styles.halfCard, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.summaryTitle}>Kiadás</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(total)}</Text>
              </View>
            </View>
          </View>

          {/* Type Summary */}
          <View style={styles.typeSummaryContainer}>
            <Text style={styles.sectionTitle}>Típusok szerint</Text>
            <View style={styles.typeRow}>
              <View style={styles.typeCard}>
                <View style={[styles.typeIndicator, { backgroundColor: getTypeColor('Szükséglet') }]} />
                <Text style={styles.typeLabel}>Szükséglet</Text>
                <Text style={styles.typeAmount}>{formatCurrency(szuksegletTotal)}</Text>
              </View>
              <View style={styles.typeCard}>
                <View style={[styles.typeIndicator, { backgroundColor: getTypeColor('Vágyak') }]} />
                <Text style={styles.typeLabel}>Vágyak</Text>
                <Text style={styles.typeAmount}>{formatCurrency(vagyakTotal)}</Text>
              </View>
              <View style={styles.typeCard}>
                <View style={[styles.typeIndicator, { backgroundColor: getTypeColor('Megtakarítás') }]} />
                <Text style={styles.typeLabel}>Megtakarítás</Text>
                <Text style={styles.typeAmount}>{formatCurrency(megtakaritasTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            <Text style={styles.sectionTitle}>Kategóriák</Text>
            {budgetData.map((category, categoryIndex) => (
              <View key={category.name} style={styles.categoryContainer}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryTitleRow}>
                    <Ionicons 
                      name={getCategoryIcon(category.name) as any} 
                      size={24} 
                      color="#14B8A6" 
                    />
                    <Text style={styles.categoryTitle}>{category.name}</Text>
                  </View>
                  <Text style={styles.categoryTotal}>
                    {formatCurrency(getCategoryTotal(category))}
                  </Text>
                </View>

                {category.items.map((item, itemIndex) => (
                  <View key={item.id} style={styles.budgetItem}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemName}>{item.subcategory}</Text>
                      {item.type && (
                        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
                          <Text style={styles.typeBadgeText}>{item.type}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.itemAmount}
                      onPress={() => setEditingItem({ categoryIndex, itemIndex })}
                    >
                      <Text style={styles.itemAmountText}>{formatCurrency(item.amount)}</Text>
                      <Ionicons name="pencil" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => addItem(categoryIndex)}
                >
                  <Ionicons name="add" size={20} color="#14B8A6" />
                  <Text style={styles.addItemText}>Új tétel hozzáadása</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Save Modal */}
        <Modal
          visible={showSaveModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSaveModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Költségvetés mentése</Text>
                <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Költségvetés neve"
                value={budgetName}
                onChangeText={setBudgetName}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Leírás (opcionális)"
                value={budgetDescription}
                onChangeText={setBudgetDescription}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                {selectedBudgetId && (
                  <TouchableOpacity
                    style={styles.deleteModalButton}
                    onPress={deleteBudget}
                    disabled={isLoading}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.deleteModalText}>Törlés</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.saveActionButton, selectedBudgetId && styles.saveActionButtonFlex]}
                  onPress={saveBudget}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="save" size={20} color="white" />
                      <Text style={styles.saveActionText}>
                        {selectedBudgetId ? 'Frissítés' : 'Mentés'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Item Modal */}
        {editingItem && (
          <Modal
            visible={true}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setEditingItem(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tétel szerkesztése</Text>
                  <TouchableOpacity onPress={() => setEditingItem(null)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Tétel neve */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Tétel neve</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Tétel neve"
                      value={budgetData[editingItem.categoryIndex].items[editingItem.itemIndex].subcategory}
                      onChangeText={(text) => updateItemName(editingItem.categoryIndex, editingItem.itemIndex, text)}
                    />
                  </View>

                  {/* Összeg */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Összeg (Ft)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      value={budgetData[editingItem.categoryIndex].items[editingItem.itemIndex].amount.toString()}
                      onChangeText={(text) => updateAmount(editingItem.categoryIndex, editingItem.itemIndex, text)}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Típus választó */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Típus</Text>
                    <View style={styles.typeSelector}>
                      {(['', 'Szükséglet', 'Vágyak', 'Megtakarítás'] as const).map((typeOption) => (
                        <TouchableOpacity
                          key={typeOption}
                          style={[
                            styles.typeOption,
                            budgetData[editingItem.categoryIndex].items[editingItem.itemIndex].type === typeOption && styles.activeTypeOption
                          ]}
                          onPress={() => updateItemType(editingItem.categoryIndex, editingItem.itemIndex, typeOption)}
                        >
                          <View style={[
                            styles.typeOptionIndicator,
                            { backgroundColor: getTypeColor(typeOption || 'default') }
                          ]} />
                          <Text style={[
                            styles.typeOptionText,
                            budgetData[editingItem.categoryIndex].items[editingItem.itemIndex].type === typeOption && styles.activeTypeOptionText
                          ]}>
                            {typeOption || 'Nincs típus'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Kategória info (csak olvasható) */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Kategória</Text>
                    <View style={styles.readOnlyField}>
                      <Ionicons 
                        name={getCategoryIcon(budgetData[editingItem.categoryIndex].name) as any} 
                        size={20} 
                        color="#14B8A6" 
                      />
                      <Text style={styles.readOnlyText}>
                        {budgetData[editingItem.categoryIndex].name}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      removeItem(editingItem.categoryIndex, editingItem.itemIndex);
                      setEditingItem(null);
                    }}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.deleteButtonText}>Törlés</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => setEditingItem(null)}
                  >
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.confirmButtonText}>Mentés</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
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
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newBudgetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newBudgetText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  budgetSelectorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  budgetSelectorTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  budgetSelector: {
    flexDirection: 'row',
  },
  budgetOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  activeBudgetOption: {
    backgroundColor: 'white',
  },
  budgetOptionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  activeBudgetOptionText: {
    color: '#333',
  },
  budgetOptionAmount: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  typeSummaryContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  typeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  typeAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  categoriesContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  categoryContainer: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  itemAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemAmountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  addItemText: {
    fontSize: 14,
    color: '#14B8A6',
    fontWeight: '500',
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
  saveActionButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteModalText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveActionButtonFlex: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#14B8A6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: 400,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  typeSelector: {
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  activeTypeOption: {
    borderColor: '#14B8A6',
    backgroundColor: '#F0FDFA',
  },
  typeOptionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  typeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  activeTypeOptionText: {
    color: '#14B8A6',
    fontWeight: '500',
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 8,
  },
  readOnlyText: {
    fontSize: 14,
    color: '#666',
  },
});

export default BudgetScreen;
