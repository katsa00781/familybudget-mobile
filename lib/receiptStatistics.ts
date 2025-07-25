import { ReceiptData, ReceiptItem } from './receiptOCR';

// Statisztika adatstruktúra
export interface ProductStatistics {
  productName: string;
  category: string;
  totalQuantity: number;
  totalAmount: number;
  averagePrice: number;
  unit: string;
  purchaseCount: number; // Hányszor vásároltuk
  stores: string[]; // Melyik üzletekben
  firstPurchase: string; // Első vásárlás dátuma
  lastPurchase: string; // Utolsó vásárlás dátuma
}

export interface TimeBasedStatistics {
  period: string; // pl. "2025-07" vagy "2025-07-25"
  totalAmount: number;
  totalItems: number;
  uniqueProducts: number;
  topProducts: ProductStatistics[];
  categoryBreakdown: { [category: string]: number };
  storeBreakdown: { [store: string]: number };
}

export interface StatisticsFilter {
  startDate?: string; // YYYY-MM-DD formátum
  endDate?: string;
  category?: string;
  store?: string;
  minAmount?: number;
  maxAmount?: number;
}

// Fő statisztika osztály
export class ReceiptStatistics {
  private receipts: ReceiptData[] = [];

  // Receipt adatok hozzáadása a statisztikához
  addReceipt(receipt: ReceiptData): void {
    this.receipts.push(receipt);
  }

  // Több receipt hozzáadása egyszerre
  addReceipts(receipts: ReceiptData[]): void {
    this.receipts.push(...receipts);
  }

  // Receipt adatok betöltése JSON-ból
  loadFromJSON(jsonData: string[]): void {
    this.receipts = [];
    jsonData.forEach(jsonString => {
      try {
        const data = JSON.parse(jsonString);
        if (data.metadata && data.items) {
          const receipt: ReceiptData = {
            items: data.items.map((item: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              name: item.name,
              quantity: item.quantity || 1,
              unit: item.unit || 'db',
              price: item.price || 0,
              category: item.category || 'Egyéb',
              checked: false
            })),
            total: data.metadata.totalAmount || 0,
            date: data.metadata.receiptDate,
            store: data.metadata.store
          };
          this.receipts.push(receipt);
        }
      } catch (error) {
        console.warn('Hibás JSON adat kihagyva:', error);
      }
    });
  }

  // Időalapú szűrés
  filterByTimeRange(startDate: string, endDate: string): ReceiptData[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.receipts.filter(receipt => {
      if (!receipt.date) return false;
      
      const receiptDate = this.parseReceiptDate(receipt.date);
      return receiptDate >= start && receiptDate <= end;
    });
  }

  // Havi statisztika generálása
  getMonthlyStatistics(year: number, month: number): TimeBasedStatistics {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
    
    return this.getStatisticsForPeriod(startDate, endDate, `${year}-${month.toString().padStart(2, '0')}`);
  }

  // Éves statisztika generálása
  getYearlyStatistics(year: number): TimeBasedStatistics {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    return this.getStatisticsForPeriod(startDate, endDate, year.toString());
  }

  // Egyedi időszak statisztika
  getStatisticsForPeriod(startDate: string, endDate: string, periodLabel: string): TimeBasedStatistics {
    const filteredReceipts = this.filterByTimeRange(startDate, endDate);
    
    // Termék aggregálás
    const productMap = new Map<string, ProductStatistics>();
    const categoryTotals = new Map<string, number>();
    const storeTotals = new Map<string, number>();
    
    let totalAmount = 0;
    let totalItems = 0;
    
    filteredReceipts.forEach(receipt => {
      totalAmount += receipt.total;
      
      // Store breakdown
      const storeTotal = storeTotals.get(receipt.store || 'Ismeretlen') || 0;
      storeTotals.set(receipt.store || 'Ismeretlen', storeTotal + receipt.total);
      
      receipt.items.forEach(item => {
        totalItems += item.quantity;
        
        // Category breakdown
        const categoryTotal = categoryTotals.get(item.category) || 0;
        categoryTotals.set(item.category, categoryTotal + (item.price * item.quantity));
        
        // Product aggregation
        const key = `${item.name}_${item.category}`;
        const existing = productMap.get(key);
        
        if (existing) {
          existing.totalQuantity += item.quantity;
          existing.totalAmount += item.price * item.quantity;
          existing.averagePrice = existing.totalAmount / existing.totalQuantity;
          existing.purchaseCount += 1;
          
          if (receipt.store && !existing.stores.includes(receipt.store)) {
            existing.stores.push(receipt.store);
          }
          
          if (receipt.date) {
            const receiptDate = this.parseReceiptDate(receipt.date);
            const lastDate = new Date(existing.lastPurchase);
            if (receiptDate > lastDate) {
              existing.lastPurchase = receipt.date;
            }
          }
        } else {
          productMap.set(key, {
            productName: item.name,
            category: item.category,
            totalQuantity: item.quantity,
            totalAmount: item.price * item.quantity,
            averagePrice: item.price,
            unit: item.unit,
            purchaseCount: 1,
            stores: receipt.store ? [receipt.store] : [],
            firstPurchase: receipt.date || '',
            lastPurchase: receipt.date || ''
          });
        }
      });
    });
    
    // Top termékek rendezése összeg szerint
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);
    
    return {
      period: periodLabel,
      totalAmount,
      totalItems,
      uniqueProducts: productMap.size,
      topProducts,
      categoryBreakdown: Object.fromEntries(categoryTotals),
      storeBreakdown: Object.fromEntries(storeTotals)
    };
  }

  // Termék specifikus statisztika
  getProductStatistics(productName: string, filter?: StatisticsFilter): ProductStatistics | null {
    let receipts = this.receipts;
    
    // Szűrés alkalmazása
    if (filter) {
      receipts = this.applyFilter(receipts, filter);
    }
    
    const productItems: { item: ReceiptItem; receipt: ReceiptData }[] = [];
    
    receipts.forEach(receipt => {
      receipt.items.forEach(item => {
        if (item.name.toLowerCase().includes(productName.toLowerCase())) {
          productItems.push({ item, receipt });
        }
      });
    });
    
    if (productItems.length === 0) return null;
    
    const firstItem = productItems[0].item;
    const stores = [...new Set(productItems.map(p => p.receipt.store).filter(Boolean))];
    const dates = productItems.map(p => p.receipt.date).filter(Boolean);
    
    const totalQuantity = productItems.reduce((sum, p) => sum + p.item.quantity, 0);
    const totalAmount = productItems.reduce((sum, p) => sum + (p.item.price * p.item.quantity), 0);
    
    return {
      productName: firstItem.name,
      category: firstItem.category,
      totalQuantity,
      totalAmount,
      averagePrice: totalAmount / totalQuantity,
      unit: firstItem.unit,
      purchaseCount: productItems.length,
      stores,
      firstPurchase: dates.length > 0 ? dates.sort()[0] : '',
      lastPurchase: dates.length > 0 ? dates.sort().reverse()[0] : ''
    };
  }

  // Kategória statisztika
  getCategoryStatistics(filter?: StatisticsFilter): { [category: string]: TimeBasedStatistics } {
    let receipts = this.receipts;
    
    if (filter) {
      receipts = this.applyFilter(receipts, filter);
    }
    
    const categories = new Set<string>();
    receipts.forEach(receipt => {
      receipt.items.forEach(item => categories.add(item.category));
    });
    
    const result: { [category: string]: TimeBasedStatistics } = {};
    
    categories.forEach(category => {
      const categoryReceipts = receipts.map(receipt => ({
        ...receipt,
        items: receipt.items.filter(item => item.category === category),
        total: receipt.items
          .filter(item => item.category === category)
          .reduce((sum, item) => sum + (item.price * item.quantity), 0)
      })).filter(receipt => receipt.items.length > 0);
      
      if (categoryReceipts.length > 0) {
        result[category] = this.getStatisticsForPeriod(
          filter?.startDate || '1900-01-01',
          filter?.endDate || '2100-12-31',
          category
        );
      }
    });
    
    return result;
  }

  // Szűrő alkalmazása
  private applyFilter(receipts: ReceiptData[], filter: StatisticsFilter): ReceiptData[] {
    return receipts.filter(receipt => {
      // Dátum szűrés
      if (filter.startDate || filter.endDate) {
        if (!receipt.date) return false;
        const receiptDate = this.parseReceiptDate(receipt.date);
        
        if (filter.startDate && receiptDate < new Date(filter.startDate)) return false;
        if (filter.endDate && receiptDate > new Date(filter.endDate)) return false;
      }
      
      // Üzlet szűrés
      if (filter.store && receipt.store !== filter.store) return false;
      
      // Összeg szűrés
      if (filter.minAmount && receipt.total < filter.minAmount) return false;
      if (filter.maxAmount && receipt.total > filter.maxAmount) return false;
      
      // Kategória szűrés (ha van olyan termék a receiptben)
      if (filter.category) {
        const hasCategory = receipt.items.some(item => item.category === filter.category);
        if (!hasCategory) return false;
      }
      
      return true;
    });
  }

  // Dátum parsing különböző formátumokhoz
  private parseReceiptDate(dateString: string): Date {
    // Próbáljuk meg különböző formátumokban
    const formats = [
      /(\d{4})[-\.\/](\d{1,2})[-\.\/](\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})[-\.\/](\d{1,2})[-\.\/](\d{4})/, // DD-MM-YYYY
    ];
    
    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        if (match[1].length === 4) {
          // YYYY-MM-DD formátum
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        } else {
          // DD-MM-YYYY formátum
          return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
        }
      }
    }
    
    // Fallback: próbáljuk meg a Date konstruktorral
    return new Date(dateString);
  }

  // Összes receipt törlése
  clear(): void {
    this.receipts = [];
  }

  // Receipt számának lekérdezése
  getReceiptCount(): number {
    return this.receipts.length;
  }

  // Összes termék számának lekérdezése
  getTotalItemCount(): number {
    return this.receipts.reduce((sum, receipt) => sum + receipt.items.length, 0);
  }
}

// Előre konfigurált statisztika példányok
export const receiptStatistics = new ReceiptStatistics();

// Segédfüggvények
export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('hu-HU')} Ft`;
};

export const formatQuantity = (quantity: number, unit: string): string => {
  return `${quantity} ${unit}`;
};

export const formatPeriod = (period: string): string => {
  if (period.match(/^\d{4}-\d{2}$/)) {
    const [year, month] = period.split('-');
    const monthNames = [
      'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
      'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }
  return period;
};
