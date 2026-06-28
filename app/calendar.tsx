import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, DateData } from 'react-native-calendars';
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

const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  return CATEGORY_ICONS[category] || 'card';
};

const formatCurrency = (amount: number): string => {
  if (amount >= 1000) {
    return '₹' + (amount / 1000).toFixed(1) + 'k';
  }
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export default function CalendarScreen() {
  const { profileId } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchTransactions();
  }, [profileId]);

  const fetchTransactions = async () => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('profile_id', profileId)
        .order('date', { ascending: false });

      if (data) {
        setTransactions(data as Transaction[]);
      }
    } catch (e) {
      console.error('Failed to fetch transactions', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Group transactions by YYYY-MM-DD
  const groupedData = useMemo(() => {
    const group: Record<string, { income: number; expense: number; transactions: Transaction[] }> = {};
    transactions.forEach(t => {
      const d = t.date.split('T')[0];
      if (!group[d]) {
        group[d] = { income: 0, expense: 0, transactions: [] };
      }
      group[d].transactions.push(t);
      if (t.type === 'income') {
        group[d].income += t.amount;
      } else {
        group[d].expense += t.amount;
      }
    });
    return group;
  }, [transactions]);

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
          <Ionicons name={getCategoryIcon(item.category)} size={22} color={item.type === 'income' ? '#22c55e' : '#ef4444'} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionCategory}>{item.category}</Text>
          {item.note ? (
            <Text style={styles.transactionNote} numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          item.type === 'income' ? styles.incomeText : styles.expenseText,
        ]}
      >
        {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
      </Text>
    </View>
  );

  const renderDay = ({ date, state }: { date: DateData; state: string }) => {
    const isSelected = selectedDate === date.dateString;
    const dayData = groupedData[date.dateString];
    
    const isToday = state === 'today';
    const isDisabled = state === 'disabled';

    return (
      <TouchableOpacity
        style={[
          styles.dayContainer,
          isSelected && styles.daySelected,
          isToday && !isSelected && styles.dayToday
        ]}
        onPress={() => setSelectedDate(date.dateString)}
        disabled={isDisabled}
      >
        <Text style={[
          styles.dayText, 
          isDisabled && styles.dayDisabledText,
          isSelected && styles.daySelectedText
        ]}>
          {date.day}
        </Text>
        
        {dayData && dayData.expense > 0 && !isDisabled && (
          <Text style={[styles.dayAmount, { color: '#ef4444' }]} numberOfLines={1}>
            -{formatCurrency(dayData.expense)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const selectedDayData = groupedData[selectedDate];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6c63ff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={{ width: 80 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c63ff" />
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={
            <View>
              <View style={styles.calendarWrapper}>
                <Calendar
                  current={selectedDate}
                  onDayPress={(day: any) => setSelectedDate(day.dateString)}
                  dayComponent={(props: any) => renderDay(props)}
                  theme={{
                    backgroundColor: '#12121a',
                    calendarBackground: '#12121a',
                    textSectionTitleColor: '#6c63ff',
                    monthTextColor: '#ffffff',
                    arrowColor: '#6c63ff',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600',
                    textMonthFontSize: 18,
                    textDayHeaderFontSize: 13,
                  }}
                />
              </View>

              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>
                  {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                
                {selectedDayData ? (
                  <View style={styles.summaryStatsRow}>
                    <View style={styles.summaryStat}>
                      <Ionicons name="arrow-down-circle" size={20} color="#22c55e" />
                      <Text style={[styles.summaryStatValue, { color: '#22c55e' }]}>
                        ₹{selectedDayData.income.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Ionicons name="arrow-up-circle" size={20} color="#ef4444" />
                      <Text style={[styles.summaryStatValue, { color: '#ef4444' }]}>
                        ₹{selectedDayData.expense.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No transactions on this day.</Text>
                )}
              </View>
            </View>
          }
          data={selectedDayData?.transactions || []}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
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
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    width: 80,
  },
  backText: {
    color: '#6c63ff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarWrapper: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e30',
    backgroundColor: '#12121a',
    paddingBottom: 10,
  },
  dayContainer: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  daySelected: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#6c63ff',
  },
  dayToday: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dayText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  daySelectedText: {
    color: '#6c63ff',
    fontWeight: 'bold',
  },
  dayDisabledText: {
    color: '#333344',
  },
  dayAmount: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  summaryContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e1e30',
    gap: 8,
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataText: {
    color: '#6b6b7e',
    fontSize: 15,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#12121a',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e1e30',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  incomeText: {
    color: '#22c55e',
  },
  expenseText: {
    color: '#ef4444',
  },
});
