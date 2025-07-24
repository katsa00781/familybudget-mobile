import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
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

interface BudgetPlan {
  id: string;
  name?: string;
  budget_data: BudgetItem[];
  total_amount: number;
}

interface BudgetItem {
  id: string;
  category: string;
  subcategory?: string;
  name?: string;
  amount: number;
  type?: 'Szükséglet' | 'Vágyak' | 'Megtakarítás' | '';
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: string;
}

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  balance: number;
  recentTransactions: Transaction[];
  budgetPlans: BudgetPlan[];
  savingsGoals: SavingsGoal[];
  todayShoppingTotal: number;
  budgetBreakdown: BudgetBreakdownItem[];
  categoryData: CategoryData[];
}

interface BudgetBreakdownItem {
  name: string;
  value: number;
  percentage: string;
  color: string;
  target?: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export default function HomeScreen({ navigation }: any) {
  const { user, userProfile } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    balance: 0,
    recentTransactions: [],
    budgetPlans: [],
    savingsGoals: [],
    todayShoppingTotal: 0,
    budgetBreakdown: [],
    categoryData: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Párhuzamos adatbetöltés
      const [
        transactionsResult,
        budgetPlansResult,
        savingsGoalsResult,
      ] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('budget_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      const transactions = transactionsResult.data || [];
      const budgetPlans = budgetPlansResult.data || [];
      const savingsGoals = savingsGoalsResult.data || [];

      // Számítások
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = budgetPlans.length > 0 ? budgetPlans[0].total_amount : 0;

      const totalSavings = savingsGoals
        .reduce((sum, goal) => sum + goal.current_amount, 0);

      const balance = totalIncome - totalExpenses;

      // Költségvetési breakdown számítása (50/30/20 szabály)
      const budgetBreakdown = getBudgetBreakdown(budgetPlans[0]);
      
      // Kategóriák szerinti bontás
      const categoryData = getCategoryData(budgetPlans[0]);

      setDashboardData({
        totalIncome,
        totalExpenses,
        totalSavings,
        balance,
        recentTransactions: transactions,
        budgetPlans,
        savingsGoals,
        todayShoppingTotal: 0, // TODO: shopping lists implementálása
        budgetBreakdown,
        categoryData,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Helper függvények a költségvetés számításokhoz
  const getBudgetBreakdown = (budgetPlan?: BudgetPlan): BudgetBreakdownItem[] => {
    if (!budgetPlan?.budget_data) return [];
    
    const totalAmount = budgetPlan.total_amount || 0;
    if (totalAmount === 0) return [];

    const breakdown: BudgetBreakdownItem[] = [];
    
    // Szükségletek (50%)
    const needsCategories = ['Lakhatás', 'Étel', 'Közlekedés', 'Egészség'];
    const needsItems = budgetPlan.budget_data.filter((item: BudgetItem) => 
      needsCategories.some(cat => item.category.toLowerCase().includes(cat.toLowerCase()))
    );
    const needsTotal = needsItems.reduce((sum: number, item: BudgetItem) => sum + item.amount, 0);
    
    breakdown.push({
      name: 'Szükségletek',
      value: needsTotal,
      percentage: `${totalAmount > 0 ? Math.round((needsTotal / totalAmount) * 100) : 0}%`,
      color: '#FF6B6B',
      target: totalAmount * 0.5
    });

    // Akaratok (30%)
    const wantsCategories = ['Szórakozás', 'Hobbi', 'Ruházat', 'Étterem'];
    const wantsItems = budgetPlan.budget_data.filter((item: BudgetItem) => 
      wantsCategories.some(cat => item.category.toLowerCase().includes(cat.toLowerCase()))
    );
    const wantsTotal = wantsItems.reduce((sum: number, item: BudgetItem) => sum + item.amount, 0);
    
    breakdown.push({
      name: 'Akaratok',
      value: wantsTotal,
      percentage: `${totalAmount > 0 ? Math.round((wantsTotal / totalAmount) * 100) : 0}%`,
      color: '#4ECDC4',
      target: totalAmount * 0.3
    });

    // Megtakarítások (20%)
    const savingsCategories = ['Megtakarítás', 'Befektetés', 'Tartalék'];
    const savingsItems = budgetPlan.budget_data.filter((item: BudgetItem) => 
      savingsCategories.some(cat => item.category.toLowerCase().includes(cat.toLowerCase()))
    );
    const savingsTotal = savingsItems.reduce((sum: number, item: BudgetItem) => sum + item.amount, 0);
    
    breakdown.push({
      name: 'Megtakarítások',
      value: savingsTotal,
      percentage: `${totalAmount > 0 ? Math.round((savingsTotal / totalAmount) * 100) : 0}%`,
      color: '#45B7D1',
      target: totalAmount * 0.2
    });

    return breakdown;
  };

  const getCategoryData = (budgetPlan?: BudgetPlan): CategoryData[] => {
    if (!budgetPlan?.budget_data) return [];
    
    const categoryTotals: {[key: string]: number} = {};
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    
    budgetPlan.budget_data.forEach((item: BudgetItem) => {
      if (categoryTotals[item.category]) {
        categoryTotals[item.category] += item.amount;
      } else {
        categoryTotals[item.category] = item.amount;
      }
    });

    return Object.entries(categoryTotals).map(([category, amount], index) => ({
      name: category,
      value: amount,
      color: colors[index % colors.length]
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBalance = () => {
    return dashboardData.totalIncome - dashboardData.totalExpenses;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Jó reggelt';
    if (hour < 18) return 'Jó napot';
    return 'Jó estét';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return 'restaurant-outline';
      case 'transport': return 'car-outline';
      case 'housing': return 'home-outline';
      case 'healthcare': return 'medical-outline';
      case 'entertainment': return 'game-controller-outline';
      case 'shopping': return 'bag-outline';
      case 'education': return 'school-outline';
      case 'salary': return 'card-outline';
      default: return 'ellipsis-horizontal-outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'food': return '#10b981';
      case 'transport': return '#3b82f6';
      case 'housing': return '#8b5cf6';
      case 'healthcare': return '#ef4444';
      case 'entertainment': return '#f59e0b';
      case 'shopping': return '#ec4899';
      case 'education': return '#06b6d4';
      case 'salary': return '#10b981';
      default: return '#64748b';
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#22D3EE', '#14B8A6', '#22C55E']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={[styles.loadingText, { color: '#ffffff' }]}>Adatok betöltése...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#22D3EE', '#14B8A6', '#22C55E']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#0891b2" />
        </TouchableOpacity>
      </View>

      {/* Financial Summary Cards */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.incomeCard]}>
            <Text style={styles.summaryLabel}>Havi bevétel</Text>
            <Text style={styles.summaryAmount}>▲ {formatCurrency(dashboardData.totalIncome)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.expenseCard]}>
            <Text style={styles.summaryLabel}>Havi kiadás</Text>
            <Text style={styles.summaryAmount}>▼ {formatCurrency(dashboardData.totalExpenses)}</Text>
          </View>
        </View>
        
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.balanceCard]}>
            <Text style={styles.summaryLabel}>Egyenleg</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(getBalance())}</Text>
          </View>
          <View style={[styles.summaryCard, styles.savingsCard]}>
            <Text style={styles.summaryLabel}>Mai beváslásid</Text>
            <Text style={styles.summaryAmount}>⭐ {formatCurrency(dashboardData.totalSavings)}</Text>
          </View>
        </View>
      </View>

      {/* Savings Goals Section */}
      {dashboardData.savingsGoals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Megtakarítási Célok</Text>
          {dashboardData.savingsGoals.slice(0, 3).map((goal) => {
            const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            return (
              <View key={goal.id} style={styles.goalItem}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalAmount}>
                    {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                  </Text>
                </View>
                <View style={styles.goalDetails}>
                  <Text style={styles.goalPercentage}>{progress.toFixed(1)}% teljesítve</Text>
                  <Text style={styles.goalDeadline}>
                    Határidő: {new Date(goal.target_date).toLocaleDateString('hu-HU')}
                  </Text>
                </View>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: '#00BCD4' }]}
            onPress={() => navigation.navigate('SalaryCalculator')}
          >
            <Ionicons name="calculator-outline" size={24} color="white" />
            <Text style={styles.quickActionText}>Bérkalkulátor</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: '#2196F3' }]}>
            <Ionicons name="list-outline" size={24} color="white" />
            <Text style={styles.quickActionText}>Új bevásárlólista</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: '#4CAF50' }]}>
            <Ionicons name="restaurant-outline" size={24} color="white" />
            <Text style={styles.quickActionText}>Receptek</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: '#9C27B0' }]}>
            <Ionicons name="wallet-outline" size={24} color="white" />
            <Text style={styles.quickActionText}>Megtakarítások</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Budget Plan */}
      {dashboardData.budgetPlans.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Költségvetési Terv</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>Mutasd</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.budgetPlanCard}>
            {dashboardData.budgetPlans[0].budget_data?.slice(0, 4).map((item, index) => (
              <View key={item.id || index} style={styles.budgetItem}>
                <View style={styles.budgetItemLeft}>
                  <Text style={styles.budgetItemName}>{item.category}</Text>
                  <Text style={styles.budgetItemDescription}>{item.subcategory || item.name}</Text>
                </View>
                <Text style={styles.budgetItemAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
            <View style={styles.budgetTotal}>
              <Text style={styles.budgetTotalLabel}>Összesen:</Text>
              <Text style={styles.budgetTotalAmount}>
                {formatCurrency(dashboardData.budgetPlans[0].total_amount)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Income Plan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bevételi Terv</Text>
        <View style={styles.incomePlanCard}>
          <View style={styles.incomeItem}>
            <Text style={styles.incomeItemName}>Alapfizetés</Text>
            <Text style={styles.incomeItemAmount}>{formatCurrency(380000)}</Text>
          </View>
          <View style={styles.incomeItem}>
            <Text style={styles.incomeItemName}>Bérbetoldás</Text>
            <Text style={styles.incomeItemAmount}>{formatCurrency(45000)}</Text>
          </View>
          <View style={styles.incomeItem}>
            <Text style={styles.incomeItemName}>Mellékállás</Text>
            <Text style={styles.incomeItemAmount}>{formatCurrency(25000)}</Text>
          </View>
          <View style={styles.incomeTotal}>
            <Text style={styles.incomeTotalLabel}>Összbevétel:</Text>
            <Text style={styles.incomeTotalAmount}>{formatCurrency(450000)}</Text>
          </View>
        </View>
      </View>

      {/* 50/30/20 Rule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>50/30/20 Szabály</Text>
        <View style={styles.ruleCard}>
          {dashboardData.budgetBreakdown.map((item, index) => {
            const colors = ['#4CAF50', '#2196F3', '#FF9800'];
            return (
              <View key={index} style={styles.ruleItem}>
                <View style={styles.ruleItemHeader}>
                  <View style={styles.ruleItemLeft}>
                    <View style={[styles.ruleIndicator, { backgroundColor: colors[index] }]} />
                    <Text style={styles.ruleItemName}>{item.name}</Text>
                  </View>
                  <Text style={styles.ruleItemPercentage}>{item.percentage}</Text>
                </View>
                <Text style={styles.ruleItemAmount}>
                  Tervezett: {formatCurrency(item.target || 0)} | Cél: {formatCurrency(item.value)}
                </Text>
                <View style={styles.ruleProgressContainer}>
                  <View 
                    style={[
                      styles.ruleProgressBar, 
                      { 
                        backgroundColor: colors[index],
                        width: `${parseInt(item.percentage)}%`
                      }
                    ]} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Category Breakdown */}
      {dashboardData.categoryData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategóriák Szerinti Kiadások</Text>
          <View style={styles.categoryCard}>
            {dashboardData.categoryData.map((category, index) => {
              const total = dashboardData.categoryData.reduce((sum, cat) => sum + cat.value, 0);
              const percentage = total > 0 ? Math.round((category.value / total) * 100) : 0;
              return (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryItemLeft}>
                    <View style={[styles.categoryIndicator, { backgroundColor: category.color }]} />
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryPercentage}>{percentage}%</Text>
                  </View>
                  <Text style={styles.categoryAmount}>{formatCurrency(category.value)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.bottomSpacer} />
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
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  notificationButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  summarySection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderLeftWidth: 4,
  },
  incomeCard: {
    borderLeftColor: '#10b981',
  },
  expenseCard: {
    borderLeftColor: '#ef4444',
  },
  balanceCard: {
    borderLeftColor: '#3b82f6',
  },
  savingsCard: {
    borderLeftColor: '#f59e0b',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    color: '#1f2937',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0891b2',
    fontWeight: '500',
  },
  goalItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  goalAmount: {
    fontSize: 14,
    color: '#6b7280',
  },
  goalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goalPercentage: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  goalDeadline: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0891b2',
    borderRadius: 3,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  budgetPlanCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  budgetItemLeft: {
    flex: 1,
  },
  budgetItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  budgetItemDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  budgetItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  budgetTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  budgetTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  budgetTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  incomePlanCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
  },
  incomeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  incomeItemName: {
    fontSize: 14,
    color: '#1f2937',
  },
  incomeItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  incomeTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#bbf7d0',
    marginTop: 8,
  },
  incomeTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  incomeTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  ruleCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  ruleItem: {
    marginBottom: 16,
  },
  ruleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ruleIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  ruleItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  ruleItemPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  ruleItemAmount: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  ruleProgressContainer: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ruleProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  bottomSpacer: {
    height: 20,
  },
});
