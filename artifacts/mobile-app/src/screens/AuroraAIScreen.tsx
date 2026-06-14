import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface AuroraAIScreenProps {
  apiBaseUrl: string;
}

const EncodingTypeBase64 = FileSystem?.EncodingType?.Base64 || 'base64';

export default function AuroraAIScreen({ apiBaseUrl }: AuroraAIScreenProps) {
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<'openai' | 'gemini'>('openai');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(true);

  // Conversations history states
  const [conversations, setConversations] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Setup/Request permissions
  useEffect(() => {
    const setupAudio = async () => {
      try {
        if (Platform.OS !== 'web' && Audio?.requestPermissionsAsync) {
          const { status } = await Audio.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Microphone permissions are required for voice interaction.');
          }
        }
      } catch (err) {
        console.error('Audio permission request failed:', err);
      }
    };
    setupAudio();

    // Auto-clean audio/sound on unmount
    return () => {
      if (sound) {
        try { sound.unloadAsync(); } catch(e) {}
      }
      if (recording) {
        try { recording.stopAndUnloadAsync(); } catch(e) {}
      }
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const listRes = await fetch(`${apiBaseUrl}/api/openai/conversations`);
      if (listRes.ok) {
        const data = await listRes.json();
        if (Array.isArray(data)) {
          setConversations(data);
          return data;
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
    return [];
  };

  const handleDeleteConversation = async (id: number) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${apiBaseUrl}/api/openai/conversations/${id}`, {
                method: 'DELETE',
              });
              if (res.ok) {
                const list = await fetchConversations();
                if (activeConvId === id) {
                  if (list.length > 0) {
                    setActiveConvId(list[0].id);
                    fetchMessages(list[0].id);
                  } else {
                    await startNewConversation();
                  }
                }
              } else {
                Alert.alert('Error', 'Failed to delete conversation.');
              }
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Could not connect to the server.');
            }
          },
        },
      ]
    );
  };

  // Fetch or create conversation
  useEffect(() => {
    const initializeConversation = async () => {
      const convList = await fetchConversations();
      if (convList.length > 0) {
        setActiveConvId(convList[0].id);
        fetchMessages(convList[0].id);
      } else {
        await startNewConversation();
      }
    };
    initializeConversation();
  }, [apiBaseUrl]);

  // Handle pulse animations
  useEffect(() => {
    if (isRecording || isSpeaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isSpeaking]);

  const fetchMessages = async (convId: number) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/openai/conversations/${convId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/openai/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Chat ${new Date().toLocaleDateString()}` }),
      });
      if (response.ok) {
        const data = await response.json();
        setActiveConvId(data.id);
        setMessages([]);
        await fetchConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim() || !activeConvId || isProcessing) return;
    const textToSend = inputText.trim();
    setInputText('');

    // Optimistically update UI
    setMessages((prev) => [...prev, { role: 'user', content: textToSend }]);
    setIsProcessing(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await fetch(`${apiBaseUrl}/api/openai/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToSend, model: selectedModel }),
      });

      if (response.ok) {
        const responseText = await response.text();
        const lines = responseText.split('\n');
        let assistantContent = '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.substring(6));
              if (d.content) {
                assistantContent = d.content;
              }
            } catch (e) {}
          }
        }

        if (assistantContent) {
          setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const startRecording = async () => {
    if (isProcessing || isSpeaking) return;
    if (Platform.OS === 'web') {
      Alert.alert('Web Mode', 'Voice recording is only supported on mobile devices. Please use the text input.');
      return;
    }
    try {
      if (Audio?.Recording) {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

        setRecording(newRecording);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to access microphone.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        // Read file as base64
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: EncodingTypeBase64,
        });

        // Send to backend
        const response = await fetch(`${apiBaseUrl}/api/openai/conversations/${activeConvId}/voice-messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio, model: selectedModel }),
        });

        if (response.ok) {
          const responseText = await response.text();
          const lines = responseText.split('\n');
          let userTranscript = '';
          let assistantTranscript = '';
          let audioBase64 = '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.substring(6));
                if (d.type === 'user_transcript') userTranscript = d.data;
                if (d.type === 'transcript') assistantTranscript = d.data;
                if (d.type === 'audio') audioBase64 = d.data;
              } catch (e) {}
            }
          }

          // Add user and assistant messages to list
          if (userTranscript) {
            setMessages((prev) => [...prev, { role: 'user', content: userTranscript }]);
          }
          if (assistantTranscript) {
            setMessages((prev) => [...prev, { role: 'assistant', content: assistantTranscript }]);
          }

          // Play Audio response
          if (audioBase64) {
            await playAudioResponse(audioBase64);
          }
        } else {
          Alert.alert('Error', 'Failed to process voice request.');
        }
      }
    } catch (err) {
      console.error('Failed to stop/upload recording:', err);
      Alert.alert('Error', 'Could not process audio.');
    } finally {
      setRecording(null);
      setIsProcessing(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const playAudioResponse = async (base64Audio: string) => {
    try {
      setIsSpeaking(true);

      // Web browser HTML5 Audio fallback
      if (Platform.OS === 'web') {
        const audio = new (window as any).Audio(`data:audio/mp3;base64,${base64Audio}`);
        audio.play();
        audio.onended = () => setIsSpeaking(false);
        return;
      }

      if (!FileSystem?.writeAsStringAsync || !Audio?.Sound) {
        setIsSpeaking(false);
        return;
      }

      const tempAudioFile = `${(FileSystem as any).cacheDirectory || ''}aurora_response.mp3`;
      await FileSystem.writeAsStringAsync(tempAudioFile, base64Audio, {
        encoding: EncodingTypeBase64,
      });

      // Unload previous sound if playing
      if (sound) {
        try { await sound.unloadAsync(); } catch(e) {}
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: tempAudioFile },
        { shouldPlay: true }
      );

      setSound(newSound);

      // Listen to playback finish
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsSpeaking(false);
          newSound.unloadAsync();
        }
      });
    } catch (err) {
      console.error('Error playing response:', err);
      setIsSpeaking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ffcc" />
        <Text style={styles.loadingText}>Connecting to Aurora AI...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.companionInfo}>
          <View style={styles.avatar}>
            <Feather name="star" size={16} color="#070a13" />
          </View>
          <View>
            <Text style={styles.companionName}>Aurora Companion</Text>
            <Text style={styles.companionStatus}>
              {isSpeaking ? 'Speaking...' : isProcessing ? 'Thinking...' : isRecording ? 'Listening...' : 'Online'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.historyBtn} onPress={() => setShowHistoryModal(true)}>
            <Feather name="message-square" size={16} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.newChatBtn} onPress={startNewConversation}>
            <Feather name="plus" size={16} color="#00ffcc" />
            <Text style={styles.newChatText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* History Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent={true}>
        <View style={styles.historyModalBg}>
          <View style={styles.historyModalContent}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={styles.closeBtn}>
                <Feather name="x" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {conversations.length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <Feather name="message-square" size={48} color="#475569" style={styles.emptyHistoryIcon} />
                  <Text style={styles.emptyHistoryTitle}>No past chats</Text>
                  <Text style={styles.emptyHistoryDesc}>Start chatting to build history!</Text>
                </View>
              ) : (
                conversations.map((conv) => {
                  const isActive = activeConvId === conv.id;
                  return (
                    <View
                      key={conv.id}
                      style={[styles.historyItem, isActive && styles.historyItemActive]}
                    >
                      <TouchableOpacity
                        style={styles.historyItemMain}
                        onPress={() => {
                          setActiveConvId(conv.id);
                          fetchMessages(conv.id);
                          setShowHistoryModal(false);
                        }}
                      >
                        <Feather name="message-square" size={16} color={isActive ? "#00ffcc" : "#64748b"} style={styles.historyIcon} />
                        <View style={styles.historyItemMeta}>
                          <Text style={[styles.historyItemTitle, isActive && styles.historyItemTitleActive]} numberOfLines={1}>
                            {conv.title}
                          </Text>
                          <Text style={styles.historyItemDate}>
                            {new Date(conv.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteChatBtn}
                        onPress={() => handleDeleteConversation(conv.id)}
                      >
                        <Feather name="trash-2" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Model Selector Sub-header */}
      <View style={styles.subHeader}>
        <View style={styles.subHeaderLeft}>
          <View style={styles.activeDot} />
          <Text style={styles.subHeaderText}>COMPANION AI ACTIVE</Text>
        </View>
        <View style={styles.modelToggleContainer}>
          <TouchableOpacity
            style={[
              styles.modelToggleButton,
              selectedModel === 'openai' && styles.modelToggleButtonActive,
            ]}
            onPress={() => setSelectedModel('openai')}
          >
            <Text
              style={[
                styles.modelToggleText,
                selectedModel === 'openai' && styles.modelToggleTextActive,
              ]}
            >
              GPT-4o-mini
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modelToggleButton,
              selectedModel === 'gemini' && styles.modelToggleButtonActive,
            ]}
            onPress={() => setSelectedModel('gemini')}
          >
            <Text
              style={[
                styles.modelToggleText,
                selectedModel === 'gemini' && styles.modelToggleTextActive,
              ]}
            >
              Gemini 2.5 Flash
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages ScrollView */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <MaterialCommunityIcons name="comment-account" size={32} color="#00ffcc" />
            </View>
            <Text style={styles.emptyTitle}>Start the Conversation</Text>
            <Text style={styles.emptySubtitle}>
              Tap and hold the mic to speak to your health coach, or type a message below. Try saying: "I drank 500ml water" or "How am I doing today?"
            </Text>
          </View>
        ) : (
          messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.messageBubbleContainer,
                msg.role === 'user' ? styles.bubbleUserContainer : styles.bubbleAssistantContainer,
              ]}
            >
              {msg.role !== 'user' && (
                <View style={styles.avatarSmall}>
                  <Feather name="star" size={10} color="#070a13" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text style={styles.messageText}>{msg.content}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Pulsing Visualizer */}
      <View style={styles.visualizerArea}>
        {isRecording || isSpeaking ? (
          <View style={styles.waveformContainer}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
            <View style={[styles.visualizerCircle, isRecording ? styles.recordingBg : styles.speakingBg]}>
              <Feather
                name={isRecording ? 'mic' : 'volume-2'}
                size={28}
                color="#0f172a"
              />
            </View>
          </View>
        ) : null}
      </View>

      {/* Input controls */}
      <View style={styles.controlBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask Aurora anything..."
          placeholderTextColor="#64748b"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendText}
          editable={!isProcessing && !isRecording}
        />

        <TouchableOpacity
          style={[
            styles.micButton,
            isRecording && styles.micButtonActive,
            isProcessing && styles.micButtonDisabled
          ]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <Feather
              name={isRecording ? 'square' : 'mic'}
              size={20}
              color={isRecording ? '#ef4444' : '#0f172a'}
            />
          )}
        </TouchableOpacity>

        {inputText.trim().length > 0 && (
          <TouchableOpacity style={styles.sendButton} onPress={handleSendText}>
            <Feather name="send" size={20} color="#00ffcc" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070a13',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  companionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00ffcc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companionName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  companionStatus: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 204, 0.08)',
    borderColor: 'rgba(0, 255, 204, 0.15)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  newChatText: {
    color: '#00ffcc',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 255, 204, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '80%',
  },
  bubbleUserContainer: {
    alignSelf: 'flex-end',
  },
  bubbleAssistantContainer: {
    alignSelf: 'flex-start',
  },
  avatarSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00ffcc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#00ffcc',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffff',
  },
  visualizerArea: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 255, 204, 0.2)',
  },
  visualizerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingBg: {
    backgroundColor: '#ef4444',
  },
  speakingBg: {
    backgroundColor: '#00ffcc',
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#070a13',
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    color: '#ffffff',
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00ffcc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: '#fca5a5',
  },
  micButtonDisabled: {
    backgroundColor: '#475569',
  },
  sendButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#0c101d',
  },
  subHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  subHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  modelToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modelToggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modelToggleButtonActive: {
    backgroundColor: '#1e293b',
  },
  modelToggleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  modelToggleTextActive: {
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  historyModalContent: {
    backgroundColor: '#0c111d',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 12,
  },
  historyModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  historyList: {
    flexDirection: 'column',
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyHistoryIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyHistoryTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptyHistoryDesc: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  historyItemActive: {
    backgroundColor: 'rgba(0, 255, 204, 0.04)',
    borderColor: 'rgba(0, 255, 204, 0.15)',
  },
  historyItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  historyIcon: {
    marginRight: 12,
  },
  historyItemMeta: {
    flex: 1,
  },
  historyItemTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  historyItemTitleActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  historyItemDate: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
  },
  deleteChatBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
