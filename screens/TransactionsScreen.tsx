import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: string;
  created_at: string;
}

export default function TransactionsScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');

  // Új tranzakció form
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    category: 'food',
    type: 'expense' as 'income' | 'expense',
  });

  const categories = [
    { key: 'food', label: 'Élelmiszer', icon: 'restaurant-outline', color: '#10b981' },
    { key: 'transport', label: 'Közlekedés', icon: 'car-outline', color: '#3b82f6' },
    { key: 'housing', label: 'Lakhatás', icon: 'home-outline', color: '#8b5cf6' },
    { key: 'healthcare', label: 'Egészség', icon: 'medical-outline', color: '#ef4444' },
    { key: 'entertainment', label: 'Szórakozás', icon: 'game-controller-outline', color: '#f59e0b' },
    { key: 'shopping', label: 'Vásárlás', icon: 'bag-outline', color: '#ec4899' },
    { key: 'education', label: 'Oktatás', icon: 'school-outline', color: '#06b6d4' },
    { key: 'salary', label: 'Fizetés', icon: 'card-outline', color: '#10b981' },
    { key: 'other', label: 'Egyéb', icon: 'ellipsis-horizontal-outline', color: '#64748b' },
  ];

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Hiba', 'Nem sikerült betölteni a tranzakciókat');
    } finally {
      setIsLoading(false);
    }
  };

  const addTransaction = async () => {
    if (!user) {
      Alert.alert('Hiba', 'Be kell jelentkezned!');
      return;
    }

    if (!newTransaction.amount || !newTransaction.description.trim()) {
      Alert.alert('Hiba', 'Töltsd ki az összes mezőt!');
      return;
    }

    try {
      const amount = parseFloat(newTransaction.amount);
      
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          description: newTransaction.description.trim(),
          category: newTransaction.category,
          type: newTransaction.type,
          date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      Alert.alert('Siker', 'Tranzakció hozzáadva!');
      setNewTransaction({ amount: '', description: '', category: 'food', type: 'expense' });
      setModalVisible(false);
      loadTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Hiba', 'Nem sikerült hozzáadni a tranzakciót');
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    Alert.alert(
      'Törlés megerősítése',
      'Biztosan törölni szeretnéd ezt a tranzakciót?',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', transactionId);

              if (error) throw error;
              loadTransactions();
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Hiba', 'Nem sikerült törölni a tranzakciót');
            }
          },
        },
      ]
    );
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;

    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    return filtered;
  };

  const getTotalIncome = () => {
    return getFilteredTransactions()
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalExpenses = () => {
    return getFilteredTransactions()
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getBalance = () => {
    return getTotalIncome() - getTotalExpenses();
  };

  const getCategoryInfo = (categoryKey: string) => {
    return categories.find(c => c.key === categoryKey) || categories[categories.length - 1];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hu-HU', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getActiveFiltersText = () => {
    const filters = [];
    if (selectedType !== 'all') {
      filters.push(selectedType === 'income' ? 'Bevételek' : 'Kiadások');
    }
    if (selectedCategory !== 'all') {
      const category = getCategoryInfo(selectedCategory);
      filters.push(category.label);
    }
    return filters.length > 0 ? filters.join(', ') : 'Minden tranzakció';
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#22D3EE', '#14B8A6', '#22C55E']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Betöltés...</Text>
        </View>
      </LinearGradient>
    );
  }

  const filteredTransactions = getFilteredTransactions();

  return (
    <LinearGradient
      colors={['#22D3EE', '#14B8A6', '#22C55E']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tranzakciók</Text>
        <Text style={styles.subtitle}>Kövesd nyomon bevételeidet és kiadásaidat</Text>
      </View>

      {/* Összesítő kártyák */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="trending-up-outline" size={24} color="#16a34a" />
          <Text style={[styles.summaryAmount, { color: '#16a34a' }]}>
            {formatCurrency(getTotalIncome())}
          </Text>
          <Text style={styles.summaryLabel}>Bevételek</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: '#fecaca' }]}>
          <Ionicons name="trending-down-outline" size={24} color="#dc2626" />
          <Text style={[styles.summaryAmount, { color: '#dc2626' }]}>
            {formatCurrency(getTotalExpenses())}
          </Text>
          <Text style={styles.summaryLabel}>Kiadások</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: getBalance() >= 0 ? '#dbeafe' : '#fee2e2' }]}>
          <Ionicons name="wallet-outline" size={24} color={getBalance() >= 0 ? '#2563eb' : '#dc2626'} />
          <Text style={[styles.summaryAmount, { color: getBalance() >= 0 ? '#2563eb' : '#dc2626' }]}>
            {formatCurrency(getBalance())}
          </Text>
          <Text style={styles.summaryLabel}>Egyenleg</Text>
        </View>
      </View>

      {/* Gyors műveletek */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={20} color="white" />
          <Text style={styles.addButtonText}>Új tranzakció</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter-outline" size={20} color="#0891b2" />
          <Text style={styles.filterButtonText}>Szűrés</Text>
        </TouchableOpacity>
      </View>

      {/* Aktív szűrők */}
      <View style={styles.activeFiltersContainer}>
        <Text style={styles.activeFiltersText}>{getActiveFiltersText()}</Text>
        {(selectedType !== 'all' || selectedCategory !== 'all') && (
          <TouchableOpacity
            onPress={() => {
              setSelectedType('all');
              setSelectedCategory('all');
            }}
            style={styles.clearFiltersButton}
          >
            <Text style={styles.clearFiltersText}>Szűrők törlése</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tranzakciók lista */}
      <ScrollView style={styles.transactionsList} showsVerticalScrollIndicator={false}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Nincsenek tranzakciók</Text>
            <Text style={styles.emptyText}>
              {selectedType !== 'all' || selectedCategory !== 'all' 
                ? 'A kiválasztott szűrőknek megfelelő tranzakciók nem találhatók.'
                : 'Hozd létre az első tranzakciódat!'
              }
            </Text>
          </View>
        ) : (
          filteredTransactions.map((transaction) => {
            const categoryInfo = getCategoryInfo(transaction.category);
            return (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: `${categoryInfo.color}20` }]}>
                    <Ionicons 
                      name={categoryInfo.icon as keyof typeof Ionicons.glyphMap} 
                      size={20} 
                      color={categoryInfo.color} 
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionCategory}>{categoryInfo.label}</Text>
                    <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                  </View>
                </View>
                
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'income' ? '#16a34a' : '#dc2626' }
                  ]}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => deleteTransaction(transaction.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Új tranzakció modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Új tranzakció</Text>
            
            {/* Típus választó */}
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newTransaction.type === 'income' && styles.typeButtonActive,
                  { backgroundColor: newTransaction.type === 'income' ? '#16a34a' : '#f1f5f9' }
                ]}
                onPress={() => setNewTransaction({ ...newTransaction, type: 'income' })}
              >
                <Ionicons 
                  name="trending-up-outline" 
                  size={20} 
                  color={newTransaction.type === 'income' ? 'white' : '#16a34a'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  { color: newTransaction.type === 'income' ? 'white' : '#16a34a' }
                ]}>
                  Bevétel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newTransaction.type === 'expense' && styles.typeButtonActive,
                  { backgroundColor: newTransaction.type === 'expense' ? '#dc2626' : '#f1f5f9' }
                ]}
                onPress={() => setNewTransaction({ ...newTransaction, type: 'expense' })}
              >
                <Ionicons 
                  name="trending-down-outline" 
                  size={20} 
                  color={newTransaction.type === 'expense' ? 'white' : '#dc2626'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  { color: newTransaction.type === 'expense' ? 'white' : '#dc2626' }
                ]}>
                  Kiadás
                </Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Összeg (Ft)"
              value={newTransaction.amount}
              onChangeText={(text) => setNewTransaction({ ...newTransaction, amount: text })}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Leírás"
              value={newTransaction.description}
              onChangeText={(text) => setNewTransaction({ ...newTransaction, description: text })}
            />

            {/* Kategória választó */}
            <Text style={styles.categoryLabel}>Kategória:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryOption,
                    newTransaction.category === category.key && styles.categoryOptionSelected,
                    { borderColor: category.color }
                  ]}
                  onPress={() => setNewTransaction({ ...newTransaction, category: category.key })}
                >
                  <Ionicons 
                    name={category.icon as keyof typeof Ionicons.glyphMap} 
                    size={20} 
                    color={newTransaction.category === category.key ? 'white' : category.color} 
                  />
                  <Text style={[
                    styles.categoryOptionText,
                    newTransaction.category === category.key && { color: 'white' }
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Mégse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={addTransaction}
              >
                <Text style={styles.createButtonText}>Hozzáadás</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Szűrés modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Szűrés</Text>
            
            <Text style={styles.filterSectionTitle}>Típus:</Text>
            <View style={styles.filterOptions}>
              {[
                { key: 'all', label: 'Minden' },
                { key: 'income', label: 'Bevételek' },
                { key: 'expense', label: 'Kiadások' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    selectedType === option.key && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedType(option.key as any)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedType === option.key && styles.filterOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Kategória:</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedCategory === 'all' && styles.filterOptionSelected
                ]}
                onPress={() => setSelectedCategory('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedCategory === 'all' && styles.filterOptionTextSelected
                ]}>
                  Minden kategória
                </Text>
              </TouchableOpacity>
              
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.filterOption,
                    selectedCategory === category.key && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedCategory(category.key)}
                >
                  <Ionicons 
                    name={category.icon as keyof typeof Ionicons.glyphMap} 
                    size={16} 
                    color={selectedCategory === category.key ? 'white' : category.color} 
                  />
                  <Text style={[
                    styles.filterOptionText,
                    selectedCategory === category.key && styles.filterOptionTextSelected
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Mégse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.createButtonText}>Alkalmaz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#0891b2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#0891b2',
  },
  filterButtonText: {
    color: '#0891b2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  activeFiltersText: {
    fontSize: 14,
    color: '#64748b',
  },
  clearFiltersButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#0891b2',
    textDecorationLine: 'underline',
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 24,
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  typeButtonActive: {
    // backgroundColor will be set dynamically
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 12,
  },
  categoryScroll: {
    marginBottom: 24,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 80,
  },
  categoryOptionSelected: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
  },
  categoryOptionText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#64748b',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 12,
    marginTop: 8,
  },
  filterOptions: {
    marginBottom: 24,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  filterOptionSelected: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  filterOptionTextSelected: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#0891b2',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});
