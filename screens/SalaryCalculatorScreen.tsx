import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SalaryCalculator } from '../lib/salaryCalculator';
import { SalaryCalculationInput } from '../types/salary';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// ================================
// IMPORTS ÉS ALAPOK
// ================================

// ================================
// BÉRSZÁMÍTÁSI KULCSOK 2025
// ================================
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

// ================================
// TYPESCRIPT TÍPUSOK
// ================================
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

// Supabase-ből jövő mentett kalkuláció típus
interface SavedCalculation {
  id: string;
  family_member_id: string;
  alapber: number;
  ledolgozott_napok: number;
  tulora_orak: number;
  muszakpotlek_orak: number;
  brutto_ber: number;
  netto_ber: number;
  created_at: string;
  additional_incomes?: string;
}

// ================================
// FŐKOMPONENS ÉS STATE VÁLTOZÓK
// ================================
export default function SalaryCalculatorScreen({ navigation }: any) {
  const { user } = useAuth();
  
  // State változók az input mezőkhöz
  const [grossSalary, setGrossSalary] = useState('400000');
  const [workingDays, setWorkingDays] = useState('20');
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [nightShiftHours, setNightShiftHours] = useState('0');
  const [familyAllowance, setFamilyAllowance] = useState('0');
  const [otherIncome, setOtherIncome] = useState('170000');
  const [calculation, setCalculation] = useState<SalaryCalculation | null>(null);
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);

  // ================================
  // BÉRSZÁMÍTÁSI LOGIKA
  // ================================
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

  // ================================
  // SUPABASE INTEGRÁCIÓ
  // ================================
  // Mentett bérszámítások betöltése
  const fetchSavedCalculations = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('salary_calculations')
        .select('*')
        .eq('family_member_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching saved calculations:', error);
      } else {
        setSavedCalculations(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [user]);

  // Komponens betöltésekor lekérjük a mentett kalkulációkat
  useEffect(() => {
    fetchSavedCalculations();
  }, [fetchSavedCalculations]);

  // ================================
  // SEGÉDFÜGGVÉNYEK
  // ================================
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Kalkuláció mentése
  const saveCalculation = async () => {
    if (!calculation || !user) {
      Alert.alert('Hiba', 'Nincs számítás vagy felhasználó!');
      return;
    }
    
    try {
      const calculationData = {
        family_member_id: user.id,
        name: `Bérkalkuláció ${new Date().toLocaleDateString('hu-HU')}`,
        alapber: parseFloat(grossSalary) || 0,
        ledolgozott_napok: parseFloat(workingDays) || 20,
        ledolgozott_orak: (parseFloat(workingDays) || 20) * 8.1,
        tulora_orak: parseFloat(overtimeHours) || 0,
        muszakpotlek_orak: parseFloat(nightShiftHours) || 0,
        formaruha_kompenzacio: parseFloat(otherIncome) || 0,
        csaladi_adokedvezmeny: parseFloat(familyAllowance) || 0,
        brutto_ber: calculation.grossSalary,
        netto_ber: calculation.netSalary,
        szja: calculation.personalTax,
        tb_jarulék: calculation.socialSecurity,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: calcError } = await supabase
        .from('salary_calculations')
        .insert([calculationData])
        .select();

      if (calcError) {
        console.error('Error saving calculation:', calcError);
        Alert.alert('Hiba', 'Nem sikerült menteni a kalkulációt: ' + calcError.message);
        return;
      }

      Alert.alert('Siker', 'A bérkalkuláció sikeresen elmentve!');
      fetchSavedCalculations(); // Frissítjük a listát
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Hiba', 'Váratlan hiba történt');
    }
  };

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
              const { error: calcError } = await supabase
                .from('salary_calculations')
                .delete()
                .eq('id', calculationId);

              if (calcError) {
                console.error('Error deleting calculation:', calcError);
                Alert.alert('Hiba', 'Nem sikerült törölni a kalkulációt');
                return;
              }

              Alert.alert('Siker', 'Kalkuláció sikeresen törölve!');
              fetchSavedCalculations(); // Frissítjük a listát
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Hiba', 'Váratlan hiba történt');
            }
          }
        }
      ]
    );
  };

  // Kalkuláció betöltése szerkesztéshez
  const loadCalculationForEdit = (calc: SavedCalculation) => {
    setGrossSalary(calc.alapber.toString());
    setWorkingDays(calc.ledolgozott_napok.toString());
    setOvertimeHours(calc.tulora_orak.toString());
    setNightShiftHours(calc.muszakpotlek_orak.toString());
    // A többi mező is betölthető ha van adat
    
    Alert.alert('Betöltve', 'A kalkuláció adatai betöltve szerkesztésre!');
  };

  // ================================
  // RENDER - FELHASZNÁLÓI FELÜLET
  // ================================
  return (
    <LinearGradient
      colors={['#22D3EE', '#14B8A6', '#22C55E']}
      style={styles.container}
    >
      {/* ================================ */}
      {/* FEJLÉC SZEKCIÓ */}
      {/* ================================ */}
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
        {/* ================================ */}
        {/* ALAPADATOK SZEKCIÓ */}
        {/* ================================ */}
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
                <Text style={styles.saveButtonText}>Kalkuláció mentése</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.exportButton}>
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.exportButtonText}>Export JSON</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.planButton}>
                <Ionicons name="add-outline" size={20} color="white" />
                <Text style={styles.planButtonText}>Bevételi tervhez hozzáadás</Text>
              </TouchableOpacity>
            </View>

            {/* Korábbi kalkulációk */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Korábbi kalkulációk</Text>
              
              {savedCalculations.length > 0 ? (
                savedCalculations.map((calc, index) => (
                  <View key={calc.id} style={styles.calculationCard}>
                    <View style={styles.calculationHeader}>
                      <View style={styles.calculationTitleContainer}>
                        <Text style={styles.calculationName}>
                          Bérkalkuláció - {new Date(calc.created_at).toLocaleDateString('hu-HU', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
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
                        <Text style={styles.calculationDetailValue}>{formatCurrency(calc.alapber)}</Text>
                      </View>
                      <View style={styles.calculationDetailRow}>
                        <Text style={styles.calculationDetailLabel}>Ledolgozott napok:</Text>
                        <Text style={styles.calculationDetailValue}>{calc.ledolgozott_napok} nap</Text>
                      </View>
                      {calc.tulora_orak > 0 && (
                        <View style={styles.calculationDetailRow}>
                          <Text style={styles.calculationDetailLabel}>Túlóra:</Text>
                          <Text style={styles.calculationDetailValue}>{calc.tulora_orak} óra</Text>
                        </View>
                      )}
                      {calc.muszakpotlek_orak > 0 && (
                        <View style={styles.calculationDetailRow}>
                          <Text style={styles.calculationDetailLabel}>Műszakpótlék:</Text>
                          <Text style={styles.calculationDetailValue}>{calc.muszakpotlek_orak} óra</Text>
                        </View>
                      )}
                      <View style={styles.calculationDetailRow}>
                        <Text style={styles.calculationDetailLabel}>Bruttó bér:</Text>
                        <Text style={styles.calculationDetailValue}>{formatCurrency(calc.brutto_ber)}</Text>
                      </View>
                      <View style={styles.calculationDetailRow}>
                        <Text style={styles.calculationDetailLabel}>Nettó bér:</Text>
                        <Text style={[styles.calculationDetailValue, styles.greenText]}>{formatCurrency(calc.netto_ber)}</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noCalculations}>
                  <Ionicons name="calculator" size={64} color="rgba(255, 255, 255, 0.5)" />
                  <Text style={styles.noCalculationsText}>Nincs mentett kalkuláció</Text>
                  <Text style={styles.noCalculationsSubtext}>
                    Számítsd ki a bért és mentsd el a "Kalkuláció mentése" gombbal
                  </Text>
                </View>
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
    backgroundColor: 'white', // Fehér háttér a jobb kontraszt érdekében
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af', // Kék szín a jobb láthatóságért
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
    color: '#1e40af', // Kék szín a jobb láthatóságért
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#1e40af', // Kék szín a jobb láthatóságért
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
    backgroundColor: 'white', // Fehér háttér a jobb kontraszt érdekében
    color: '#1e40af', // Input szöveg színe
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
    color: '#1e40af', // Kék szín a jobb láthatóságért
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
    borderBottomColor: '#e5e7eb', // Világosabb szürke vonal
  },
  deductionLabel: {
    fontSize: 14,
    color: '#1e40af', // Kék szín a jobb láthatóságért
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
    color: '#1e40af', // Kék szín a jobb láthatóságért
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
    backgroundColor: 'white', // Fehér háttér a jobb kontraszt érdekében
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
    color: '#000000', // Fekete szín - tökéletes kontraszt fehér háttéren
    marginBottom: 4,
    fontWeight: '600',
  },
  previousAmount: {
    fontSize: 14,
    color: '#000000', // Fekete szín - tökéletes kontraszt fehér háttéren
    marginBottom: 4,
    fontWeight: '600',
  },
  previousResult: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
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
    borderBottomColor: '#e5e7eb', // Világosabb szürke vonal
  },
  employerCostLabel: {
    fontSize: 14,
    color: '#1e40af', // Kék szín a jobb láthatóságért
  },
  employerCostValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  noCalculations: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginTop: 8,
  },
  noCalculationsText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  noCalculationsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  calculationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Majdnem fehér, átlátszó
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calculationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calculationTitleContainer: {
    flex: 1,
  },
  calculationName: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  calculationDate: {
    color: '#6b7280',
    fontSize: 12,
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
    color: '#374151',
    fontSize: 14,
  },
  calculationDetailValue: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '500',
  },
  greenText: {
    color: '#059669',
    fontWeight: '600',
  },
});
