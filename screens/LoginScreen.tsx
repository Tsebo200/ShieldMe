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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigation = useNavigation<any>();
  const { setUser } = useTrip(); // 👈 Access setUser from context

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 🔍 Fetch user's full data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        setErrorMsg('User document not found in database');
        return;
      }

      const userData = userDoc.data();
      setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userData });

      setErrorMsg('');
      navigation.navigate('HomeScreen');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error: any) {
      let message = 'Email & Password Do Not Match';
      if (error.code === 'auth/invalid-email') message = 'Invalid email format';
      else if (error.code === 'auth/user-not-found') message = 'User not found';
      else if (error.code === 'auth/wrong-password') message = 'Incorrect password';
      setErrorMsg(message);
    }
  };

    const handleRegisterNav = (data: any) => {
      navigation.navigate("RegisterScreen");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

  return (
    <DropProvider>
    <View style={styles.container}>
      {errorMsg !== '' && 
       <View style={styles.errorBox}>
    <Text style={styles.errorIcon}>⚠️</Text>
    <Text style={styles.errorText}>{errorMsg}</Text>
    </View>}
      <Text style={styles.title}>Login</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#ccc"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#ccc"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      {/* Drag & Drop Container */}
      <View style={styles.dragAndDropContainer}>
        <Droppable
          id="go-register"
          style={styles.navDropZone}
          onDrop={handleRegisterNav}
          
          activeStyle={styles.dropZoneActive}
        >
          <Text style={{ color: '#F1EFE5', textAlign: 'center' }}>Go {"\n"} Register</Text>
        </Droppable>
          <Droppable
          id="submit-register"
          style={styles.navDropZone}
          onDrop={handleLogin}
          activeStyle={styles.dropZoneActive}
        >
          <Text style={{ color: '#F1EFE5', textAlign: 'center' }}>Submit {"\n"} & Login</Text>
        </Droppable>
      </View>

      {/* Armo */}
        <Draggable id="login-icon"  style={styles.navDraggable}>
          <Mascot width={60} height={60}/>
        </Draggable>


        {/* ToolTip */}
        <View style={styles.tooltipMainContainer}>
        <View style={styles.tooltipContainerOne}>
          {/* <View style={styles.tooltipBox}>
            <Text style={styles.tooltipText}>Don't have an account?</Text>
          </View> */}

        </View>

        <View style={styles.tooltipContainerTwo}>
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipText}>Drag & Drop Armo to Register</Text>
            <Text style={styles.tooltipSubText}>to create an account</Text>
          </View>

        </View>
        </View>

        
                  {/* <View style={styles.tooltipArrow} /> */}
                  {/* <View style={styles.tooltipArrow} /> */}

        {/* <Text style={styles.toolTip}> Don't have an account?</Text>
        <Text style={styles.toolTip}>Drag & Drop Armo To Register</Text>
        <Text style={styles.toolTip}>To Create An Account</Text> */}


        {/* <Text style={styles.link}>
          Don't have an account? {"\n"} */}
 
        {/* <Text style={{ fontWeight: 'bold', padding: 200 }}>Drag & Drop Armo To Register</Text> {"\n"}To Create An Account </Text> */}

    </View>
    </DropProvider>
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
