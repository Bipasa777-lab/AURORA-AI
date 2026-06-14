import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ConnectionScreenProps {
  onConnect: (url: string) => void;
}

export default function ConnectionScreen({ onConnect }: ConnectionScreenProps) {
  const [url, setUrl] = useState('http://192.168.1.100:8080'); // reasonable default hint
  const [testing, setTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to load previously saved URL
    const loadUrl = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem('BACKEND_API_URL');
        if (savedUrl) {
          setUrl(savedUrl);
        }
      } catch (err) {
        console.error('Failed to load API URL:', err);
      }
    };
    loadUrl();
  }, []);

  const handleConnect = async () => {
    setErrorMsg(null);
    if (!url.trim()) {
      setErrorMsg('Please enter a valid server URL');
      return;
    }

    const formattedUrl = url.trim().replace(/\/$/, ''); // strip trailing slash
    setTesting(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${formattedUrl}/api/healthz`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 'ok') {
          // Save and proceed
          await AsyncStorage.setItem('BACKEND_API_URL', formattedUrl);
          onConnect(formattedUrl);
        } else {
          setErrorMsg('Server responded, but health status is not OK.');
        }
      } else {
        setErrorMsg(`Server returned status code ${response.status}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Could not connect. Please check the URL, make sure the backend is running, and that you are on the same Wi-Fi network.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="server-network" size={48} color="#00ffcc" />
        </View>
        <Text style={styles.title}>Connect to Aurora Backend</Text>
        <Text style={styles.subtitle}>
          Enter the local API URL of your Aurora server (e.g. http://192.168.X.X:8080).
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.100:8080"
            placeholderTextColor="#888"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <TouchableOpacity
          style={styles.button}
          onPress={handleConnect}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.buttonText}>Connect & Start</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a13',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 255, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 15,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#00ffcc',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
});
