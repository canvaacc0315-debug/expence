import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SetupScreen() {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { updateBalance } = useAuth();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleStart = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await updateBalance(numAmount);
    } catch (e) {
      setError('Failed to set balance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDisplayAmount = (val: string) => {
    if (!val) return '';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toLocaleString('en-IN');
  };

  return (
    <View style={styles.container}>
      {/* Background accents */}
      <View style={styles.bgAccent1} />
      <View style={styles.bgAccent2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🏦</Text>
          </View>

          <Text style={styles.title}>Set Your Bank Balance</Text>
          <Text style={styles.subtitle}>
            Enter your current bank balance in ₹
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Large currency input */}
          <View style={styles.currencyInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.currencyInput}
              placeholder="0"
              placeholderTextColor="#3a3a4a"
              keyboardType="numeric"
              value={amount}
              onChangeText={(text) => {
                setAmount(text.replace(/[^0-9.]/g, ''));
                if (error) setError('');
              }}
              selectionColor="#22c55e"
            />
          </View>

          {/* Display formatted amount */}
          {amount ? (
            <Text style={styles.formattedAmount}>
              ₹ {formatDisplayAmount(amount)}
            </Text>
          ) : null}

          <View style={styles.divider} />

          {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}

          <TouchableOpacity
            style={[styles.startButton, isLoading && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.startButtonText}>Start Tracking</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hintText}>
            You can always update this later from settings
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  bgAccent1: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
  },
  bgAccent2: {
    position: 'absolute',
    bottom: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7a7a8e',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 28,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 48,
    fontWeight: '700',
    color: '#22c55e',
    marginRight: 8,
  },
  currencyInput: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    minWidth: 120,
    textAlign: 'left',
    padding: 0,
  },
  formattedAmount: {
    fontSize: 16,
    color: '#5a5a6e',
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hintText: {
    color: '#4a4a5a',
    fontSize: 13,
    textAlign: 'center',
  },
});
