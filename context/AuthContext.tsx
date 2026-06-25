import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  isActivated: boolean;
  profileId: string | null;
  balance: number | null;
  isLoading: boolean;
  activate: (code: string) => Promise<boolean>;
  updateBalance: (amount: number) => Promise<void>;
  addTransaction: (
    type: string,
    amount: number,
    category: string,
    note: string
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isActivated, setIsActivated] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: check AsyncStorage for existing profileId
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedProfileId = await AsyncStorage.getItem('profileId');
        if (storedProfileId) {
          setIsActivated(true);
          setProfileId(storedProfileId);

          // Fetch profile balance from supabase
          const { data, error } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', storedProfileId)
            .single();

          if (data) {
            setBalance(data.balance);
          }
          if (error) {
            console.error('Error fetching profile balance:', error.message);
            if (error.code === '22P02' || error.message.includes('uuid')) {
              await AsyncStorage.removeItem('profileId');
              setIsActivated(false);
              setProfileId(null);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load auth state:', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const activate = async (code: string): Promise<boolean> => {
    try {
      // 1. Query activation_codes table for the code
      const { data: codeData, error: codeError } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', code)
        .single();

      // Code NOT found -> return false
      if (codeError || !codeData) {
        console.error('Activation code not found:', codeError?.message);
        return false;
      }

      if (!codeData.is_used) {
        // 3. Code found and is_used=false -> fresh activation
        // Mark the code as used
        await supabase
          .from('activation_codes')
          .update({ is_used: true })
          .eq('code', code);

        // Create a new profile with balance=null
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({ balance: null, activated_with_code: code })
          .select()
          .single();

        if (profileError || !newProfile) {
          console.error('Error creating profile:', profileError?.message);
          return false;
        }

        const newProfileId = newProfile.id;
        await AsyncStorage.setItem('profileId', newProfileId);
        setProfileId(newProfileId);
        setBalance(null); // triggers setup screen
        setIsActivated(true);
        return true;
      } else {
        // 4. Code found and is_used=true -> returning user
        // Find the profile that was activated with this code
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('activated_with_code', code)
          .single();

        if (profileError || !existingProfile) {
          console.error('Error finding existing profile:', profileError?.message);
          return false;
        }

        const existingProfileId = existingProfile.id;
        await AsyncStorage.setItem('profileId', existingProfileId);
        setProfileId(existingProfileId);
        setBalance(existingProfile.balance); // goes to dashboard if balance exists
        setIsActivated(true);
        return true;
      }
    } catch (e) {
      console.error('Activation error:', e);
      return false;
    }
  };

  const updateBalance = async (amount: number): Promise<void> => {
    setBalance(amount);
    if (profileId) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: profileId, balance: amount });

      if (error) {
        console.error('Error updating balance:', error.message);
      }
    }
  };

  const addTransaction = async (
    type: string,
    amount: number,
    category: string,
    note: string
  ): Promise<void> => {
    if (!profileId) return;

    // Insert into transactions table
    const { error: txError } = await supabase.from('transactions').insert({
      profile_id: profileId,
      type,
      amount,
      category,
      note,
    });

    if (txError) {
      console.error('Error adding transaction:', txError.message);
      return;
    }

    // Update balance accordingly
    const currentBalance = balance ?? 0;
    const newBalance =
      type === 'income'
        ? currentBalance + amount
        : currentBalance - amount;

    await updateBalance(newBalance);
  };

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('profileId');
      setIsActivated(false);
      setProfileId(null);
      setBalance(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isActivated,
        profileId,
        balance,
        isLoading,
        activate,
        updateBalance,
        addTransaction,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
