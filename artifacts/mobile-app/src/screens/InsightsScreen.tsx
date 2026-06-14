import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface InsightsScreenProps {
  apiBaseUrl: string;
}

export default function InsightsScreen({ apiBaseUrl }: InsightsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/memories`);
      if (response.ok) {
        const data = await response.json();
        setMemories(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch health memories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'user_note',
          observation: `User note: ${newNote.trim()}`,
          source: 'user',
        }),
      });

      if (response.ok) {
        setNewNote('');
        fetchInsights();
      } else {
        Alert.alert('Error', 'Failed to save health note.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string, source: string) => {
    if (source === 'user') return <Feather name="edit-3" size={18} color="#c084fc" />;
    switch (category) {
      case 'hydration':
        return <MaterialCommunityIcons name="water" size={18} color="#38bdf8" />;
      case 'sleep':
        return <Feather name="moon" size={18} color="#a855f7" />;
      case 'habits':
        return <Feather name="check-circle" size={18} color="#00ffcc" />;
      default:
        return <Feather name="activity" size={18} color="#00ffcc" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ffcc" />
        <Text style={styles.loadingText}>Loading health insights...</Text>
      </View>
    );
  }

  const systemMemories = memories.filter((m) => m.source === 'system');
  const userNotes = memories.filter((m) => m.source === 'user');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ffcc" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Smart Insights</Text>
        <Text style={styles.subtitle}>Health patterns identified by your AI coach</Text>
      </View>

      {/* Coach Observations Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Observations</Text>
        {systemMemories.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="shield" size={24} color="#64748b" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>
              Keep logging water, sleep, and habits! Aurora needs 3-7 days of data to discover personalized health patterns.
            </Text>
          </View>
        ) : (
          systemMemories.map((item) => (
            <View key={item.id} style={styles.insightCard}>
              <View style={styles.iconBg}>
                {getCategoryIcon(item.category, item.source)}
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightText}>{item.observation}</Text>
                <Text style={styles.insightMeta}>
                  {item.category.toUpperCase()} • {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* User Notes Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Health Notes & Goals</Text>
        
        {/* Form to add note */}
        <View style={styles.addNoteContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add note (e.g. 'I feel dizzy after coffee')"
            placeholderTextColor="#64748b"
            value={newNote}
            onChangeText={setNewNote}
            onSubmitEditing={handleAddNote}
            editable={!submitting}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddNote}
            disabled={!newNote.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Feather name="plus" size={20} color="#0f172a" />
            )}
          </TouchableOpacity>
        </View>

        {userNotes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="edit-3" size={20} color="#64748b" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>
              Log custom comments, symptom notes, or active goals. Aurora AI will remember them during voice conversations.
            </Text>
          </View>
        ) : (
          userNotes.map((item) => (
            <View key={item.id} style={[styles.insightCard, styles.userNoteCard]}>
              <View style={[styles.iconBg, styles.userIconBg]}>
                {getCategoryIcon(item.category, item.source)}
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightText}>{item.observation.replace(/^User note: /, '')}</Text>
                <Text style={styles.insightMeta}>
                  LOGGED ON {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a13',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#070a13',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
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
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  userNoteCard: {
    borderColor: 'rgba(192, 132, 252, 0.15)',
    backgroundColor: 'rgba(192, 132, 252, 0.03)',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 204, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userIconBg: {
    backgroundColor: 'rgba(192, 132, 252, 0.08)',
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  insightMeta: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
    fontWeight: 'bold',
  },
  addNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#00ffcc',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
