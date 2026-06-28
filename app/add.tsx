import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { categorizeExpense } from '../lib/groq';
import { Ionicons } from '@expo/vector-icons';

const EXPENSE_CATEGORIES = [
  { icon: 'fast-food', name: 'Food' },
  { icon: 'car', name: 'Transport' },
  { icon: 'cart', name: 'Shopping' },
  { icon: 'medkit', name: 'Health' },
  { icon: 'film', name: 'Entertainment' },
  { icon: 'receipt', name: 'Bills' },
  { icon: 'home', name: 'Rent' },
  { icon: 'school', name: 'Education' },
  { icon: 'airplane', name: 'Travel' },
  { icon: 'gift', name: 'Other' },
];

const INCOME_CATEGORIES = [
  { icon: 'cash', name: 'Salary' },
  { icon: 'laptop', name: 'Freelance' },
  { icon: 'trending-up', name: 'Investment' },
  { icon: 'gift', name: 'Gift' },
  { icon: 'wallet', name: 'Other' },
];

export default function AddTransactionScreen() {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { profileId, balance, updateBalance } = useAuth();
  const router = useRouter();

  // Animation for pill toggle
  const pillAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: type === 'expense' ? 0 : 1,
      friction: 8,
      tension: 50,
      useNativeDriver: false,
    }).start();
    // Reset category when switching type
    setCategory('');
  }, [type]);

  const pillTranslate = pillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1], // We'll use percentage-based in the style
  });

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleAiCategorize = async () => {
    if (!aiText.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await categorizeExpense(aiText);
      if (result.amount) setAmount(result.amount.toString());
      if (result.category) {
        // match category exactly
        const found = EXPENSE_CATEGORIES.find(c => c.name.toLowerCase() === result.category.toLowerCase());
        if (found) {
          setType('expense');
          setCategory(found.name);
        }
      }
      if (result.note) setNote(result.note);
      setAiText(''); // clear on success
    } catch (e) {
      alert('Failed to analyze text. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!profileId) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!category.trim()) {
      alert('Please select a category');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        profile_id: profileId,
        type,
        amount: numAmount,
        category,
        note,
        date: new Date().toISOString(),
      });

      if (error) throw error;

      // Update balance
      const currentBalance = balance || 0;
      const newBalance =
        type === 'income'
          ? currentBalance + numAmount
          : currentBalance - numAmount;

      await updateBalance(newBalance);

      router.back();
    } catch (e) {
      console.error(e);
      alert('Failed to save transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background accents */}
      <View
        style={[
          styles.bgAccent,
          {
            backgroundColor:
              type === 'expense'
                ? 'rgba(239, 68, 68, 0.04)'
                : 'rgba(34, 197, 94, 0.04)',
          },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add Transaction</Text>
              <View style={{ width: 60 }} />
            </View>

            {/* Pill Toggle */}
            <View style={styles.toggleContainer}>
              <Animated.View
                style={[
                  styles.togglePill,
                  {
                    left: pillAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['2%', '50%'],
                    }),
                    backgroundColor:
                      type === 'expense'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(34, 197, 94, 0.2)',
                  },
                ]}
              />
              <TouchableOpacity
                style={styles.toggleOption}
                onPress={() => setType('expense')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleText,
                    type === 'expense' && styles.toggleTextActiveExpense,
                  ]}
                >
                  <Ionicons name="arrow-up-circle-outline" size={16} /> Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleOption}
                onPress={() => setType('income')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleText,
                    type === 'income' && styles.toggleTextActiveIncome,
                  ]}
                >
                  <Ionicons name="arrow-down-circle-outline" size={16} /> Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* AI Auto-Categorization */}
            {type === 'expense' && (
              <View style={styles.aiSection}>
                <Text style={styles.sectionLabel}><Ionicons name="sparkles" size={14} color="#a855f7" /> AI Magic Fill</Text>
                <View style={styles.aiInputContainer}>
                  <TextInput
                    style={styles.aiInput}
                    placeholder="e.g. Spent 500 on Swiggy for dinner"
                    placeholderTextColor="#555"
                    value={aiText}
                    onChangeText={setAiText}
                    multiline
                  />
                  <TouchableOpacity 
                    style={styles.aiButton} 
                    onPress={handleAiCategorize}
                    disabled={isAnalyzing || !aiText.trim()}
                  >
                    {isAnalyzing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.aiButtonText}>Auto Fill</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Amount Input */}
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Amount</Text>
              <View style={styles.amountInputRow}>
                <Text
                  style={[
                    styles.currencySymbol,
                    {
                      color:
                        type === 'expense' ? '#ef4444' : '#22c55e',
                    },
                  ]}
                >
                  ₹
                </Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor="#3a3a4a"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                  selectionColor={type === 'expense' ? '#ef4444' : '#22c55e'}
                />
              </View>
              {amount ? (
                <Text style={styles.amountFormatted}>
                  ₹{' '}
                  {parseFloat(amount).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              ) : null}
            </View>

            {/* Category Grid */}
            <View style={styles.categorySection}>
              <Text style={styles.sectionLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    style={[
                      styles.categoryItem,
                      category === cat.name && styles.categoryItemSelected,
                      category === cat.name && {
                        borderColor:
                          type === 'expense'
                            ? 'rgba(239, 68, 68, 0.4)'
                            : 'rgba(34, 197, 94, 0.4)',
                        backgroundColor:
                          type === 'expense'
                            ? 'rgba(239, 68, 68, 0.08)'
                            : 'rgba(34, 197, 94, 0.08)',
                      },
                    ]}
                    onPress={() => setCategory(cat.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={cat.icon as any} size={24} color={category === cat.name ? '#ffffff' : '#6b6b7e'} style={{ marginBottom: 6 }} />
                    <Text
                      style={[
                        styles.categoryName,
                        category === cat.name && styles.categoryNameSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Note Input */}
            <View style={styles.noteSection}>
              <Text style={styles.sectionLabel}>Note (optional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="What was this for?"
                placeholderTextColor="#3a3a4a"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                selectionColor="#a855f7"
              />
            </View>

            {/* Date */}
            <View style={styles.dateSection}>
              <Text style={styles.sectionLabel}>Date</Text>
              <View style={styles.dateDisplay}>
                <Ionicons name="calendar-outline" size={20} color="#8b8b9e" />
                <Text style={styles.dateText}>{todayFormatted}</Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor:
                    type === 'expense' ? '#ef4444' : '#22c55e',
                  shadowColor:
                    type === 'expense' ? '#ef4444' : '#22c55e',
                },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  Save {type === 'expense' ? 'Expense' : 'Income'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  bgAccent: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 350,
    height: 350,
    borderRadius: 175,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  backButton: {
    width: 60,
  },
  backText: {
    color: '#a855f7',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  togglePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '48%',
    borderRadius: 16,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    zIndex: 1,
  },
  toggleText: {
    color: '#6b6b7e',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleTextActiveExpense: {
    color: '#ef4444',
  },
  toggleTextActiveIncome: {
    color: '#22c55e',
  },

  // Amount
  amountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  amountLabel: {
    color: '#6b6b7e',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  currencySymbol: {
    fontSize: 44,
    fontWeight: '800',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 44,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    padding: 0,
    minWidth: 80,
    maxWidth: '80%',
  },
  amountFormatted: {
    color: '#5a5a6e',
    fontSize: 14,
    marginTop: 8,
  },

  // Category
  categorySection: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#8b8b9e',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryItem: {
    width: '18.5%',
    aspectRatio: 0.85,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 8,
  },
  categoryItemSelected: {
    borderWidth: 1.5,
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  categoryName: {
    color: '#6b6b7e',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // AI Section
  aiSection: {
    marginBottom: 24,
  },
  aiInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    paddingRight: 10,
  },
  aiInput: {
    flex: 1,
    padding: 16,
    color: '#ffffff',
    fontSize: 15,
  },
  aiButton: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  aiButtonText: {
    color: '#a855f7',
    fontWeight: '600',
    fontSize: 13,
  },

  // Note
  noteSection: {
    marginBottom: 24,
  },
  noteInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Date
  dateSection: {
    marginBottom: 32,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  dateIcon: {
    fontSize: 20,
  },
  dateText: {
    color: '#8b8b9e',
    fontSize: 15,
    fontWeight: '500',
  },

  // Save Button
  saveButton: {
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Cancel
  cancelButton: {
    padding: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: '#4a4a5a',
    fontSize: 16,
    fontWeight: '500',
  },
});
