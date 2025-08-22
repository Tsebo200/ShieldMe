import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useTrip } from '../context/TripContext';
import { DropProvider, Draggable, Droppable } from 'react-native-reanimated-dnd';
import Mascot  from '../assets/CrawlDark.svg';
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  // State for email input
  const [email, setEmail] = useState('');
  // State for password input
  const [password, setPassword] = useState('');
  // State to display any login error messages
  const [errorMsg, setErrorMsg] = useState('');
  const navigation = useNavigation<any>();
  // Access setUser function from TripContext to store logged-in user data
  const { setUser } = useTrip(); 

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

  // Navigate to Register screen when user drops Armo on register zone
  const handleRegisterNav = (data: any) => {
    navigation.navigate("RegisterScreen");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); // Haptic feedback
  };

  return (
    <DropProvider>
      <View style={styles.container}>
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

        {/* Drag & Drop Container for login and registration */}
        <View style={styles.dragAndDropContainer}>
          {/* Droppable zone for registering */}
          <Droppable
            id="go-register"
            style={styles.navDropZone}
            onDrop={handleRegisterNav}
            activeStyle={styles.dropZoneActive}
          >
            <Text style={{ color: '#F1EFE5', textAlign: 'center' }}>Go {"\n"} Register</Text>
          </Droppable>

          {/* Droppable zone for submitting login */}
          <Droppable
            id="submit-register"
            style={styles.navDropZone}
            onDrop={handleLogin}
            activeStyle={styles.dropZoneActive}
          >
            <Text style={{ color: '#F1EFE5', textAlign: 'center' }}>Submit {"\n"} & Login</Text>
          </Droppable>
        </View>

        {/* Draggable mascot (Armo) */}
        <Draggable id="login-icon" style={styles.navDraggable}>
          <Mascot width={60} height={60}/>
        </Draggable>

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

      </View>
    </DropProvider>
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

});
