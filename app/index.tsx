import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  note: string;
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Food: 'fast-food',
  Transport: 'car',
  Shopping: 'cart',
  Health: 'medkit',
  Entertainment: 'film',
  Bills: 'receipt',
  Rent: 'home',
  Education: 'school',
  Travel: 'airplane',
  Salary: 'cash',
  Freelance: 'laptop',
  Investment: 'trending-up',
  Gift: 'gift',
  Other: 'wallet',
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const formatCurrency = (amount: number): string => {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function Dashboard() {
  const { balance, profileId } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'calendar' | 'ai' | 'admin'>('home');

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthSpending, setMonthSpending] = useState(0);

  const fetchTransactions = useCallback(async () => {
    if (!profileId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('profile_id', profileId)
        .order('date', { ascending: false });

      if (data) {
        const txns = data as Transaction[];
        setAllTransactions(txns);
        setTransactions(txns.slice(0, 5));

        // Calculate totals
        let income = 0;
        let expenses = 0;
        let monthExp = 0;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        txns.forEach((t) => {
          if (t.type === 'income') {
            income += t.amount;
          } else {
            expenses += t.amount;
          }

          const txDate = new Date(t.date);
          if (
            t.type === 'expense' &&
            txDate.getMonth() === currentMonth &&
            txDate.getFullYear() === currentYear
          ) {
            monthExp += t.amount;
          }
        });

        setTotalIncome(income);
        setTotalExpenses(expenses);
        setMonthSpending(monthExp);
      }
    } catch (e) {
      console.error('Failed to fetch transactions', e);
    }
  }, [profileId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchTransactions();
      setIsLoading(false);
    };
    load();
  }, [fetchTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const handleTabPress = (tab: 'home' | 'history' | 'calendar' | 'ai' | 'admin') => {
    setActiveTab(tab);
    if (tab === 'history') router.push('/history' as any);
    if (tab === 'calendar') router.push('/calendar' as any);
    if (tab === 'ai') router.push('/ai' as any);
    if (tab === 'admin') router.push('/admin' as any);
  };

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    return CATEGORY_ICONS[category] || 'card';
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.emojiContainer,
            {
              backgroundColor:
                item.type === 'income'
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
            },
          ]}
        >
          <Ionicons name={getCategoryIcon(item.category)} size={22} color={item.type === 'income' ? '#22c55e' : '#ef4444'} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionCategory}>{item.category}</Text>
          {item.note ? (
            <Text style={styles.transactionNote} numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          item.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
        ]}
      >
        {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a855f7"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} <Ionicons name="hand-left" size={24} color="#fbbf24" /></Text>
            <Text style={styles.greetingSub}>Here's your financial overview</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/admin' as any)}
          >
            <Ionicons name="settings-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Balance Card - Glassmorphism */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceGlow} />
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceValue}>
            {formatCurrency(balance || 0)}
          </Text>
          <View style={styles.balanceFooter}>
            <View style={styles.balanceStat}>
              <Ionicons name="arrow-up" size={16} color="#22c55e" />
              <Text style={styles.balanceStatLabel}>Income</Text>
            </View>
            <View style={styles.balanceStat}>
              <Ionicons name="arrow-down" size={16} color="#ef4444" />
              <Text style={styles.balanceStatLabel}>Expense</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statIncome]}>
            <Ionicons name="trending-up" size={20} color="#ffffff" style={{ marginBottom: 6 }} />
            <Text style={styles.statValue}>
              ₹{totalIncome.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Total Income</Text>
          </View>
          <View style={[styles.statCard, styles.statExpense]}>
            <Ionicons name="trending-down" size={20} color="#ffffff" style={{ marginBottom: 6 }} />
            <Text style={styles.statValue}>
              ₹{totalExpenses.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Total Expenses</Text>
          </View>
          <View style={[styles.statCard, styles.statMonth]}>
            <Ionicons name="calendar" size={20} color="#ffffff" style={{ marginBottom: 6 }} />
            <Text style={styles.statValue}>
              ₹{monthSpending.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.expenseButton}
            onPress={() => router.push('/add')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up-circle-outline" size={20} color="#ef4444" />
            <Text style={styles.actionText}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.incomeButton}
            onPress={() => router.push('/add')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-down-circle-outline" size={20} color="#22c55e" />
            <Text style={styles.actionText}>Add Income</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/history' as any)}>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          )}
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="stats-chart" size={48} color="#a855f7" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Start by adding your first expense or income
            </Text>
          </View>
        ) : (
          transactions.map((item) => (
            <View key={item.id}>{renderTransaction({ item })}</View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('home')}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'home' ? '#a855f7' : 'rgba(255,255,255,0.5)'}
            style={styles.navIcon}
          />
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('history')}
        >
          <Ionicons
            name={activeTab === 'history' ? 'list' : 'list-outline'}
            size={22}
            color={activeTab === 'history' ? '#a855f7' : 'rgba(255,255,255,0.5)'}
            style={styles.navIcon}
          />
          <Text style={[styles.navLabel, activeTab === 'history' && styles.navLabelActive]}>
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('calendar')}
        >
          <Ionicons
            name={activeTab === 'calendar' ? 'calendar' : 'calendar-outline'}
            size={22}
            color={activeTab === 'calendar' ? '#a855f7' : 'rgba(255,255,255,0.5)'}
            style={styles.navIcon}
          />
          <Text style={[styles.navLabel, activeTab === 'calendar' && styles.navLabelActive]}>
            Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('ai')}
        >
          <Ionicons
            name={activeTab === 'ai' ? 'planet' : 'planet-outline'}
            size={22}
            color={activeTab === 'ai' ? '#a855f7' : 'rgba(255,255,255,0.5)'}
            style={styles.navIcon}
          />
          <Text style={[styles.navLabel, activeTab === 'ai' && styles.navLabelActive]}>
            AI Insights
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('admin')}
        >
          <Ionicons
            name={activeTab === 'admin' ? 'settings' : 'settings-outline'}
            size={22}
            color={activeTab === 'admin' ? '#a855f7' : 'rgba(255,255,255,0.5)'}
            style={styles.navIcon}
          />
          <Text style={[styles.navLabel, activeTab === 'admin' && styles.navLabelActive]}>
            Admin
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  greetingSub: {
    fontSize: 14,
    color: '#6b6b7e',
    marginTop: 4,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingsIcon: {
    fontSize: 22,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
    overflow: 'hidden',
  },
  balanceGlow: {
    position: 'absolute',
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  balanceLabel: {
    color: '#8b8b9e',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  balanceValue: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(168, 85, 247, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  balanceFooter: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24,
  },
  balanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceStatArrow: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '700',
  },
  balanceStatLabel: {
    color: '#7a7a8e',
    fontSize: 13,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIncome: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  statExpense: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  statMonth: {
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#7a7a8e',
    textAlign: 'center',
  },

  // Action Buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  expenseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  incomeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  actionEmoji: {
    fontSize: 20,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  seeAllText: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '600',
  },

  // Transaction Card
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emojiContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  emojiText: {
    fontSize: 22,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionNote: {
    color: '#6b6b7e',
    fontSize: 13,
    marginBottom: 2,
  },
  transactionDate: {
    color: '#4a4a5a',
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  incomeAmount: {
    color: '#22c55e',
  },
  expenseAmount: {
    color: '#ef4444',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#7a7a8e',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtext: {
    color: '#4a4a5a',
    fontSize: 14,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 15, 22, 0.95)',
    paddingVertical: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navIcon: {
    fontSize: 22,
    marginBottom: 4,
    opacity: 0.5,
  },
  navActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
    color: '#4a4a5a',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#a855f7',
    fontWeight: '700',
  },
});
