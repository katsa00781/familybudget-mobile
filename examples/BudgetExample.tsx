// Example: Using shared services in React Native component
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { budgetService, authService } from '../src/services';
import { BudgetPlan } from '../src/types';
import { formatCurrency } from '../src/lib/utils/helpers';
import { COLORS } from '../src/config/constants';

export default function BudgetExample() {
  const [budgets, setBudgets] = useState<BudgetPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      // Get current user
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Load user's budgets using shared service
      const userBudgets = await budgetService.getBudgetPlans(user.id);
      setBudgets(userBudgets);
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderBudgetItem = ({ item }: { item: BudgetPlan }) => (
    <View style={styles.budgetCard}>
      <Text style={styles.budgetName}>{item.name}</Text>
      <Text style={styles.budgetAmount}>
        {formatCurrency(item.total_planned)} / {formatCurrency(item.total_spent)}
      </Text>
      <View style={styles.categoriesContainer}>
        {item.categories.map((category) => (
          <View 
            key={category.id} 
            style={[styles.categoryTag, { backgroundColor: category.color }]}
          >
            <Text style={styles.categoryText}>{category.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading budgets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Budgets</Text>
      <FlatList
        data={budgets}
        renderItem={renderBudgetItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.familybudget.blue,
  },
  budgetCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  budgetName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  budgetAmount: {
    fontSize: 16,
    color: COLORS.familybudget.teal,
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
});
