import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  RefreshControl,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { processReceiptImage, exportToJSON, ReceiptData } from '../lib/receiptOCR';

interface BudgetItem {
  id: string;
  category: string;
  type: 'Szükséglet' | 'Vágyak' | 'Megtakarítás' | '';
  subcategory: string;
  amount: number;
}

interface BudgetCategory {
  name: string;
  items: BudgetItem[];
}

interface SavedBudget {
  id: string;
  user_id: string;
  budget_data: BudgetItem[];
  total_amount: number;
  name?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

interface IncomePlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  monthly_income: number;
  additional_incomes: string; // JSON string
  total_income: number;
  created_at: string;
  updated_at?: string;
}

// Bérkalkulátor típusok
interface SavedCalculation {
  id: string;
  family_member_id: string;
  alapber: number;
  ledolgozott_napok: number;
  brutto_ber: number;
  netto_ber: number;
  created_at: string;
  additional_incomes?: string;
}

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    display_name?: string;
  };
}

interface AdditionalIncome {
  id: string;
  name: string;
  amount: number;
}

interface SalaryResult {
  alapber: number;
  oraber: number;
  haviberesIdober: number;
  fizetettSzabadsag: number;
  tuloraAlapossszeg: number;
  tuloraPotlek: number;
  muszakpotlek: number;
  tuloraMuszakpotlek: number;
  unnepnapiMunka: number;
  betegszabadsag: number;
  kikuldetesTobblet: number;
  gyedMunkavMellett: number;
  formaruhakompenzacio: number;
  bruttoBer: number;
  osszesJarandsag: number;
  tbJarulék: number;
  nyugdijJarulék: number;
  onkentesNyugdij: number;
  erdekKepvTagdij: number;
  szja: number;
  szjaAlap: number;
  kedvezményesAlap: number;
  osszesLevonas: number;
  netto: number;
  szocHozzjarulas: number;
  teljesMunkaltaroiKoltseg: number;
  levonasArany: string;
  munkaltaroiTerhek: string;
}

// 2025-ös bérszámítási kulcsok - KORRIGÁLT értékek
const KULCSOK = {
  SZOCIALIS_HOZZAJARULAS: 0.135, // 13.5% (munkáltatói teher)
  TB_JARULÉK: 0.185, // 18.5% (munkavállalói járulék)
  NYUGDIJJARULÉK: 0.10, // 10% (500.000 Ft felett)
  SZJA_KULCS: 0.15, // 15% (egységes kulcs)
  ÖNKÉNTES_NYUGDIJ: 0.015, // 1.5% (dolgozói befizetés, adóalapot csökkenti) ✅ JAVÍTVA
  MUSZAKPOTLEK: 0.45, // 45% (műszakpótlék - túlórára is vonatkozik)
  TULORA_POTLEK: 1.0, // 0% (túlóra = 100% alapbér, pótlék csak műszakban)
  UNNEPNAPI_SZORZO: 1.0, // 100% (200%-hoz 100% hozzáadás)
  BETEGSZABADSAG_SZAZALEK: 0.70, // 70%
  GYED_NAPI: 13570, // GYED napi összeg 2025
  KIKULDETESI_POTLEK: 6710, // Kiküldetési pótlék
  ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK: 0.007 // 0.7% (adóalapot csökkenti) ✅ JAVÍTVA
};

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const createInitialBudgetData = (): BudgetCategory[] => [
  {
    name: 'Autó',
    items: [
      { id: generateId(), category: 'Autó', type: 'Szükséglet', subcategory: 'Üzemanyag', amount: 30000 },
      { id: generateId(), category: 'Autó', type: '', subcategory: 'Utazás', amount: 0 },
      { id: generateId(), category: 'Autó', type: '', subcategory: 'Szervíz', amount: 0 },
    ]
  },
  {
    name: 'Szórakozás',
    items: [
      { id: generateId(), category: 'Szórakozás', type: 'Vágyak', subcategory: 'Játék és Egyéb', amount: 0 },
      { id: generateId(), category: 'Szórakozás', type: '', subcategory: 'Szórakozás', amount: 50000 }
    ]
  },
  {
    name: 'Háztartás',
    items: [
      { id: generateId(), category: 'Háztartás', type: 'Szükséglet', subcategory: 'Élelmiszer', amount: 150000 },
      { id: generateId(), category: 'Háztartás', type: '', subcategory: 'Otthon', amount: 30000 }
    ]
  },
  {
    name: 'Hitel',
    items: [
      { id: generateId(), category: 'Hitel', type: 'Szükséglet', subcategory: 'Lakáshitel', amount: 120000 },
      { id: generateId(), category: 'Hitel', type: '', subcategory: 'Autóhitel', amount: 80000 }
    ]
  },
  {
    name: 'Rezsi',
    items: [
      { id: generateId(), category: 'Rezsi', type: 'Szükséglet', subcategory: 'Rezsi', amount: 80000 }
    ]
  },
  {
    name: 'Megtakarítás',
    items: [
      { id: generateId(), category: 'Megtakarítás', type: 'Megtakarítás', subcategory: 'Állampapír', amount: 0 },
      { id: generateId(), category: 'Megtakarítás', type: '', subcategory: 'Részvény', amount: 0 }
    ]
  },
  {
    name: 'Egészség',
    items: [
      { id: generateId(), category: 'Egészség', type: 'Szükséglet', subcategory: 'Gyógyszer', amount: 0 },
      { id: generateId(), category: 'Egészség', type: '', subcategory: 'Orvos', amount: 0 }
    ]
  },
  {
    name: 'Egyéb',
    items: [
      { id: generateId(), category: 'Egyéb', type: 'Vágyak', subcategory: 'Szépségápolás', amount: 0 },
      { id: generateId(), category: 'Egyéb', type: '', subcategory: 'Egyéb', amount: 20000 }
    ]
  }
];

const BudgetScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Költségvetés állapotok
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>(createInitialBudgetData());
  const [savedBudgets, setSavedBudgets] = useState<SavedBudget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [budgetDescription, setBudgetDescription] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [expectedIncome, setExpectedIncome] = useState<number>(0);
  const [incomePlans, setIncomePlans] = useState<IncomePlan[]>([]);
  const [selectedIncomeId, setSelectedIncomeId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{categoryIndex: number, itemIndex: number} | null>(null);

  // Bérkalkulátor állapotok
  const [users, setUsers] = useState<User[]>([]);
  const [familyMember, setFamilyMember] = useState("");
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [eredmény, setEredmény] = useState<SalaryResult | null>(null);
  
  // Bérkalkulátor input állapotok
  const [alapber, setAlapber] = useState(986400);
  const [ledolgozottNapok, setLedolgozottNapok] = useState(20);
  const [szabadsagNapok, setSzabadsagNapok] = useState(0);
  const [tuloraOrak, setTuloraOrak] = useState(0);
  const [unnepnapiOrak, setUnnepnapiOrak] = useState(0);
  const [betegszabadsagNapok, setBetegszabadsagNapok] = useState(0);
  const [kikuldetesNapok, setKikuldetesNapok] = useState(0);
  const [gyedMellett, setGyedMellett] = useState(30);
  const [formaruhakompenzacio, setFormaruhakompenzacio] = useState(0);
  const [családiAdókedvezmény, setCsaládiAdókedvezmény] = useState(500000);
  const [additionalIncomes, setAdditionalIncomes] = useState<AdditionalIncome[]>([]);
  
  // Modal állapotok
  const [activeTab, setActiveTab] = useState<'budget' | 'salary'>('budget');
  const [isFamilyMemberModalVisible, setIsFamilyMemberModalVisible] = useState(false);
  const [isAdditionalIncomeModalVisible, setIsAdditionalIncomeModalVisible] = useState(false);
  const [newIncome, setNewIncome] = useState({ name: '', amount: 0 });
  const [editingCalculation, setEditingCalculation] = useState<SavedCalculation | null>(null);
  const [isEditCalculationModalVisible, setIsEditCalculationModalVisible] = useState(false);
  const [isSaveCalculationModalVisible, setIsSaveCalculationModalVisible] = useState(false);
  const [calculationName, setCalculationName] = useState('');

  // OCR Receipt Scanner állapotok
  const [isReceiptScannerVisible, setIsReceiptScannerVisible] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Számított értékek
  const ledolgozottOrak = ledolgozottNapok * 8.1;
  const muszakpotlekOrak = ledolgozottOrak;
  const szabadsagOrak = szabadsagNapok * 8.1;

  // Felhasználó és adatok betöltése
  useEffect(() => {
    if (user) {
      loadData();
      loadUsers();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('BudgetScreen loadData: Loading started');

      // Timeout mechanizmus - ha 15 mp alatt nem tölt be, akkor leállítjuk a loading-ot
      const timeoutId = setTimeout(() => {
        console.error('BudgetScreen loadData: Loading timeout after 15 seconds');
        setLoading(false);
      }, 15000);

      // Mentett költségvetések betöltése
      console.log('BudgetScreen loadData: Loading budget plans');
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (budgetError) {
        console.error('BudgetScreen loadData: Budget error', budgetError);
        // Silent error handling
      } else {
        console.log('BudgetScreen loadData: Budget data loaded', budgetData?.length);
      }

      // Bevételi tervek betöltése
      console.log('BudgetScreen loadData: Loading income plans');
      const { data: incomeData, error: incomeError } = await supabase
        .from('income_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (incomeError) {
        console.error('BudgetScreen loadData: Income error', incomeError);
        // Silent error handling
      } else {
        console.log('BudgetScreen loadData: Income data loaded', incomeData?.length);
      }

      setSavedBudgets(budgetData || []);
      setIncomePlans(incomeData || []);

      // Ha van mentett költségvetés, betöltjük az elsőt
      if (budgetData && budgetData.length > 0) {
        console.log('BudgetScreen loadData: Loading first budget');
        loadBudget(budgetData[0]);
      }

      // Ha van bevételi terv, beállítjuk az elvárható jövedelmet
      if (incomeData && incomeData.length > 0) {
        setExpectedIncome(incomeData[0].total_income || 0);
        setSelectedIncomeId(incomeData[0].id);
        console.log('BudgetScreen loadData: Income set to', incomeData[0].total_income);
      }

      // Sikeres betöltés után töröljük a timeout-ot
      clearTimeout(timeoutId);
      console.log('BudgetScreen loadData: Loading completed successfully');

    } catch (error) {
      console.error('BudgetScreen loadData: Unexpected error', error);
      // Silent error handling
    } finally {
      setLoading(false);
      console.log('BudgetScreen loadData: Loading state set to false');
    }
  };

  // Felhasználók betöltése bérkalkulátorhoz
  const loadUsers = async () => {
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, display_name');
      
      if (error || !profilesData) {
        // Fallback statikus adatok
        const fallbackUsers = [
          { id: '1', email: 'janos@example.com', user_metadata: { full_name: 'János' } },
          { id: '2', email: 'eva@example.com', user_metadata: { full_name: 'Éva' } },
          { id: '3', email: 'peter@example.com', user_metadata: { full_name: 'Péter' } }
        ];
        setUsers(fallbackUsers);
        if (!familyMember) {
          setFamilyMember('1');
        }
      } else {
        const formattedUsers = profilesData.map(profile => ({
          id: profile.id,
          email: profile.email,
          user_metadata: {
            full_name: profile.full_name || profile.display_name,
            display_name: profile.display_name
          }
        }));
        setUsers(formattedUsers);
        
        if (!familyMember && formattedUsers.length > 0) {
          setFamilyMember(formattedUsers[0].id);
        }
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const loadBudget = (budget: SavedBudget) => {
    if (budget.budget_data) {
      // Konvertáljuk vissza kategóriás formátumra
      const categoryMap: { [key: string]: BudgetItem[] } = {};
      
      budget.budget_data.forEach(item => {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = [];
        }
        categoryMap[item.category].push(item);
      });

      const categories: BudgetCategory[] = Object.entries(categoryMap).map(([name, items]) => ({
        name,
        items
      }));

      setBudgetData(categories);
      setSelectedBudgetId(budget.id);
      setBudgetName(budget.name || '');
      setBudgetDescription(budget.description || '');
    }
  };

  // Összesítések számítása
  const calculateTotals = useCallback(() => {
    const allItems = budgetData.flatMap(category => category.items);
    const total = allItems.reduce((sum, item) => sum + item.amount, 0);
    
    const szuksegletTotal = allItems
      .filter(item => item.type === 'Szükséglet')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const vagyakTotal = allItems
      .filter(item => item.type === 'Vágyak')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const megtakaritasTotal = allItems
      .filter(item => item.type === 'Megtakarítás')
      .reduce((sum, item) => sum + item.amount, 0);

    return { total, szuksegletTotal, vagyakTotal, megtakaritasTotal };
  }, [budgetData]);

  // Összeg módosítása
  const updateAmount = (categoryIndex: number, itemIndex: number, newAmount: string) => {
    const amount = parseInt(newAmount.replace(/\s/g, '')) || 0;
    
    setBudgetData(prev => prev.map((category, catIdx) => 
      catIdx === categoryIndex 
        ? {
            ...category,
            items: category.items.map((item, itemIdx) => 
              itemIdx === itemIndex ? { ...item, amount } : item
            )
          }
        : category
    ));
  };

  // Tétel név módosítása
  const updateItemName = (categoryIndex: number, itemIndex: number, newName: string) => {
    setBudgetData(prev => prev.map((category, catIdx) => 
      catIdx === categoryIndex 
        ? {
            ...category,
            items: category.items.map((item, itemIdx) => 
              itemIdx === itemIndex ? { ...item, subcategory: newName } : item
            )
          }
        : category
    ));
  };

  // Tétel típus módosítása
  const updateItemType = (categoryIndex: number, itemIndex: number, newType: 'Szükséglet' | 'Vágyak' | 'Megtakarítás' | '') => {
    setBudgetData(prev => prev.map((category, catIdx) => 
      catIdx === categoryIndex 
        ? {
            ...category,
            items: category.items.map((item, itemIdx) => 
              itemIdx === itemIndex ? { ...item, type: newType } : item
            )
          }
        : category
    ));
  };

  // Új tétel hozzáadása
  const addItem = (categoryIndex: number, callback?: () => void) => {
    const newData = [...budgetData];
    const category = newData[categoryIndex];
    const newItem: BudgetItem = {
      id: generateId(),
      category: category.name,
      type: '',
      subcategory: 'Új tétel',
      amount: 0
    };
    newData[categoryIndex].items.push(newItem);
    setBudgetData(newData);
    
    // Execute callback after state update
    if (callback) {
      setTimeout(callback, 100);
    }
  };

  // Tétel eltávolítása
  const removeItem = (categoryIndex: number, itemIndex: number) => {
    const newData = [...budgetData];
    newData[categoryIndex].items.splice(itemIndex, 1);
    setBudgetData(newData);
  };

  // Kategória összegzése
  const getCategoryTotal = (category: BudgetCategory) => {
    return category.items.reduce((sum, item) => sum + item.amount, 0);
  };

  // Költségvetés mentése
  const saveBudget = async () => {
    if (!user) {
      Alert.alert('Hiba', 'Be kell jelentkezned a mentéshez!');
      return;
    }

    console.log('BudgetScreen: Saving budget with name:', budgetName);
    console.log('BudgetScreen: Selected budget ID:', selectedBudgetId);

    setIsLoading(true);
    try {
      const allItems = budgetData.flatMap(category => category.items);
      const { total } = calculateTotals();

      const budgetToSave = {
        user_id: user.id,
        budget_data: allItems,
        total_amount: total,
        name: budgetName || `Költségvetés ${new Date().toLocaleDateString('hu-HU')}`,
        description: budgetDescription || null
      };

      console.log('BudgetScreen: Budget to save:', budgetToSave);

      let data, error;

      if (selectedBudgetId) {
        // Meglévő költségvetés frissítése
        const updateResult = await supabase
          .from('budget_plans')
          .update(budgetToSave)
          .eq('id', selectedBudgetId)
          .select();
        
        data = updateResult.data;
        error = updateResult.error;
        
        if (!error) {
          Alert.alert('Siker', 'Költségvetés sikeresen frissítve!');
        }
      } else {
        // Új költségvetés létrehozása
        const insertResult = await supabase
          .from('budget_plans')
          .insert({
            ...budgetToSave,
            created_at: new Date().toISOString()
          })
          .select();
        
        data = insertResult.data;
        error = insertResult.error;
        
        if (!error && data && data.length > 0) {
          console.log('BudgetScreen: New budget saved successfully:', data[0]);
          Alert.alert('Siker', 'Új költségvetés sikeresen elmentve!');
          setSelectedBudgetId(data[0].id);
          // Frissítsük a mentett költségvetések listáját
          await loadData();
        }
      }

      if (error) {
        console.error('Hiba a mentés során:', error);
        Alert.alert('Hiba', 'Nem sikerült elmenteni a költségvetést');
      } else {
        // Adatok újra betöltése
        loadData();
        setShowSaveModal(false);
      }

    } catch (error) {
      console.error('Hiba a mentés során:', error);
      Alert.alert('Hiba', 'Nem sikerült elmenteni a költségvetést');
    } finally {
      setIsLoading(false);
    }
  };

  // Új költségvetés létrehozása
  const createNewBudget = () => {
    Alert.alert(
      'Új költségvetés',
      'Szeretnél új költségvetést létrehozni? Az aktuális módosítások elvesznek.',
      [
        {
          text: 'Mégse',
          style: 'cancel',
        },
        {
          text: 'Új költségvetés',
          style: 'destructive',
          onPress: () => {
            // Reset minden adat
            setBudgetData(createInitialBudgetData());
            setSelectedBudgetId('');
            setBudgetName('');
            setBudgetDescription('');
            Alert.alert('Új költségvetés', 'Új költségvetés létrehozva! Ne felejts el menteni.');
          },
        },
      ]
    );
  };

  // Költségvetés törlése
  const deleteBudget = async () => {
    if (!selectedBudgetId || !user) {
      Alert.alert('Hiba', 'Nincs kiválasztott költségvetés törölhető!');
      return;
    }

    Alert.alert(
      'Költségvetés törlése',
      'Biztosan törölni szeretnéd ezt a költségvetést? Ez a művelet nem vonható vissza.',
      [
        {
          text: 'Mégse',
          style: 'cancel',
        },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const { error } = await supabase
                .from('budget_plans')
                .delete()
                .eq('id', selectedBudgetId)
                .eq('user_id', user.id);

              if (error) {
                console.error('Hiba a törlés során:', error);
                Alert.alert('Hiba', 'Nem sikerült törölni a költségvetést');
              } else {
                Alert.alert('Siker', 'Költségvetés sikeresen törölve!');
                // Reset minden adat
                setBudgetData(createInitialBudgetData());
                setSelectedBudgetId('');
                setBudgetName('');
                setBudgetDescription('');
                setShowSaveModal(false);
                // Adatok újra betöltése
                loadData();
              }
            } catch (error) {
              console.error('Hiba a törlés során:', error);
              Alert.alert('Hiba', 'Nem sikerült törölni a költségvetést');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // OCR RECEIPT SCANNER FÜGGVÉNYEK

  // Kamera engedély ellenőrzése és kép készítése
  const handleReceiptScan = async () => {
    try {
      // Kamera engedély kérése
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Engedély szükséges',
          'A receipt scanner használatához engedélyezned kell a kamera hozzáférést.',
          [
            { text: 'Mégse', style: 'cancel' },
            { text: 'Beállítások', onPress: () => {} }
          ]
        );
        return;
      }

      // Kép készítése
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setReceiptImage(imageUri);
        setIsReceiptScannerVisible(true);
        
        // OCR feldolgozás indítása
        await processReceiptWithOCR(imageUri);
      }
    } catch (error) {
      console.error('Hiba a receipt scan során:', error);
      Alert.alert('Hiba', 'Nem sikerült elkészíteni a képet');
    }
  };

  // OCR feldolgozás
  const processReceiptWithOCR = async (imageUri: string) => {
    try {
      setIsProcessingReceipt(true);
      
      // OCR feldolgozás
      const result = await processReceiptImage(imageUri);
      setReceiptData(result);
      
      Alert.alert(
        'Receipt feldolgozva!',
        `${result.items.length} termék felismerve. Összeg: ${result.total.toLocaleString()} Ft\n\nHozzáadod a költségvetéshez?`,
        [
          { text: 'Mégse', style: 'cancel' },
          { text: 'Hozzáad', onPress: () => importReceiptToBudget(result) }
        ]
      );
      
    } catch (error) {
      console.error('OCR hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült feldolgozni a receipt képet');
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  // Receipt adatok importálása a költségvetésbe
  const importReceiptToBudget = (receiptData: ReceiptData) => {
    try {
      const newBudgetData = [...budgetData];
      
      // Minden termék hozzáadása a megfelelő kategóriához
      receiptData.items.forEach(item => {
        // Keressük meg a megfelelő kategóriát
        let categoryIndex = newBudgetData.findIndex(cat => cat.name === item.category);
        
        // Ha nincs ilyen kategória, hozzuk létre
        if (categoryIndex === -1) {
          newBudgetData.push({
            name: item.category,
            items: []
          });
          categoryIndex = newBudgetData.length - 1;
        }
        
        // Új budget item létrehozása
        const newBudgetItem: BudgetItem = {
          id: generateId(),
          category: item.category,
          type: 'Szükséglet', // Alapértelmezetten szükséglet
          subcategory: item.name,
          amount: item.price * item.quantity
        };
        
        newBudgetData[categoryIndex].items.push(newBudgetItem);
      });
      
      setBudgetData(newBudgetData);
      setIsReceiptScannerVisible(false);
      setReceiptImage(null);
      setReceiptData(null);
      
      Alert.alert('Siker', 'A receipt termékei sikeresen hozzáadva a költségvetéshez!');
      
    } catch (error) {
      console.error('Hiba a receipt import során:', error);
      Alert.alert('Hiba', 'Nem sikerült importálni a receipt adatokat');
    }
  };

  // Receipt JSON export
  const exportReceiptAsJSON = () => {
    if (!receiptData) return;
    
    try {
      const jsonString = exportToJSON(receiptData);
      
      Alert.alert(
        'JSON Export',
        'Receipt adatok JSON formátumban:\n\n' + jsonString.substring(0, 200) + '...',
        [
          { text: 'Bezár', style: 'cancel' },
          { text: 'Megosztás', onPress: () => {
            // Itt lehetne megosztási funkciót implementálni
          }}
        ]
      );
      
    } catch (error) {
      console.error('JSON export hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült exportálni a JSON adatokat');
    }
  };

  // BÉRKALKULÁTOR FÜGGVÉNYEK

  // Bérszámítás
  const calculateSalary = useCallback(() => {
    // Nullával való osztás elkerülése
    if (ledolgozottNapok === 0 || ledolgozottOrak === 0) {
      setEredmény(null);
      return;
    }

    const oraber = alapber / (ledolgozottNapok * 8.1); // Órabér számítása  
    
    // Járandóságok számítása
    const haviberesIdober = Math.round(oraber * ledolgozottOrak);
    const fizetettSzabadsag = Math.round(szabadsagOrak * oraber);
    
    // Túlóra számítás - 100% alapbér
    const tuloraAlapossszeg = Math.round(alapber / ledolgozottOrak * tuloraOrak);
    const tuloraPihenpnapos = tuloraOrak > 0 ? Math.round(tuloraAlapossszeg * 1.4) : 0; // 140% ünnepnapi túlóra
    const tuloraPotlek = Math.round(tuloraAlapossszeg * KULCSOK.TULORA_POTLEK); // 45% pótlék

    const muszakpotlek = Math.round(muszakpotlekOrak * oraber * KULCSOK.MUSZAKPOTLEK);
    const tuloraMuszakpotlek = Math.round(tuloraAlapossszeg * KULCSOK.MUSZAKPOTLEK); // 45% műszakpótlék túlórára
    const unnepnapiMunka = Math.round(unnepnapiOrak * oraber * KULCSOK.UNNEPNAPI_SZORZO);
    const betegszabadsag = Math.round(betegszabadsagNapok * (oraber * 8) * KULCSOK.BETEGSZABADSAG_SZAZALEK);
    const kikuldetesTobblet = Math.round(kikuldetesNapok * KULCSOK.KIKULDETESI_POTLEK);
    const gyedMunkavMellett = Math.round(gyedMellett * KULCSOK.GYED_NAPI);
    
    // Bruttó bér összesen
    const bruttoBer = haviberesIdober + fizetettSzabadsag + tuloraAlapossszeg + tuloraPihenpnapos +
                     muszakpotlek + tuloraMuszakpotlek + unnepnapiMunka + 
                     betegszabadsag + kikuldetesTobblet;

    // Összes járandóság
    const osszesJarandsag = bruttoBer + gyedMunkavMellett + formaruhakompenzacio;
    
    // TB járulék számítás - 18.5% bruttó bérből (maximálisan 1.200.000 Ft-ig)
    const tbJarulékAlap = Math.min(bruttoBer, 1200000);
    const tbJarulék = Math.round(tbJarulékAlap * KULCSOK.TB_JARULÉK);
    
    // Nyugdíjjárulék - 10% csak 500.000 Ft feletti bér esetén
    const nyugdijJarulék = bruttoBer > 500000 ? Math.round((bruttoBer - 500000) * KULCSOK.NYUGDIJJARULÉK) : 0;
    
    // Önkéntes nyugdíjpénztári befizetés - 1.5% (adóalapot csökkenti)
    const onkentesNyugdij = Math.round(bruttoBer * KULCSOK.ÖNKÉNTES_NYUGDIJ);
    
    // Érdekképviseleti tagdíj - 0.7% (adóalapot csökkenti)
    const erdekKepvTagdij = Math.round(bruttoBer * KULCSOK.ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK);
    
    // SZJA alap = bruttó bér + formaruhakomp. - TB járulék - nyugdíjjárulék - önkéntes nyugdíj
    const szjaAlap = bruttoBer + formaruhakompenzacio - tbJarulék - nyugdijJarulék - onkentesNyugdij;
    
    // Családi adókedvezmény alkalmazása
    const kedvezményesAlap = Math.max(0, szjaAlap - családiAdókedvezmény);
    
    // SZJA számítás - 15% az SZJA alapból
    const szjaBrutto = Math.round(kedvezményesAlap * KULCSOK.SZJA_KULCS);
    
    // Általános adókedvezmény levonása (2025-ben minimum 10.000 Ft)
    const altalnosAdoKedvezmeny = 0;
    const szja = Math.max(0, szjaBrutto - altalnosAdoKedvezmeny);
    
    // Összes levonás
    const osszesLevonas = tbJarulék + nyugdijJarulék + onkentesNyugdij + szja + erdekKepvTagdij;
    
    // Nettó fizetés
    const netto = osszesJarandsag - osszesLevonas;
    
    // Munkáltatói terhek
    const szocHozzjarulas = Math.round((bruttoBer + formaruhakompenzacio) * KULCSOK.SZOCIALIS_HOZZAJARULAS);
    const teljesMunkaltaroiKoltseg = osszesJarandsag + szocHozzjarulas;

    setEredmény({
      alapber,
      oraber: Math.round(oraber),
      haviberesIdober,
      fizetettSzabadsag,
      tuloraAlapossszeg,
      tuloraPotlek,
      muszakpotlek,
      tuloraMuszakpotlek,
      unnepnapiMunka,
      betegszabadsag,
      kikuldetesTobblet,
      gyedMunkavMellett,
      formaruhakompenzacio,
      bruttoBer,
      osszesJarandsag,
      tbJarulék,
      nyugdijJarulék,
      onkentesNyugdij,
      erdekKepvTagdij,
      szja,
      szjaAlap,
      kedvezményesAlap,
      osszesLevonas,
      netto,
      szocHozzjarulas,
      teljesMunkaltaroiKoltseg,
      levonasArany: ((osszesLevonas / osszesJarandsag) * 100).toFixed(1),
      munkaltaroiTerhek: ((szocHozzjarulas / osszesJarandsag) * 100).toFixed(1)
    });
  }, [alapber, ledolgozottOrak, szabadsagOrak, tuloraOrak, muszakpotlekOrak, 
      unnepnapiOrak, betegszabadsagNapok, kikuldetesNapok, gyedMellett, 
      formaruhakompenzacio, családiAdókedvezmény]);

  // Auto-calculate when values change
  useEffect(() => {
    calculateSalary();
  }, [calculateSalary]);

  // Mentett bérszámítások betöltése
  const fetchSavedCalculations = useCallback(async () => {
    if (!familyMember) return;
    
    try {
      const { data, error } = await supabase
        .from('salary_calculations')
        .select('*')
        .eq('family_member_id', familyMember)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching saved calculations:', error);
      } else {
        setSavedCalculations(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [familyMember]);

  useEffect(() => {
    fetchSavedCalculations();
  }, [fetchSavedCalculations]);

  // Bérszámítás mentése - modal megnyitása
  const handleSaveCalculation = async () => {
    if (!familyMember || !eredmény) {
      Alert.alert('Hiba', 'Kérjük válasszon családtagot és számítsa ki a bért!');
      return;
    }

    // Default név generálása
    const userName = users.find(u => u.id === familyMember)?.user_metadata?.full_name || 'Ismeretlen';
    const currentDate = new Date().toLocaleDateString('hu-HU', { month: 'long', year: 'numeric' });
    setCalculationName(`${userName} - ${currentDate}`);
    setIsSaveCalculationModalVisible(true);
  };

  // Tényleges mentés végrehajtása
  const saveCalculationWithName = async () => {
    if (!calculationName.trim()) {
      Alert.alert('Hiba', 'Kérjük adjon nevet a kalkulációnak!');
      return;
    }

    if (!familyMember || !eredmény || !user) {
      Alert.alert('Hiba', 'Hiányzó adatok!');
      return;
    }

    try {
      setIsLoading(true);
      
      const totalMonthlyIncome = getTotalMonthlyIncome();
      
      // 1. Bérkalkuláció mentése
      const calculationData = {
        family_member_id: familyMember,
        alapber,
        ledolgozott_napok: ledolgozottNapok,
        ledolgozott_orak: ledolgozottOrak,
        szabadsag_napok: szabadsagNapok,
        szabadsag_orak: szabadsagOrak,
        tulora_orak: tuloraOrak,
        muszakpotlek_orak: muszakpotlekOrak,
        unnepnapi_orak: unnepnapiOrak,
        betegszabadsag_napok: betegszabadsagNapok,
        kikuldes_napok: kikuldetesNapok,
        gyed_mellett: gyedMellett,
        formaruha_kompenzacio: formaruhakompenzacio,
        csaladi_adokedvezmeny: családiAdókedvezmény,
        brutto_ber: eredmény.bruttoBer,
        netto_ber: eredmény.netto,
        szja: eredmény.szja,
        tb_jarulék: eredmény.tbJarulék,
        szoc_hozzajarulas: eredmény.szocHozzjarulas,
        teljes_munkaltaroi_koltseg: eredmény.teljesMunkaltaroiKoltseg,
        additional_incomes: JSON.stringify(additionalIncomes),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: calcError } = await supabase
        .from('salary_calculations')
        .insert([calculationData])
        .select();

      if (calcError) {
        console.error('Error saving calculation:', calcError);
        Alert.alert('Hiba', 'Hiba történt a kalkuláció mentése során: ' + calcError.message);
        return;
      }

      // 2. Bevételi terv mentése/frissítése
      const incomeData = {
        user_id: user.id,
        name: calculationName,
        description: `Bérkalkuláció alapján: ${formatCurrency(eredmény.netto)} nettó bér + ${formatCurrency(additionalIncomes.reduce((sum, income) => sum + income.amount, 0))} egyéb jövedelem`,
        monthly_income: eredmény.netto, // Nettó bér
        additional_incomes: JSON.stringify(additionalIncomes), // Egyéb jövedelmek JSON-ként
        total_income: totalMonthlyIncome // Teljes havi jövedelem
      };

      const { error: incomeError } = await supabase
        .from('income_plans')
        .insert([incomeData])
        .select();

      if (incomeError) {
        console.error('Error saving income plan:', incomeError);
        // Ne dobjunk hibát, mert a kalkuláció már mentve van
      }

      // 3. Várható bevétel frissítése az aktuális komponensben
      setExpectedIncome(totalMonthlyIncome);
      
      Alert.alert('Siker', 'Kalkuláció és havi jövedelem sikeresen elmentve!');
      setIsSaveCalculationModalVisible(false);
      setCalculationName('');
      fetchSavedCalculations();
      loadData(); // Frissíti a bevételi terveket is

    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Hiba', 'Hiba történt a mentés során!');
    } finally {
      setIsLoading(false);
    }
  };

  // Egyéb jövedelem kezelése
  const addAdditionalIncome = () => {
    if (newIncome.name.trim() && newIncome.amount > 0) {
      setAdditionalIncomes([...additionalIncomes, {
        id: Date.now().toString(),
        name: newIncome.name,
        amount: newIncome.amount
      }]);
      setNewIncome({ name: '', amount: 0 });
      setIsAdditionalIncomeModalVisible(false);
      Alert.alert('Siker', 'Jövedelem hozzáadva!');
    } else {
      Alert.alert('Hiba', 'Kérjük töltse ki az összes mezőt!');
    }
  };

  const removeAdditionalIncome = (id: string) => {
    setAdditionalIncomes(additionalIncomes.filter(income => income.id !== id));
  };

  // Teljes havi bevétel számítása
  const getTotalMonthlyIncome = useCallback(() => {
    const nettoSalary = eredmény?.netto || 0;
    const additionalTotal = additionalIncomes.reduce((sum, income) => sum + income.amount, 0);
    return nettoSalary + additionalTotal;
  }, [eredmény, additionalIncomes]);

  // Kalkuláció törlése
  const deleteCalculation = async (calculationId: string) => {
    Alert.alert(
      'Kalkuláció törlése',
      'Biztosan törölni szeretnéd ezt a kalkulációt?',
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
              // Először megkeressük a kalkulációt
              const calculation = savedCalculations.find(calc => calc.id === calculationId);
              
              // Kalkuláció törlése
              const { error: calcError } = await supabase
                .from('salary_calculations')
                .delete()
                .eq('id', calculationId);

              if (calcError) {
                console.error('Error deleting calculation:', calcError);
                Alert.alert('Hiba', 'Nem sikerült törölni a kalkulációt');
                return;
              }

              // A kapcsolódó income plan-t a név alapján töröljük
              if (user) {
                // Megkeressük a kapcsolódó bevételi tervet az aktuálisan mentett név alapján
                const { error: incomeError } = await supabase
                  .from('income_plans')
                  .delete()
                  .eq('user_id', user.id)
                  .ilike('name', `%${new Date().toLocaleDateString('hu-HU', { month: 'long', year: 'numeric' })}%`);

                if (incomeError) {
                  console.warn('Error deleting related income plan:', incomeError);
                  // Ne dobjunk hibát, mert a fő kalkuláció már törölve van
                }
              }

              Alert.alert('Siker', 'Kalkuláció sikeresen törölve!');
              fetchSavedCalculations();
              loadData(); // Frissíti a bevételi terveket is
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Hiba', 'Hiba történt a törlés során!');
            }
          },
        },
      ]
    );
  };

  // Kalkuláció betöltése szerkesztéshez
  const loadCalculationForEdit = (calculation: SavedCalculation) => {
    setEditingCalculation(calculation);
    
    // Alapértékek beállítása a mentett kalkulációból
    setAlapber(calculation.alapber);
    setLedolgozottNapok(calculation.ledolgozott_napok);
    
    // Ha van additional_incomes mező, akkor azt is betöltjük
    if (calculation.additional_incomes) {
      try {
        const additionalIncomesData = JSON.parse(calculation.additional_incomes);
        setAdditionalIncomes(additionalIncomesData || []);
      } catch (error) {
        console.error('Error parsing additional incomes:', error);
        setAdditionalIncomes([]);
      }
    }
    
    Alert.alert('Kalkuláció betöltve', 'A kalkuláció adatai betöltésre kerültek. Módosítsd az értékeket és mentsd el újra.');
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await fetchSavedCalculations();
    setRefreshing(false);
  }, [fetchSavedCalculations]);

  // Render függvények
  const renderBudgetContent = () => {
    const { total, szuksegletTotal, vagyakTotal, megtakaritasTotal } = calculateTotals();
    const balance = expectedIncome - total;

    return (
      <>
        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceTitle}>Egyenleg</Text>
            <Text style={[styles.summaryAmount, balance >= 0 ? styles.positiveBalance : styles.negativeBalance]}>
              {formatCurrency(balance)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Várható bevétel</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(expectedIncome)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tervezett kiadás</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* Type Summary */}
        <View style={styles.typeSummaryContainer}>
          <Text style={styles.sectionTitle}>Kiadási típusok</Text>
          <View style={styles.typeRow}>
            <View style={styles.typeCard}>
              <View style={[styles.typeIndicator, { backgroundColor: getTypeColor('Szükséglet') }]} />
              <Text style={styles.typeLabel}>Szükséglet</Text>
              <Text style={styles.typeAmount}>{formatCurrency(szuksegletTotal)}</Text>
            </View>
            <View style={styles.typeCard}>
              <View style={[styles.typeIndicator, { backgroundColor: getTypeColor('Vágyak') }]} />
              <Text style={styles.typeLabel}>Vágyak</Text>
              <Text style={styles.typeAmount}>{formatCurrency(vagyakTotal)}</Text>
            </View>
            <View style={styles.typeCard}>
              <View style={[styles.typeIndicator, { backgroundColor: getTypeColor('Megtakarítás') }]} />
              <Text style={styles.typeLabel}>Megtakarítás</Text>
              <Text style={styles.typeAmount}>{formatCurrency(megtakaritasTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Budget Categories */}
        <View>
          {budgetData.map((category, categoryIndex) => (
            <View key={category.name} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                  <Ionicons name={getCategoryIcon(category.name) as any} size={20} color="#14B8A6" />
                  <Text style={styles.categoryTitle}>{category.name}</Text>
                </View>
                <Text style={styles.categoryTotal}>
                  {formatCurrency(getCategoryTotal(category))}
                </Text>
              </View>
              
              <View style={styles.itemsContainer}>
                {category.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemRow}
                    onPress={() => setEditingItem({ categoryIndex, itemIndex })}
                  >
                    <View style={styles.itemLeft}>
                      <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(item.type) }]} />
                      <Text style={styles.itemName}>{item.subcategory}</Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemAmountText}>{formatCurrency(item.amount)}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                ))}
                
                {/* Add new item button */}
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => {
                    console.log('💰 Adding new budget item to category:', categoryIndex);
                    console.log('📋 Category:', category.name);
                    
                    // Get the index before adding the item
                    const newItemIndex = category.items.length;
                    
                    console.log('🆕 New item will be created at index:', newItemIndex);
                    console.log('✅ About to add item and open edit modal');
                    
                    // Add item with callback to open modal after state update
                    addItem(categoryIndex, () => {
                      console.log('📝 Opening edit modal for new item at index:', newItemIndex);
                      setEditingItem({ categoryIndex, itemIndex: newItemIndex });
                    });
                  }}
                >
                  <Ionicons name="add" size={16} color="#14B8A6" />
                  <Text style={styles.addItemText}>Új tétel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </>
    );
  };

  const renderSalaryContent = () => (
    <>
      {/* Family Member Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Családtag</Text>
        <TouchableOpacity
          style={styles.familyMemberSelector}
          onPress={() => setIsFamilyMemberModalVisible(true)}
        >
          <Text style={styles.familyMemberText}>
            {users.find(u => u.id === familyMember)?.user_metadata?.full_name || 
             users.find(u => u.id === familyMember)?.email || 
             'Válassz családtagot'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Basic Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alapadatok</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Besorolási alapbér (Ft/hó)</Text>
          <TextInput
            style={styles.input}
            value={alapber.toString()}
            onChangeText={(text) => {
              const numValue = parseInt(text);
              if (!isNaN(numValue) || text === '') {
                setAlapber(isNaN(numValue) ? 0 : numValue);
              }
            }}
            keyboardType="numeric"
            placeholder="986400"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Családi adókedvezmény (Ft/hó)</Text>
          <TextInput
            style={styles.input}
            value={családiAdókedvezmény.toString()}
            onChangeText={(text) => {
              const numValue = parseInt(text);
              if (!isNaN(numValue) || text === '') {
                setCsaládiAdókedvezmény(isNaN(numValue) ? 0 : numValue);
              }
            }}
            keyboardType="numeric"
            placeholder="333330"
          />
          <Text style={styles.inputHint}>2 gyermek: 333.330 Ft</Text>
        </View>
      </View>

      {/* Working Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Munkaidő</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Ledolgozott napok</Text>
          <TextInput
            style={styles.input}
            value={ledolgozottNapok.toString()}
            onChangeText={(text) => {
              const numValue = parseFloat(text);
              if (!isNaN(numValue) || text === '') {
                setLedolgozottNapok(isNaN(numValue) ? 0 : numValue);
              }
            }}
            keyboardType="numeric"
            placeholder="20"
          />
          <Text style={styles.inputHint}>{ledolgozottOrak.toFixed(2)} óra (1 nap = 8,1 óra)</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Fizetett szabadság (nap)</Text>
          <TextInput
            style={styles.input}
            value={szabadsagNapok.toString()}
            onChangeText={(text) => {
              const numValue = parseFloat(text);
              if (!isNaN(numValue) || text === '') {
                setSzabadsagNapok(isNaN(numValue) ? 0 : numValue);
              }
            }}
            keyboardType="numeric"
            placeholder="0"
          />
          <Text style={styles.inputHint}>{szabadsagOrak.toFixed(2)} óra (1 nap = 8,1 óra)</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Túlóra (óra)</Text>
          <TextInput
            style={styles.input}
            value={tuloraOrak.toString()}
            onChangeText={(text) => {
              const numValue = parseFloat(text);
              if (!isNaN(numValue) || text === '') {
                setTuloraOrak(isNaN(numValue) ? 0 : numValue);
              }
            }}
            keyboardType="numeric"
            placeholder="0"
          />
          <Text style={styles.inputHint}>+100% pótlék (összesen 200%)</Text>
        </View>
      </View>

      {/* Other */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Egyéb</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Ünnepnapi munka (óra)</Text>
          <TextInput
            style={styles.input}
            value={unnepnapiOrak.toString()}
            onChangeText={(text) => setUnnepnapiOrak(parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="0"
          />
          <Text style={styles.inputHint}>+100% pótlék</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Betegszabadság (nap)</Text>
          <TextInput
            style={styles.input}
            value={betegszabadsagNapok.toString()}
            onChangeText={(text) => setBetegszabadsagNapok(parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="0"
          />
          <Text style={styles.inputHint}>70% térítés</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Kiküldetés (nap)</Text>
          <TextInput
            style={styles.input}
            value={kikuldetesNapok.toString()}
            onChangeText={(text) => setKikuldetesNapok(parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>GYED munkavégzés mellett (nap)</Text>
          <TextInput
            style={styles.input}
            value={gyedMellett.toString()}
            onChangeText={(text) => setGyedMellett(parseFloat(text) || 0)}
            keyboardType="numeric"
            placeholder="30"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Formaruha kompenzáció (Ft)</Text>
          <TextInput
            style={styles.input}
            value={formaruhakompenzacio.toString()}
            onChangeText={(text) => setFormaruhakompenzacio(parseInt(text) || 0)}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
      </View>

      {/* Results */}
      {eredmény && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eredmény</Text>
          
          <View style={styles.resultCard}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Órabér</Text>
              <Text style={styles.resultValue}>{formatCurrency(eredmény.oraber)}/óra</Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Bruttó bér összesen</Text>
              <Text style={[styles.resultValue, styles.greenText]}>{formatCurrency(eredmény.bruttoBer)}</Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Összes levonás</Text>
              <Text style={[styles.resultValue, styles.redText]}>-{formatCurrency(eredmény.osszesLevonas)}</Text>
              <Text style={styles.resultHint}>Levonások aránya: {eredmény.levonasArany}%</Text>
            </View>

            <View style={[styles.resultItem, styles.mainResult]}>
              <Text style={styles.resultLabel}>Nettó fizetés</Text>
              <Text style={[styles.resultValue, styles.blueText, styles.largeText]}>{formatCurrency(eredmény.netto)}</Text>
            </View>

            {/* Additional incomes */}
            <View style={styles.additionalIncomesSection}>
              <View style={styles.additionalIncomesHeader}>
                <Text style={styles.additionalIncomesTitle}>Egyéb jövedelmek</Text>
                <TouchableOpacity
                  style={styles.addIncomeButton}
                  onPress={() => setIsAdditionalIncomeModalVisible(true)}
                >
                  <Ionicons name="add" size={16} color="#14B8A6" />
                  <Text style={styles.addIncomeButtonText}>Hozzáad</Text>
                </TouchableOpacity>
              </View>

              {additionalIncomes.map((income) => (
                <View key={income.id} style={styles.incomeItem}>
                  <View style={styles.incomeInfo}>
                    <Text style={styles.incomeName}>{income.name}</Text>
                    <Text style={styles.incomeAmount}>{formatCurrency(income.amount)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeIncomeButton}
                    onPress={() => removeAdditionalIncome(income.id)}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {additionalIncomes.length > 0 && (
                <View style={styles.totalIncomeContainer}>
                  <Text style={styles.totalIncomeLabel}>Teljes havi bevétel:</Text>
                  <Text style={styles.totalIncomeValue}>{formatCurrency(getTotalMonthlyIncome())}</Text>
                  <View style={styles.totalIncomeBreakdown}>
                    <Text style={styles.totalIncomeBreakdownText}>Nettó bér: {formatCurrency(eredmény.netto)}</Text>
                    <Text style={styles.totalIncomeBreakdownText}>
                      Egyéb jövedelem: {formatCurrency(additionalIncomes.reduce((sum, income) => sum + income.amount, 0))}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Employer costs */}
            <View style={styles.employerCosts}>
              <Text style={styles.employerCostsTitle}>Munkáltatói terhek:</Text>
              <Text style={styles.employerCostsText}>
                Szoc. hozzájárulás: {formatCurrency(eredmény.szocHozzjarulas)}
              </Text>
              <Text style={styles.employerCostsTotal}>
                Teljes költség: {formatCurrency(eredmény.teljesMunkaltaroiKoltseg)}
              </Text>
            </View>

            {/* GYED info */}
            {eredmény.gyedMunkavMellett > 0 && (
              <View style={styles.gyedInfo}>
                <Text style={styles.gyedInfoTitle}>GYED munkavégzés mellett:</Text>
                <Text style={styles.gyedInfoText}>
                  Összeg: {formatCurrency(eredmény.gyedMunkavMellett)}
                </Text>
                <Text style={styles.gyedInfoNote}>
                  ✓ Adómentes juttatás (nem része az SZJA alapnak)
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Saved Calculations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Korábbi kalkulációk</Text>
        {savedCalculations.length > 0 ? (
          savedCalculations.map((calc) => (
            <View key={calc.id} style={styles.calculationCard}>
              <View style={styles.calculationHeader}>
                <View style={styles.calculationTitleContainer}>
                  <Text style={styles.calculationName}>
                    {`${users.find(u => u.id === calc.family_member_id)?.user_metadata?.full_name || 'Ismeretlen'} - ${new Date(calc.created_at).toLocaleDateString('hu-HU', { month: 'long' })}`}
                  </Text>
                  <Text style={styles.calculationDate}>
                    {new Date(calc.created_at).toLocaleDateString('hu-HU')}
                  </Text>
                </View>
                <View style={styles.calculationActions}>
                  <TouchableOpacity
                    style={styles.editCalculationButton}
                    onPress={() => loadCalculationForEdit(calc)}
                  >
                    <Ionicons name="pencil" size={16} color="#14B8A6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteCalculationButton}
                    onPress={() => deleteCalculation(calc.id)}
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.calculationDetails}>
                <View style={styles.calculationDetailRow}>
                  <Text style={styles.calculationDetailLabel}>Alapbér:</Text>
                  <Text style={styles.calculationDetailValue}>{calc.alapber.toLocaleString()} Ft</Text>
                </View>
                <View style={styles.calculationDetailRow}>
                  <Text style={styles.calculationDetailLabel}>Ledolgozott napok:</Text>
                  <Text style={styles.calculationDetailValue}>{calc.ledolgozott_napok} nap</Text>
                </View>
                <View style={styles.calculationDetailRow}>
                  <Text style={styles.calculationDetailLabel}>Bruttó bér:</Text>
                  <Text style={styles.calculationDetailValue}>{calc.brutto_ber.toLocaleString()} Ft</Text>
                </View>
                <View style={styles.calculationDetailRow}>
                  <Text style={styles.calculationDetailLabel}>Nettó bér:</Text>
                  <Text style={[styles.calculationDetailValue, styles.greenText]}>{calc.netto_ber.toLocaleString()} Ft</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calculator" size={64} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.emptyStateText}>Nincs mentett kalkuláció</Text>
            <Text style={styles.emptyStateSubtext}>
              Számítsd ki a bért és mentsd el a jobb felső sarokban található gombbal
            </Text>
          </View>
        )}
      </View>
    </>
  );

  // Format currency helper function
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Szükséglet': return '#10B981';
      case 'Vágyak': return '#F59E0B';
      case 'Megtakarítás': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'autó': return 'car';
      case 'szórakozás': return 'game-controller';
      case 'háztartás': return 'home';
      case 'hitel': return 'card';
      case 'rezsi': return 'flash';
      case 'megtakarítás': return 'wallet';
      case 'egészség': return 'medical';
      case 'egyéb': return 'ellipsis-horizontal';
      default: return 'list';
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#22D3EE', '#14B8A6', '#22C55E']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Betöltés...</Text>
            <TouchableOpacity 
              style={styles.skipLoadingButton}
              onPress={() => {
                console.log('BudgetScreen: User manually stopped loading');
                setLoading(false);
              }}
            >
              <Text style={styles.skipLoadingText}>Kihagyás</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#22D3EE', '#14B8A6', '#22C55E']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pénzügyek</Text>
          <View style={styles.headerButtons}>
            {activeTab === 'budget' ? (
              <>
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={handleReceiptScan}
                >
                  <Ionicons name="camera" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.newBudgetButton}
                  onPress={() => createNewBudget()}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.newBudgetText}>Új</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => setShowSaveModal(true)}
                >
                  <Ionicons name="save" size={24} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveCalculation}
                disabled={!eredmény}
              >
                <Ionicons name="save" size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'budget' && styles.activeTab]}
            onPress={() => setActiveTab('budget')}
          >
            <Ionicons 
              name="wallet" 
              size={20} 
              color={activeTab === 'budget' ? '#14B8A6' : '#9CA3AF'} 
            />
            <Text style={[styles.tabText, activeTab === 'budget' && styles.activeTabText]}>
              Költségvetés
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'salary' && styles.activeTab]}
            onPress={() => setActiveTab('salary')}
          >
            <Ionicons 
              name="calculator" 
              size={20} 
              color={activeTab === 'salary' ? '#14B8A6' : '#9CA3AF'} 
            />
            <Text style={[styles.tabText, activeTab === 'salary' && styles.activeTabText]}>
              Bérkalkulátor
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'budget' ? renderBudgetContent() : renderSalaryContent()}
        </ScrollView>

        {/* Save Modal */}
        <Modal
          visible={showSaveModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSaveModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Költségvetés mentése</Text>
                <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Költségvetés neve"
                value={budgetName}
                onChangeText={setBudgetName}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Leírás (opcionális)"
                value={budgetDescription}
                onChangeText={setBudgetDescription}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                {selectedBudgetId && (
                  <TouchableOpacity
                    style={styles.deleteModalButton}
                    onPress={deleteBudget}
                    disabled={isLoading}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.deleteModalText}>Törlés</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.saveActionButton, selectedBudgetId && styles.saveActionButtonFlex]}
                  onPress={saveBudget}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="save" size={20} color="white" />
                      <Text style={styles.saveActionText}>
                        {selectedBudgetId ? 'Frissítés' : 'Mentés'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Item Modal */}
        {editingItem && 
         budgetData[editingItem.categoryIndex] && 
         budgetData[editingItem.categoryIndex].items[editingItem.itemIndex] && (
          <Modal
            visible={true}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setEditingItem(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tétel szerkesztése</Text>
                  <TouchableOpacity onPress={() => setEditingItem(null)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Tétel neve */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Tétel neve</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Tétel neve"
                      value={budgetData[editingItem.categoryIndex].items[editingItem.itemIndex]?.subcategory || ''}
                      onChangeText={(text) => updateItemName(editingItem.categoryIndex, editingItem.itemIndex, text)}
                    />
                  </View>

                  {/* Összeg */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Összeg (Ft)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      value={budgetData[editingItem.categoryIndex].items[editingItem.itemIndex]?.amount?.toString() || '0'}
                      onChangeText={(text) => updateAmount(editingItem.categoryIndex, editingItem.itemIndex, text)}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Típus választó */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Típus</Text>
                    <View style={styles.typeSelector}>
                      {(['', 'Szükséglet', 'Vágyak', 'Megtakarítás'] as const).map((typeOption) => (
                        <TouchableOpacity
                          key={typeOption}
                          style={[
                            styles.typeOption,
                            budgetData[editingItem.categoryIndex].items[editingItem.itemIndex]?.type === typeOption && styles.activeTypeOption
                          ]}
                          onPress={() => updateItemType(editingItem.categoryIndex, editingItem.itemIndex, typeOption)}
                        >
                          <View style={[
                            styles.typeOptionIndicator,
                            { backgroundColor: getTypeColor(typeOption || 'default') }
                          ]} />
                          <Text style={[
                            styles.typeOptionText,
                            budgetData[editingItem.categoryIndex].items[editingItem.itemIndex].type === typeOption && styles.activeTypeOptionText
                          ]}>
                            {typeOption || 'Nincs típus'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Kategória info (csak olvasható) */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Kategória</Text>
                    <View style={styles.readOnlyField}>
                      <Ionicons 
                        name={getCategoryIcon(budgetData[editingItem.categoryIndex].name) as any} 
                        size={20} 
                        color="#14B8A6" 
                      />
                      <Text style={styles.readOnlyText}>
                        {budgetData[editingItem.categoryIndex].name}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      removeItem(editingItem.categoryIndex, editingItem.itemIndex);
                      setEditingItem(null);
                    }}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.deleteButtonText}>Törlés</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => setEditingItem(null)}
                  >
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.confirmButtonText}>Mentés</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Family Member Selection Modal */}
        <Modal
          visible={isFamilyMemberModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsFamilyMemberModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Családtag választása</Text>
                <TouchableOpacity onPress={() => setIsFamilyMemberModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                {users.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.familyMemberOption,
                      familyMember === user.id && styles.activeFamilyMemberOption
                    ]}
                    onPress={() => {
                      setFamilyMember(user.id);
                      setIsFamilyMemberModalVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.familyMemberOptionText,
                      familyMember === user.id && styles.activeFamilyMemberOptionText
                    ]}>
                      {user.user_metadata?.full_name || user.email}
                    </Text>
                    {familyMember === user.id && (
                      <Ionicons name="checkmark" size={20} color="#14B8A6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Additional Income Modal */}
        <Modal
          visible={isAdditionalIncomeModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsAdditionalIncomeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Új jövedelem hozzáadása</Text>
                <TouchableOpacity onPress={() => setIsAdditionalIncomeModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Megnevezés</Text>
                  <TextInput
                    style={styles.input}
                    value={newIncome.name}
                    onChangeText={(text) => setNewIncome({ ...newIncome, name: text })}
                    placeholder="pl. Családi pótlék"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Összeg (Ft/hó)</Text>
                  <TextInput
                    style={styles.input}
                    value={newIncome.amount.toString()}
                    onChangeText={(text) => setNewIncome({ ...newIncome, amount: parseInt(text) || 0 })}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => setIsAdditionalIncomeModalVisible(false)}
                >
                  <Text style={styles.cancelModalText}>Mégse</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveModalButton}
                  onPress={addAdditionalIncome}
                >
                  <Text style={styles.saveModalText}>Hozzáad</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Save Calculation Modal */}
        <Modal
          visible={isSaveCalculationModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsSaveCalculationModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Kalkuláció mentése</Text>
                <TouchableOpacity onPress={() => setIsSaveCalculationModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Kalkuláció neve</Text>
                  <TextInput
                    style={styles.input}
                    value={calculationName}
                    onChangeText={setCalculationName}
                    placeholder="Pl. János - 2025 január"
                  />
                </View>
                
                <View style={styles.saveSummaryContainer}>
                  <Text style={styles.saveSummaryTitle}>Összefoglaló:</Text>
                  {eredmény && (
                    <>
                      <Text style={styles.saveSummaryText}>Nettó bér: {formatCurrency(eredmény.netto)}</Text>
                      <Text style={styles.saveSummaryText}>
                        Egyéb jövedelem: {formatCurrency(additionalIncomes.reduce((sum, income) => sum + income.amount, 0))}
                      </Text>
                      <Text style={styles.saveSummaryTotal}>
                        Teljes havi jövedelem: {formatCurrency(getTotalMonthlyIncome())}
                      </Text>
                      <Text style={styles.saveSummaryNote}>
                        ✓ Ez a kalkuláció egyben havi bevételi tervként is mentésre kerül
                      </Text>
                    </>
                  )}
                </View>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => setIsSaveCalculationModalVisible(false)}
                >
                  <Text style={styles.cancelModalText}>Mégse</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveModalButton}
                  onPress={saveCalculationWithName}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveModalText}>Mentés</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* OCR Receipt Scanner Modal */}
        <Modal
          visible={isReceiptScannerVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setIsReceiptScannerVisible(false);
            setReceiptImage(null);
            setReceiptData(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.receiptModalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Receipt Scanner</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setIsReceiptScannerVisible(false);
                    setReceiptImage(null);
                    setReceiptData(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.receiptModalBody}>
                {receiptImage && (
                  <View style={styles.receiptImageContainer}>
                    <Text style={styles.receiptImageTitle}>Elkészített kép:</Text>
                    <View style={styles.receiptImagePlaceholder}>
                      <Ionicons name="image" size={64} color="#9CA3AF" />
                      <Text style={styles.receiptImagePath}>
                        {receiptImage.split('/').pop()}
                      </Text>
                    </View>
                  </View>
                )}

                {isProcessingReceipt && (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="large" color="#14B8A6" />
                    <Text style={styles.processingText}>Receipt feldolgozása...</Text>
                    <Text style={styles.processingSubtext}>
                      A kép elemzése és a termékek felismerése folyamatban
                    </Text>
                  </View>
                )}

                {receiptData && !isProcessingReceipt && (
                  <View style={styles.receiptResultsContainer}>
                    <Text style={styles.receiptResultsTitle}>
                      Felismert termékek ({receiptData.items.length} db):
                    </Text>
                    
                    {receiptData.store && (
                      <View style={styles.receiptStoreInfo}>
                        <Ionicons name="storefront" size={16} color="#14B8A6" />
                        <Text style={styles.receiptStoreText}>{receiptData.store}</Text>
                      </View>
                    )}

                    <View style={styles.receiptItemsList}>
                      {receiptData.items.map((item, index) => (
                        <View key={index} style={styles.receiptItem}>
                          <View style={styles.receiptItemInfo}>
                            <Text style={styles.receiptItemName}>{item.name}</Text>
                            <Text style={styles.receiptItemCategory}>{item.category}</Text>
                          </View>
                          <View style={styles.receiptItemPrice}>
                            <Text style={styles.receiptItemQuantity}>
                              {item.quantity} {item.unit}
                            </Text>
                            <Text style={styles.receiptItemAmount}>
                              {(item.price * item.quantity).toLocaleString()} Ft
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    <View style={styles.receiptTotalContainer}>
                      <Text style={styles.receiptTotalLabel}>Összesen:</Text>
                      <Text style={styles.receiptTotalAmount}>
                        {receiptData.total.toLocaleString()} Ft
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {receiptData && !isProcessingReceipt && (
                <View style={styles.receiptModalActions}>
                  <TouchableOpacity
                    style={styles.receiptExportButton}
                    onPress={exportReceiptAsJSON}
                  >
                    <Ionicons name="download" size={16} color="#6366F1" />
                    <Text style={styles.receiptExportText}>JSON Export</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.receiptImportButton}
                    onPress={() => importReceiptToBudget(receiptData)}
                  >
                    <Ionicons name="add" size={16} color="white" />
                    <Text style={styles.receiptImportText}>Költségvetéshez ad</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  skipLoadingButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipLoadingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  cameraButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
    marginRight: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newBudgetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newBudgetText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  typeSummaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
    padding: 12,
  },
  typeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  typeAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  categoriesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryContainer: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  categoryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  itemAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemAmountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  addItemText: {
    fontSize: 14,
    color: '#14B8A6',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveActionButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteModalText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveActionButtonFlex: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#14B8A6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: 400,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  typeSelector: {
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  activeTypeOption: {
    borderColor: '#14B8A6',
    backgroundColor: '#F0FDFA',
  },
  typeOptionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  typeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  activeTypeOptionText: {
    color: '#14B8A6',
    fontWeight: '500',
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 8,
  },
  readOnlyText: {
    fontSize: 14,
    color: '#666',
  },
  
  // Tab navigation styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    margin: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#14B8A6',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },

  
  // Balance styles
  balanceContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceTitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  positiveBalance: {
    color: '#10B981',
  },
  negativeBalance: {
    color: '#EF4444',
  },
  
  // Categories styles
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  itemsContainer: {
    marginTop: 8,
  },
  
  // Salary calculator styles
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  familyMemberSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  familyMemberText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  inputHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    color: '#666',
    fontSize: 14,
  },
  resultValue: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  resultHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  mainResult: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  greenText: {
    color: '#4ADE80',
  },
  redText: {
    color: '#EF4444',
  },
  blueText: {
    color: '#14B8A6',
  },
  largeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  additionalIncomesSection: {
    marginTop: 16,
  },
  additionalIncomesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  additionalIncomesTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addIncomeButton: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#14B8A6',
    borderStyle: 'dashed',
  },
  addIncomeButtonText: {
    color: '#14B8A6',
    fontSize: 16,
    fontWeight: '600',
  },
  incomeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  incomeInfo: {
    flex: 1,
  },
  incomeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  incomeAmount: {
    color: '#14B8A6',
    fontSize: 14,
    marginTop: 2,
  },
  removeIncomeButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 8,
    marginLeft: 12,
  },
  totalIncomeContainer: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  totalIncomeLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  totalIncomeValue: {
    color: '#14B8A6',
    fontSize: 24,
    fontWeight: '700',
  },
  totalIncomeBreakdown: {
    marginTop: 8,
    alignItems: 'center',
  },
  totalIncomeBreakdownText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  employerCosts: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  employerCostsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  employerCostsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  employerCostsTotal: {
    color: '#14B8A6',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  gyedInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  gyedInfoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  gyedInfoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  gyedInfoNote: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  calculationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  calculationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calculationName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  calculationDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  calculationDetails: {
    marginTop: 8,
  },
  calculationDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  calculationDetailLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  calculationDetailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  familyMemberOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeFamilyMemberOption: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  familyMemberOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  activeFamilyMemberOptionText: {
    color: '#14B8A6',
  },
  cancelModalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 12,
  },
  cancelModalText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  saveModalButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  saveModalText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  calculationTitleContainer: {
    flex: 1,
  },
  calculationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editCalculationButton: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderRadius: 8,
    padding: 8,
  },
  deleteCalculationButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 8,
  },
  saveSummaryContainer: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  saveSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  saveSummaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  saveSummaryTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14B8A6',
    marginTop: 8,
    marginBottom: 8,
  },
  saveSummaryNote: {
    fontSize: 12,
    color: '#10B981',
    fontStyle: 'italic',
  },
  
  // OCR Receipt Scanner Styles
  receiptModalContent: {
    maxHeight: '90%',
  },
  receiptModalBody: {
    maxHeight: 400,
  },
  receiptImageContainer: {
    marginBottom: 20,
  },
  receiptImageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  receiptImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  receiptImagePath: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  receiptResultsContainer: {
    marginTop: 20,
  },
  receiptResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  receiptStoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  receiptStoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803D',
    marginLeft: 8,
  },
  receiptItemsList: {
    marginBottom: 16,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  receiptItemInfo: {
    flex: 1,
  },
  receiptItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  receiptItemCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  receiptItemPrice: {
    alignItems: 'flex-end',
  },
  receiptItemQuantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  receiptItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  receiptTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  receiptTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  receiptTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  receiptModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  receiptExportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  receiptExportText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 4,
  },
  receiptImportButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    padding: 12,
    borderRadius: 8,
  },
  receiptImportText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
});

export default BudgetScreen;
