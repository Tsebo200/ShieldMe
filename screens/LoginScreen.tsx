// screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { loginUser } from '../services/authService';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation', 'Email and password are required');
      return;
    }
    try {
      await loginUser(email, password);
      navigation.replace('FriendsScreen');
      // navigation.replace('HomeScreen');
    } catch (e) {
      // loginUser shows alert
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#393031', // Rich dark brown/gray
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#CBBC9F', // Elegant cream
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#232625', // Deep charcoal (input background)
    color: '#F1EFE5', // Soft cream text
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#755540', // Warm brown
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#F1EFE5', // Light cream
    fontWeight: '600',
  },
  errorText: {
    color: '#ED1C25', // Red for error
    textAlign: 'center',
    marginBottom: 10,
  },
  link: {
    marginTop: 20,
    color: '#F8C1E1', // Light pink
    textAlign: 'center',
  },
});
