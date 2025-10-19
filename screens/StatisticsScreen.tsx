import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ShoppingStatistics, InflationStats } from '../types/database';

// Statistics interfaces
interface CategoryStats {
  category: string;
  totalAmount: number;
  itemCount: number;
  percentage: number;
}

interface MonthlyStats {
  month: string;
  totalAmount: number;
  itemCount: number;
  averagePerDay: number;
}

interface ProductStats {
  productName: string;
  totalAmount: number;
  quantity: number;
  unit: string;
  averagePrice: number;
  lastPurchase: string;
}

interface StoreStats {
  storeName: string;
  totalAmount: number;
  visitCount: number;
  averageBasket: number;
}

interface PersonalInflationData {
  overallInflationRate: number;
  topInflationProducts: InflationStats[];
  categoryInflation: { category: string; inflationRate: number; impact: number }[];
  monthlyInflationTrend: { month: string; inflationRate: number }[];
}

const StatisticsScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistics, setStatistics] = useState<ShoppingStatistics[]>([]);
  
  // Computed statistics
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  
  // Inflation tracking
  const [inflationData, setInflationData] = useState<PersonalInflationData>({
    overallInflationRate: 0,
    topInflationProducts: [],
    categoryInflation: [],
    monthlyInflationTrend: [],
  });
  
  // Time period filter
  const [selectedPeriod, setSelectedPeriod] = useState<'30days' | '3months' | '6months' | 'year'>('30days');
  const [totalSpent, setTotalSpent] = useState(0);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InflationStats | null>(null);
  const [editedCurrentPrice, setEditedCurrentPrice] = useState('');
  const [editedPreviousPrice, setEditedPreviousPrice] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  
  // Product edit modal state
  const [productEditModalVisible, setProductEditModalVisible] = useState(false);
  const [editingTopProduct, setEditingTopProduct] = useState<ProductStats | null>(null);
  const [editedQuantity, setEditedQuantity] = useState('');
  const [editedUnit, setEditedUnit] = useState('');
  
  // Edit price functions
  const openEditModal = (product: InflationStats) => {
    setEditingProduct(product);
    setEditedCurrentPrice(product.current_price.toString());
    setEditedPreviousPrice(product.previous_price.toString());
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingProduct(null);
    setEditedCurrentPrice('');
    setEditedPreviousPrice('');
  };

  const saveEditedPrices = async () => {
    if (!editingProduct || !user) return;

    const newCurrentPrice = parseFloat(editedCurrentPrice);
    const newPreviousPrice = parseFloat(editedPreviousPrice);

    if (isNaN(newCurrentPrice) || isNaN(newPreviousPrice)) {
      Alert.alert('Hiba', 'Kérjük, adjon meg érvényes árakat!');
      return;
    }

    try {
      // Update shopping_statistics table for the most recent price
      const { error: currentPriceError } = await supabase
        .from('shopping_statistics')
        .update({ unit_price: newCurrentPrice })
        .eq('user_id', user.id)
        .eq('product_name', editingProduct.product_name)
        .eq('shopping_date', editingProduct.last_purchase_date);

      if (currentPriceError) {
        console.error('Error updating current price:', currentPriceError);
      }

      // Update shopping_statistics table for the oldest price
      const { error: previousPriceError } = await supabase
        .from('shopping_statistics')
        .update({ unit_price: newPreviousPrice })
        .eq('user_id', user.id)
        .eq('product_name', editingProduct.product_name)
        .eq('shopping_date', editingProduct.first_purchase_date);

      if (previousPriceError) {
        console.error('Error updating previous price:', previousPriceError);
      }

      Alert.alert('Siker', 'Az árak sikeresen frissítve!');
      closeEditModal();
      // Reload statistics to reflect changes
      loadStatistics();
    } catch (error) {
      console.error('Error saving edited prices:', error);
      Alert.alert('Hiba', 'Nem sikerült menteni a változtatásokat!');
    }
  };

  const deleteInflationRecord = async (product: InflationStats) => {
    Alert.alert(
      'Statisztika törlése',
      `Biztosan törölni szeretné a "${product.product_name}" termék összes árstatisztikáját? Ez nem visszavonható!`,
      [
        {
          text: 'Mégse',
          style: 'cancel',
        },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shopping_statistics')
                .delete()
                .eq('user_id', user.id)
                .eq('product_name', product.product_name);

              if (error) {
                throw error;
              }

              Alert.alert('Siker', 'A termék statisztikái sikeresen törölve!');
              loadStatistics();
            } catch (error) {
              console.error('Error deleting product statistics:', error);
              Alert.alert('Hiba', 'Nem sikerült törölni a termék statisztikáit!');
            }
          }
        }
      ]
    );
  };

  // Top product edit functions
  const openProductEditModal = (product: ProductStats) => {
    setEditingTopProduct(product);
    setEditedQuantity(product.quantity.toString());
    setEditedUnit(product.unit);
    setProductEditModalVisible(true);
  };

  const closeProductEditModal = () => {
    setProductEditModalVisible(false);
    setEditingTopProduct(null);
    setEditedQuantity('');
    setEditedUnit('');
  };

  const saveEditedProduct = async () => {
    if (!editingTopProduct || !user) return;

    const newQuantity = parseFloat(editedQuantity);
    const newUnit = editedUnit.trim();

    if (isNaN(newQuantity) || newQuantity <= 0) {
      Alert.alert('Hiba', 'Kérjük, adjon meg érvényes mennyiséget!');
      return;
    }

    if (!newUnit) {
      Alert.alert('Hiba', 'Kérjük, adjon meg mértékegységet!');
      return;
    }

    try {
      // Update all records for this product with new quantity and unit
      const { error } = await supabase
        .from('shopping_statistics')
        .update({ 
          quantity: newQuantity,
          unit: newUnit 
        })
        .eq('user_id', user.id)
        .eq('product_name', editingTopProduct.productName);

      if (error) {
        throw error;
      }

      Alert.alert('Siker', 'A termék adatai sikeresen frissítve!');
      closeProductEditModal();
      // Reload statistics to reflect changes
      loadStatistics();
    } catch (error) {
      console.error('Error saving edited product:', error);
      Alert.alert('Hiba', 'Nem sikerült menteni a változtatásokat!');
    }
  };

  const deleteTopProduct = async (product: ProductStats) => {
    Alert.alert(
      'Termék törlése',
      `Biztosan törölni szeretné a "${product.productName}" termék összes statisztikáját? Ez nem visszavonható!`,
      [
        {
          text: 'Mégse',
          style: 'cancel',
        },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shopping_statistics')
                .delete()
                .eq('user_id', user.id)
                .eq('product_name', product.productName);

              if (error) {
                throw error;
              }

              Alert.alert('Siker', 'A termék statisztikái sikeresen törölve!');
              loadStatistics();
            } catch (error) {
              console.error('Error deleting product statistics:', error);
              Alert.alert('Hiba', 'Nem sikerült törölni a termék statisztikáit!');
            }
          }
        }
      ]
    );
  };
  
  useEffect(() => {
    if (user) {
      loadStatistics();
    }
  }, [user, selectedPeriod]);

  const loadStatistics = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Calculate start date based on selected period
      switch (selectedPeriod) {
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('shopping_statistics')
        .select('*')
        .eq('user_id', user.id)
        .gte('shopping_date', startDate.toISOString().split('T')[0])
        .lte('shopping_date', endDate.toISOString().split('T')[0])
        .order('shopping_date', { ascending: false });

      if (error) {
        throw error;
      }

      setStatistics(data || []);
      calculateStatistics(data || []);
      
    } catch (error) {
      Alert.alert('Hiba', 'Nem sikerült betölteni a statisztikákat');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const calculateStatistics = (data: ShoppingStatistics[]) => {
    if (data.length === 0) {
      setCategoryStats([]);
      setMonthlyStats([]);
      setTopProducts([]);
      setStoreStats([]);
      setTotalSpent(0);
      setTotalItems(0);
      return;
    }

    // Total amounts
    const total = data.reduce((sum, item) => sum + item.total_price, 0);
    const itemCount = data.reduce((sum, item) => sum + item.quantity, 0);
    setTotalSpent(total);
    setTotalItems(itemCount);

    // Category statistics
    const categoryMap = new Map<string, { total: number; count: number }>();
    data.forEach(item => {
      const category = item.product_category || 'Egyéb';
      const existing = categoryMap.get(category) || { total: 0, count: 0 };
      categoryMap.set(category, {
        total: existing.total + item.total_price,
        count: existing.count + item.quantity
      });
    });

    const categoryStatsArray: CategoryStats[] = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        totalAmount: stats.total,
        itemCount: stats.count,
        percentage: (stats.total / total) * 100
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
    setCategoryStats(categoryStatsArray);

    // Monthly statistics (last 6 months)
    const monthlyMap = new Map<string, { total: number; count: number }>();
    data.forEach(item => {
      const date = new Date(item.shopping_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyMap.get(monthKey) || { total: 0, count: 0 };
      monthlyMap.set(monthKey, {
        total: existing.total + item.total_price,
        count: existing.count + item.quantity
      });
    });

    const monthlyStatsArray: MonthlyStats[] = Array.from(monthlyMap.entries())
      .map(([month, stats]) => {
        const [year, monthNum] = month.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
        return {
          month: `${year}. ${monthNum}.`,
          totalAmount: stats.total,
          itemCount: stats.count,
          averagePerDay: stats.total / daysInMonth
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6);
    setMonthlyStats(monthlyStatsArray);

    // Top products
    const productMap = new Map<string, { 
      total: number; 
      quantity: number; 
      unit: string; 
      lastDate: string;
      priceSum: number;
      count: number;
    }>();
    
    data.forEach(item => {
      const existing = productMap.get(item.product_name) || { 
        total: 0, 
        quantity: 0, 
        unit: item.unit, 
        lastDate: item.shopping_date,
        priceSum: 0,
        count: 0
      };
      productMap.set(item.product_name, {
        total: existing.total + item.total_price,
        quantity: existing.quantity + item.quantity,
        unit: item.unit,
        lastDate: item.shopping_date > existing.lastDate ? item.shopping_date : existing.lastDate,
        priceSum: existing.priceSum + item.unit_price,
        count: existing.count + 1
      });
    });

    const topProductsArray: ProductStats[] = Array.from(productMap.entries())
      .map(([productName, stats]) => ({
        productName,
        totalAmount: stats.total,
        quantity: stats.quantity,
        unit: stats.unit,
        averagePrice: stats.priceSum / stats.count,
        lastPurchase: stats.lastDate
      }))
      .sort((a, b) => {
        // Minden esetben mennyiség szerint rendezünk (ez a legtöbbet vásárolt)
        // kg, liter esetén decimális mennyiség szerint
        // db esetén egész szám szerint
        return b.quantity - a.quantity;
      })
      .slice(0, 10);
    
    // Debug információ a legtöbbet vásárolt termékekről
    console.log('🏆 Legtöbbet vásárolt termékek (mennyiség szerint):');
    topProductsArray.slice(0, 3).forEach((product, index) => {
      console.log(`${index + 1}. ${product.productName}: ${product.quantity} ${product.unit} (${formatCurrency(product.totalAmount)})`);
    });
    setTopProducts(topProductsArray);

    // Store statistics (ha van store adat)
    const storeMap = new Map<string, { total: number; visits: Set<string> }>();
    data.forEach(item => {
      // A shopping_list_id alapján számoljuk a látogatásokat
      const store = 'Általános bolt'; // Mivel nincs store mező a statistics táblában
      const existing = storeMap.get(store) || { total: 0, visits: new Set() };
      existing.total += item.total_price;
      existing.visits.add(item.shopping_list_id);
      storeMap.set(store, existing);
    });

    const storeStatsArray: StoreStats[] = Array.from(storeMap.entries())
      .map(([storeName, stats]) => ({
        storeName,
        totalAmount: stats.total,
        visitCount: stats.visits.size,
        averageBasket: stats.total / stats.visits.size
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
    setStoreStats(storeStatsArray);

    // Personal inflation calculation
    calculateInflation(data);
  };

  const calculateInflation = (data: ShoppingStatistics[]) => {
    if (data.length < 2) {
      setInflationData({
        overallInflationRate: 0,
        topInflationProducts: [],
        categoryInflation: [],
        monthlyInflationTrend: [],
      });
      return;
    }

    // Group data by product for price comparison
    const productPriceHistory = new Map<string, {
      prices: { date: string; price: number; quantity: number }[];
      category: string;
      unit: string;
    }>();

    data.forEach(item => {
      const key = `${item.product_name}_${item.unit}`;
      if (!productPriceHistory.has(key)) {
        productPriceHistory.set(key, {
          prices: [],
          category: item.product_category,
          unit: item.unit
        });
      }
      productPriceHistory.get(key)!.prices.push({
        date: item.shopping_date,
        price: item.unit_price,
        quantity: item.quantity
      });
    });

    // Calculate inflation for each product
    const inflationProducts: InflationStats[] = [];
    let totalWeightedInflation = 0;
    let totalWeight = 0;

    productPriceHistory.forEach((history, productKey) => {
      const [productName] = productKey.split('_');
      if (history.prices.length < 2) return;

      // Sort by date
      history.prices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const firstPrice = history.prices[0].price;
      const lastPrice = history.prices[history.prices.length - 1].price;
      const priceChange = lastPrice - firstPrice;
      const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
      
      const totalQuantity = history.prices.reduce((sum, p) => sum + p.quantity, 0);
      const totalSpent = history.prices.reduce((sum, p) => sum + (p.price * p.quantity), 0);

      if (Math.abs(priceChangePercent) > 0.1) { // Only show significant changes
        inflationProducts.push({
          product_name: productName,
          category: history.category,
          unit: history.unit,
          current_price: lastPrice,
          previous_price: firstPrice,
          price_change: priceChange,
          price_change_percent: priceChangePercent,
          first_purchase_date: history.prices[0].date,
          last_purchase_date: history.prices[history.prices.length - 1].date,
          purchase_frequency: history.prices.length,
          total_spent: totalSpent
        });

        // Weight by spending for overall inflation
        totalWeightedInflation += priceChangePercent * totalSpent;
        totalWeight += totalSpent;
      }
    });

    // Sort by price change impact (absolute change * total spent)
    inflationProducts.sort((a, b) => {
      const impactA = Math.abs(a.price_change_percent) * a.total_spent;
      const impactB = Math.abs(b.price_change_percent) * b.total_spent;
      return impactB - impactA;
    });

    // Calculate category inflation
    const categoryInflationMap = new Map<string, { 
      totalInflation: number; 
      weight: number; 
      count: number 
    }>();

    inflationProducts.forEach(product => {
      const category = product.category || 'Egyéb';
      const existing = categoryInflationMap.get(category) || { 
        totalInflation: 0, 
        weight: 0, 
        count: 0 
      };
      
      categoryInflationMap.set(category, {
        totalInflation: existing.totalInflation + (product.price_change_percent * product.total_spent),
        weight: existing.weight + product.total_spent,
        count: existing.count + 1
      });
    });

    const categoryInflation = Array.from(categoryInflationMap.entries())
      .map(([category, stats]) => ({
        category,
        inflationRate: stats.weight > 0 ? stats.totalInflation / stats.weight : 0,
        impact: stats.weight
      }))
      .sort((a, b) => Math.abs(b.inflationRate) - Math.abs(a.inflationRate));

    // Calculate monthly inflation trend
    const monthlyInflationTrend = calculateMonthlyInflationTrend(data);

    const overallInflationRate = totalWeight > 0 ? totalWeightedInflation / totalWeight : 0;

    setInflationData({
      overallInflationRate,
      topInflationProducts: inflationProducts.slice(0, 10),
      categoryInflation,
      monthlyInflationTrend
    });
  };

  const calculateMonthlyInflationTrend = (data: ShoppingStatistics[]) => {
    // Group by month and calculate average prices
    const monthlyPrices = new Map<string, Map<string, number[]>>();
    
    data.forEach(item => {
      const date = new Date(item.shopping_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyPrices.has(monthKey)) {
        monthlyPrices.set(monthKey, new Map());
      }
      
      const monthData = monthlyPrices.get(monthKey)!;
      const productKey = `${item.product_name}_${item.unit}`;
      
      if (!monthData.has(productKey)) {
        monthData.set(productKey, []);
      }
      
      monthData.get(productKey)!.push(item.unit_price);
    });

    // Calculate monthly inflation rates
    const sortedMonths = Array.from(monthlyPrices.keys()).sort();
    const monthlyTrend = [];

    for (let i = 1; i < sortedMonths.length; i++) {
      const currentMonth = sortedMonths[i];
      const previousMonth = sortedMonths[i - 1];
      
      const currentPrices = monthlyPrices.get(currentMonth)!;
      const previousPrices = monthlyPrices.get(previousMonth)!;
      
      let totalInflation = 0;
      let count = 0;
      
      // Compare common products between months
      currentPrices.forEach((prices, productKey) => {
        if (previousPrices.has(productKey)) {
          const currentAvg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
          const previousAvg = previousPrices.get(productKey)!.reduce((sum, p) => sum + p, 0) / previousPrices.get(productKey)!.length;
          
          if (previousAvg > 0) {
            const inflation = ((currentAvg - previousAvg) / previousAvg) * 100;
            totalInflation += inflation;
            count++;
          }
        }
      });
      
      const avgInflation = count > 0 ? totalInflation / count : 0;
      const [year, month] = currentMonth.split('-');
      
      monthlyTrend.push({
        month: `${year}. ${month}.`,
        inflationRate: avgInflation
      });
    }

    return monthlyTrend.slice(-6); // Last 6 months
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('hu-HU')} Ft`;
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '30days': return 'Utolsó 30 nap';
      case '3months': return 'Utolsó 3 hónap';
      case '6months': return 'Utolsó 6 hónap';
      case 'year': return 'Utolsó év';
      default: return 'Ismeretlen időszak';
    }
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
            <Text style={styles.loadingText}>Statisztikák betöltése...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Ionicons name="analytics" size={24} color="white" />
            </View>
            <Text style={styles.headerTitle}>Bevásárlási Statisztikák</Text>
          </View>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('hu-HU', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </Text>
        </View>

        <ScrollView 
          style={styles.content}
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
          {/* Period Selector */}
          <View style={styles.periodSelector}>
            <Text style={styles.sectionTitle}>Időszak</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['30days', '3months', '6months', 'year'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonActive
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive
                  ]}>
                    {period === '30days' && '30 nap'}
                    {period === '3months' && '3 hónap'}
                    {period === '6months' && '6 hónap'}
                    {period === 'year' && '1 év'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Ionicons name="cash" size={24} color="#667eea" />
              <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
              <Text style={styles.summaryLabel}>Összes költés</Text>
              <Text style={styles.summaryPeriod}>{getPeriodLabel()}</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Ionicons name="basket" size={24} color="#764ba2" />
              <Text style={styles.summaryValue}>{totalItems}</Text>
              <Text style={styles.summaryLabel}>Termékek száma</Text>
              <Text style={styles.summaryPeriod}>{statistics.length} vásárlás</Text>
            </View>
          </View>

          {statistics.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="analytics-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyText}>Még nincsenek bevásárlási adatok</Text>
              <Text style={styles.emptySubText}>
                Importálj JSON adatokat vagy hozz létre bevásárlólistákat a statisztikák megtekintéséhez
              </Text>
            </View>
          ) : (
            <>
              {/* Debug információ az infláció adatokról */}
              {__DEV__ && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Debug - Infláció Adatok</Text>
                  <Text style={{ color: 'white', fontSize: 12 }}>
                    Statistics count: {statistics.length}
                  </Text>
                  <Text style={{ color: 'white', fontSize: 12 }}>
                    Top inflation products: {inflationData.topInflationProducts.length}
                  </Text>
                  <Text style={{ color: 'white', fontSize: 12 }}>
                    Overall rate: {inflationData.overallInflationRate.toFixed(2)}%
                  </Text>
                </View>
              )}

              {/* Personal Inflation Section */}
              {statistics.length >= 0 && ( // Mindig megjelenjen teszteléshez
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="trending-up" size={24} color="white" />
                    <Text style={styles.sectionTitle}>Személyes Infláció</Text>
                  </View>
                  
                  {/* Overall Inflation Rate */}
                  <View style={styles.inflationOverview}>
                    <View style={styles.inflationRateContainer}>
                      <Text style={styles.inflationRate}>
                        {inflationData.overallInflationRate >= 0 ? '+' : ''}
                        {inflationData.overallInflationRate.toFixed(1)}%
                      </Text>
                      <Text style={styles.inflationLabel}>Átlagos áremelkedés</Text>
                      <Text style={styles.inflationPeriod}>{getPeriodLabel()}</Text>
                    </View>
                    <Ionicons 
                      name={inflationData.overallInflationRate >= 0 ? "trending-up" : "trending-down"} 
                      size={32} 
                      color={inflationData.overallInflationRate >= 0 ? "#FF6B6B" : "#4ECDC4"} 
                    />
                  </View>

                  {/* Top Inflation Products */}
                  <View style={styles.subsection}>
                    <Text style={styles.subsectionTitle}>Legnagyobb áremelkedések</Text>
                    {inflationData.topInflationProducts.length > 0 ? 
                      inflationData.topInflationProducts.slice(0, 5).map((product, index) => (
                        <View key={index} style={styles.inflationItem}>
                          <View style={styles.inflationItemInfo}>
                            <Text style={styles.inflationProductName}>{product.product_name}</Text>
                            <Text style={styles.inflationProductDetails}>
                              {formatCurrency(product.previous_price)} → {formatCurrency(product.current_price)} / {product.unit}
                            </Text>
                            <Text style={styles.inflationProductCategory}>{product.category}</Text>
                          </View>
                          <View style={styles.inflationActions}>
                            <View style={styles.inflationChange}>
                              <Text style={[
                                styles.inflationPercent,
                                { color: product.price_change_percent >= 0 ? '#FF6B6B' : '#4ECDC4' }
                              ]}>
                                {product.price_change_percent >= 0 ? '+' : ''}
                                {product.price_change_percent.toFixed(1)}%
                              </Text>
                              <Text style={styles.inflationAmount}>
                                {product.price_change >= 0 ? '+' : ''}{formatCurrency(product.price_change)}
                              </Text>
                            </View>
                            <View style={styles.editButtons}>
                              <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => openEditModal(product)}
                              >
                                <Ionicons name="pencil" size={16} color="#14B8A6" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => deleteInflationRecord(product)}
                              >
                                <Ionicons name="trash" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )) : (
                        <Text style={styles.emptyText}>
                          Nincs elegendő adat az infláció számításához
                        </Text>
                      )
                    }
                  </View>

                  {/* Category Inflation */}
                  {inflationData.categoryInflation.length > 0 && (
                    <View style={styles.subsection}>
                      <Text style={styles.subsectionTitle}>Kategóriák szerint</Text>
                      {inflationData.categoryInflation.slice(0, 5).map((category, index) => (
                        <View key={index} style={styles.categoryInflationItem}>
                          <Text style={styles.categoryInflationName}>{category.category}</Text>
                          <View style={styles.categoryInflationStats}>
                            <Text style={[
                              styles.categoryInflationRate,
                              { color: category.inflationRate >= 0 ? '#FF6B6B' : '#4ECDC4' }
                            ]}>
                              {category.inflationRate >= 0 ? '+' : ''}
                              {category.inflationRate.toFixed(1)}%
                            </Text>
                            <Text style={styles.categoryInflationImpact}>
                              Kiadás: {formatCurrency(category.impact)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Monthly Trend */}
                  {inflationData.monthlyInflationTrend.length > 0 && (
                    <View style={styles.subsection}>
                      <Text style={styles.subsectionTitle}>Havi trend</Text>
                      <View style={styles.monthlyTrendContainer}>
                        {inflationData.monthlyInflationTrend.map((month, index) => (
                          <View key={index} style={styles.monthlyTrendItem}>
                            <Text style={styles.monthlyTrendMonth}>{month.month}</Text>
                            <Text style={[
                              styles.monthlyTrendRate,
                              { color: month.inflationRate >= 0 ? '#FF6B6B' : '#4ECDC4' }
                            ]}>
                              {month.inflationRate >= 0 ? '+' : ''}
                              {month.inflationRate.toFixed(1)}%
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Category Statistics */}
              {categoryStats.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>💰 Kategóriák szerint</Text>
                  {categoryStats.slice(0, 5).map((category, index) => (
                    <View key={category.category} style={styles.categoryItem}>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{category.category}</Text>
                        <Text style={styles.categoryDetails}>
                          {category.itemCount} termék • {formatCurrency(category.totalAmount)}
                        </Text>
                      </View>
                      <View style={styles.categoryPercentage}>
                        <Text style={styles.percentageText}>
                          {category.percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Top Products */}
              {topProducts.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🏆 Legtöbbet vásárolt termékek</Text>
                  {topProducts.slice(0, 5).map((product, index) => (
                    <View key={product.productName} style={styles.productItem}>
                      <View style={styles.productRank}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{product.productName}</Text>
                        <Text style={styles.productDetails}>
                          {product.quantity.toFixed(product.unit === 'kg' || product.unit === 'l' || product.unit === 'liter' ? 2 : 0)} {product.unit} • Átlag: {formatCurrency(product.averagePrice)}/{product.unit}
                        </Text>
                        <Text style={styles.productLastPurchase}>
                          Utolsó vásárlás: {new Date(product.lastPurchase).toLocaleDateString('hu-HU')}
                        </Text>
                      </View>
                      <View style={styles.productActions}>
                        <View style={styles.productTotal}>
                          <Text style={styles.productTotalText}>
                            {formatCurrency(product.totalAmount)}
                          </Text>
                        </View>
                        <View style={styles.editButtons}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => openProductEditModal(product)}
                          >
                            <Ionicons name="pencil" size={16} color="#14B8A6" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteTopProduct(product)}
                          >
                            <Ionicons name="trash" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Monthly Trends */}
              {monthlyStats.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📊 Havi trendk</Text>
                  {monthlyStats.map((month) => (
                    <View key={month.month} style={styles.monthItem}>
                      <Text style={styles.monthName}>{month.month}</Text>
                      <View style={styles.monthStats}>
                        <Text style={styles.monthAmount}>{formatCurrency(month.totalAmount)}</Text>
                        <Text style={styles.monthDetails}>
                          {month.itemCount} termék • Napi átlag: {formatCurrency(month.averagePerDay)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Edit Price Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeEditModal}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Árak szerkesztése</Text>
            <TouchableOpacity onPress={saveEditedPrices}>
              <Text style={styles.modalSave}>Mentés</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {editingProduct && (
              <>
                <Text style={styles.modalProductName}>{editingProduct.product_name}</Text>
                <Text style={styles.modalProductCategory}>{editingProduct.category} • {editingProduct.unit}</Text>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Korábbi ár</Text>
                  <View style={styles.modalInputContainer}>
                    <TextInput
                      style={styles.modalInput}
                      value={editedPreviousPrice}
                      onChangeText={setEditedPreviousPrice}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                    <Text style={styles.modalInputUnit}>Ft</Text>
                  </View>
                  <Text style={styles.modalInputNote}>
                    Első vásárlás: {new Date(editingProduct.first_purchase_date).toLocaleDateString('hu-HU')}
                  </Text>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Jelenlegi ár</Text>
                  <View style={styles.modalInputContainer}>
                    <TextInput
                      style={styles.modalInput}
                      value={editedCurrentPrice}
                      onChangeText={setEditedCurrentPrice}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                    <Text style={styles.modalInputUnit}>Ft</Text>
                  </View>
                  <Text style={styles.modalInputNote}>
                    Utolsó vásárlás: {new Date(editingProduct.last_purchase_date).toLocaleDateString('hu-HU')}
                  </Text>
                </View>

                <View style={styles.modalWarning}>
                  <Ionicons name="warning" size={20} color="#F59E0B" />
                  <Text style={styles.modalWarningText}>
                    Az árak módosítása hatással lesz a statisztikákra és inflációs számításokra.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Product Edit Modal */}
      <Modal
        visible={productEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeProductEditModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeProductEditModal}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Termék szerkesztése</Text>
            <TouchableOpacity onPress={saveEditedProduct}>
              <Text style={styles.modalSave}>Mentés</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {editingTopProduct && (
              <>
                <Text style={styles.modalProductName}>{editingTopProduct.productName}</Text>
                <Text style={styles.modalProductCategory}>Jelenlegi adatok módosítása</Text>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Mennyiség</Text>
                  <View style={styles.modalInputContainer}>
                    <TextInput
                      style={styles.modalInput}
                      value={editedQuantity}
                      onChangeText={setEditedQuantity}
                      placeholder="1"
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.modalInputNote}>
                    Jelenlegi: {editingTopProduct.quantity} {editingTopProduct.unit}
                  </Text>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Mértékegység</Text>
                  <View style={styles.modalInputContainer}>
                    <TextInput
                      style={styles.modalInput}
                      value={editedUnit}
                      onChangeText={setEditedUnit}
                      placeholder="db"
                    />
                  </View>
                  <Text style={styles.modalInputNote}>
                    Példák: db, kg, g, l, liter, csomag, doboz
                  </Text>
                </View>

                <View style={styles.modalWarning}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text style={styles.modalWarningText}>
                    Példa: 200g-os csigatészta csomag → Mennyiség: 1, Mértékegység: csomag
                  </Text>
                </View>

                <View style={styles.modalWarning}>
                  <Ionicons name="warning" size={20} color="#F59E0B" />
                  <Text style={styles.modalWarningText}>
                    A módosítás hatással lesz a statisztikákra és a termék összes korábbi vásárlási adatára.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  periodSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  periodButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  periodButtonActive: {
    backgroundColor: 'white',
  },
  periodButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#667eea',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    flex: 0.48,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryPeriod: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.8,
  },
  emptySubText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  categoryDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  categoryPercentage: {
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  productRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  productDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  productLastPurchase: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  productTotal: {
    alignItems: 'flex-end',
  },
  productTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  monthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  monthName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  monthStats: {
    alignItems: 'flex-end',
  },
  monthAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  monthDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  // Inflation styles
  inflationOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  inflationRateContainer: {
    flex: 1,
  },
  inflationRate: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  inflationLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  inflationPeriod: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  subsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  inflationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  inflationItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  inflationProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  inflationProductDetails: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  inflationProductCategory: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  inflationChange: {
    alignItems: 'flex-end',
  },
  inflationPercent: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inflationAmount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  categoryInflationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryInflationName: {
    fontSize: 14,
    color: 'white',
    flex: 1,
  },
  categoryInflationStats: {
    alignItems: 'flex-end',
  },
  categoryInflationRate: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryInflationImpact: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  monthlyTrendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthlyTrendItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  monthlyTrendMonth: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  monthlyTrendRate: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  inflationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14B8A6',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalProductName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalProductCategory: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  modalInputGroup: {
    marginBottom: 24,
  },
  modalInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  modalInputUnit: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 8,
  },
  modalInputNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  modalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  modalWarningText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  productActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
});

export default StatisticsScreen;
