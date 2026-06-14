import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, Text, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';

import ConnectionScreen from './src/screens/ConnectionScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AuroraAIScreen from './src/screens/AuroraAIScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import ResearchHubScreen from './src/screens/ResearchHubScreen';

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ai' | 'insights' | 'research' | 'settings'>('dashboard');

  useEffect(() => {
    // Check if we have a saved API URL
    const checkConnection = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem('BACKEND_API_URL');
        if (savedUrl) {
          setApiBaseUrl(savedUrl);
        }
      } catch (err) {
        console.error('Failed to read BACKEND_API_URL:', err);
      } finally {
        setLoading(false);
      }
    };
    checkConnection();
  }, []);

  const handleConnect = (url: string) => {
    setApiBaseUrl(url);
  };

  const handleDisconnect = () => {
    setApiBaseUrl(null);
    setActiveTab('dashboard'); // reset tab
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>Loading Aurora...</Text>
      </View>
    );
  }

  // If we don't have a configured API URL, force user to Connect
  if (!apiBaseUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ConnectionScreen onConnect={handleConnect} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Active Screen Area */}
      <View style={styles.screenContainer}>
        {activeTab === 'dashboard' && <DashboardScreen apiBaseUrl={apiBaseUrl} />}
        {activeTab === 'ai' && <AuroraAIScreen apiBaseUrl={apiBaseUrl} />}
        {activeTab === 'insights' && <InsightsScreen apiBaseUrl={apiBaseUrl} />}
        {activeTab === 'research' && <ResearchHubScreen apiBaseUrl={apiBaseUrl} />}
        {activeTab === 'settings' && (
          <SettingsScreen apiBaseUrl={apiBaseUrl} onDisconnect={handleDisconnect} />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('dashboard')}
        >
          <Feather
            name="activity"
            size={20}
            color={activeTab === 'dashboard' ? '#00ffcc' : '#64748b'}
          />
          <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('ai')}
        >
          <Feather
            name="zap"
            size={20}
            color={activeTab === 'ai' ? '#00ffcc' : '#64748b'}
          />
          <Text style={[styles.tabLabel, activeTab === 'ai' && styles.tabLabelActive]}>
            Aurora AI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('insights')}
        >
          <Feather
            name="eye"
            size={20}
            color={activeTab === 'insights' ? '#00ffcc' : '#64748b'}
          />
          <Text style={[styles.tabLabel, activeTab === 'insights' && styles.tabLabelActive]}>
            Insights
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('research')}
        >
          <Feather
            name="search"
            size={20}
            color={activeTab === 'research' ? '#00ffcc' : '#64748b'}
          />
          <Text style={[styles.tabLabel, activeTab === 'research' && styles.tabLabelActive]}>
            Research
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('settings')}
        >
          <Feather
            name="settings"
            size={20}
            color={activeTab === 'settings' ? '#00ffcc' : '#64748b'}
          />
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a13',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#070a13',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#00ffcc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#00ffcc',
    fontWeight: '600',
  },
});
