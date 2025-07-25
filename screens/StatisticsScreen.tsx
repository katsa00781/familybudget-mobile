import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { 
  ReceiptStatistics, 
  TimeBasedStatistics, 
  ProductStatistics,
  StatisticsFilter,
  formatCurrency,
  formatQuantity,
  formatPeriod
} from '../lib/receiptStatistics';

const StatisticsScreen = () => {
  const [statistics] = useState(new ReceiptStatistics());
  const [currentPeriod, setCurrentPeriod] = useState<TimeBasedStatistics | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isProductDetailsVisible, setIsProductDetailsVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductStatistics | null>(null);
  const [filter, setFilter] = useState<StatisticsFilter>({});
  
  // Dátum kezelés
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'custom'>('monthly');

  useEffect(() => {
    loadCurrentPeriodData();
  }, [selectedYear, selectedMonth, viewMode, filter]);

  const loadCurrentPeriodData = () => {
    try {
      let data: TimeBasedStatistics;
      
      if (viewMode === 'monthly') {
        data = statistics.getMonthlyStatistics(selectedYear, selectedMonth);
      } else if (viewMode === 'yearly') {
        data = statistics.getYearlyStatistics(selectedYear);
      } else {
        // Custom period
        const startDate = filter.startDate || `${selectedYear}-01-01`;
        const endDate = filter.endDate || `${selectedYear}-12-31`;
        data = statistics.getStatisticsForPeriod(startDate, endDate, 'Egyedi időszak');
      }
      
      setCurrentPeriod(data);
    } catch (error) {
      console.error('Statisztika betöltési hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült betölteni a statisztikákat');
    }
  };

  const loadSampleData = () => {
    // Minta JSON adatok betöltése teszteléshez
    const sampleJSONData = [
      JSON.stringify({
        metadata: {
          exportDate: "2025-07-25T10:00:00.000Z",
          store: "TESCO",
          receiptDate: "2025-07-25",
          totalAmount: 3213,
          itemCount: 7
        },
        items: [
          { name: "KENYÉR FEHÉR", quantity: 1, unit: "db", price: 289, category: "Pékáruk" },
          { name: "TEJ UHT 2,8%", quantity: 1, unit: "l", price: 359, category: "Tejtermékek" },
          { name: "SONKA SZELETEK", quantity: 1, unit: "csomag", price: 1299, category: "Hús és hal" },
          { name: "ALMA GOLDEN", quantity: 1, unit: "kg", price: 449, category: "Zöldség és gyümölcs" }
        ]
      }),
      JSON.stringify({
        metadata: {
          exportDate: "2025-07-20T14:30:00.000Z",
          store: "ALDI",
          receiptDate: "2025-07-20",
          totalAmount: 2014,
          itemCount: 6
        },
        items: [
          { name: "BAGETT", quantity: 1, unit: "db", price: 129, category: "Pékáruk" },
          { name: "TEJFÖL", quantity: 1, unit: "db", price: 179, category: "Tejtermékek" },
          { name: "CSIRKECOMB", quantity: 1, unit: "kg", price: 899, category: "Hús és hal" },
          { name: "BANÁN", quantity: 1, unit: "kg", price: 399, category: "Zöldség és gyümölcs" }
        ]
      }),
      JSON.stringify({
        metadata: {
          exportDate: "2025-06-15T16:15:00.000Z",
          store: "LIDL",
          receiptDate: "2025-06-15",
          totalAmount: 1824,
          itemCount: 6
        },
        items: [
          { name: "LISZT BL-55", quantity: 1, unit: "kg", price: 179, category: "Alapanyag" },
          { name: "MARGARIN", quantity: 1, unit: "db", price: 299, category: "Tejtermékek" },
          { name: "CUKOR", quantity: 1, unit: "kg", price: 189, category: "Alapanyag" },
          { name: "KOLBÁSZ HÁZI", quantity: 1, unit: "db", price: 789, category: "Hús és hal" }
        ]
      })
    ];
    
    statistics.loadFromJSON(sampleJSONData);
    loadCurrentPeriodData();
    Alert.alert('Siker', 'Minta adatok betöltve!');
  };

  const showProductDetails = (product: ProductStatistics) => {
    setSelectedProduct(product);
    setIsProductDetailsVisible(true);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const renderProductItem = ({ item }: { item: ProductStatistics }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => showProductDetails(item)}
    >
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.productName}</Text>
        <Text style={styles.productAmount}>{formatCurrency(item.totalAmount)}</Text>
      </View>
      <View style={styles.productDetails}>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productQuantity}>
          {formatQuantity(item.totalQuantity, item.unit)}
        </Text>
      </View>
      <View style={styles.productStats}>
        <Text style={styles.productStat}>
          📊 {item.purchaseCount}× vásárolva
        </Text>
        <Text style={styles.productStat}>
          💰 {formatCurrency(item.averagePrice)} átlag
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📊 Statisztikák</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setIsFilterModalVisible(true)}
            >
              <Ionicons name="filter" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={loadSampleData}
            >
              <Ionicons name="download" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Időszak navigáció */}
        <View style={styles.periodNavigation}>
          <TouchableOpacity onPress={() => changeMonth('prev')}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.periodSelector}>
            <Text style={styles.periodText}>
              {viewMode === 'monthly' 
                ? formatPeriod(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`)
                : selectedYear.toString()
              }
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => changeMonth('next')}>
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* View Mode selector */}
        <View style={styles.viewModeSelector}>
          {['monthly', 'yearly', 'custom'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.viewModeButton,
                viewMode === mode && styles.viewModeButtonActive
              ]}
              onPress={() => setViewMode(mode as any)}
            >
              <Text style={[
                styles.viewModeText,
                viewMode === mode && styles.viewModeTextActive
              ]}>
                {mode === 'monthly' ? 'Havi' : mode === 'yearly' ? 'Éves' : 'Egyedi'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content}>
          {currentPeriod ? (
            <>
              {/* Összesítő kártyák */}
              <View style={styles.summaryCards}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>Összes költés</Text>
                  <Text style={styles.summaryCardValue}>
                    {formatCurrency(currentPeriod.totalAmount)}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>Termékek száma</Text>
                  <Text style={styles.summaryCardValue}>
                    {currentPeriod.totalItems}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryCards}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>Egyedi termékek</Text>
                  <Text style={styles.summaryCardValue}>
                    {currentPeriod.uniqueProducts}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>Üzletek száma</Text>
                  <Text style={styles.summaryCardValue}>
                    {Object.keys(currentPeriod.storeBreakdown).length}
                  </Text>
                </View>
              </View>

              {/* Kategória breakdown */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💰 Kategóriák szerint</Text>
                {Object.entries(currentPeriod.categoryBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, amount]) => (
                    <View key={category} style={styles.breakdownItem}>
                      <Text style={styles.breakdownCategory}>{category}</Text>
                      <Text style={styles.breakdownAmount}>
                        {formatCurrency(amount)}
                      </Text>
                    </View>
                  ))}
              </View>

              {/* Store breakdown */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏪 Üzletek szerint</Text>
                {Object.entries(currentPeriod.storeBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .map(([store, amount]) => (
                    <View key={store} style={styles.breakdownItem}>
                      <Text style={styles.breakdownCategory}>{store}</Text>
                      <Text style={styles.breakdownAmount}>
                        {formatCurrency(amount)}
                      </Text>
                    </View>
                  ))}
              </View>

              {/* Top termékek */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏆 Top termékek</Text>
                <FlatList
                  data={currentPeriod.topProducts.slice(0, 10)}
                  renderItem={renderProductItem}
                  keyExtractor={(item) => `${item.productName}_${item.category}`}
                  scrollEnabled={false}
                />
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart" size={64} color="#ffffff80" />
              <Text style={styles.emptyStateText}>
                Nincs adat a kiválasztott időszakra
              </Text>
              <TouchableOpacity
                style={styles.loadSampleButton}
                onPress={loadSampleData}
              >
                <Text style={styles.loadSampleButtonText}>
                  Minta adatok betöltése
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Product Details Modal */}
        <Modal
          visible={isProductDetailsVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsProductDetailsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Termék részletek</Text>
                <TouchableOpacity
                  onPress={() => setIsProductDetailsVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {selectedProduct && (
                <ScrollView style={styles.productDetailsContent}>
                  <Text style={styles.productDetailName}>
                    {selectedProduct.productName}
                  </Text>
                  <Text style={styles.productDetailCategory}>
                    {selectedProduct.category}
                  </Text>

                  <View style={styles.productDetailStats}>
                    <View style={styles.productDetailStat}>
                      <Text style={styles.productDetailStatLabel}>
                        Összes mennyiség
                      </Text>
                      <Text style={styles.productDetailStatValue}>
                        {formatQuantity(selectedProduct.totalQuantity, selectedProduct.unit)}
                      </Text>
                    </View>

                    <View style={styles.productDetailStat}>
                      <Text style={styles.productDetailStatLabel}>
                        Összes költés
                      </Text>
                      <Text style={styles.productDetailStatValue}>
                        {formatCurrency(selectedProduct.totalAmount)}
                      </Text>
                    </View>

                    <View style={styles.productDetailStat}>
                      <Text style={styles.productDetailStatLabel}>
                        Átlagár
                      </Text>
                      <Text style={styles.productDetailStatValue}>
                        {formatCurrency(selectedProduct.averagePrice)}
                      </Text>
                    </View>

                    <View style={styles.productDetailStat}>
                      <Text style={styles.productDetailStatLabel}>
                        Vásárlások száma
                      </Text>
                      <Text style={styles.productDetailStatValue}>
                        {selectedProduct.purchaseCount}×
                      </Text>
                    </View>
                  </View>

                  <View style={styles.productDetailSection}>
                    <Text style={styles.productDetailSectionTitle}>
                      🏪 Üzletek
                    </Text>
                    {selectedProduct.stores.map((store, index) => (
                      <Text key={index} style={styles.productDetailItem}>
                        • {store}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.productDetailSection}>
                    <Text style={styles.productDetailSectionTitle}>
                      📅 Időszak
                    </Text>
                    <Text style={styles.productDetailItem}>
                      Első vásárlás: {selectedProduct.firstPurchase}
                    </Text>
                    <Text style={styles.productDetailItem}>
                      Utolsó vásárlás: {selectedProduct.lastPurchase}
                    </Text>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Filter Modal - Placeholder */}
        <Modal
          visible={isFilterModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsFilterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Szűrők</Text>
                <TouchableOpacity
                  onPress={() => setIsFilterModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <Text style={styles.placeholderText}>
                Szűrő funkciók hamarosan...
              </Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  periodNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  periodSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  periodText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  viewModeSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: 'white',
  },
  viewModeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  viewModeTextActive: {
    color: '#667eea',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCards: {
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
  summaryCardTitle: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
  summaryCardValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownCategory: {
    color: 'white',
    fontSize: 16,
    flex: 1,
  },
  breakdownAmount: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  productItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  productAmount: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productCategory: {
    color: 'white',
    fontSize: 14,
    opacity: 0.7,
  },
  productQuantity: {
    color: 'white',
    fontSize: 14,
    opacity: 0.7,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productStat: {
    color: 'white',
    fontSize: 12,
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.7,
  },
  loadSampleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 15,
    marginTop: 30,
  },
  loadSampleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
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
  },
  closeButton: {
    padding: 5,
  },
  productDetailsContent: {
    padding: 20,
  },
  productDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productDetailCategory: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  productDetailStats: {
    marginBottom: 20,
  },
  productDetailStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productDetailStatLabel: {
    fontSize: 16,
    color: '#333',
  },
  productDetailStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  productDetailSection: {
    marginBottom: 20,
  },
  productDetailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  productDetailItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  placeholderText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 40,
  },
});

export default StatisticsScreen;
