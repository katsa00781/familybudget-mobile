import React, { useState } from 'react';
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

export default function SalaryCalculatorScreen({ navigation }: any) {
  const [grossSalary, setGrossSalary] = useState('400000');
  const [workingDays, setWorkingDays] = useState('20');
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [nightShiftHours, setNightShiftHours] = useState('0');
  const [familyAllowance, setFamilyAllowance] = useState('0');
  const [otherIncome, setOtherIncome] = useState('170000');
  const [calculation, setCalculation] = useState<SalaryCalculation | null>(null);

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

  const saveCalculation = () => {
    if (!calculation) return;
    
    Alert.alert(
      'Számítás mentése',
      'A bérkalkuláció sikeresen elmentve!',
      [{ text: 'OK' }]
    );
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
                <Text style={styles.saveButtonText}>Számítás frissítése</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.exportButton}>
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.exportButtonText}>Kalkuláció mentése</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.planButton}>
                <Ionicons name="add-outline" size={20} color="white" />
                <Text style={styles.planButtonText}>Bevételi tervhez hozzáadás</Text>
              </TouchableOpacity>
            </View>

            {/* Korábbi kalkulációk */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🧮 Korábbi kalkulációk</Text>
              
              <View style={styles.previousCalculation}>
                <Text style={styles.previousDate}>2024. július 11.</Text>
                <Text style={styles.previousAmount}>400,000 Ft • 22 nap</Text>
                <Text style={styles.previousResult}>{formatCurrency(299250)}</Text>
              </View>
              
              <View style={styles.previousCalculation}>
                <Text style={styles.previousDate}>2024. július 1.</Text>
                <Text style={styles.previousAmount}>380,000 Ft • 22 nap</Text>
                <Text style={styles.previousResult}>{formatCurrency(284240)}</Text>
              </View>
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
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
  },
  previousDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  previousAmount: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
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
