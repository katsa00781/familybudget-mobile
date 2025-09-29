import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SalaryCalculator } from '../lib/salaryCalculator';
import { SalaryCalculationInput } from '../types/salary';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

// 2025-ös bérszámítási kulcsok - BudgetScreen.tsx-ből másolva
const KULCSOK = {
  SZOCIALIS_HOZZAJARULAS: 0.135, // 13.5% (munkáltatói teher)
  TB_JARULÉK: 0.185, // 18.5% (munkavállalói járulék)
  NYUGDIJJARULÉK: 0.10, // 10% (500.000 Ft felett)
  SZJA_KULCS: 0.15, // 15% (egységes kulcs)
  ÖNKÉNTES_NYUGDIJ: 0.015, // 1.5% (dolgozói befizetés, adóalapot csökkenti)
  MUSZAKPOTLEK: 0.45, // 45% (műszakpótlék - túlórára is vonatkozik)
  TULORA_POTLEK: 0.00, // 0% (túlóra = 100% alapbér, NINCS extra túlórapótlék)
  UNNEPNAPI_SZORZO: 1.0, // 100% (200%-hoz 100% hozzáadás)
  BETEGSZABADSAG_SZAZALEK: 0.70, // 70%
  GYED_NAPI: 13570, // GYED napi összeg 2025
  KIKULDETESI_POTLEK: 6710, // Kiküldetési pótlék
  ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK: 0.007 // 0.7% (adóalapot csökkenti)
};

interface SalaryCalculation {
  grossSalary: number;
  netSalary: number;
  personalTax: number;
  socialSecurity: number;
  pensionContribution: number;
  voluntaryPension: number;
  unionFee: number;
  totalDeductions: number;
}

interface SavedCalculation {
  id: string;
  family_member_id: string;
  alapber: number;
  ledolgozott_napok: number;
  tulora_orak: number;
  muszakpotlek_orak: number;
  csaladi_adokedvezmeny: number;
  formaruha_kompenzacio: number;
  brutto_ber: number;
  netto_ber: number;
  szja: number;
  tb_jarulék: number;
  created_at: string;
  additional_incomes?: string;
  name?: string;
  description?: string;
}

export default function SalaryCalculatorScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  // Számítási input mezők
  const [grossSalary, setGrossSalary] = useState('');
  const [workingDays, setWorkingDays] = useState('20');
  const [overtimeHours, setOvertimeHours] = useState('');
  const [nightShiftHours, setNightShiftHours] = useState('');
  const [familyAllowance, setFamilyAllowance] = useState('');
  const [otherIncome, setOtherIncome] = useState('');
  const [calculation, setCalculation] = useState<any>(null);
  
  // Mentett számítások
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [isLoadingCalculations, setIsLoadingCalculations] = useState(false);
  
  // Nincs szükség további state-ekre, mivel a tábla nem támogatja a névadást

    const loadSavedCalculations = async () => {
    if (!user) return;

    try {
      console.log('Loading saved calculations for user:', user.id);
      
      const { data, error } = await supabase
        .from('income_plans')
        .select('*')
        .eq('user_id', user.id)
        .ilike('name', '%Bérkalkuláció%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading saved calculations:', error);
        return;
      }

      console.log('Loaded income plans data:', data);

      if (data) {
        // Konvertáljuk az income_plans rekordokat SavedCalculation formátumra
        const converted = data.map(plan => {
          let calculationDetails = null;
          try {
            const additionalIncomes = JSON.parse(plan.additional_incomes || '[]');
            calculationDetails = additionalIncomes[0] || {};
          } catch (e) {
            console.error('Error parsing additional_incomes:', e);
            calculationDetails = {};
          }

          return {
            id: plan.id,
            family_member_id: plan.user_id,
            alapber: calculationDetails.alapber || 0,
            ledolgozott_napok: calculationDetails.ledolgozott_napok || 20,
            brutto_ber: calculationDetails.brutto_ber || plan.monthly_income,
            netto_ber: plan.monthly_income,
            created_at: plan.created_at,
            additional_incomes: plan.additional_incomes,
            name: plan.name,
            description: plan.description,
            tulora_orak: calculationDetails.tulora_orak || 0,
            muszakpotlek_orak: calculationDetails.muszakpotlek_orak || 0,
            csaladi_adokedvezmeny: calculationDetails.csaladi_adokedvezmeny || 0,
            formaruha_kompenzacio: calculationDetails.formaruha_kompenzacio || 0,
            szja: calculationDetails.szja || 0,
            tb_jarulék: calculationDetails.tb_jarulék || 0,
          };
        });

        console.log('Converted calculations:', converted);
        setSavedCalculations(converted);
      }
    } catch (error) {
      console.error('Error loading saved calculations:', error);
    }
  };

  // Mentett számítások betöltése csak amikor user létezik
  useEffect(() => {
    loadSavedCalculations();
  }, [loadSavedCalculations]);

  const saveCalculation = async () => {
    if (!user || !calculation) {
      Alert.alert('Hiba', 'Nincs számítás mentésre');
      return;
    }

    try {
      const alapber = parseFloat(grossSalary) || 0;
      const napok = parseFloat(workingDays) || 20;
      
      // Számítás adatok a további felhasználáshoz (JSON string formában)
      const calculationDetails = {
        alapber: alapber,
        ledolgozott_napok: napok,
        tulora_orak: parseFloat(overtimeHours) || 0,
        muszakpotlek_orak: parseFloat(nightShiftHours) || 0,
        csaladi_adokedvezmeny: parseFloat(familyAllowance) || 0,
        formaruha_kompenzacio: parseFloat(otherIncome) || 0,
        brutto_ber: calculation.grossSalary,
        szja: calculation.personalTax,
        tb_jarulék: calculation.socialSecurity,
      };

      // Mentés az income_plans táblába
      const incomeData = {
        user_id: user.id,
        name: `Bérkalkuláció - ${new Date().toLocaleDateString('hu-HU')}`,
        description: `Alapbér: ${alapber} Ft, Napok: ${napok}, Túlóra: ${parseFloat(overtimeHours) || 0}h`,
        monthly_income: calculation.netSalary,
        additional_incomes: JSON.stringify([calculationDetails]),
        total_income: calculation.netSalary,
      };

      const { error } = await supabase
        .from('income_plans')
        .insert([incomeData]);

      if (error) {
        console.error('Hiba a számítás mentésekor:', error);
        Alert.alert('Hiba', 'Nem sikerült menteni a számítást');
      } else {
        Alert.alert('Siker', 'Számítás sikeresen mentve');
        loadSavedCalculations();
      }
    } catch (error) {
      console.error('Hiba a számítás mentésekor:', error);
      Alert.alert('Hiba', 'Nem sikerült menteni a számítást');
    }
  };

  const loadCalculation = (savedCalc: SavedCalculation) => {
    setGrossSalary(savedCalc.alapber.toString());
    setWorkingDays(savedCalc.ledolgozott_napok.toString());
    setOvertimeHours(savedCalc.tulora_orak?.toString() || '0');
    setNightShiftHours(savedCalc.muszakpotlek_orak?.toString() || '0');
    setFamilyAllowance(savedCalc.csaladi_adokedvezmeny?.toString() || '0');
    setOtherIncome(savedCalc.formaruha_kompenzacio?.toString() || '0');
    
    // Betöltjük az eredményeket is
    setCalculation({
      grossSalary: savedCalc.brutto_ber,
      netSalary: savedCalc.netto_ber,
      personalTax: savedCalc.szja,
      socialSecurity: savedCalc.tb_jarulék,
      pensionContribution: 0, // Ez nincs külön tárolva
      voluntaryPension: 0,
      unionFee: 0,
      totalDeductions: savedCalc.brutto_ber - savedCalc.netto_ber,
    });
  };



  const deleteCalculation = async (id: string) => {
    Alert.alert(
      'Törlés',
      'Biztosan törölni szeretné ezt a számítást?',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('income_plans')
                .delete()
                .eq('id', id);

              if (error) {
                console.error('Hiba a törléskor:', error);
                Alert.alert('Hiba', 'Nem sikerült törölni a számítást');
              } else {
                loadSavedCalculations();
              }
            } catch (error) {
              console.error('Hiba a törléskor:', error);
              Alert.alert('Hiba', 'Nem sikerült törölni a számítást');
            }
          },
        },
      ]
    );
  };

  const calculateSalary = () => {
    const alapber = parseFloat(grossSalary) || 0;
    const munkanapok = parseFloat(workingDays) || 20;
    const tulora = parseFloat(overtimeHours) || 0;
    const muszakpotlek = parseFloat(nightShiftHours) || 0;
    const csaladi_kedv = parseFloat(familyAllowance) || 0;
    const egyeb_jovedelem = parseFloat(otherIncome) || 0;

    // Készítsük el a bemenő adatokat a lib/salaryCalculator alapján
    const input: SalaryCalculationInput = {
      alapber: alapber,
      ledolgozott_napok: munkanapok,
      ledolgozott_orak: munkanapok * 8.1, // 8,1 óra/nap (magyar munkaügyi szabályozás)
      tulora_orak: tulora,
      muszakpotlek_orak: muszakpotlek,
      formaruha_kompenzacio: egyeb_jovedelem,
      csaladi_adokedvezmeny: csaladi_kedv,
    };

    // Számítsuk ki a bért a helyes kalkulátorral
    const result = SalaryCalculator.calculateComplete(input);

    setCalculation({
      grossSalary: result.brutto_ber + (result.formaruha_kompenzacio || 0),
      netSalary: result.netto_ber,
      personalTax: result.szja,
      socialSecurity: result.tb_jarulék,
      pensionContribution: result.nyugdijjarulék,
      voluntaryPension: result.onkentes_nyugdij,
      unionFee: result.erdekKepv_tagdij,
      totalDeductions: result.osszes_levonas,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };



  return (
    <LinearGradient
      colors={['#22D3EE', '#14B8A6', '#22C55E']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0891b2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Részletes Magyar Bérkalkulátor 2025</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Alapadatok */}
        <View style={styles.section}>
          <Text style={styles.sectionIcon}>🏠</Text>
          <Text style={styles.sectionTitle}>Alapadatok</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Alapbér (Ft/hó)</Text>
            <TextInput
              style={styles.input}
              value={grossSalary}
              onChangeText={setGrossSalary}
              placeholder="pl. 400000"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ledolgozott napok</Text>
            <TextInput
              style={styles.input}
              value={workingDays}
              onChangeText={setWorkingDays}
              placeholder="22"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Túlórák (óra)</Text>
            <TextInput
              style={styles.input}
              value={overtimeHours}
              onChangeText={setOvertimeHours}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Műszakpótlék (óra)</Text>
            <TextInput
              style={styles.input}
              value={nightShiftHours}
              onChangeText={setNightShiftHours}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Családi adókedvezmény (Ft)</Text>
            <TextInput
              style={styles.input}
              value={familyAllowance}
              onChangeText={setFamilyAllowance}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Formaruha kompenzáció (Ft)</Text>
            <TextInput
              style={styles.input}
              value={otherIncome}
              onChangeText={setOtherIncome}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Számítás gomb */}
        <TouchableOpacity style={styles.calculateButton} onPress={calculateSalary}>
          <Text style={styles.calculateButtonText}>Számítás</Text>
        </TouchableOpacity>

        {/* Eredmények */}
        {calculation && (
          <>
            {/* Bruttó számítások */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BRUTTÓ SZÁMÍTÁSOK</Text>
              <Text style={styles.totalAmount}>{formatCurrency(calculation.grossSalary)}</Text>
              
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>• Alapbér ({workingDays} nap): {formatCurrency(parseFloat(grossSalary) || 0)}</Text>
              </View>
              {parseFloat(overtimeHours) > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>• Túlóra ({overtimeHours} óra): {formatCurrency((parseFloat(overtimeHours) || 0) * ((parseFloat(grossSalary) || 0) / (parseFloat(workingDays) * 8.1)) * 1.45)}</Text>
                </View>
              )}
              {parseFloat(nightShiftHours) > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>• Műszakpótlék ({nightShiftHours} óra): {formatCurrency((parseFloat(nightShiftHours) || 0) * ((parseFloat(grossSalary) || 0) / (parseFloat(workingDays) * 8.1)) * 0.45)}</Text>
                </View>
              )}
              {parseFloat(otherIncome) > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>• Formaruha kompenzáció: {formatCurrency(parseFloat(otherIncome) || 0)}</Text>
                </View>
              )}
            </View>

            {/* Levonások */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>LEVONÁSOK</Text>
              <Text style={styles.deductionAmount}>{formatCurrency(calculation.totalDeductions)}</Text>
              
              <View style={styles.deductionItem}>
                <Text style={styles.deductionLabel}>TB járulék (18,5%)</Text>
                <Text style={styles.deductionValue}>{formatCurrency(calculation.socialSecurity)}</Text>
              </View>
              {calculation.pensionContribution > 0 && (
                <View style={styles.deductionItem}>
                  <Text style={styles.deductionLabel}>Nyugdíjjárulék (10%)</Text>
                  <Text style={styles.deductionValue}>{formatCurrency(calculation.pensionContribution)}</Text>
                </View>
              )}
              <View style={styles.deductionItem}>
                <Text style={styles.deductionLabel}>Önkéntes nyugdíj (2%)</Text>
                <Text style={styles.deductionValue}>{formatCurrency(calculation.voluntaryPension)}</Text>
              </View>
              <View style={styles.deductionItem}>
                <Text style={styles.deductionLabel}>Érdekképviseleti tagdíj (0,5%)</Text>
                <Text style={styles.deductionValue}>{formatCurrency(calculation.unionFee)}</Text>
              </View>
              <View style={styles.deductionItem}>
                <Text style={styles.deductionLabel}>SZJA (15% - 10k Ft kedv.)</Text>
                <Text style={styles.deductionValue}>{formatCurrency(calculation.personalTax)}</Text>
              </View>
            </View>

            {/* Nettó fizetés */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>NETTÓ FIZETÉS</Text>
              <Text style={styles.netAmount}>{formatCurrency(calculation.netSalary)}</Text>
              
              <View style={styles.netBreakdown}>
                <Text style={styles.netLabel}>Nettó/bruttó arány:</Text>
                <Text style={styles.netValue}>{((calculation.netSalary / calculation.grossSalary) * 100).toFixed(1)}%</Text>
              </View>
            </View>

            {/* Munkáltatói terhek */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MUNKÁLTATÓI TERHEK</Text>
              
              <View style={styles.employerCostItem}>
                <Text style={styles.employerCostLabel}>Szociális hozzájárulás (13,5%)</Text>
                <Text style={styles.employerCostValue}>{formatCurrency(calculation.grossSalary * 0.135)}</Text>
              </View>
              <View style={styles.employerCostItem}>
                <Text style={styles.employerCostLabel}>Teljes munkáltatói költség</Text>
                <Text style={styles.employerCostValue}>{formatCurrency(calculation.grossSalary * 1.135)}</Text>
              </View>
              <View style={styles.employerCostItem}>
                <Text style={styles.employerCostLabel}>Munkáltatói teher aránya</Text>
                <Text style={styles.employerCostValue}>13,5%</Text>
              </View>
            </View>

            {/* Mentés gombok */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={saveCalculation}>
                <Ionicons name="save-outline" size={20} color="white" />
                <Text style={styles.saveButtonText}>Számítás mentése</Text>
              </TouchableOpacity>
            </View>

            {/* Korábbi kalkulációk */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🧮 Korábbi kalkulációk</Text>
              
              {isLoadingCalculations ? (
                <Text style={styles.loadingText}>Betöltés...</Text>
              ) : savedCalculations.length === 0 ? (
                <Text style={styles.noDataText}>Még nincsenek mentett számítások</Text>
              ) : (
                savedCalculations.map((savedCalc) => (
                  <TouchableOpacity
                    key={savedCalc.id}
                    style={styles.previousCalculation}
                    onPress={() => loadCalculation(savedCalc)}
                  >
                    <Text style={styles.previousDate}>
                      {new Date(savedCalc.created_at).toLocaleDateString('hu-HU')}
                    </Text>
                    <Text style={styles.previousAmount}>
                      {formatCurrency(savedCalc.alapber)} • {savedCalc.ledolgozott_napok} nap
                      {savedCalc.tulora_orak > 0 && ` • ${savedCalc.tulora_orak}h túlóra`}
                    </Text>
                    <View style={styles.previousResultRow}>
                      <Text style={styles.previousResult}>{formatCurrency(savedCalc.netto_ber)}</Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          deleteCalculation(savedCalc.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  calculateButton: {
    backgroundColor: '#14b8a6',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 16,
  },
  detailItem: {
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#374151',
  },
  deductionAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 16,
  },
  deductionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  deductionLabel: {
    fontSize: 14,
    color: '#374151',
  },
  deductionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  netAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 16,
  },
  netBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  netLabel: {
    fontSize: 14,
    color: '#374151',
  },
  netValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  totalDeductionAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  actionButtons: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: '#14b8a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exportButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  planButton: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  planButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  previousCalculation: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previousDate: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 4,
    fontWeight: '500',
  },
  previousAmount: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
    fontWeight: '600',
  },
  previousResult: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d9488',
  },
  previousResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
  monthlyIncomeContainer: {
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    padding: 20,
  },
  monthlyIncomeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  monthlyIncomeAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  monthlyIncomeBreakdown: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    paddingTop: 16,
  },
  monthlyIncomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthlyIncomeLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  monthlyIncomeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  employerCostItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  employerCostLabel: {
    fontSize: 14,
    color: '#374151',
  },
  employerCostValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
});
