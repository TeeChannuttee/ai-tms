// AI-TMS Enterprise Driver App - Entry Point
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import RouteListScreen from './src/screens/RouteListScreen';
import RouteDetailScreen from './src/screens/RouteDetailScreen';
import StopDetailScreen from './src/screens/StopDetailScreen';
import PODScreen from './src/screens/PODScreen';
import SyncScreen from './src/screens/SyncScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Home, Truck, Cloud, Settings as SettingsIcon } from 'lucide-react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 70, paddingBottom: 15, paddingTop: 10, borderTopWidth: 0, elevation: 10, shadowOpacity: 0.1 },
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontWeight: 'bold', fontSize: 10 }
      }}
    >
      <Tab.Screen
        name="Overview"
        component={HomeScreen}
        options={{ title: 'หน้าหลัก', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
      />
      <Tab.Screen
        name="MyRoutes"
        component={RouteListScreen}
        options={{ title: 'งานขนส่ง', tabBarIcon: ({ color }) => <Truck size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Outbox"
        component={SyncScreen}
        options={{ title: 'รอซิงค์', tabBarIcon: ({ color }) => <Cloud size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'ตั้งค่า', tabBarIcon: ({ color }) => <SettingsIcon size={22} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

const Navigation = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token === null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="RouteDetail" component={RouteDetailScreen} />
            <Stack.Screen name="StopDetail" component={StopDetailScreen} />
            <Stack.Screen name="POD" component={PODScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Navigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
