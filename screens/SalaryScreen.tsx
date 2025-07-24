import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { SalaryCalculation, SalaryCalculationInput } from '../types/salary';
import { SalaryCalculator } from '../lib/salaryCalculator';

export default function SalaryScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState<SalaryCalculation[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form állapotok
  const [formData, setFormData] = useState<SalaryCalculationInput>({
    alapber: 0,
    ledolgozott_napok: 22,
    ledolgozott_orak: 176,
    szabadsag_napok: 0,
    szabadsag_orak: 0,
    tulora_orak: 0,
    muszakpotlek_orak: 0,
    unnepnapi_orak: 0,
    betegszabadsag_napok: 0,
    kikuldes_napok: 0,
    gyed_mellett: 0,
    formaruha_kompenzacio: 0,
    csaladi_adokedvezmeny: 0,
  });

  useEffect(() => {
    if (user) {
      fetchCalculations();
    }
  }, [user]);

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('salary_calculations')
        .select('*')
        .eq('family_member_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalculations(data || []);
    } catch (error) {
      console.error('Hiba a bérkalkulációk betöltésekor:', error);
      Alert.alert('Hiba', 'Nem sikerült betölteni a bérkalkulációkat');
    } finally {
      setLoading(false);
    }
  };

  const calculateSalary = (input: SalaryCalculationInput) => {
    const validation = SalaryCalculator.validateInput(input);
    if (!validation.isValid) {
      Alert.alert('Hibás adatok', validation.errors.join('\n'));
      return null;
    }

    return SalaryCalculator.calculateComplete(input);
  };

  const handleSaveCalculation = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const calculated = calculateSalary(formData);
      if (!calculated) {
        setLoading(false);
        return;
      }
      
      const { error } = await supabase
        .from('salary_calculations')
        .insert([{
          family_member_id: user.id,
          ...formData,
          ...calculated,
        }]);

      if (error) throw error;

      Alert.alert('Siker', 'Bérkalkuláció mentve!');
      setShowForm(false);
      fetchCalculations();
    } catch (error) {
      console.error('Hiba a mentés során:', error);
      Alert.alert('Hiba', 'Nem sikerült menteni a kalkulációt');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return SalaryCalculator.formatCurrency(amount);
  };

  const renderCalculationCard = (calculation: SalaryCalculation) => (
    <View key={calculation.id} style={styles.calculationCard}>
      <View style={styles.calculationHeader}>
        <Text style={styles.calculationDate}>
          {new Date(calculation.created_at).toLocaleDateString('hu-HU')}
        </Text>
      </View>
      
      <View style={styles.calculationRow}>
        <Text style={styles.calculationLabel}>Bruttó bér:</Text>
        <Text style={styles.calculationValue}>{formatCurrency(calculation.brutto_ber)}</Text>
      </View>
      
      <View style={styles.calculationRow}>
        <Text style={styles.calculationLabel}>Nettó bér:</Text>
        <Text style={[styles.calculationValue, styles.nettoValue]}>{formatCurrency(calculation.netto_ber)}</Text>
      </View>
      
      <View style={styles.calculationRow}>
        <Text style={styles.calculationLabel}>SZJA:</Text>
        <Text style={styles.calculationValue}>{formatCurrency(calculation.szja)}</Text>
      </View>
      
      <View style={styles.calculationRow}>
        <Text style={styles.calculationLabel}>TB járulék:</Text>
        <Text style={styles.calculationValue}>{formatCurrency(calculation.tb_jarulék)}</Text>
      </View>
    </View>
  );

  const renderForm = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.formTitle}>Új bérkalkuláció</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Alapbér (Ft)</Text>
        <TextInput
          style={styles.input}
          value={formData.alapber.toString()}
          onChangeText={(text) => setFormData({...formData, alapber: parseInt(text) || 0})}
          keyboardType="numeric"
          placeholder="300000"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Ledolgozott napok</Text>
        <TextInput
          style={styles.input}
          value={formData.ledolgozott_napok.toString()}
          onChangeText={(text) => setFormData({...formData, ledolgozott_napok: parseFloat(text) || 0})}
          keyboardType="numeric"
          placeholder="22"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Ledolgozott órák</Text>
        <TextInput
          style={styles.input}
          value={formData.ledolgozott_orak.toString()}
          onChangeText={(text) => setFormData({...formData, ledolgozott_orak: parseFloat(text) || 0})}
          keyboardType="numeric"
          placeholder="176"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Túlóra órák</Text>
        <TextInput
          style={styles.input}
          value={formData.tulora_orak?.toString() || ''}
          onChangeText={(text) => setFormData({...formData, tulora_orak: parseFloat(text) || 0})}
          keyboardType="numeric"
          placeholder="0"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Családi adókedvezmény (Ft)</Text>
        <TextInput
          style={styles.input}
          value={formData.csaladi_adokedvezmeny?.toString() || ''}
          onChangeText={(text) => setFormData({...formData, csaladi_adokedvezmeny: parseInt(text) || 0})}
          keyboardType="numeric"
          placeholder="0"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveCalculation}>
        <Text style={styles.saveButtonText}>Kalkuláció mentése</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForm(false)}>
        <Text style={styles.cancelButtonText}>Mégse</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Bérkalkulátor</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {showForm ? (
          renderForm()
        ) : (
          <ScrollView style={styles.calculationsList}>
            {calculations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calculator" size={64} color="#ccc" />
                <Text style={styles.emptyText}>Még nincsenek bérkalkulációk</Text>
                <Text style={styles.emptySubtext}>
                  Koppints a + gombra az első kalkuláció létrehozásához
                </Text>
              </View>
            ) : (
              calculations.map(renderCalculationCard)
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  calculationsList: {
    flex: 1,
    padding: 20,
  },
  calculationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calculationHeader: {
    marginBottom: 12,
  },
  calculationDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calculationLabel: {
    fontSize: 14,
    color: '#333',
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  nettoValue: {
    color: '#4CAF50',
    fontSize: 16,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
});
