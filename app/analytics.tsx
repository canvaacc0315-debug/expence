import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  note: string;
};

type TimePeriod = 'week' | 'month' | 'year';

const CATEGORY_EMOJIS: Record<string, string> = {
  food: '🍔',
  groceries: '🛒',
  transport: '🚗',
  shopping: '🛍️',
  entertainment: '🎬',
  health: '💊',
  education: '📚',
  bills: '💡',
  rent: '🏠',
  salary: '💰',
  freelance: '💻',
  investment: '📈',
  gift: '🎁',
  travel: '✈️',
  fitness: '🏋️',
  subscriptions: '📱',
  recharge: '📞',
  fuel: '⛽',
  clothing: '👕',
  other: '📝',
};

const getEmoji = (category: string): string => {
  const key = category.toLowerCase().trim();
  return CATEGORY_EMOJIS[key] || '📝';
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getStartDate = (period: TimePeriod): Date => {
  const now = new Date();
  switch (period) {
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    case 'year': {
      return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    }
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  return `${day} ${month}`;
};

export default function AnalyticsScreen() {
  const { profileId } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');

  useEffect(() => {
    fetchTransactions();
  }, [profileId, timePeriod]);

  const fetchTransactions = async () => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      const startDate = getStartDate(timePeriod).toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('profile_id', profileId)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (data) {
        setTransactions(data as Transaction[]);
      }
      if (error) console.error('Fetch error:', error);
    } catch (e) {
      console.error('Failed to fetch analytics data', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Spending by category
  const categoryMap: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = t.category;
      categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
    });
  const categoryList = Object.entries(categoryMap)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Daily spending (last 7 days)
  const dailySpending: { day: string; date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayExpenses = transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(dateStr))
      .reduce((sum, t) => sum + t.amount, 0);
    dailySpending.push({
      day: DAY_NAMES[d.getDay()],
      date: `${d.getDate()}`,
      amount: dayExpenses,
    });
  }
  const maxDailySpend = Math.max(...dailySpending.map((d) => d.amount), 1);

  // Top 5 expenses
  const topExpenses = transactions
    .filter((t) => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const PERIOD_LABELS: Record<TimePeriod, string> = {
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Analytics</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Time Period Selector */}
      <View style={styles.periodContainer}>
        {(['week', 'month', 'year'] as TimePeriod[]).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodTab,
              timePeriod === period && styles.periodTabActive,
            ]}
            onPress={() => setTimePeriod(period)}
          >
            <Text
              style={[
                styles.periodTabText,
                timePeriod === period && styles.periodTabTextActive,
              ]}
            >
              {PERIOD_LABELS[period]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.incomeCard]}>
              <Text style={styles.summaryIcon}>📈</Text>
              <Text style={styles.summaryLabel}>Total Income</Text>
              <Text style={[styles.summaryValue, styles.incomeColor]}>
                +₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.expenseCard]}>
              <Text style={styles.summaryIcon}>📉</Text>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={[styles.summaryValue, styles.expenseColor]}>
                -₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          <View style={[styles.netCard, netSavings >= 0 ? styles.netPositive : styles.netNegative]}>
            <Text style={styles.netIcon}>{netSavings >= 0 ? '💰' : '⚠️'}</Text>
            <View>
              <Text style={styles.netLabel}>Net Savings</Text>
              <Text
                style={[
                  styles.netValue,
                  netSavings >= 0 ? styles.incomeColor : styles.expenseColor,
                ]}
              >
                {netSavings >= 0 ? '+' : ''}₹{netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Spending by Category */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            {categoryList.length === 0 ? (
              <Text style={styles.noDataText}>No expenses in this period</Text>
            ) : (
              categoryList.map((cat, index) => (
                <View key={`cat-${index}`} style={styles.categoryRow}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryNameRow}>
                      <Text style={styles.categoryEmoji}>{getEmoji(cat.name)}</Text>
                      <Text style={styles.categoryName}>{cat.name}</Text>
                    </View>
                    <View style={styles.categoryValues}>
                      <Text style={styles.categoryAmount}>
                        ₹{cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.categoryPercent}>
                        {cat.percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.barBackground}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${cat.percentage}%`,
                          backgroundColor: getBarColor(index),
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Daily Spending */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Daily Spending (Last 7 Days)</Text>
            <View style={styles.dailyChart}>
              {dailySpending.map((day, index) => (
                <View key={`day-${index}`} style={styles.dailyBarContainer}>
                  <Text style={styles.dailyAmount}>
                    {day.amount > 0
                      ? `₹${day.amount >= 1000
                          ? (day.amount / 1000).toFixed(1) + 'k'
                          : day.amount.toFixed(0)}`
                      : '—'}
                  </Text>
                  <View style={styles.dailyBarWrapper}>
                    <View
                      style={[
                        styles.dailyBar,
                        {
                          height: day.amount > 0
                            ? `${(day.amount / maxDailySpend) * 100}%`
                            : '2%',
                          backgroundColor:
                            day.amount > 0 ? '#6c63ff' : '#1e1e30',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.dailyLabel}>{day.day}</Text>
                  <Text style={styles.dailyDate}>{day.date}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Top Expenses */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Top Expenses</Text>
            {topExpenses.length === 0 ? (
              <Text style={styles.noDataText}>No expenses in this period</Text>
            ) : (
              topExpenses.map((txn, index) => (
                <View key={txn.id} style={styles.topExpenseRow}>
                  <View style={styles.topExpenseLeft}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View>
                      <View style={styles.topExpenseNameRow}>
                        <Text style={styles.topExpenseEmoji}>
                          {getEmoji(txn.category)}
                        </Text>
                        <Text style={styles.topExpenseName}>{txn.category}</Text>
                      </View>
                      <Text style={styles.topExpenseDate}>
                        {formatDate(txn.date)}
                        {txn.note ? ` • ${txn.note}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.topExpenseAmount}>
                    -₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const BAR_COLORS = ['#6c63ff', '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0', '#c8d6e5'];

const getBarColor = (index: number): string => {
  return BAR_COLORS[index % BAR_COLORS.length];
};

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
    marginBottom: 14,
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
  periodContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#12121a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodTabActive: {
    backgroundColor: '#6c63ff',
  },
  periodTabText: {
    color: '#777',
    fontSize: 14,
    fontWeight: '600',
  },
  periodTabTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  // Summary Cards
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#12121a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  incomeCard: {
    borderColor: '#1b3a1e',
  },
  expenseCard: {
    borderColor: '#3a1b1b',
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeColor: {
    color: '#4caf50',
  },
  expenseColor: {
    color: '#ff4d4d',
  },
  netCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    gap: 14,
  },
  netPositive: {
    borderColor: '#1b3a1e',
  },
  netNegative: {
    borderColor: '#3a1b1b',
  },
  netIcon: {
    fontSize: 32,
  },
  netLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  netValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Section Card
  sectionCard: {
    backgroundColor: '#12121a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e1e30',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noDataText: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Category Row
  categoryRow: {
    marginBottom: 14,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  categoryName: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryAmount: {
    color: '#ff4d4d',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryPercent: {
    color: '#888',
    fontSize: 12,
    minWidth: 42,
    textAlign: 'right',
  },
  barBackground: {
    height: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Daily Spending
  dailyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
  },
  dailyBarContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  dailyAmount: {
    color: '#888',
    fontSize: 10,
    marginBottom: 6,
    textAlign: 'center',
  },
  dailyBarWrapper: {
    width: '70%',
    height: 100,
    justifyContent: 'flex-end',
    borderRadius: 6,
    overflow: 'hidden',
  },
  dailyBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  dailyLabel: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  dailyDate: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
  },
  // Top Expenses
  topExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  topExpenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#6c63ff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  topExpenseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topExpenseEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  topExpenseName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  topExpenseDate: {
    color: '#555',
    fontSize: 12,
    marginTop: 2,
  },
  topExpenseAmount: {
    color: '#ff4d4d',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
