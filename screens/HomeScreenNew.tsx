import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export default function HomeScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalBalance: 385000,
    monthlyIncome: 475000,
    monthlyExpenses: 215000,
    savings: 260000,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock adatok a fejlesztéshez
  const mockRecentTransactions: Transaction[] = [
    {
      id: '1',
      description: 'Tesco bevásárlás',
      amount: -12500,
      type: 'expense',
      category: 'Élelmiszer',
      date: '2025-01-23',
    },
    {
      id: '2',
      description: 'Lakbér',
      amount: -120000,
      type: 'expense',
      category: 'Lakhatás',
      date: '2025-01-22',
    },
    {
      id: '3',
      description: 'Fizetés',
      amount: 475000,
      type: 'income',
      category: 'Fizetés',
      date: '2025-01-21',
    },
  ];

  const mockUpcomingBills = [
    { id: '1', name: 'Lakbér', dueDate: '2025-02-05', amount: 120000, icon: 'home' },
    { id: '2', name: 'Internet', dueDate: '2025-02-10', amount: 8500, icon: 'wifi' },
  ];

  const mockCategoryData: CategoryData[] = [
    { name: 'Élelmiszer', value: 45000, color: '#0084C7' },
    { name: 'Lakhatás', value: 120000, color: '#00B4DB' },
    { name: 'Közlekedés', value: 25000, color: '#00C9A7' },
    { name: 'Szórakozás', value: 15000, color: '#C1E1C5' },
    { name: 'Egyéb', value: 10000, color: '#F0F8FF' },
  ];

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Mock adatok használata fejlesztés közben
      setRecentTransactions(mockRecentTransactions);
      setUpcomingBills(mockUpcomingBills);
      setCategoryData(mockCategoryData);
      
      // TODO: Valós adatok betöltése a Supabase-ből
      // const { data: transactions } = await supabase
      //   .from('transactions')
      //   .select('*')
      //   .eq('family_id', userProfile?.family_id)
      //   .order('created_at', { ascending: false })
      //   .limit(5);

    } catch (error) {
      console.error('Hiba a dashboard adatok betöltésekor:', error);
      Alert.alert('Hiba', 'Nem sikerült betölteni az adatokat');
    } finally {
      setLoading(false);
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderStatsCard = (title: string, amount: number, icon: string, color: string, isIncome?: boolean) => (
    <View style={[styles.statsCard, { backgroundColor: color }]}>
      <View style={styles.statsCardContent}>
        <View>
          <Text style={styles.statsCardTitle}>{title}</Text>
          <Text style={styles.statsCardAmount}>
            {formatCurrency(amount)}
          </Text>
        </View>
        <View style={styles.statsCardIcon}>
          <Ionicons name={icon as any} size={24} color="white" />
        </View>
      </View>
    </View>
  );

  const renderTransactionItem = (transaction: Transaction) => (
    <View key={transaction.id} style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        <Ionicons 
          name={getTransactionIcon(transaction.category)} 
          size={20} 
          color="#14B8A6" 
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionName}>{transaction.description}</Text>
        <Text style={styles.transactionDetails}>
          {new Date(transaction.date).toLocaleDateString('hu-HU')} • {transaction.category}
        </Text>
      </View>
      <Text style={[
        styles.transactionAmount,
        { color: transaction.amount > 0 ? '#10B981' : '#EF4444' }
      ]}>
        {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
      </Text>
    </View>
  );

  const renderUpcomingBill = (bill: any) => (
    <View key={bill.id} style={styles.billItem}>
      <View style={styles.billIcon}>
        <Ionicons name={bill.icon as any} size={20} color="#F59E0B" />
      </View>
      <View style={styles.billInfo}>
        <Text style={styles.billName}>{bill.name}</Text>
        <Text style={styles.billDate}>Esedékes: {bill.dueDate}</Text>
      </View>
      <Text style={styles.billAmount}>
        {formatCurrency(bill.amount)}
      </Text>
    </View>
  );

  const renderCategoryItem = (category: CategoryData, index: number) => (
    <View key={category.name} style={styles.categoryItem}>
      <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
      <Text style={styles.categoryName}>{category.name}</Text>
      <Text style={styles.categoryAmount}>{formatCurrency(category.value)}</Text>
    </View>
  );

  const renderQuickAction = (title: string, icon: string, color: string, onPress: () => void) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="white" />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const getTransactionIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'élelmiszer': return 'basket';
      case 'lakhatás': return 'home';
      case 'közlekedés': return 'car';
      case 'szórakozás': return 'film';
      case 'fizetés': return 'card';
      default: return 'ellipse';
    }
  };

  const navigateToTransactions = () => {
    navigation.navigate('TransactionsScreen');
  };

  const navigateToBudget = () => {
    navigation.navigate('Költségvetés');
  };

  const navigateToSavings = () => {
    navigation.navigate('Megtakarítások');
  };

  const navigateToShopping = () => {
    navigation.navigate('Bevásárlólista');
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
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
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Ionicons name="wallet" size={24} color="white" />
              </View>
              <Text style={styles.headerTitle}>FamilyBudget</Text>
            </View>
            <Text style={styles.headerDate}>
              {new Date().toLocaleDateString('hu-HU', { 
                year: 'numeric', 
                month: 'long' 
              })}
            </Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {renderStatsCard('Egyenleg', dashboardStats.totalBalance, 'wallet', '#14B8A6')}
            {renderStatsCard('Havi bevétel', dashboardStats.monthlyIncome, 'arrow-up', '#10B981', true)}
            {renderStatsCard('Havi kiadás', dashboardStats.monthlyExpenses, 'arrow-down', '#EF4444')}
            {renderStatsCard('Megtakarítás', dashboardStats.savings, 'trophy', '#8B5CF6')}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Gyors műveletek</Text>
            <View style={styles.quickActionsGrid}>
              {renderQuickAction('Tranzakció', 'add-circle', '#14B8A6', navigateToTransactions)}
              {renderQuickAction('Költségvetés', 'calculator', '#8B5CF6', navigateToBudget)}
              {renderQuickAction('Megtakarítás', 'wallet', '#F59E0B', navigateToSavings)}
              {renderQuickAction('Bevásárlás', 'basket', '#EF4444', navigateToShopping)}
            </View>
          </View>

          {/* Recent Transactions */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Legutóbbi tranzakciók</Text>
              <TouchableOpacity onPress={navigateToTransactions}>
                <Text style={styles.seeAllText}>Összes</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.transactionsContainer}>
              {recentTransactions.map(renderTransactionItem)}
            </View>
          </View>

          {/* Upcoming Bills */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Közelgő számlák</Text>
            <View style={styles.billsContainer}>
              {upcomingBills.map(renderUpcomingBill)}
            </View>
          </View>

          {/* Category Breakdown */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Kiadások kategóriái</Text>
            <View style={styles.categoriesContainer}>
              {categoryData.map(renderCategoryItem)}
            </View>
          </View>
        </ScrollView>
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
  scrollView: {
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
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsCardTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  statsCardAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statsCardIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: (width - 60) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#14B8A6',
    fontWeight: '600',
  },
  transactionsContainer: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  transactionDetails: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  billsContainer: {
    gap: 12,
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 8,
    padding: 12,
  },
  billIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  billDate: {
    fontSize: 12,
    color: '#D97706',
  },
  billAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  categoriesContainer: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#14B8A6',
  },
});
