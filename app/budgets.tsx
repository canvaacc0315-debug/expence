import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Budgets() {
  const router = useRouter();
  const { session, user: authUser } = useAuth();
  const user = authUser || session?.user;

  const [budgets, setBudgets] = useState<any[]>([]);
  const [spentByCategory, setSpentByCategory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');

  const fetchData = async () => {
    try {
      const userId = user?.id;
      if (!userId) return;

      const { data: bData, error: bError } = await supabase
        .from('budgets')
        .select('*')
        .eq('profile_id', userId);
      
      if (bError) throw bError;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      const { data: tData, error: tError } = await supabase
        .from('transactions')
        .select('amount, category')
        .eq('profile_id', userId)
        .gte('date', startOfMonth.toISOString());

      if (tError) throw tError;

      const spent: Record<string, number> = {};
      (tData || []).forEach((tx) => {
        const cat = tx.category || 'Uncategorized';
        spent[cat] = (spent[cat] || 0) + Math.abs(Number(tx.amount));
      });

      setBudgets(bData || []);
      setSpentByCategory(spent);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddBudget = async () => {
    if (!category || !amount) return;
    try {
      const userId = user?.id;
      const { error } = await supabase
        .from('budgets')
        .insert([{
          profile_id: userId,
          category,
          amount: Number(amount)
        }]);
      if (error) throw error;
      setModalVisible(false);
      setCategory('');
      setAmount('');
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add budget');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6c5ce7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/')}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Budgets</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {budgets.length === 0 ? (
          <Text style={{color: 'gray', textAlign: 'center', marginTop: 20}}>No budgets set yet.</Text>
        ) : null}

        {budgets.map(b => {
          const spent = spentByCategory[b.category] || 0;
          const progress = Math.min(spent / b.amount, 1);
          const isClose = progress > 0.8;
          return (
            <View key={b.id} style={styles.card}>
              <Text style={styles.category}>{b.category}</Text>
              <View style={styles.amountRow}>
                <Text style={styles.spent}>₹{spent.toFixed(2)}</Text>
                <Text style={styles.total}> / ₹{b.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: isClose ? '#ff4757' : '#2ed573' }]} />
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
            <Text style={styles.modalTitle}>New Budget</Text>
            <TextInput
              style={styles.input}
              placeholder="Category"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={category}
              onChangeText={setCategory}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount (₹)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddBudget}>
              <Text style={styles.saveBtnText}>Save Budget</Text>
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
    backgroundColor: '#6c5ce7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#6c5ce7',
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
    backgroundColor: '#6c5ce7',
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
