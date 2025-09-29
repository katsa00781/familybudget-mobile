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

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: string;
  created_at: string;
}

interface SavingsTransaction {
  id: string;
  savings_goal_id: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal';
  description?: string;
  transaction_date: string;
}

interface Investment {
  id: string;
  name: string;
  symbol: string;
  investment_type: 'stock' | 'bond' | 'etf' | 'crypto';
  quantity: number;
  average_price: number;
  current_price: number;
  currency: string;
}

export default function SavingsScreen() {
  const { user } = useAuth();
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Új megtakarítási cél form
  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    target_date: '',
    category: 'general',
  });

  // Szerkesztett cél form
  const [editedGoal, setEditedGoal] = useState({
    name: '',
    target_amount: '',
    target_date: '',
    category: 'general',
  });

  // Tranzakció form
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    transaction_type: 'deposit' as 'deposit' | 'withdrawal',
  });

  useEffect(() => {
    if (user) {
      loadSavingsGoals();
      loadInvestments();
    }
  }, [user]);

  const loadSavingsGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavingsGoals(data || []);
    } catch (error) {
      console.error('Error loading savings goals:', error);
      Alert.alert('Hiba', 'Nem sikerült betölteni a megtakarítási célokat');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvestments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('investment_portfolio')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Error loading investments:', error);
    }
  };

  const createSavingsGoal = async () => {
    console.log('🎯 Creating savings goal with data:', newGoal);
    
    if (!user) {
      Alert.alert('Hiba', 'Be kell jelentkezned!');
      return;
    }

    if (!newGoal.name.trim() || !newGoal.target_amount || !newGoal.target_date) {
      Alert.alert('Hiba', 'Töltsd ki az összes mezőt!');
      console.log('❌ Validation failed - missing fields:', {
        name: newGoal.name.trim(),
        target_amount: newGoal.target_amount,
        target_date: newGoal.target_date
      });
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newGoal.target_date)) {
      Alert.alert('Hiba', 'A dátum formátuma ÉÉÉÉ-HH-NN kell legyen (pl. 2024-12-31)');
      return;
    }

    // Validate amount is a valid number
    const targetAmount = parseFloat(newGoal.target_amount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert('Hiba', 'A célösszeg érvényes pozitív szám kell legyen');
      return;
    }

    try {
      console.log('📡 Inserting to Supabase:', {
        user_id: user.id,
        name: newGoal.name,
        target_amount: targetAmount,
        current_amount: 0,
        target_date: newGoal.target_date,
        category: newGoal.category,
      });

      const { data, error } = await supabase
        .from('savings_goals')
        .insert({
          user_id: user.id,
          name: newGoal.name,
          target_amount: targetAmount,
          current_amount: 0,
          target_date: newGoal.target_date,
          category: newGoal.category,
        });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Success! Data inserted:', data);
      Alert.alert('Siker', 'Megtakarítási cél létrehozva!');
      setNewGoal({ name: '', target_amount: '', target_date: '', category: 'general' });
      setModalVisible(false);
      loadSavingsGoals();
    } catch (error) {
      console.log('💥 Error creating savings goal:', error);
      Alert.alert('Hiba', `Nem sikerült létrehozni a megtakarítási célt: ${error.message || error}`);
    }
  };

  const updateSavingsGoal = async () => {
    console.log('✏️ Updating savings goal with data:', editedGoal);
    
    if (!user || !editingGoal) {
      Alert.alert('Hiba', 'Be kell jelentkezned és ki kell választanod egy célt!');
      return;
    }

    if (!editedGoal.name.trim() || !editedGoal.target_amount || !editedGoal.target_date) {
      Alert.alert('Hiba', 'Töltsd ki az összes mezőt!');
      console.log('❌ Validation failed - missing fields:', {
        name: editedGoal.name.trim(),
        target_amount: editedGoal.target_amount,
        target_date: editedGoal.target_date
      });
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(editedGoal.target_date)) {
      Alert.alert('Hiba', 'A dátum formátuma ÉÉÉÉ-HH-NN kell legyen (pl. 2024-12-31)');
      return;
    }

    // Validate amount is a valid number
    const targetAmount = parseFloat(editedGoal.target_amount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert('Hiba', 'A célösszeg érvényes pozitív szám kell legyen');
      return;
    }

    try {
      console.log('📡 Updating in Supabase:', {
        id: editingGoal.id,
        name: editedGoal.name,
        target_amount: targetAmount,
        target_date: editedGoal.target_date,
        category: editedGoal.category,
      });

      const { data, error } = await supabase
        .from('savings_goals')
        .update({
          name: editedGoal.name,
          target_amount: targetAmount,
          target_date: editedGoal.target_date,
          category: editedGoal.category,
        })
        .eq('id', editingGoal.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Success! Data updated:', data);
      Alert.alert('Siker', 'Megtakarítási cél módosítva!');
      setEditedGoal({ name: '', target_amount: '', target_date: '', category: 'general' });
      setEditModalVisible(false);
      setEditingGoal(null);
      loadSavingsGoals();
    } catch (error) {
      console.error('💥 Error updating savings goal:', error);
      Alert.alert('Hiba', `Nem sikerült módosítani a megtakarítási célt: ${error.message || error}`);
    }
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setEditedGoal({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      target_date: goal.target_date,
      category: goal.category,
    });
    setEditModalVisible(true);
  };

  const addTransaction = async () => {
    if (!selectedGoal || !newTransaction.amount) {
      Alert.alert('Hiba', 'Töltsd ki az összes mezőt!');
      return;
    }

    try {
      const amount = parseFloat(newTransaction.amount);
      
      // Tranzakció hozzáadása
      const { error: transactionError } = await supabase
        .from('savings_transactions')
        .insert({
          savings_goal_id: selectedGoal.id,
          amount: amount,
          transaction_type: newTransaction.transaction_type,
          description: newTransaction.description.trim() || null,
          transaction_date: new Date().toISOString().split('T')[0]
        });

      if (transactionError) throw transactionError;

      // Megtakarítási cél frissítése
      const newCurrentAmount = newTransaction.transaction_type === 'deposit' 
        ? selectedGoal.current_amount + amount
        : selectedGoal.current_amount - amount;

      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: Math.max(0, newCurrentAmount) })
        .eq('id', selectedGoal.id);

      if (updateError) throw updateError;

      Alert.alert('Siker', 'Tranzakció hozzáadva!');
      setNewTransaction({ amount: '', description: '', transaction_type: 'deposit' });
      setTransactionModalVisible(false);
      setSelectedGoal(null);
      loadSavingsGoals();
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Hiba', 'Nem sikerült hozzáadni a tranzakciót');
    }
  };

  const deleteGoal = async (goalId: string) => {
    Alert.alert(
      'Törlés megerősítése',
      'Biztosan törölni szeretnéd ezt a megtakarítási célt?',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('savings_goals')
                .delete()
                .eq('id', goalId);

              if (error) throw error;
              loadSavingsGoals();
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Hiba', 'Nem sikerült törölni a célt');
            }
          },
        },
      ]
    );
  };

  const getProgressPercentage = (goal: SavingsGoal) => {
    return Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'home': return 'home-outline';
      case 'car': return 'car-outline';
      case 'vacation': return 'airplane-outline';
      case 'emergency': return 'shield-outline';
      case 'education': return 'school-outline';
      default: return 'wallet-outline';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'home': return 'Lakás';
      case 'car': return 'Autó';
      case 'vacation': return 'Nyaralás';
      case 'emergency': return 'Vészhelyzet';
      case 'education': return 'Oktatás';
      default: return 'Általános';
    }
  };

  const getTotalSavings = () => {
    return savingsGoals.reduce((sum, goal) => sum + goal.current_amount, 0);
  };

  const getTotalInvestmentValue = () => {
    return investments.reduce((sum, investment) => 
      sum + (investment.quantity * investment.current_price), 0);
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

  return (
    <LinearGradient
      colors={['#22D3EE', '#14B8A6', '#22C55E']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Megtakarítások</Text>
        <Text style={styles.subtitle}>
          Kövesd nyomon megtakarítási céljaidat és befektetéseidet
        </Text>

      {/* Összesítő kártyák */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="wallet-outline" size={32} color="#10b981" />
          <Text style={styles.summaryAmount}>{formatCurrency(getTotalSavings())}</Text>
          <Text style={styles.summaryLabel}>Összes megtakarítás</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="trending-up-outline" size={32} color="#3b82f6" />
          <Text style={styles.summaryAmount}>{formatCurrency(getTotalInvestmentValue())}</Text>
          <Text style={styles.summaryLabel}>Befektetések értéke</Text>
        </View>
      </View>

      {/* Gyors műveletek */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={24} color="white" />
          <Text style={styles.quickActionText}>Új cél</Text>
        </TouchableOpacity>
      </View>

      {/* Megtakarítási célok */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Megtakarítási célok</Text>
        <Text style={styles.sectionSubtitle}>{savingsGoals.length} aktív cél</Text>
      </View>

      {savingsGoals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Még nincsenek megtakarítási célok</Text>
          <Text style={styles.emptyText}>
            Hozz létre az első megtakarítási célodat és kezdj el pénzt gyűjteni!
          </Text>
          <TouchableOpacity
            style={styles.createFirstButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.createFirstButtonText}>Első cél létrehozása</Text>
          </TouchableOpacity>
        </View>
      ) : (
        savingsGoals.map((goal) => (
          <View key={goal.id} style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalInfo}>
                <Ionicons 
                  name={getCategoryIcon(goal.category) as keyof typeof Ionicons.glyphMap} 
                  size={24} 
                  color="#0891b2" 
                />
                <View style={styles.goalTitleContainer}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalCategory}>{getCategoryName(goal.category)}</Text>
                </View>
              </View>
              <View style={styles.goalActions}>
                <TouchableOpacity
                  onPress={() => openEditModal(goal)}
                  style={styles.editButton}
                >
                  <Ionicons name="create-outline" size={20} color="#f59e0b" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteGoal(goal.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.goalProgress}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                </Text>
                <Text style={styles.progressPercentage}>
                  {getProgressPercentage(goal).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${getProgressPercentage(goal)}%` }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.goalFooter}>
              <Text style={styles.targetDate}>
                Céldátum: {new Date(goal.target_date).toLocaleDateString('hu-HU')}
              </Text>
              <TouchableOpacity
                style={styles.addMoneyButton}
                onPress={() => {
                  setSelectedGoal(goal);
                  setTransactionModalVisible(true);
                }}
              >
                <Ionicons name="add-outline" size={16} color="white" />
                <Text style={styles.addMoneyText}>Pénz hozzáadása</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Befektetési portfólió */}
      {investments.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Befektetési portfólió</Text>
            <Text style={styles.sectionSubtitle}>{investments.length} befektetés</Text>
          </View>

          {investments.map((investment) => (
            <View key={investment.id} style={styles.investmentCard}>
              <View style={styles.investmentHeader}>
                <Text style={styles.investmentName}>{investment.name}</Text>
                <Text style={styles.investmentSymbol}>{investment.symbol}</Text>
              </View>
              <View style={styles.investmentDetails}>
                <Text style={styles.investmentQuantity}>
                  {investment.quantity} db × {formatCurrency(investment.current_price)}
                </Text>
                <Text style={styles.investmentValue}>
                  {formatCurrency(investment.quantity * investment.current_price)}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Új megtakarítási cél modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Új megtakarítási cél</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Cél neve (pl. Új autó)"
              value={newGoal.name}
              onChangeText={(text) => setNewGoal({ ...newGoal, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Célösszeg (Ft)"
              value={newGoal.target_amount}
              onChangeText={(text) => setNewGoal({ ...newGoal, target_amount: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Céldátum (pl. 2025-06-15)"
              value={newGoal.target_date}
              onChangeText={(text) => setNewGoal({ ...newGoal, target_date: text })}
            />

            <Text style={styles.categoryLabel}>Kategória:</Text>
            <View style={styles.categoryButtons}>
              {[
                { key: 'general', label: 'Általános', icon: 'wallet-outline' },
                { key: 'home', label: 'Lakás', icon: 'home-outline' },
                { key: 'car', label: 'Autó', icon: 'car-outline' },
                { key: 'vacation', label: 'Nyaralás', icon: 'airplane-outline' },
                { key: 'emergency', label: 'Vészhelyzet', icon: 'shield-outline' },
                { key: 'education', label: 'Oktatás', icon: 'school-outline' },
              ].map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryButton,
                    newGoal.category === category.key && styles.categoryButtonSelected
                  ]}
                  onPress={() => setNewGoal({ ...newGoal, category: category.key })}
                >
                  <Ionicons 
                    name={category.icon as keyof typeof Ionicons.glyphMap} 
                    size={20} 
                    color={newGoal.category === category.key ? 'white' : '#64748b'} 
                  />
                  <Text style={[
                    styles.categoryButtonText,
                    newGoal.category === category.key && styles.categoryButtonTextSelected
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Mégse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={createSavingsGoal}
              >
                <Text style={styles.createButtonText}>Létrehozás</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Megtakarítási cél szerkesztése modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Megtakarítási cél szerkesztése</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Cél neve (pl. Új autó)"
              value={editedGoal.name}
              onChangeText={(text) => setEditedGoal({ ...editedGoal, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Célösszeg (Ft)"
              value={editedGoal.target_amount}
              onChangeText={(text) => setEditedGoal({ ...editedGoal, target_amount: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Céldátum (pl. 2025-06-15)"
              value={editedGoal.target_date}
              onChangeText={(text) => setEditedGoal({ ...editedGoal, target_date: text })}
            />

            <Text style={styles.categoryLabel}>Kategória:</Text>
            <View style={styles.categoryButtons}>
              {[
                { key: 'general', label: 'Általános', icon: 'wallet-outline' },
                { key: 'home', label: 'Lakás', icon: 'home-outline' },
                { key: 'car', label: 'Autó', icon: 'car-outline' },
                { key: 'vacation', label: 'Nyaralás', icon: 'airplane-outline' },
                { key: 'emergency', label: 'Vészhelyzet', icon: 'shield-outline' },
                { key: 'education', label: 'Oktatás', icon: 'school-outline' },
              ].map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryButton,
                    editedGoal.category === category.key && styles.categoryButtonSelected
                  ]}
                  onPress={() => setEditedGoal({ ...editedGoal, category: category.key })}
                >
                  <Ionicons 
                    name={category.icon as keyof typeof Ionicons.glyphMap} 
                    size={20} 
                    color={editedGoal.category === category.key ? 'white' : '#64748b'} 
                  />
                  <Text style={[
                    styles.categoryButtonText,
                    editedGoal.category === category.key && styles.categoryButtonTextSelected
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingGoal(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Mégse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={updateSavingsGoal}
              >
                <Text style={styles.createButtonText}>Módosítás</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tranzakció hozzáadása modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={transactionModalVisible}
        onRequestClose={() => setTransactionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Pénz {newTransaction.transaction_type === 'deposit' ? 'hozzáadása' : 'kivétele'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedGoal?.name}
            </Text>
            
            <View style={styles.transactionTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.transactionTypeButton,
                  newTransaction.transaction_type === 'deposit' && styles.transactionTypeButtonActive
                ]}
                onPress={() => setNewTransaction({ ...newTransaction, transaction_type: 'deposit' })}
              >
                <Ionicons name="add-outline" size={20} color={newTransaction.transaction_type === 'deposit' ? 'white' : '#10b981'} />
                <Text style={[
                  styles.transactionTypeText,
                  newTransaction.transaction_type === 'deposit' && styles.transactionTypeTextActive
                ]}>
                  Befizetés
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.transactionTypeButton,
                  newTransaction.transaction_type === 'withdrawal' && styles.transactionTypeButtonActive
                ]}
                onPress={() => setNewTransaction({ ...newTransaction, transaction_type: 'withdrawal' })}
              >
                <Ionicons name="remove-outline" size={20} color={newTransaction.transaction_type === 'withdrawal' ? 'white' : '#ef4444'} />
                <Text style={[
                  styles.transactionTypeText,
                  newTransaction.transaction_type === 'withdrawal' && styles.transactionTypeTextActive
                ]}>
                  Kivét
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
              style={[styles.input, styles.textArea]}
              placeholder="Megjegyzés (opcionális)"
              value={newTransaction.description}
              onChangeText={(text) => setNewTransaction({ ...newTransaction, description: text })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setTransactionModalVisible(false);
                  setSelectedGoal(null);
                }}
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
    </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
    marginBottom: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickActionButton: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: 24,
  },
  createFirstButton: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  goalCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  goalCategory: {
    fontSize: 12,
    color: '#64748b',
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  goalProgress: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#0f172a',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0891b2',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0891b2',
    borderRadius: 4,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetDate: {
    fontSize: 12,
    color: '#64748b',
  },
  addMoneyButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addMoneyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  investmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  investmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  investmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  investmentSymbol: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  investmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investmentQuantity: {
    fontSize: 14,
    color: '#64748b',
  },
  investmentValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 12,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonSelected: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  categoryButtonTextSelected: {
    color: 'white',
  },
  transactionTypeContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  transactionTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  transactionTypeButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  transactionTypeText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  transactionTypeTextActive: {
    color: 'white',
    fontWeight: '500',
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
