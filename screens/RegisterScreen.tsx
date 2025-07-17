import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Hiba', 'Kérjük, töltsd ki az összes mezőt');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hiba', 'A jelszónak legalább 6 karakter hosszúnak kell lennie');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password, fullName);

      if (error) {
        Alert.alert('Hiba', 'Regisztrációs hiba történt');
      } else {
        Alert.alert(
          'Siker', 
          'Regisztráció sikeres! Ellenőrizd az e-mail fiókodat a megerősítő linkért.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Hiba', 'Váratlan hiba történt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="person-add" size={80} color="#0891b2" />
        </View>
        <Text style={styles.title}>Családi Költségvetés</Text>
        <Text style={styles.subtitle}>Regisztráció</Text>

        <TextInput
          style={styles.input}
          placeholder="Teljes név"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />

        <TextInput
          style={styles.input}
          placeholder="E-mail cím"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Jelszó (min. 6 karakter)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password-new"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Regisztráció...' : 'Regisztráció'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>Van már fiókod? Jelentkezz be</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#0891b2',
    fontSize: 16,
  },
});
