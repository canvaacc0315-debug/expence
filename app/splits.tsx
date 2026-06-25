import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function SplitsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('split_groups')
        .select(`
          id, 
          name, 
          created_at,
          split_members (
            id,
            user_id,
            name,
            amount_owed
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || !user) return;
    try {
      const { data, error } = await supabase
        .from('split_groups')
        .insert([{ name: newGroupName.trim(), created_by: user.id }])
        .select();

      if (error) throw error;
      
      setNewGroupName('');
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Split Expenses</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.createSection}>
          <TextInput
            style={styles.input}
            placeholder="New Group Name"
            placeholderTextColor="#888"
            value={newGroupName}
            onChangeText={setNewGroupName}
          />
          <TouchableOpacity style={styles.createButton} onPress={createGroup}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#a855f7" style={{ marginTop: 40 }} />
        ) : (
          groups.map((group) => (
            <View key={group.id} style={styles.card}>
              <Text style={styles.cardTitle}>{group.name}</Text>
              {group.split_members?.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={[styles.amount, { color: member.amount_owed >= 0 ? '#4ade80' : '#f87171' }]}>
                    {member.amount_owed >= 0 ? '+' : '-'}₹{Math.abs(member.amount_owed).toFixed(2)}
                  </Text>
                </View>
              ))}
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
    flexDirection: 'row',
    marginBottom: 25,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    marginRight: 10,
  },
  createButton: {
    backgroundColor: '#a855f7',
    width: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'rgba(20, 20, 30, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  memberName: {
    color: '#ccc',
    fontSize: 16,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
