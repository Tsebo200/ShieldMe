// screens/RegisterScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { registerUser } from "../services/authService";
import { useNavigation } from "@react-navigation/native";
import { DropProvider, Draggable, Droppable } from "react-native-reanimated-dnd";
import Mascot from "../assets/CrawlDark.svg";
import { SafeAreaView } from "react-native-safe-area-context";

// Firebase to save user doc (we rely on registerUser to sign-in the user)
import { auth, db } from "../firebase";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import AvatarPicker from "../components/AvatarPicker";

const brandColors = [
  "#232625", "#393031", "#545456", "#282827", "#563F2F",
  "#46372D", "#635749", "#AB9E87", "#F8C1E1", "#ED1C25",
  "#F1EFE5", "#F0E4CB", "#731702", "#CBBC9F",
];

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // avatar selection payload: { seed, style, uri }
  const [avatar, setAvatar] = useState<{ seed: string; style: string; uri: string } | null>(null);

  const navigation = useNavigation<any>();

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMsg("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords Do Not Match");
      return;
    }

    setLoading(true);
    try {
      // registerUser is assumed to create the Firebase auth user and sign them in
      await registerUser(fullName.trim(), email.trim(), password);

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Registration succeeded but no user found");

      const uid = currentUser.uid;

      // update auth profile displayName (optional)
      if (fullName.trim()) {
        try {
          await updateProfile(currentUser, { displayName: fullName.trim() });
        } catch (e) {
          // non-fatal: continue even if updating profile fails
          console.warn("updateProfile failed:", e);
        }
      }

      // build default avatar if none chosen
      const defaultAvatar = {
        seed: "anonymous",
        style: "adventurer",
        uri: `https://api.dicebear.com/9.x/adventurer/svg?seed=anonymous`,
      };

      const avatarToSave = avatar || defaultAvatar;

      // derive username default if user didn't provide one (use email prefix)
      const usernameFromEmail = email.split("@")[0].replace(/\s+/g, "_").toLowerCase();

      const userDoc = {
        displayName: fullName.trim() || currentUser.displayName || "Anonymous",
        username: usernameFromEmail,
        email: email.trim(),
        phone: "N/A",
        emergencyContacts: [],
        avatar: avatarToSave,
        createdAt: new Date(),
      };

      // save user doc
      await setDoc(doc(db, "users", uid), userDoc);

      setErrorMsg("");
      navigation.replace("HomeScreen");
    } catch (e: any) {
      console.error("Register error:", e);
      let message = "Registration failed";
      if (e.code === "auth/email-already-in-use") message = "User Already Exists";
      else if (e.code === "auth/invalid-email") message = "Invalid Email Format";
      else if (e.code === "auth/weak-password") message = "Password Too Weak: At Least 6 characters";
      else if (e.message) message = e.message;
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const onAvatarConfirm = (payload: { seed: string; style: string; uri: string }) => {
    setAvatar(payload);
  };

  return (
    <DropProvider>
      <ScrollView style={styles.safe}>
        <View style={styles.container}>
          {errorMsg !== "" && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Text style={styles.title}>Create Account</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#ccc"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#ccc"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#ccc"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#ccc"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {/* Avatar picker */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.pickTitle}>Pick a profile icon</Text>
            <AvatarPicker initialSeed={fullName || undefined} onConfirm={onAvatarConfirm} />
            {/* quick hint showing chosen seed */}
            {avatar ? (
              <Text style={styles.chosenText}>Chosen: {avatar.seed} ({avatar.style})</Text>
            ) : (
              <Text style={styles.chosenText}>No avatar selected — default will be used</Text>
            )}
          </View>

          {/* Drag & Drop Container */}
          <View style={styles.dragAndDropContainer}>
            <Droppable
              id="go-login"
              style={styles.navDropZone}
              onDrop={() => navigation.navigate("LoginScreen")}
              activeStyle={styles.dropZoneActive}
            >
              <Text style={{ color: "#F1EFE5", textAlign: "center" }}>Go Login</Text>
            </Droppable>

            <Droppable
              id="submit-register"
              style={styles.navDropZone}
              onDrop={handleRegister}
              activeStyle={styles.dropZoneActive}
            >
              <Text style={{ color: "#F1EFE5", textAlign: "center" }}>
                {loading ? "Processing..." : "Submit\n& Register"}
              </Text>
            </Droppable>
          </View>

          <Draggable id="register-icon" style={styles.navDraggable}>
            {loading ? (
              <ActivityIndicator color={brandColors[9]} />
            ) : (
              <Mascot width={60} height={60} />
            )}
          </Draggable>

          {/* ToolTip */}
          <View style={styles.tooltipMainContainer}>
            <View style={styles.tooltipContainerTwo}>
              <View style={styles.tooltipBox}>
                <Text style={styles.tooltipText}>Drag & Drop Armo on Login</Text>
                <Text style={styles.tooltipSubText}>to Login</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </DropProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brandColors[1] },
  container: {
    flex: 1,
    backgroundColor: brandColors[1],
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    marginBottom: 18,
    fontWeight: "700",
    color: brandColors[13],
    textAlign: "center",
  },
  pickTitle: {
    color: brandColors[10],
    fontWeight: "700",
    marginBottom: 8,
  },
  chosenText: { color: brandColors[13], marginTop: 8, fontWeight: "600" },
  input: {
    backgroundColor: brandColors[0],
    color: brandColors[10],
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  link: {
    marginTop: 20,
    color: brandColors[8],
    textAlign: "center",
  },
  navDropZone: {
    width: 85,
    height: 85,
    backgroundColor: brandColors[0],
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#755540",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  dragAndDropContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginVertical: 20,
    marginTop: 30,
  },
  dropZoneActive: {
    transform: [{ scale: 1.07 }],
    backgroundColor: "#755540",
    borderColor: brandColors[10],
    borderStyle: "solid",
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
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4c1205",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2b257",
    alignSelf: "center",
    width: "100%",
    top: 90,
    zIndex: 1000,
  },
  errorIcon: {
    marginRight: 8,
    fontSize: 18,
    color: brandColors[10],
  },
  errorText: {
    color: brandColors[10],
    fontSize: 14,
    flexShrink: 1,
  },

  // Tool Tip container
  tooltipMainContainer: {
    marginTop: 5,
    justifyContent: "center",
    alignItems: "center",
  },

  tooltipContainerTwo: {
    width: "70%",
    marginTop: 10,
  },
  tooltipBox: {
    backgroundColor: brandColors[0],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#755540",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  tooltipText: {
    color: brandColors[8],
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  tooltipSubText: {
    color: brandColors[13],
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
