import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface ResearchHubScreenProps {
  apiBaseUrl: string;
}

export default function ResearchHubScreen({ apiBaseUrl }: ResearchHubScreenProps) {
  const [activeTab, setActiveTab] = useState<'drug' | 'trial'>('drug');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [drugData, setDrugData] = useState<any | null>(null);
  const [trialsData, setTrialsData] = useState<any[] | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setDrugData(null);
    setTrialsData(null);

    try {
      if (activeTab === 'drug') {
        const url = `${apiBaseUrl}/api/research/drug-safety?drug=${encodeURIComponent(searchQuery.trim())}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setDrugData(data);
        } else {
          Alert.alert('Search Failed', 'Could not locate drug information. Try brand or generic names like Aspirin or Metformin.');
        }
      } else {
        const url = `${apiBaseUrl}/api/research/clinical-trials?condition=${encodeURIComponent(searchQuery.trim())}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setTrialsData(data);
        } else {
          Alert.alert('Search Failed', 'Could not retrieve clinical trials data. Try conditions like Diabetes or Hypertension.');
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Unable to reach the research server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Research Hub</Text>
        <Text style={styles.subtitle}>FDA Drug Safety & Clinical Trials Lookup</Text>
      </View>

      {/* Switcher Tab */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'drug' && styles.tabActive]}
          onPress={() => {
            setActiveTab('drug');
            setSearchQuery('');
            setDrugData(null);
            setTrialsData(null);
          }}
        >
          <MaterialCommunityIcons name="pill" size={18} color={activeTab === 'drug' ? '#070a13' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'drug' && styles.tabTextActive]}>Drug Safety</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'trial' && styles.tabActive]}
          onPress={() => {
            setActiveTab('trial');
            setSearchQuery('');
            setDrugData(null);
            setTrialsData(null);
          }}
        >
          <Feather name="search" size={16} color={activeTab === 'trial' ? '#070a13' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'trial' && styles.tabTextActive]}>Clinical Trials</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'drug' ? "Search drug (e.g. Metformin, Aspirin)" : "Search condition (e.g. Diabetes, Cancer)"}
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <Feather name="search" size={20} color="#0f172a" />
          )}
        </TouchableOpacity>
      </View>

      {/* Scrollable Results Area */}
      <ScrollView style={styles.resultsArea} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#00ffcc" />
            <Text style={styles.loadingText}>Fetching scientific databases...</Text>
          </View>
        )}

        {!loading && !drugData && !trialsData && (
          <View style={styles.emptyContainer}>
            <Feather name="database" size={48} color="#1e293b" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Enter a query to begin</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'drug'
                ? "Retrieve official FDA label precautions, side effects, and active safety recalls from openFDA databases."
                : "Search active recruiting clinical trials, phase details, and sponsors from ClinicalTrials.gov."}
            </Text>
          </View>
        )}

        {/* Drug Safety Results */}
        {!loading && drugData && (
          <View style={styles.cardContainer}>
            {/* General Info Card */}
            <View style={styles.glassCard}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="pill" size={24} color="#00ffcc" />
                <View style={styles.headerTitleWrap}>
                  <Text style={styles.brandName}>{drugData.brandName}</Text>
                  <Text style={styles.genericName}>Generic: {drugData.genericName}</Text>
                </View>
              </View>
              {drugData.manufacturer && (
                <Text style={styles.metaText}>Manufacturer: {drugData.manufacturer}</Text>
              )}
            </View>

            {/* Warnings Section */}
            <View style={styles.sectionHeader}>
              <Feather name="alert-triangle" size={16} color="#fbbf24" />
              <Text style={[styles.sectionTitle, { color: '#fbbf24' }]}>FDA Boxed Warnings</Text>
            </View>
            <View style={styles.glassCard}>
              <Text style={styles.bodyText}>{drugData.warnings}</Text>
            </View>

            {/* Side Effects Section */}
            {drugData.sideEffects && (
              <>
                <View style={styles.sectionHeader}>
                  <Feather name="info" size={16} color="#00d2ff" />
                  <Text style={[styles.sectionTitle, { color: '#00d2ff' }]}>Adverse Reactions</Text>
                </View>
                <View style={styles.glassCard}>
                  <Text style={styles.bodyText}>{drugData.sideEffects}</Text>
                </View>
              </>
            )}

            {/* Recalls list */}
            <View style={styles.sectionHeader}>
              <Feather name="shield" size={16} color="#f87171" />
              <Text style={[styles.sectionTitle, { color: '#f87171' }]}>Active Recalls & Enforcement</Text>
            </View>
            {drugData.recalls.length === 0 ? (
              <View style={[styles.glassCard, styles.successRecallCard]}>
                <Text style={styles.successRecallText}>No active recalls found in FDA enforcement logs.</Text>
              </View>
            ) : (
              drugData.recalls.map((r: any, idx: number) => (
                <View key={idx} style={[styles.glassCard, styles.recallCard]}>
                  <View style={styles.recallHeader}>
                    <Text style={styles.recallNumber}>{r.recallNumber}</Text>
                    <View style={styles.recallStatusBadge}>
                      <Text style={styles.recallStatusText}>{r.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.recallReason}>{r.reasonForRecall}</Text>
                  <Text style={styles.recallDate}>Report Date: {r.reportDate}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Clinical Trials Results */}
        {!loading && trialsData && (
          <View style={styles.cardContainer}>
            <View style={styles.sectionHeader}>
              <Feather name="list" size={16} color="#00ffcc" />
              <Text style={styles.sectionTitle}>Found {trialsData.length} Clinical Trials</Text>
            </View>
            {trialsData.length === 0 ? (
              <View style={styles.glassCard}>
                <Text style={styles.bodyText}>No active clinical trials found for this condition.</Text>
              </View>
            ) : (
              trialsData.map((item) => (
                <View key={item.nctId} style={styles.glassCard}>
                  <View style={styles.trialHeader}>
                    <Text style={styles.nctId}>{item.nctId}</Text>
                    <View style={[
                      styles.statusBadge,
                      item.status.toLowerCase().includes('recruiting') && styles.statusBadgeRecruiting
                    ]}>
                      <Text style={styles.statusBadgeText}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.trialTitle}>{item.title}</Text>
                  <Text style={styles.trialMeta}>Sponsor: {item.sponsor}</Text>
                  <Text style={styles.trialMeta}>Phase: {item.phases.join(', ')}</Text>
                  
                  {item.conditions && item.conditions.length > 0 && (
                    <View style={styles.conditionsTags}>
                      {item.conditions.slice(0, 3).map((cond: string, idx: number) => (
                        <View key={idx} style={styles.tag}>
                          <Text style={styles.tagText}>{cond}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#00ffcc',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#070a13',
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    color: '#ffffff',
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#00ffcc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsArea: {
    flex: 1,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  cardContainer: {
    gap: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleWrap: {
    marginLeft: 12,
    flex: 1,
  },
  brandName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  genericName: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 13,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bodyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
  successRecallCard: {
    borderColor: 'rgba(34, 197, 94, 0.15)',
    backgroundColor: 'rgba(34, 197, 94, 0.03)',
  },
  successRecallText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  recallCard: {
    borderColor: 'rgba(239, 68, 68, 0.15)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  recallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recallNumber: {
    color: '#f87171',
    fontWeight: 'bold',
    fontSize: 13,
  },
  recallStatusBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recallStatusText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
  recallReason: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  recallDate: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 'bold',
  },
  trialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nctId: {
    color: '#00ffcc',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeRecruiting: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  trialTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 10,
  },
  trialMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  conditionsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  tag: {
    backgroundColor: 'rgba(0, 255, 204, 0.08)',
    borderColor: 'rgba(0, 255, 204, 0.15)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: '#00ffcc',
    fontSize: 11,
    fontWeight: '500',
  },
});
