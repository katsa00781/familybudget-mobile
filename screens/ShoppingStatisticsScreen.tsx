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
  inflationData: { product: string; oldPrice: number; newPrice: number; change: number }[];
  priceComparison: { category: string; avgPrice: number; trend: 'up' | 'down' | 'stable' }[];
}

const ShoppingStatisticsScreen: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Inflációs számítás - azonos termékek árváltozásai időben
  const calculateInflation = (items: any[]) => {
    const productPrices = new Map<string, Array<{ price: number; date: string }>>();
    
    // Termékek árai időrendben
    items.forEach(item => {
      const productName = item.name || 'Ismeretlen termék';
      const price = item.price || 0;
      const date = item.listDate || '';
      
      if (!productPrices.has(productName)) {
        productPrices.set(productName, []);
      }
      productPrices.get(productName)!.push({ price, date });
    });

    const inflationData: { product: string; oldPrice: number; newPrice: number; change: number }[] = [];

    // Csak azokat a termékeket nézzük, amelyekből legalább 2 vásárlás van
    for (const [product, prices] of productPrices.entries()) {
      if (prices.length >= 2) {
        // Rendezzük dátum szerint
        prices.sort((a, b) => a.date.localeCompare(b.date));
        
        const oldPrice = prices[0].price;
        const newPrice = prices[prices.length - 1].price;
        const change = ((newPrice - oldPrice) / oldPrice) * 100;
        
        if (Math.abs(change) > 1) { // Csak jelentős változásokat mutatunk
          inflationData.push({
            product,
            oldPrice,
            newPrice,
            change: Math.round(change * 100) / 100
          });
        }
      }
    }

    return inflationData.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10);
  };

  // Kategóriák átlagár trendjének számítása
  const calculatePriceComparison = (items: any[]) => {
    const categoryPrices = new Map<string, Array<{ price: number; date: string }>>();
    
    items.forEach(item => {
      const category = item.category || 'Egyéb';
      const price = item.price || 0;
      const date = item.listDate || '';
      
      if (!categoryPrices.has(category)) {
        categoryPrices.set(category, []);
      }
      categoryPrices.get(category)!.push({ price, date });
    });

    const priceComparison: { category: string; avgPrice: number; trend: 'up' | 'down' | 'stable' }[] = [];

    for (const [category, prices] of categoryPrices.entries()) {
      if (prices.length >= 3) {
        prices.sort((a, b) => a.date.localeCompare(b.date));
        
        const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
        const secondHalf = prices.slice(Math.floor(prices.length / 2));
        
        const avgOld = firstHalf.reduce((sum, p) => sum + p.price, 0) / firstHalf.length;
        const avgNew = secondHalf.reduce((sum, p) => sum + p.price, 0) / secondHalf.length;
        
        const change = ((avgNew - avgOld) / avgOld) * 100;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (change > 5) trend = 'up';
        else if (change < -5) trend = 'down';
        
        priceComparison.push({
          category,
          avgPrice: Math.round(avgNew),
          trend
        });
      }
    }

    return priceComparison;
  };

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

      // Fetch data from shopping_lists table instead of shopping_statistics
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Parse items from JSON strings
        const allItems: any[] = [];
        let totalSpent = 0;
        const monthlyMap = new Map<string, number>();

        data.forEach(list => {
          const listTotal = list.total_amount || 0;
          totalSpent += listTotal;
          
          // Monthly spending calculation
          const month = list.created_at.substring(0, 7); // YYYY-MM
          monthlyMap.set(month, (monthlyMap.get(month) || 0) + listTotal);

          // Parse items
          let items = [];
          try {
            items = typeof list.items === 'string' ? JSON.parse(list.items) : list.items;
          } catch (e) {
            console.warn('Failed to parse items for list:', list.id);
            items = [];
          }

          if (Array.isArray(items)) {
            items.forEach(item => {
              allItems.push({
                ...item,
                listDate: list.created_at,
                storeName: list.name // A lista nevéből próbáljuk kinyerni a bolt nevét
              });
            });
          }
        });

        const itemsCount = allItems.length;
        const avgPrice = itemsCount > 0 ? totalSpent / itemsCount : 0;

        // Top categories calculation
        const categoryMap = new Map<string, { total: number; count: number }>();
        allItems.forEach(item => {
          const category = item.category || 'Egyéb';
          const itemTotal = (item.price || 0) * (item.quantity || 1);
          const current = categoryMap.get(category) || { total: 0, count: 0 };
          categoryMap.set(category, {
            total: current.total + itemTotal,
            count: current.count + (item.quantity || 1)
          });
        });
        const topCategories = Array.from(categoryMap.entries())
          .map(([category, stats]) => ({ category, ...stats }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        // Top products calculation
        const productMap = new Map<string, { total: number; count: number }>();
        allItems.forEach(item => {
          const productName = item.name || 'Ismeretlen termék';
          const itemTotal = (item.price || 0) * (item.quantity || 1);
          const current = productMap.get(productName) || { total: 0, count: 0 };
          productMap.set(productName, {
            total: current.total + itemTotal,
            count: current.count + (item.quantity || 1)
          });
        });
        const topProducts = Array.from(productMap.entries())
          .map(([product, stats]) => ({ product, ...stats }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        // Monthly spending (last 6 months)
        const monthlySpending = Array.from(monthlyMap.entries())
          .map(([month, total]) => ({ month, total }))
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-6);

        // Calculate inflation data (compare same products over time)
        const inflationData = calculateInflation(allItems);
        const priceComparison = calculatePriceComparison(allItems);

        setStats({
          totalSpent: Math.round(totalSpent),
          itemsCount,
          avgPrice: Math.round(avgPrice),
          topCategories,
          topProducts,
          monthlySpending,
          inflationData,
          priceComparison
        });
      } else {
        setStats({
          totalSpent: 0,
          itemsCount: 0,
          avgPrice: 0,
          topCategories: [],
          topProducts: [],
          monthlySpending: [],
          inflationData: [],
          priceComparison: []
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

      {/* Inflation Analysis */}
      {stats.inflationData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Árváltozások (Infláció)</Text>
          {stats.inflationData.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.itemName}>{item.product}</Text>
              <View style={styles.itemStats}>
                <Text style={[styles.itemPrice, item.change > 0 ? styles.priceUp : styles.priceDown]}>
                  {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                </Text>
                <Text style={styles.itemCount}>
                  {item.oldPrice} → {item.newPrice} Ft
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Price Trends by Category */}
      {stats.priceComparison.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Kategória Trendek</Text>
          {stats.priceComparison.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.itemName}>{item.category}</Text>
              <View style={styles.itemStats}>
                <Text style={styles.itemPrice}>{item.avgPrice} Ft átlag</Text>
                <Text style={[
                  styles.trendIndicator,
                  item.trend === 'up' ? styles.trendUp :
                  item.trend === 'down' ? styles.trendDown : styles.trendStable
                ]}>
                  {item.trend === 'up' ? '📈 Emelkedő' :
                   item.trend === 'down' ? '📉 Csökkenő' : '➡️ Stabil'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

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
  priceUp: {
    color: '#FF3B30', // Piros az áremelkedéshez
  },
  priceDown: {
    color: '#34C759', // Zöld az árcsökkenéshez
  },
  trendIndicator: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendUp: {
    color: '#FF3B30',
  },
  trendDown: {
    color: '#34C759',
  },
  trendStable: {
    color: '#8E8E93',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
});

export default ShoppingStatisticsScreen;
