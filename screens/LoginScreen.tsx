import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useTrip } from '../context/TripContext';
import LocalSvg from '../components/LocalSvg';
import * as Haptics from "expo-haptics";
import { LoginScreenProps } from '../types/navigation';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  // State for email input
  const [email, setEmail] = useState('');
  // State for password input
  const [password, setPassword] = useState('');
  // State to display any login error messages
  const [errorMsg, setErrorMsg] = useState('');
  // Access setUser function from TripContext to store logged-in user data
  const { setUser } = useTrip() as any;

  // Function to handle user login
  const handleLogin = async () => {
    // Validate input fields
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch full user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        setErrorMsg('User document not found in database');
        return;
      }

      // Set the user in context
      const userData = userDoc.data();
      setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userData });

      setErrorMsg(''); // Clear error messages
      navigation.navigate('HomeScreen'); // Navigate to Home after login
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Haptic feedback
    } catch (error: any) {
      // Handle Firebase auth errors
      let message = 'Email & Password Do Not Match';
      if (error.code === 'auth/invalid-email') message = 'Invalid email format';
      else if (error.code === 'auth/user-not-found') message = 'User not found';
      else if (error.code === 'auth/wrong-password') message = 'Incorrect password';
      setErrorMsg(message);
    }
  };

  // Navigate to Register screen
  const handleRegisterNav = useCallback(() => {
    navigation.navigate("RegisterScreen");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [navigation]);

  // Handle login button press
  const handleLoginPress = useCallback(() => {
    handleLogin();
  }, [email, password, setUser, navigation]);

  return (
    <SafeAreaView style={styles.container}>
        {/* Display error message if login fails */}
        {errorMsg !== '' && 
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        }

        {/* Screen title */}
        <Text style={styles.title}>Login</Text>

        {/* Email input field */}
        <TextInput
          placeholder="Email"
          placeholderTextColor="#ccc"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password input field */}
        <TextInput
          placeholder="Password"
          placeholderTextColor="#ccc"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />

        {/* Navigation buttons */}
        <View style={styles.dragAndDropContainer}>
          <TouchableOpacity
            onPress={handleRegisterNav}
            style={styles.navDropZone}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#F1EFE5', textAlign: 'center' }}>Go {"\n"} Register</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLoginPress}
            style={styles.navDropZone}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#F1EFE5', textAlign: 'center' }}>Submit {"\n"} & Login</Text>
          </TouchableOpacity>
        </View>

        {/* Tooltip explaining drag & drop action */}
        <View style={styles.tooltipMainContainer}>
          <View style={styles.tooltipContainerOne}>
            {/* Optional first tooltip container */}
          </View>

          <View style={styles.tooltipContainerTwo}>
            <View style={styles.tooltipBox}>
              <Text style={styles.tooltipText}>Drag & Drop Armo to Register</Text>
              <Text style={styles.tooltipSubText}>to create an account</Text>
            </View>
          </View>
        </View>

      </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#393031',
    // backgroundColor: '#F1EFE5',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    marginBottom: 30,
    fontWeight: '700',
    color: '#CBBC9F',
    textAlign: 'center',
    position: 'relative',
  },
  input: {
    backgroundColor: '#232625',
    color: '#F1EFE5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  toolTip: {
    marginTop: 20,
    color: '#F8C1E1',
    textAlign: 'center',
  },
  navDropZone: {
    width: 85,
    height: 85,
    backgroundColor: "#232625",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#755540",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  dragAndDropContainer: {
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: 'space-around',
    marginVertical: 20,
    marginTop: 30,
  },
  dropZoneActive: {
    transform: [{ scale: 1.07 }],
    backgroundColor: '#755540',
    borderStyle: 'solid',
    borderColor: '#F1EFE5',
  },
  navDraggable: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },

  // Error message style
  errorBox: {
  position: 'absolute',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#4c1205',   // deep red from your palette
  padding: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#e2b257',       // amber accent
  alignSelf: 'center',
  width: '100%',
  top: 120,
  zIndex: 1000, // Ensure it appears above other elements
},
errorIcon: {
  marginRight: 8,
  fontSize: 18,
  color: '#CBBC9F',
},
errorText: {
  color: '#CBBC9F',
  fontSize: 14,
  flexShrink: 1,
  },

// Tool Tip container
tooltipMainContainer: {
  justifyContent: 'center',
  alignItems: 'center'
},

  tooltipContainerOne: {
  width: '70%',
  marginTop: 30,
},
  // Tool Tip container
  tooltipContainerTwo: {
  width: '70%',
  marginTop: 10,
},
tooltipBox: {
  backgroundColor: '#232625',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#755540',
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 6,
  elevation: 3, // for Android shadow
  // maxWidth: '80%',
},
tooltipText: {
  color: '#F8C1E1',
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
},
tooltipSubText: {
  color: '#CBBC9F',
  fontSize: 12,
  marginTop: 4,
  textAlign: 'center',
},
tooltipArrow: {
  width: 0,
  height: 0,
  borderLeftWidth: 8,
  borderRightWidth: 8,
  borderTopWidth: 10,
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  borderTopColor: '#232625',
  alignSelf: 'center',
  marginTop: -1,
  marginLeft:-1,
},

// Button styles
buttonContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  width: '100%',
  marginTop: 20,
},
navButton: {
  backgroundColor: '#4CAF50',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  minWidth: 120,
},
  buttonText: {
    color: '#F1EFE5',
    textAlign: 'center',
    fontWeight: 'bold',
  },

});
