import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function RecurringScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async () => {
    if (!title.trim() || !amount.trim() || !nextDueDate.trim() || !user) return;
    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .insert([{ 
          title: title.trim(), 
          amount: parseFloat(amount),
          next_due_date: nextDueDate,
          user_id: user.id 
        }]);

      if (error) throw error;
      
      setTitle('');
      setAmount('');
      setNextDueDate('');
      fetchExpenses();
    } catch (error) {
      console.error('Error adding recurring expense:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscriptions</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.createSection}>
          <TextInput
            style={styles.input}
            placeholder="Title (e.g., Netflix)"
            placeholderTextColor="#888"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={styles.input}
            placeholder="Next Due (YYYY-MM-DD)"
            placeholderTextColor="#888"
            value={nextDueDate}
            onChangeText={setNextDueDate}
          />
          <TouchableOpacity style={styles.createButton} onPress={addExpense}>
            <Text style={styles.createButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#ec4899" style={{ marginTop: 40 }} />
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{expense.title}</Text>
                <Text style={styles.amount}>₹{expense.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.cardFooter}>
                <Ionicons name="calendar-outline" size={16} color="#aaa" />
                <Text style={styles.dueDate}>Due: {new Date(expense.next_due_date).toLocaleDateString()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(20, 20, 25, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  createSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 15,
    borderRadius: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: '#ec4899',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  card: {
    backgroundColor: 'rgba(30, 20, 40, 0.4)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDate: {
    color: '#aaa',
    marginLeft: 8,
    fontSize: 14,
  },
});
