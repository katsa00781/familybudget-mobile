import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Temporary simple types instead of importing from src
interface BudgetCategory {
  id: string;
  name: string;
  planned_amount: number;
  spent_amount: number;
  color?: string;
  icon?: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

interface BudgetData {
  savingsGoals: SavingsGoal[];
  totalIncome: number;
  totalExpenses: number;
}

const COLORS = {
  familybudget: {
    teal: '#1cc8e3',
    green: '#35e094',
    blue: '#2044b2',
    transport: '#ffc700',
    entertainment: '#ff6b6b',
    food: '#4ecdc4',
    healthcare: '#95e1d3',
    shopping: '#f38ba8',
    utilities: '#a8e6cf',
    other: '#ddd6fe'
  }
};

const BudgetScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState<BudgetData>({
    savingsGoals: [],
    totalIncome: 0,
    totalExpenses: 0,
  });

  // Format currency helper function
  const formatCurrency = (amount: number): string => {
    return `${amount.toLocaleString('hu-HU')} Ft`;
  };

  // Load budget data
  const loadBudgetData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Mock data for now
      setBudgetData({
        savingsGoals: [
          {
            id: '1',
            name: 'Nyaralás',
            target: 500000,
            current: 150000,
            deadline: '2025-08-01',
          },
          {
            id: '2',
            name: 'Új autó',
            target: 2000000,
            current: 600000,
            deadline: '2026-01-01',
          },
        ],
        totalIncome: 450000,
        totalExpenses: 380000,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading budget data:', error);
      setLoading(false);
      Alert.alert('Hiba', 'Nem sikerült betölteni a költségvetési adatokat.');
    }
  };

  useEffect(() => {
    loadBudgetData();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.familybudget.teal} />
        <Text style={styles.loadingText}>Betöltés...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.familybudget.teal }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Üdvözöljük, {user?.user_metadata?.full_name || 'Felhasználó'}!</Text>
            <Text style={styles.balanceLabel}>Havi egyenleg</Text>
            <Text style={styles.balanceAmount}>
              {formatCurrency(budgetData.totalIncome - budgetData.totalExpenses)}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="arrow-up" size={24} color={COLORS.familybudget.green} />
            </View>
            <Text style={styles.statAmount}>{formatCurrency(budgetData.totalIncome)}</Text>
            <Text style={styles.statLabel}>Bevétel</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="arrow-down" size={24} color="#ff6b6b" />
            </View>
            <Text style={styles.statAmount}>{formatCurrency(budgetData.totalExpenses)}</Text>
            <Text style={styles.statLabel}>Kiadás</Text>
          </View>
        </View>

        {/* Savings Goals */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Megtakarítási célok</Text>
            <TouchableOpacity>
              <Ionicons name="add" size={24} color={COLORS.familybudget.blue} />
            </TouchableOpacity>
          </View>

          {budgetData.savingsGoals.map((goal) => {
            const progressPercentage = (goal.current / goal.target) * 100;
            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalAmount}>
                    {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                  </Text>
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${Math.min(progressPercentage, 100)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{Math.round(progressPercentage)}%</Text>
                </View>
                <Text style={styles.goalDeadline}>Határidő: {new Date(goal.deadline).toLocaleDateString('hu-HU')}</Text>
              </View>
            );
          })}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Gyors műveletek</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="add-circle" size={32} color={COLORS.familybudget.green} />
              <Text style={styles.quickActionText}>Bevétel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="remove-circle" size={32} color="#ff6b6b" />
              <Text style={styles.quickActionText}>Kiadás</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="analytics" size={32} color={COLORS.familybudget.blue} />
              <Text style={styles.quickActionText}>Elemzés</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  headerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  sectionContainer: {
    marginBottom: 24,
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
    color: 'white',
  },
  goalCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    minWidth: 35,
    textAlign: 'right',
  },
  goalDeadline: {
    fontSize: 12,
    color: '#6b7280',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionButton: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
});

export default BudgetScreen;
