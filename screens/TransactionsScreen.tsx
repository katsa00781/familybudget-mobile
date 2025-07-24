import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'income' | 'expense';
  user_name?: string;
}

const categories = {
  income: ['Fizetés', 'Jutalom', 'Befektetés', 'Egyéb bevétel'],
  expense: ['Élelmiszer', 'Lakás', 'Közlekedés', 'Szórakozás', 'Egészségügy', 'Oktatás', 'Ruházat', 'Egyéb']
};

const categoryIcons: { [key: string]: string } = {
  'Fizetés': 'cash',
  'Jutalom': 'gift',
  'Befektetés': 'trending-up',
  'Egyéb bevétel': 'add-circle',
  'Élelmiszer': 'fast-food',
  'Lakás': 'home',
  'Közlekedés': 'car',
  'Szórakozás': 'game-controller',
  'Egészségügy': 'medical',
  'Oktatás': 'school',
  'Ruházat': 'shirt',
  'Egyéb': 'ellipsis-horizontal'
};

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      amount: 250000,
      category: 'Fizetés',
      description: 'Havi fizetés',
      date: '2024-01-15',
      type: 'income',
      user_name: 'Kovács János'
    },
    {
      id: '2',
      amount: -45000,
      category: 'Élelmiszer',
      description: 'Heti bevásárlás',
      date: '2024-01-14',
      type: 'expense',
      user_name: 'Nagy Anna'
    },
    {
      id: '3',
      amount: -12000,
      category: 'Közlekedés',
      description: 'Benzin',
      date: '2024-01-13',
      type: 'expense',
      user_name: 'Kovács János'
    },
    {
      id: '4',
      amount: -8500,
      category: 'Szórakozás',
      description: 'Mozi jegyek',
      date: '2024-01-12',
      type: 'expense',
      user_name: 'Nagy Anna'
    },
    {
      id: '5',
      amount: 50000,
      category: 'Jutalom',
      description: 'Prémium',
      date: '2024-01-10',
      type: 'income',
      user_name: 'Kovács János'
    }
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    type: 'expense' as 'income' | 'expense'
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hu-HU', {
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filterType === 'all') return true;
    return transaction.type === filterType;
  });

  const openAddModal = () => {
    setEditingTransaction(null);
    setFormData({
      amount: '',
      category: '',
      description: '',
      type: 'expense'
    });
    setModalVisible(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: Math.abs(transaction.amount).toString(),
      category: transaction.category,
      description: transaction.description,
      type: transaction.type
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!formData.amount || !formData.category || !formData.description) {
      Alert.alert('Hiba', 'Kérjük töltse ki az összes mezőt!');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hiba', 'Kérjük adjon meg érvényes összeget!');
      return;
    }

    const finalAmount = formData.type === 'expense' ? -amount : amount;

    if (editingTransaction) {
      // Edit existing transaction
      setTransactions(prev =>
        prev.map(t =>
          t.id === editingTransaction.id
            ? {
                ...t,
                amount: finalAmount,
                category: formData.category,
                description: formData.description,
                type: formData.type
              }
            : t
        )
      );
    } else {
      // Add new transaction
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        amount: finalAmount,
        category: formData.category,
        description: formData.description,
        date: new Date().toISOString().split('T')[0],
        type: formData.type,
        user_name: 'Jelenlegi felhasználó'
      };
      setTransactions(prev => [newTransaction, ...prev]);
    }

    setModalVisible(false);
  };

  const handleDelete = (transactionId: string) => {
    Alert.alert(
      'Tranzakció törlése',
      'Biztosan törölni szeretné ezt a tranzakciót?',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: () => {
            setTransactions(prev => prev.filter(t => t.id !== transactionId));
          }
        }
      ]
    );
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => openEditModal(item)}
    >
      <View style={styles.transactionLeft}>
        <View style={[
          styles.categoryIcon,
          { backgroundColor: item.type === 'income' ? '#E8F5E8' : '#FFE8E8' }
        ]}>
          <Ionicons
            name={categoryIcons[item.category] as any || 'ellipsis-horizontal'}
            size={20}
            color={item.type === 'income' ? '#4CAF50' : '#F44336'}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionCategory}>{item.category}</Text>
          <Text style={styles.transactionUser}>{item.user_name}</Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: item.type === 'income' ? '#4CAF50' : '#F44336' }
        ]}>
          {item.type === 'income' ? '+' : ''}{formatAmount(item.amount)}
        </Text>
        <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.title}>Tranzakciók</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'all' && styles.activeFilter]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterText, filterType === 'all' && styles.activeFilterText]}>
            Összes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'income' && styles.activeFilter]}
          onPress={() => setFilterType('income')}
        >
          <Text style={[styles.filterText, filterType === 'income' && styles.activeFilterText]}>
            Bevételek
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'expense' && styles.activeFilter]}
          onPress={() => setFilterType('expense')}
        >
          <Text style={[styles.filterText, filterType === 'expense' && styles.activeFilterText]}>
            Kiadások
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.transactionsList}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTransaction ? 'Tranzakció szerkesztése' : 'Új tranzakció'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === 'income' && styles.activeIncomeType
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type: 'income', category: '' }))}
                >
                  <Text style={[
                    styles.typeButtonText,
                    formData.type === 'income' && styles.activeTypeText
                  ]}>
                    Bevétel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === 'expense' && styles.activeExpenseType
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type: 'expense', category: '' }))}
                >
                  <Text style={[
                    styles.typeButtonText,
                    formData.type === 'expense' && styles.activeTypeText
                  ]}>
                    Kiadás
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Összeg (Ft)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.amount}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Kategória</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categorySelector}>
                    {categories[formData.type].map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryOption,
                          formData.category === category && styles.activeCategoryOption
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, category }))}
                      >
                        <Ionicons
                          name={categoryIcons[category] as any || 'ellipsis-horizontal'}
                          size={20}
                          color={formData.category === category ? 'white' : '#666'}
                        />
                        <Text style={[
                          styles.categoryOptionText,
                          formData.category === category && styles.activeCategoryText
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Leírás</Text>
                <TextInput
                  style={styles.input}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Tranzakció leírása"
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Mégse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Mentés</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
    color: 'white',
  },
  transactionsList: {
    padding: 20,
    paddingTop: 0,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  transactionUser: {
    fontSize: 11,
    color: '#999',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  activeIncomeType: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  activeExpenseType: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTypeText: {
    color: 'white',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    minWidth: 80,
  },
  activeCategoryOption: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryOptionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  activeCategoryText: {
    color: 'white',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
});
