import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BudgetScreen from '../screens/BudgetScreen';
import SavingsScreen from '../screens/SavingsScreen';
import ShoppingScreen from '../screens/ShoppingScreen';
import SalaryCalculatorScreen from '../screens/SalaryCalculatorScreen';

const Stack = createStackNavigator<any>();
const Tab = createBottomTabNavigator<any>();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0891b2" />
      <Text style={styles.loadingText}>Betöltés...</Text>
    </View>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Főoldal') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Költségvetés') {
            iconName = focused ? 'calculator' : 'calculator-outline';
          } else if (route.name === 'Bevásárlólista') {
            iconName = focused ? 'basket' : 'basket-outline';
          } else if (route.name === 'Megtakarítások') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0891b2',
        tabBarInactiveTintColor: '#666',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0891b2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Főoldal" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Főoldal',
          headerTitle: 'Családi Költségvetés',
        }}
      />
      <Tab.Screen 
        name="Költségvetés" 
        component={BudgetScreen}
        options={{
          tabBarLabel: 'Költségvetés',
          headerTitle: 'Költségvetés',
        }}
      />
      <Tab.Screen 
        name="Bevásárlólista" 
        component={ShoppingScreen}
        options={{
          tabBarLabel: 'Bevásárlás',
          headerTitle: 'Bevásárlólisták',
        }}
      />
      <Tab.Screen 
        name="Megtakarítások" 
        component={SavingsScreen}
        options={{
          tabBarLabel: 'Megtakarítások',
          headerTitle: 'Megtakarítások',
        }}
      />
      <Tab.Screen 
        name="Profil" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          headerTitle: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator 
          id={undefined}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen 
            name="SalaryCalculator" 
            component={SalaryCalculatorScreen}
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
