import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface DashboardScreenProps {
  apiBaseUrl: string;
}

const COMMON_SYMPTOMS = ['Headache', 'Fatigue', 'Dizziness', 'Nausea', 'Cough', 'Fever', 'Sore Throat', 'Muscle Pain'];

export default function DashboardScreen({ apiBaseUrl }: DashboardScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [habitsToday, setHabitsToday] = useState<any[]>([]);
  const [latestVitals, setLatestVitals] = useState<any | null>(null);

  // Form states for Vitals Modal
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch dashboard summary
      const dashRes = await fetch(`${apiBaseUrl}/api/dashboard`);
      const dashData = await dashRes.json();

      // Fetch habits status
      const habitsRes = await fetch(`${apiBaseUrl}/api/habits/today`);
      const habitsData = await habitsRes.json();

      // Fetch latest vitals log
      const vitalsRes = await fetch(`${apiBaseUrl}/api/vitals?limit=1`);
      const vitalsData = await vitalsRes.json();

      if (dashRes.ok) setData(dashData);
      if (habitsRes.ok) setHabitsToday(habitsData);
      if (vitalsRes.ok && vitalsData.length > 0) {
        setLatestVitals(vitalsData[0]);
      } else {
        setLatestVitals(null);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      Alert.alert('Connection Error', 'Could not refresh data from the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleAddWater = async (amount: number) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/hydration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountMl: amount, note: 'Added via mobile' }),
      });
      if (response.ok) {
        fetchDashboardData();
      } else {
        Alert.alert('Error', 'Failed to log hydration.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not connect to the server.');
    }
  };

  const handleToggleHabit = async (habitId: number, currentStatus: string | null) => {
    const isCompleted = currentStatus === 'completed';
    const endpoint = isCompleted ? 'skip' : 'complete';
    try {
      const response = await fetch(`${apiBaseUrl}/api/habits/${habitId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        fetchDashboardData();
      } else {
        Alert.alert('Error', `Failed to mark habit as ${endpoint}d.`);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not connect to the server.');
    }
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleLogVitals = async () => {
    try {
      const body: any = {
        symptoms: selectedSymptoms,
        notes: notes.trim() || undefined,
      };
      if (systolic) body.systolic = parseInt(systolic, 10);
      if (diastolic) body.diastolic = parseInt(diastolic, 10);
      if (heartRate) body.heartRate = parseInt(heartRate, 10);
      if (temperature) body.temperature = parseFloat(temperature);
      if (weight) body.weight = parseFloat(weight);

      const response = await fetch(`${apiBaseUrl}/api/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setShowVitalsModal(false);
        // Reset form
        setSystolic('');
        setDiastolic('');
        setHeartRate('');
        setTemperature('');
        setWeight('');
        setNotes('');
        setSelectedSymptoms([]);
        fetchDashboardData();
      } else {
        Alert.alert('Error', 'Failed to log vitals.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not connect to the server.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ffcc" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ffcc" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, User</Text>
        <Text style={styles.date}>{data?.date || new Date().toISOString().split('T')[0]}</Text>
      </View>

      {/* Insight Banner */}
      {data?.dailyInsight && (
        <View style={styles.insightCard}>
          <Feather name="star" size={20} color="#00ffcc" style={styles.insightIcon} />
          <Text style={styles.insightText}>{data.insight || data.dailyInsight}</Text>
        </View>
      )}

      {/* Trackers Grid */}
      <View style={styles.grid}>
        {/* Hydration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="water" size={24} color="#00d2ff" />
            <Text style={styles.cardTitle}>Hydration</Text>
          </View>
          <Text style={styles.metricValue}>
            {data?.hydration?.totalMl || 0} <Text style={styles.metricUnit}>/ {data?.hydration?.goalMl || 2000} ml</Text>
          </Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${data?.hydration?.percentComplete || 0}%`, backgroundColor: '#00d2ff' }]} />
          </View>
          <Text style={styles.progressText}>{data?.hydration?.percentComplete || 0}% completed today</Text>

          <View style={styles.quickAddRow}>
            <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleAddWater(250)}>
              <Feather name="plus" size={14} color="#00d2ff" />
              <Text style={styles.quickAddText}>250ml</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleAddWater(500)}>
              <Feather name="plus" size={14} color="#00d2ff" />
              <Text style={styles.quickAddText}>500ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sleep Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="moon" size={20} color="#c084fc" />
            <Text style={styles.cardTitle}>Sleep</Text>
          </View>
          <Text style={styles.metricValue}>
            {data?.sleep?.lastNightHours !== null ? `${data.sleep.lastNightHours.toFixed(1)}` : 'Not logged'}
            {data?.sleep?.lastNightHours !== null && <Text style={styles.metricUnit}> hrs</Text>}
          </Text>
          <View style={styles.sleepStats}>
            <Text style={styles.sleepStatText}>Weekly Avg: {data?.sleep?.weeklyAvgHours || 0} hrs</Text>
            <Text style={styles.sleepStatText}>Consistency: {data?.sleep?.consistency || 0}%</Text>
          </View>
        </View>

        {/* Vitals & Symptoms Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color="#f43f5e" />
            <Text style={styles.cardTitle}>Vitals & Symptoms</Text>
          </View>
          {latestVitals ? (
            <View style={styles.vitalsPreview}>
              <View style={styles.vitalsRow}>
                {latestVitals.systolic && latestVitals.diastolic ? (
                  <View style={styles.vitalsCol}>
                    <Text style={styles.vitalsLabel}>BP</Text>
                    <Text style={styles.vitalsVal}>{latestVitals.systolic}/{latestVitals.diastolic}</Text>
                    <Text style={styles.vitalsUnit}>mmHg</Text>
                  </View>
                ) : null}
                {latestVitals.heartRate ? (
                  <View style={styles.vitalsCol}>
                    <Text style={styles.vitalsLabel}>Pulse</Text>
                    <Text style={styles.vitalsVal}>{latestVitals.heartRate}</Text>
                    <Text style={styles.vitalsUnit}>bpm</Text>
                  </View>
                ) : null}
                {latestVitals.temperature ? (
                  <View style={styles.vitalsCol}>
                    <Text style={styles.vitalsLabel}>Temp</Text>
                    <Text style={styles.vitalsVal}>{latestVitals.temperature}°</Text>
                    <Text style={styles.vitalsUnit}>C/F</Text>
                  </View>
                ) : null}
                {latestVitals.weight ? (
                  <View style={styles.vitalsCol}>
                    <Text style={styles.vitalsLabel}>Weight</Text>
                    <Text style={styles.vitalsVal}>{latestVitals.weight}</Text>
                    <Text style={styles.vitalsUnit}>kg</Text>
                  </View>
                ) : null}
              </View>

              {latestVitals.symptoms && latestVitals.symptoms.length > 0 ? (
                <View style={styles.symptomsBadgeContainer}>
                  {latestVitals.symptoms.map((symptom: string, idx: number) => (
                    <View key={idx} style={styles.symptomMiniBadge}>
                      <Text style={styles.symptomMiniText}>{symptom}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noSymptomsLogged}>No symptoms logged</Text>
              )}
            </View>
          ) : (
            <Text style={styles.noVitalsText}>No biometrics or symptoms logged today.</Text>
          )}

          <TouchableOpacity style={styles.logVitalsBtn} onPress={() => setShowVitalsModal(true)}>
            <Feather name="edit" size={14} color="#f43f5e" />
            <Text style={styles.logVitalsText}>Log Vitals & Symptoms</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Habits Checklist */}
      <View style={styles.habitsSection}>
        <Text style={styles.sectionTitle}>Today's Habits</Text>
        {habitsToday.length === 0 ? (
          <View style={styles.noHabitsCard}>
            <Text style={styles.noHabitsText}>No active habits today. Create one in the web app or ask Aurora AI!</Text>
          </View>
        ) : (
          habitsToday.map((item) => {
            const isCompleted = item.todayStatus === 'completed';
            return (
              <TouchableOpacity
                key={item.habit.id}
                style={[
                  styles.habitItem,
                  isCompleted && styles.habitItemCompleted
                ]}
                onPress={() => handleToggleHabit(item.habit.id, item.todayStatus)}
              >
                <View style={styles.habitContent}>
                  <View style={[styles.habitIconContainer, { backgroundColor: item.habit.color || '#00ffcc' }]}>
                    <Feather name="activity" size={16} color="#070a13" />
                  </View>
                  <Text style={[styles.habitName, isCompleted && styles.habitTextCompleted]}>
                    {item.habit.name}
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  isCompleted && styles.checkboxChecked
                ]}>
                  {isCompleted && <Feather name="check" size={14} color="#070a13" />}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Vitals Form Modal */}
      <Modal visible={showVitalsModal} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Biometrics & Symptoms</Text>
              <TouchableOpacity onPress={() => setShowVitalsModal(false)}>
                <Feather name="x" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Blood Pressure Row */}
              <Text style={styles.inputLabel}>Blood Pressure (mmHg)</Text>
              <View style={styles.modalRow}>
                <TextInput
                  style={[styles.modalInput, { flex: 1 }]}
                  placeholder="Systolic (e.g. 120)"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={systolic}
                  onChangeText={setSystolic}
                />
                <Text style={styles.slash}>/</Text>
                <TextInput
                  style={[styles.modalInput, { flex: 1 }]}
                  placeholder="Diastolic (e.g. 80)"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={diastolic}
                  onChangeText={setDiastolic}
                />
              </View>

              {/* Heart Rate / Pulse */}
              <Text style={styles.inputLabel}>Heart Rate (bpm)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Pulse (e.g. 72)"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={heartRate}
                onChangeText={setHeartRate}
              />

              {/* Temp / Weight Row */}
              <View style={styles.modalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Body Temp (°C/°F)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Temp (e.g. 98.6)"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={temperature}
                    onChangeText={setTemperature}
                  />
                </View>
                <View style={{ width: 16 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Weight (kg/lbs)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Weight"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>
              </View>

              {/* Symptoms Checklist */}
              <Text style={styles.inputLabel}>Select Symptoms</Text>
              <View style={styles.symptomsGrid}>
                {COMMON_SYMPTOMS.map((symptom) => {
                  const active = selectedSymptoms.includes(symptom);
                  return (
                    <TouchableOpacity
                      key={symptom}
                      style={[styles.symptomBtn, active && styles.symptomBtnActive]}
                      onPress={() => toggleSymptom(symptom)}
                    >
                      <Text style={[styles.symptomBtnText, active && styles.symptomBtnTextActive]}>{symptom}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom notes */}
              <Text style={styles.inputLabel}>Condition Notes</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="How do you feel? Any symptoms trigger?"
                placeholderTextColor="#64748b"
                multiline={true}
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />

              {/* Submit / Cancel Buttons */}
              <TouchableOpacity style={styles.submitBtn} onPress={handleLogVitals}>
                <Text style={styles.submitBtnText}>Save Entry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowVitalsModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  date: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 204, 0.06)',
    borderColor: 'rgba(0, 255, 204, 0.2)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  insightIcon: {
    marginRight: 12,
  },
  insightText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  metricUnit: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'normal',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    borderColor: 'rgba(0, 210, 255, 0.2)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  quickAddText: {
    color: '#00d2ff',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  sleepStats: {
    marginTop: 8,
    gap: 4,
  },
  sleepStatText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  vitalsPreview: {
    marginBottom: 16,
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  vitalsCol: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  vitalsLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  vitalsVal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  vitalsUnit: {
    color: '#475569',
    fontSize: 9,
    marginTop: 2,
  },
  symptomsBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  symptomMiniBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  symptomMiniText: {
    color: '#f43f5e',
    fontSize: 11,
    fontWeight: '500',
  },
  noSymptomsLogged: {
    color: '#475569',
    fontSize: 12,
  },
  noVitalsText: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 16,
  },
  logVitalsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  logVitalsText: {
    color: '#f43f5e',
    fontSize: 13,
    fontWeight: 'bold',
  },
  habitsSection: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  noHabitsCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
  },
  noHabitsText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  habitItemCompleted: {
    backgroundColor: 'rgba(0, 255, 204, 0.05)',
    borderColor: 'rgba(0, 255, 204, 0.15)',
  },
  habitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  habitIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  habitName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  habitTextCompleted: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#00ffcc',
    backgroundColor: '#00ffcc',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0c111d',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalForm: {
    flexDirection: 'column',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slash: {
    color: '#64748b',
    fontSize: 20,
    marginHorizontal: 10,
  },
  modalInput: {
    height: 48,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    color: '#ffffff',
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  symptomBtn: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  symptomBtnActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: '#f43f5e',
  },
  symptomBtnText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  symptomBtnTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#00ffcc',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#070a13',
    fontWeight: 'bold',
    fontSize: 15,
  },
  cancelBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});
