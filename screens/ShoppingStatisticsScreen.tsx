import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface StatisticsData {
  totalSpent: number;
  itemsCount: number;
  avgPrice: number;
  topCategories: { category: string; total: number; count: number }[];
  topProducts: { product: string; total: number; count: number }[];
  monthlySpending: { month: string; total: number }[];
}

const ShoppingStatisticsScreen: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (user) {
      loadStatistics();
    }
  }, [user, selectedPeriod]);

  const loadStatistics = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Calculate date range based on selected period
      const now = new Date();
      let startDate: string;
      
      switch (selectedPeriod) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = weekAgo.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          startDate = monthAgo.toISOString().split('T')[0];
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          startDate = yearAgo.toISOString().split('T')[0];
          break;
      }

      // Fetch statistics data
      const { data, error } = await supabase
        .from('shopping_statistics')
        .select('*')
        .eq('user_id', user.id)
        .gte('shopping_date', startDate)
        .order('shopping_date', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Calculate statistics
        const totalSpent = data.reduce((sum, item) => sum + item.total_price, 0);
        const itemsCount = data.length;
        const avgPrice = totalSpent / itemsCount;

        // Top categories
        const categoryMap = new Map<string, { total: number; count: number }>();
        data.forEach(item => {
          const current = categoryMap.get(item.product_category) || { total: 0, count: 0 };
          categoryMap.set(item.product_category, {
            total: current.total + item.total_price,
            count: current.count + 1
          });
        });
        const topCategories = Array.from(categoryMap.entries())
          .map(([category, stats]) => ({ category, ...stats }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        // Top products
        const productMap = new Map<string, { total: number; count: number }>();
        data.forEach(item => {
          const current = productMap.get(item.product_name) || { total: 0, count: 0 };
          productMap.set(item.product_name, {
            total: current.total + item.total_price,
            count: current.count + 1
          });
        });
        const topProducts = Array.from(productMap.entries())
          .map(([product, stats]) => ({ product, ...stats }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        // Monthly spending (last 6 months)
        const monthlyMap = new Map<string, number>();
        data.forEach(item => {
          const month = item.shopping_date.substring(0, 7); // YYYY-MM
          monthlyMap.set(month, (monthlyMap.get(month) || 0) + item.total_price);
        });
        const monthlySpending = Array.from(monthlyMap.entries())
          .map(([month, total]) => ({ month, total }))
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-6);

        setStats({
          totalSpent,
          itemsCount,
          avgPrice,
          topCategories,
          topProducts,
          monthlySpending
        });
      } else {
        setStats({
          totalSpent: 0,
          itemsCount: 0,
          avgPrice: 0,
          topCategories: [],
          topProducts: [],
          monthlySpending: []
        });
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      Alert.alert('Hiba', 'Nem sikerült betölteni a statisztikákat!');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Statisztikák betöltése...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>Nincs elérhető statisztika</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bevásárlási Statisztikák</Text>
        <Text style={styles.subtitle}>
          {selectedPeriod === 'week' ? 'Elmúlt hét' : 
           selectedPeriod === 'month' ? 'Elmúlt hónap' : 'Elmúlt év'}
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalSpent.toLocaleString('hu-HU')} Ft</Text>
          <Text style={styles.summaryLabel}>Összes költés</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.itemsCount}</Text>
          <Text style={styles.summaryLabel}>Termékek száma</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.avgPrice.toLocaleString('hu-HU')} Ft</Text>
          <Text style={styles.summaryLabel}>Átlagár</Text>
        </View>
      </View>

      {/* Top Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Kategóriák</Text>
        {stats.topCategories.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.itemName}>{item.category}</Text>
            <View style={styles.itemStats}>
              <Text style={styles.itemPrice}>{item.total.toLocaleString('hu-HU')} Ft</Text>
              <Text style={styles.itemCount}>({item.count} db)</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Top Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Termékek</Text>
        {stats.topProducts.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.itemName}>{item.product}</Text>
            <View style={styles.itemStats}>
              <Text style={styles.itemPrice}>{item.total.toLocaleString('hu-HU')} Ft</Text>
              <Text style={styles.itemCount}>({item.count} db)</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Monthly Spending */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Havi Költések</Text>
        {stats.monthlySpending.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.itemName}>{item.month}</Text>
            <Text style={styles.itemPrice}>{item.total.toLocaleString('hu-HU')} Ft</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  itemStats: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  itemCount: {
    fontSize: 12,
    color: '#666',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
});

export default ShoppingStatisticsScreen;
