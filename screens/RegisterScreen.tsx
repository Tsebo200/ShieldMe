import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { registerUser } from '../services/authService';
import { useNavigation } from '@react-navigation/native';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Validation', 'All fields are required');
      return;
    }
    try {
      await registerUser(fullName, email, password);
      Alert.alert('Success', 'Account created');
      navigation.replace('FriendsScreen');
    } catch (e:any) {
      // registerUser alerts errors
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize='none'
        keyboardType='email-address'
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
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
        <Text style={styles.link}>Already have an account? Login</Text>
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
