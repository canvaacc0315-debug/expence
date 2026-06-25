import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Goals() {
  const router = useRouter();
  const { session, user: authUser } = useAuth();
  const user = authUser || session?.user;

  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');

  const fetchData = async () => {
    try {
      const userId = user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('profile_id', userId);
      
      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddGoal = async () => {
    if (!title || !targetAmount) return;
    try {
      const userId = user?.id;
      const { error } = await supabase
        .from('goals')
        .insert([{
          profile_id: userId,
          title,
          target_amount: Number(targetAmount),
          current_amount: Number(currentAmount) || 0
        }]);
      if (error) throw error;
      setModalVisible(false);
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add goal');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00cec9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/')}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Goals</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {goals.length === 0 ? (
          <Text style={{color: 'gray', textAlign: 'center', marginTop: 20}}>No goals set yet.</Text>
        ) : null}

        {goals.map(g => {
          const progress = Math.min((g.current_amount || 0) / g.target_amount, 1);
          return (
            <View key={g.id} style={styles.card}>
              <Text style={styles.category}>{g.title}</Text>
              <View style={styles.amountRow}>
                <Text style={styles.spent}>₹{(g.current_amount || 0).toFixed(2)}</Text>
                <Text style={styles.total}> / ₹{g.target_amount.toFixed(2)}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: '#00cec9' }]} />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Goal</Text>
            <TextInput
              style={styles.input}
              placeholder="Goal Title (e.g. Vacation)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Target Amount (₹)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              value={targetAmount}
              onChangeText={setTargetAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Current Saved Amount (₹)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              value={currentAmount}
              onChangeText={setCurrentAmount}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddGoal}>
              <Text style={styles.saveBtnText}>Save Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    marginRight: 16,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  category: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  spent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  total: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00cec9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#00cec9',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 34,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#1a1a24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    marginBottom: 16,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: '#00cec9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  }
});
