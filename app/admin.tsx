import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

const ADMIN_PASSWORD = 'admin';

type Code = {
  id: string;
  code: string;
  is_used: boolean;
  created_at: string;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function AdminPanel() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<Code[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCodes();
    }
  }, [isAuthenticated]);

  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setCodes(data);
      }
      if (error) console.error('Fetch codes error:', error);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      Alert.alert('Error', 'Incorrect admin password');
    }
  };

  const generateCode = async () => {
    setIsGenerating(true);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newCode = '';
    for (let i = 0; i < 6; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    try {
      const { error } = await supabase
        .from('activation_codes')
        .insert({ code: newCode, is_used: false });

      if (!error) {
        fetchCodes();
        Alert.alert('✅ Code Generated', `New activation code:\n\n${newCode}`, [
          { text: 'OK' },
        ]);
      } else {
        Alert.alert('Error', 'Failed to generate code. Try again.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate code.');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteCode = async (id: string, code: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to delete code ${code}?`);
      if (confirmed) {
        try {
          await supabase.from('activation_codes').delete().eq('id', id);
          fetchCodes();
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    Alert.alert('Delete Code', `Are you sure you want to delete code ${code}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('activation_codes').delete().eq('id', id);
            fetchCodes();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const copyCode = (code: string) => {
    // Show alert with the code so user can manually copy
    Alert.alert('📋 Activation Code', `${code}\n\nCode shown above for reference.`, [
      { text: 'OK' },
    ]);
  };

  const totalCodes = codes.length;
  const activeCodes = codes.filter((c) => !c.is_used).length;
  const usedCodes = codes.filter((c) => c.is_used).length;

  // Login Screen
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
        <View style={styles.loginWrapper}>
          <View style={styles.loginCard}>
            <View style={styles.lockIconContainer}>
              <Text style={styles.lockIcon}>🔐</Text>
            </View>
            <Text style={styles.loginTitle}>Admin Access</Text>
            <Text style={styles.loginSubtitle}>Enter your admin password to continue</Text>

            <TextInput
              style={styles.loginInput}
              placeholder="Admin Password"
              placeholderTextColor="#555"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.backLinkText}>← Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Admin Dashboard
  const renderCode = ({ item }: { item: Code }) => (
    <View style={styles.codeCard}>
      <View style={styles.codeLeft}>
        <Text style={styles.codeText}>{item.code}</Text>
        <View style={styles.codeMetaRow}>
          <View
            style={[
              styles.statusBadge,
              item.is_used ? styles.statusBadgeUsed : styles.statusBadgeActive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.is_used ? '#ff4d4d' : '#4caf50' },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                item.is_used ? styles.usedStatusText : styles.activeStatusText,
              ]}
            >
              {item.is_used ? 'Used' : 'Active'}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      <View style={styles.codeActions}>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => copyCode(item.code)}
        >
          <Text style={styles.copyButtonText}>📋</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteCode(item.id, item.code)}
        >
          <Text style={styles.deleteButtonText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ Admin Panel</Text>
        <TouchableOpacity onPress={() => setIsAuthenticated(false)} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.statCardPurple]}>
          <Text style={styles.statNumber}>{totalCodes}</Text>
          <Text style={styles.statLabel}>Total Codes</Text>
        </View>
        <View style={[styles.statCard, styles.statCardGreen]}>
          <Text style={[styles.statNumber, styles.activeColor]}>{activeCodes}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, styles.statCardRed]}>
          <Text style={[styles.statNumber, styles.usedColor]}>{usedCodes}</Text>
          <Text style={styles.statLabel}>Used</Text>
        </View>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={styles.generateButton}
        onPress={generateCode}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Text style={styles.generateIcon}>✚</Text>
            <Text style={styles.generateText}>Generate New Code</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Code List */}
      <Text style={styles.sectionTitle}>Activation Codes</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <Text style={styles.loadingText}>Loading codes...</Text>
        </View>
      ) : codes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyText}>No activation codes yet</Text>
          <Text style={styles.emptySubtext}>Generate your first code above</Text>
        </View>
      ) : (
        <FlatList
          data={codes}
          keyExtractor={(item) => item.id}
          renderItem={renderCode}
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
  // Login Styles
  loginWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loginCard: {
    backgroundColor: '#12121a',
    borderRadius: 20,
    padding: 30,
    borderWidth: 1,
    borderColor: '#1e1e30',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  lockIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lockIcon: {
    fontSize: 48,
  },
  loginTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
  },
  loginInput: {
    backgroundColor: '#0a0a0f',
    color: '#ffffff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1e1e30',
    textAlign: 'center',
    letterSpacing: 2,
  },
  loginButton: {
    backgroundColor: '#6c63ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  backLinkText: {
    color: '#6c63ff',
    fontSize: 14,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    paddingVertical: 8,
  },
  backBtnText: {
    color: '#6c63ff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutBtn: {
    paddingVertical: 8,
  },
  logoutText: {
    color: '#ff4d4d',
    fontSize: 14,
    fontWeight: '600',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#12121a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statCardPurple: {
    borderColor: '#2d2b55',
  },
  statCardGreen: {
    borderColor: '#1b3a1e',
  },
  statCardRed: {
    borderColor: '#3a1b1b',
  },
  statNumber: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activeColor: {
    color: '#4caf50',
  },
  usedColor: {
    color: '#ff4d4d',
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Generate
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#6c63ff',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generateIcon: {
    color: '#ffffff',
    fontSize: 18,
    marginRight: 10,
    fontWeight: 'bold',
  },
  generateText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 14,
  },
  // Code Card
  codeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#12121a',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1a1a2e',
  },
  codeLeft: {
    flex: 1,
  },
  codeText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 4,
    marginBottom: 8,
  },
  codeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: '#0d2e10',
  },
  statusBadgeUsed: {
    backgroundColor: '#2e0d0d',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#4caf50',
  },
  usedStatusText: {
    color: '#ff4d4d',
  },
  dateText: {
    color: '#555',
    fontSize: 12,
  },
  codeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: 18,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2e0d0d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
  },
  // Loading / Empty
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
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
