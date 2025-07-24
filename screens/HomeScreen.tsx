import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

interface BudgetItem {
  name: string;
  amount: number;
  category?: string;
  description?: string;
}

interface OtherIncome {
  name: string;
  amount: number;
  description?: string;
}

interface BudgetPlan {
  id: string;
  name: string;
  total_amount: number;
  budget_data: BudgetItem[];
}

interface IncomePlan {
  id: string;
  base_income: number;
  other_income: OtherIncome[];
  total_income: number;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: string;
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
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [incomePlans, setIncomePlans] = useState<IncomePlan[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savings: 0,
  });
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Költségvetési tervek betöltése
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (budgetError) {
        console.warn('Budget plans error:', budgetError);
      }

      // Bevételi tervek betöltése
      const { data: incomeData, error: incomeError } = await supabase
        .from('income_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (incomeError) {
        console.warn('Income plans error:', incomeError);
      }

      // Megtakarítási célok betöltése
      const { data: savingsData, error: savingsError } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (savingsError) {
        console.warn('Savings goals error:', savingsError);
      }

      setBudgetPlans(budgetData || []);
      
      // Income plans feldolgozása
      if (incomeData && incomeData.length > 0) {
        const latestIncome = incomeData[0];
        
        // Additional incomes parse-olása
        let additionalIncomes: OtherIncome[] = [];
        try {
          if (latestIncome.additional_incomes) {
            const parsed = typeof latestIncome.additional_incomes === 'string' 
              ? JSON.parse(latestIncome.additional_incomes)
              : latestIncome.additional_incomes;
            
            if (Array.isArray(parsed)) {
              additionalIncomes = parsed.map((income: { name?: string; amount?: number; description?: string }) => ({
                name: income.name || 'Egyéb jövedelem',
                amount: income.amount || 0,
                description: income.description || ''
              }));
            }
          }
        } catch (error) {
          console.warn('Error parsing additional incomes:', error);
        }

        // IncomePlan objektum összeállítása
        const incomeFromPlans: IncomePlan = {
          id: latestIncome.id,
          base_income: latestIncome.monthly_income || 0,
          other_income: additionalIncomes,
          total_income: latestIncome.total_income || 0
        };

        setIncomePlans([incomeFromPlans]);
      } else {
        setIncomePlans([]);
      }
      
      setSavingsGoals(savingsData || []);

      // Számítások
      const currentBudget = budgetData?.[0];
      const currentIncome = incomeData?.[0];
      
      const totalIncome = currentIncome?.total_income || 0;
      const totalExpenses = currentBudget?.total_amount || 0;
      const balance = totalIncome - totalExpenses;
      const totalSavings = savingsData?.reduce((sum, goal) => sum + (goal.current_amount || 0), 0) || 0;

      setDashboardStats({
        totalBalance: balance,
        monthlyIncome: totalIncome,
        monthlyExpenses: totalExpenses,
        savings: totalSavings,
      });

      // Költségvetési kategóriák a chart-hoz
      if (currentBudget?.budget_data) {
        const categories = currentBudget.budget_data.reduce((acc: Record<string, number>, item: BudgetItem) => {
          const category = item.category || 'Egyéb';
          acc[category] = (acc[category] || 0) + item.amount;
          return acc;
        }, {});

        const colors = ['#0084C7', '#00B4DB', '#00C9A7', '#C1E1C5', '#F0F8FF'];
        const categoryArray = Object.entries(categories).map(([name, value], index) => ({
          name,
          value: value as number,
          color: colors[index % colors.length]
        }));

        setCategoryData(categoryArray);
      }

      console.log('Dashboard data loaded successfully', {
        budgets: budgetData?.length || 0,
        incomes: incomeData?.length || 0,
        savings: savingsData?.length || 0
      });

    } catch (error) {
      console.error('Hiba a dashboard adatok betöltésekor:', error);
      Alert.alert('Információ', 'Az adatok betöltése során hiba történt. Alapértelmezett értékek lesznek használva.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Pull-to-refresh funkció
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Automatikus frissítés, amikor a screen fókuszba kerül
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadDashboardData();
      }
    }, [user, loadDashboardData])
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderStatsCard = (title: string, amount: number, icon: string, color: string) => (
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

  const navigateToTransactions = () => {
    Alert.alert('Fejlesztés alatt', 'Ez a funkció nem érhető el a webes verzióban.');
  };

  const navigateToFamilyMembers = () => {
    navigation.navigate('FamilyMembers');
  };

  const navigateToBudget = () => {
    navigation.navigate('Költségvetés');
  };

  const navigateToSavings = () => {
    navigation.navigate('Megtakarítások');
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
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="white"
              title="Frissítés..."
              titleColor="white"
            />
          }
        >
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
            {renderStatsCard('Havi bevétel', dashboardStats.monthlyIncome, 'arrow-up', '#10B981')}
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
              {renderQuickAction('Családtagok', 'people', '#EC4899', navigateToFamilyMembers)}
            </View>
          </View>

          {/* Category Breakdown */}
          {categoryData.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Kiadások kategóriái</Text>
              <View style={styles.categoriesContainer}>
                {categoryData.map(renderCategoryItem)}
              </View>
            </View>
          )}

          {/* Savings Goals */}
          {savingsGoals.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Megtakarítási célok</Text>
              <View style={styles.categoriesContainer}>
                {savingsGoals.slice(0, 3).map((goal) => (
                  <View key={goal.id} style={styles.categoryItem}>
                    <View style={[styles.categoryColor, { backgroundColor: '#14B8A6' }]} />
                    <Text style={styles.categoryName}>{goal.name}</Text>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
