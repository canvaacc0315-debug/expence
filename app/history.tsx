import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
  food: 'fast-food',
  groceries: 'cart',
  transport: 'car',
  shopping: 'cart',
  entertainment: 'film',
  health: 'medkit',
  education: 'school',
  bills: 'receipt',
  rent: 'home',
  salary: 'cash',
  freelance: 'laptop',
  investment: 'trending-up',
  gift: 'gift',
  travel: 'airplane',
  fitness: 'barbell',
  subscriptions: 'phone-portrait',
  recharge: 'flash',
  fuel: 'water',
  clothing: 'shirt',
  other: 'wallet',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  const key = category.toLowerCase().trim();
  return CATEGORY_ICONS[key] || 'card';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function HistoryScreen() {
  const { profileId } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchTransactions();
  }, [profileId, selectedMonth, selectedYear]);

  const fetchTransactions = async () => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('profile_id', profileId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (data) {
        setTransactions(data as Transaction[]);
      }
      if (error) console.error('Fetch error:', error);
    } catch (e) {
      console.error('Failed to fetch transactions', e);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [profileId, selectedMonth, selectedYear]);

  const filteredTransactions = transactions.filter((t) => {
    const matchesFilter = activeFilter === 'all' || t.type === activeFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      t.category.toLowerCase().includes(query) ||
      (t.note && t.note.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const changeMonth = (direction: number) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const exportCSV = async () => {
    if (filteredTransactions.length === 0) {
      Alert.alert('Empty', 'No transactions to export.');
      return;
    }
    
    let csvString = 'Date,Type,Category,Amount,Note\n';
    filteredTransactions.forEach(t => {
      csvString += `${t.date.split('T')[0]},${t.type},${t.category},${t.amount},"${t.note || ''}"\n`;
    });

    const fileUri = FileSystem.documentDirectory + 'transactions.csv';
    try {
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Error', 'Sharing is not available on this device/web');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.emojiContainer,
            {
              backgroundColor: item.type === 'income' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            },
          ]}
        >
          <Ionicons name={getCategoryIcon(item.category)} size={22} color={item.type === 'income' ? '#4caf50' : '#ff4d4d'} />
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
          item.type === 'income' ? styles.incomeText : styles.expenseText,
        ]}
      >
        {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );

  const ListHeader = () => (
    <View>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, styles.incomeText]}>
              +₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={[styles.summaryValue, styles.expenseText]}>
              -₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text
              style={[
                styles.summaryValue,
                totalIncome - totalExpense >= 0 ? styles.incomeText : styles.expenseText,
              ]}
            >
              ₹{(totalIncome - totalExpense).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'income', 'expense'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              activeFilter === filter && styles.filterTabActive,
              activeFilter === filter && filter === 'income' && styles.filterTabIncome,
              activeFilter === filter && filter === 'expense' && styles.filterTabExpense,
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter && styles.filterTabTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by category or note..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.resultCount}>
        {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6c63ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <TouchableOpacity onPress={exportCSV} style={styles.exportButton}>
          <Text style={styles.exportText}>CSV 📥</Text>
        </TouchableOpacity>
      </View>

      {/* Month/Year Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={24} color="#6c63ff" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {MONTHS[selectedMonth]} {selectedYear}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
          <Ionicons name="chevron-forward" size={24} color="#6c63ff" />
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color="#555" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'No transactions for this period'}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6c63ff"
              colors={['#6c63ff']}
              progressBackgroundColor="#1a1a2e"
            />
          }
        />
      )}
    </View>
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  monthArrow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  monthArrowText: {
    color: '#6c63ff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  monthText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    minWidth: 160,
    textAlign: 'center',
  },
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: '#12121a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e1e30',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#2a2a40',
  },
  summaryLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#12121a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: '#6c63ff',
  },
  filterTabIncome: {
    backgroundColor: '#1b5e20',
  },
  filterTabExpense: {
    backgroundColor: '#b71c1c',
  },
  filterTabText: {
    color: '#777',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: '#12121a',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1e1e30',
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 12,
  },
  clearSearch: {
    color: '#888',
    fontSize: 16,
    padding: 4,
  },
  resultCount: {
    color: '#555',
    fontSize: 13,
    marginHorizontal: 24,
    marginBottom: 10,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#12121a',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1a1a2e',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
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
    color: '#888',
    fontSize: 13,
    marginBottom: 2,
  },
  transactionDate: {
    color: '#555',
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  incomeText: {
    color: '#4caf50',
  },
  expenseText: {
    color: '#ff4d4d',
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
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtext: {
    color: '#555',
    fontSize: 14,
  },
});
