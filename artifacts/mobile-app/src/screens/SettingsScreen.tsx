import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface SettingsScreenProps {
  apiBaseUrl: string;
  onDisconnect: () => void;
}

export default function SettingsScreen({ apiBaseUrl, onDisconnect }: SettingsScreenProps) {
  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Server',
      'Are you sure you want to disconnect from the current server?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('BACKEND_API_URL');
            onDisconnect();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Connection</Text>
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="server" size={20} color="#00ffcc" />
            <Text style={styles.label}>Endpoint URL</Text>
          </View>
          <Text style={styles.value}>{apiBaseUrl}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Active Connection</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
          <Feather name="log-out" size={16} color="#ef4444" style={styles.btnIcon} />
          <Text style={styles.disconnectText}>Change Server Endpoint</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Companion Info</Text>
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Authentication Mode</Text>
            <Text style={styles.detailValue}>Mock Bypass (Clerk Bypass)</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>User Identity</Text>
            <Text style={styles.detailValue}>user_mock_123</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>SDK Version</Text>
            <Text style={styles.detailValue}>Expo SDK 56</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Aurora Health Companion Mobile v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a13',
    padding: 16,
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  value: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    borderColor: 'rgba(0, 255, 204, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#00ffcc',
    fontSize: 12,
    fontWeight: '600',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
  },
  btnIcon: {
    marginRight: 8,
  },
  disconnectText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: '#475569',
    fontSize: 12,
  },
});
