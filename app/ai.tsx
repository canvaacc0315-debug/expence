import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getAIInsight } from '../lib/groq';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  note: string;
};

const buildTransactionSummary = (transactions: Transaction[]): string => {
  if (transactions.length === 0) return 'No transactions found.';

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Top spending categories
  const categoryMap: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = t.category.toLowerCase();
      categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
    });
  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(2)}`)
    .join(', ');

  // Income categories
  const incomeCategoryMap: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'income')
    .forEach((t) => {
      const cat = t.category.toLowerCase();
      incomeCategoryMap[cat] = (incomeCategoryMap[cat] || 0) + t.amount;
    });
  const topIncome = Object.entries(incomeCategoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(2)}`)
    .join(', ');

  // Recent spending (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentExpenses = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date) >= weekAgo)
    .reduce((sum, t) => sum + t.amount, 0);

  // Last 30 days
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthlyExpenses = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date) >= monthAgo)
    .reduce((sum, t) => sum + t.amount, 0);

  return `User Financial Summary (Currency: Indian Rupees ₹):
- Total Transactions: ${transactions.length}
- Total Income: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpense.toFixed(2)}
- Net Savings: ₹${netSavings.toFixed(2)}
- Savings Rate: ${totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0}%
- Top Spending Categories: ${topCategories || 'None'}
- Top Income Sources: ${topIncome || 'None'}
- Last 7 Days Spending: ₹${recentExpenses.toFixed(2)}
- Last 30 Days Spending: ₹${monthlyExpenses.toFixed(2)}
- Transaction Period: ${transactions.length > 0 ? new Date(transactions[transactions.length - 1].date).toLocaleDateString() : 'N/A'} to ${transactions.length > 0 ? new Date(transactions[0].date).toLocaleDateString() : 'N/A'}`;
};

export default function AIInsightsScreen() {
  const { profileId } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [customQuestion, setCustomQuestion] = useState('');
  const [customResponse, setCustomResponse] = useState('');
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransactionsAndAnalyze();
  }, [profileId]);

  const fetchTransactionsAndAnalyze = async () => {
    if (!profileId) return;
    setIsLoadingData(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('profile_id', profileId)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      const txns = (data || []) as Transaction[];
      setTransactions(txns);

      const txnSummary = buildTransactionSummary(txns);
      setSummary(txnSummary);

      // Auto-fetch AI insight
      setIsLoadingInsight(true);
      try {
        const prompt = `You are a premium Indian financial advisor AI. Analyze this user's financial data and provide actionable insights. Use ₹ (Indian Rupees) for all amounts. Be concise but insightful. Include: 1) Overall financial health assessment 2) Key spending patterns 3) Top 3 personalized saving tips 4) Warning flags if any.\n\n${txnSummary}`;
        const response = await getAIInsight(prompt);
        setAiResponse(response);
      } catch (aiErr) {
        console.error('AI insight error:', aiErr);
        setAiResponse('Unable to generate insights at this time. Please try again later.');
      } finally {
        setIsLoadingInsight(false);
      }
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
      setError('Failed to load your financial data. Pull down to retry.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleAskCustomQuestion = async () => {
    if (!customQuestion.trim()) return;
    setIsLoadingCustom(true);
    setCustomResponse('');
    try {
      const prompt = `You are a premium Indian financial advisor AI. The user is asking a question about their finances. Use ₹ (Indian Rupees) for all amounts. Answer based on their data below.\n\nUser's Financial Data:\n${summary}\n\nUser's Question: ${customQuestion}`;
      const response = await getAIInsight(prompt);
      setCustomResponse(response);
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      console.error('Custom question error:', e);
      setCustomResponse('Sorry, I could not process your question. Please try again.');
    } finally {
      setIsLoadingCustom(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>✨ AI Insights</Text>
        <TouchableOpacity onPress={fetchTransactionsAndAnalyze} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isLoadingData ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6c63ff" />
            <Text style={styles.loadingText}>Fetching your financial data...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchTransactionsAndAnalyze}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{transactions.length}</Text>
                <Text style={styles.statLabel}>Transactions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.incomeColor]}>
                  ₹{transactions
                    .filter((t) => t.type === 'income')
                    .reduce((s, t) => s + t.amount, 0)
                    .toLocaleString('en-IN')}
                </Text>
                <Text style={styles.statLabel}>Total Income</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.expenseColor]}>
                  ₹{transactions
                    .filter((t) => t.type === 'expense')
                    .reduce((s, t) => s + t.amount, 0)
                    .toLocaleString('en-IN')}
                </Text>
                <Text style={styles.statLabel}>Total Expense</Text>
              </View>
            </View>

            {/* AI Insight Card */}
            <View style={styles.gradientBorderOuter}>
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightTitle}>✨ AI Financial Analysis</Text>
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>AI</Text>
                  </View>
                </View>

                {isLoadingInsight ? (
                  <View style={styles.insightLoading}>
                    <ActivityIndicator size="small" color="#6c63ff" />
                    <Text style={styles.insightLoadingText}>
                      Analyzing your finances with AI...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.insightText}>{aiResponse}</Text>
                )}
              </View>
            </View>

            {/* Custom Question Response */}
            {customResponse ? (
              <View style={styles.gradientBorderOuter}>
                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Text style={styles.insightTitle}>💬 Your Question</Text>
                  </View>
                  <Text style={styles.questionPreview}>{customQuestion}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.insightText}>{customResponse}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Ask AI Input */}
      {!isLoadingData && !error && (
        <View style={styles.askContainer}>
          <View style={styles.askInputWrapper}>
            <TextInput
              style={styles.askInput}
              placeholder="Ask AI about your finances..."
              placeholderTextColor="#555"
              value={customQuestion}
              onChangeText={setCustomQuestion}
              multiline
              maxLength={500}
              editable={!isLoadingCustom}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!customQuestion.trim() || isLoadingCustom) && styles.sendButtonDisabled,
              ]}
              onPress={handleAskCustomQuestion}
              disabled={!customQuestion.trim() || isLoadingCustom}
            >
              {isLoadingCustom ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.sendButtonText}>→</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.askHint}>
            e.g. "Where am I spending the most?" or "How can I save ₹5000 this month?"
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 10,
  },
  backText: {
    color: '#6c63ff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshBtn: {
    padding: 8,
  },
  refreshText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: '#888',
    fontSize: 15,
    marginTop: 16,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#6c63ff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: '#12121a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e1e30',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2a2a40',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  incomeColor: {
    color: '#4caf50',
  },
  expenseColor: {
    color: '#ff4d4d',
  },
  gradientBorderOuter: {
    borderRadius: 18,
    padding: 1.5,
    marginBottom: 16,
    backgroundColor: '#6c63ff',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  insightCard: {
    backgroundColor: '#0e0e18',
    borderRadius: 17,
    padding: 20,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  insightTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  aiBadge: {
    backgroundColor: '#6c63ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  insightLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  insightLoadingText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 12,
  },
  insightText: {
    color: '#d0d0d0',
    fontSize: 14,
    lineHeight: 22,
  },
  questionPreview: {
    color: '#6c63ff',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e1e30',
    marginBottom: 12,
  },
  askContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    backgroundColor: '#0a0a0f',
  },
  askInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#12121a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e30',
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
  },
  askInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    maxHeight: 80,
    paddingVertical: 10,
  },
  sendButton: {
    backgroundColor: '#6c63ff',
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#2a2a3e',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  askHint: {
    color: '#444',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
});
