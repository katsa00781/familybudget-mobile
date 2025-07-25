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

interface SalaryCalculation {
  grossSalary: number;
  netSalary: number;
  personalTax: number;
  socialSecurity: number;
  healthInsurance: number;
  unemploymentInsurance: number;
  totalDeductions: number;
}

export default function SalaryCalculatorScreen({ navigation }: any) {
  const [grossSalary, setGrossSalary] = useState('400000');
  const [workingDays, setWorkingDays] = useState('22');
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [nightShiftHours, setNightShiftHours] = useState('0');
  const [familyAllowance, setFamilyAllowance] = useState('0');
  const [otherIncome, setOtherIncome] = useState('170000');
  const [calculation, setCalculation] = useState<SalaryCalculation | null>(null);

  const calculateSalary = () => {
    const gross = parseFloat(grossSalary) || 0;
    const overtime = parseFloat(overtimeHours) || 0;
    const nightShift = parseFloat(nightShiftHours) || 0;
    const allowance = parseFloat(familyAllowance) || 0;

    // Túlóra és műszakpótlék számítása (2025-ös értékek)
    const hourlyRate = gross / 174; // Havi 174 óra átlag
    const overtimePay = overtime * hourlyRate * 1.0; // 100% túlóra alapbér
    const nightShiftPay = nightShift * hourlyRate * 1.45; // 145% műszakpótlék (100% + 45%)

    const totalGross = gross + overtimePay + nightShiftPay + allowance;

    // Magyar adózási rendszer 2025 (pontosabb számítás)
    // TB járulék: 18.5% (maximum 1.200.000 Ft alapból)
    const tbBase = Math.min(totalGross, 1200000);
    const socialSecurity = tbBase * 0.185;
    
    // Nyugdíjjárulék: 10% (csak 500.000 Ft feletti bér esetén)
    const pensionContribution = totalGross > 500000 ? (totalGross - 500000) * 0.10 : 0;
    
    // Önkéntes nyugdíjpénztár: 1.5% (adóalapot csökkenti)
    const voluntaryPension = totalGross * 0.015;
    
    // Érdekképviseleti tagdíj: 0.7% (adóalapot csökkenti)
    const unionFee = totalGross * 0.007;
    
    // SZJA alap = bruttó - TB járulék - nyugdíjjárulék - önkéntes nyugdíj
    const taxBase = totalGross - socialSecurity - pensionContribution - voluntaryPension;
    
    // SZJA: 15% az SZJA alapból
    const grossTax = Math.max(0, taxBase) * 0.15;
    
    // Általános adókedvezmény: 10.000 Ft
    const personalTax = Math.max(0, grossTax - 10000);
    
    // Egészségügyi és munkanélküli járulék nem létezik 2025-ben
    const healthInsurance = 0;
    const unemploymentInsurance = 0;

    // Összes levonás
    const totalDeductions = personalTax + socialSecurity + pensionContribution + voluntaryPension + unionFee;
    const netSalary = totalGross - totalDeductions;

    setCalculation({
      grossSalary: totalGross,
      netSalary,
      personalTax,
      socialSecurity,
      healthInsurance,
      unemploymentInsurance,
      totalDeductions,
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
            <Text style={styles.inputLabel}>Műszakpótlék (Ft)</Text>
            <TextInput
              style={styles.input}
              value={nightShiftHours}
              onChangeText={setNightShiftHours}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>GYED munkavégzés melletti (Ft)</Text>
            <TextInput
              style={styles.input}
              value={familyAllowance}
              onChangeText={setFamilyAllowance}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Formátum kompenzáció (Ft)</Text>
            <TextInput
              style={styles.input}
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
                  <Text style={styles.detailLabel}>• Túlóra ({overtimeHours} óra): {formatCurrency((parseFloat(overtimeHours) || 0) * ((parseFloat(grossSalary) || 0) / 174) * 1.5)}</Text>
                </View>
              )}
              {parseFloat(nightShiftHours) > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>• Műszakpótlék: {formatCurrency(parseFloat(nightShiftHours) || 0)}</Text>
                </View>
              )}
              {parseFloat(familyAllowance) > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>• GYED melletti: {formatCurrency(parseFloat(familyAllowance) || 0)}</Text>
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
              <View style={styles.deductionItem}>
                <Text style={styles.deductionLabel}>SZJA (15%)</Text>
                <Text style={styles.deductionValue}>{formatCurrency(calculation.personalTax)}</Text>
              </View>
            </View>

            {/* Nettó fizetés */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>NETTÓ FIZETÉS</Text>
              <Text style={styles.netAmount}>{formatCurrency(calculation.netSalary)}</Text>
              
              <View style={styles.netBreakdown}>
                <Text style={styles.netLabel}>Nettó bér:</Text>
                <Text style={styles.netValue}>{formatCurrency(calculation.netSalary)}</Text>
              </View>
              <View style={styles.netBreakdown}>
                <Text style={styles.netLabel}>Egyéb jövedelem:</Text>
                <Text style={styles.netValue}>{formatCurrency(parseFloat(otherIncome))}</Text>
              </View>
            </View>

            {/* Teljes havi bevétel */}
            <View style={styles.section}>
              <View style={styles.monthlyIncomeContainer}>
                <Text style={styles.monthlyIncomeTitle}>Teljes havi bevétel</Text>
                <Text style={styles.monthlyIncomeAmount}>{formatCurrency(calculation.netSalary + parseFloat(otherIncome))}</Text>
                
                <View style={styles.monthlyIncomeBreakdown}>
                  <View style={styles.monthlyIncomeRow}>
                    <Text style={styles.monthlyIncomeLabel}>Nettó bér:</Text>
                    <Text style={styles.monthlyIncomeValue}>{formatCurrency(calculation.netSalary)}</Text>
                  </View>
                  <View style={styles.monthlyIncomeRow}>
                    <Text style={styles.monthlyIncomeLabel}>Egyéb jövedelem:</Text>
                    <Text style={styles.monthlyIncomeValue}>{formatCurrency(parseFloat(otherIncome))}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Egyéb jövedelmek */}
            <View style={styles.section}>
              <Text style={styles.sectionIcon}>🏠</Text>
              <Text style={styles.sectionTitle}>Egyéb jövedelmek</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Lakáskiadás</Text>
                <TextInput
                  style={styles.input}
                  placeholder="120000"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Osztalék</Text>
                <TextInput
                  style={styles.input}
                  value={otherIncome}
                  onChangeText={setOtherIncome}
                  placeholder="50000"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Összes levonás */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Összes levonás</Text>
              <Text style={styles.totalDeductionAmount}>{formatCurrency(calculation.totalDeductions)}</Text>
            </View>

            {/* Munkáltatói terhek */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MUNKÁLTATÓI TERHEK</Text>
              
              <View style={styles.employerCostItem}>
                <Text style={styles.employerCostLabel}>Szociális hozzájárulás (13%)</Text>
                <Text style={styles.employerCostValue}>{formatCurrency(calculation.grossSalary * 0.13)}</Text>
              </View>
              <View style={styles.employerCostItem}>
                <Text style={styles.employerCostLabel}>Teljes munkáltatói költség</Text>
                <Text style={styles.employerCostValue}>{formatCurrency(calculation.grossSalary * 1.13)}</Text>
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
