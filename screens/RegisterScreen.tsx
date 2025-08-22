import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image} from "react-native";
import { registerUser } from "../services/authService";
import { useNavigation } from "@react-navigation/native";
import { DropProvider, Draggable, Droppable } from "react-native-reanimated-dnd";
import Mascot from "../assets/CrawlDark.svg";
import MascotLight from "../assets/CrawlLight.svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import AvatarPicker from "../components/AvatarPicker";
import { auth, db } from "../firebase";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

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

  // Avatar state (seed/style/uri)
  const [avatar, setAvatar] = useState<{ seed: string; style: string; uri: string } | null>(null);

  const navigation = useNavigation<any>();

  // BottomSheetModal ref + snap points (no 0)
  const bottomSheetModalRef = useRef<BottomSheetModal | null>(null);
  const snapPoints = useMemo(() => ["50%", "85%"], []);

  // DEBUG: check ref after mount
  useEffect(() => {
    console.log("bottomSheetModalRef on mount ->", bottomSheetModalRef.current);
  }, []);

  const openAvatarPicker = useCallback(() => {
    console.log("openAvatarPicker called, ref:", bottomSheetModalRef.current);
    try {
      bottomSheetModalRef.current?.present();
    } catch (err) {
      console.warn("present() threw:", err);
    }
  }, []);

  const closeAvatarPicker = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const onAvatarConfirm = useCallback((payload: { seed: string; style: string; uri: string }) => {
    setAvatar(payload);
    closeAvatarPicker();
  }, [closeAvatarPicker]);

  // helper to generate random avatar if user never picked one
  const DICEBEAR_BASE = "https://api.dicebear.com/9.x";
  const AVATAR_STYLES = ["adventurer", "micah", "bottts", "identicon"] as const;
  const generateRandomAvatar = () => {
    const sampleSeeds = [
      "Explorer","Astra","Nova","ShieldUser","Traveler","Luna","Harper","Kai","Mika","Riley","Sam","Jordan","Aiden"
    ];
    const seed = sampleSeeds[Math.floor(Math.random() * sampleSeeds.length)];
    const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
    const safe = encodeURIComponent(seed.trim().replace(/\s+/g, "_"));
    const uri = `${DICEBEAR_BASE}/${style}/svg?seed=${safe}`;
    return { seed, style, uri };
  };

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
      await registerUser(fullName.trim(), email.trim(), password);

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Registration succeeded but no user found");

      const uid = currentUser.uid;

      if (fullName.trim()) {
        try {
          await updateProfile(currentUser, { displayName: fullName.trim() });
        } catch (e) {
          console.warn("updateProfile failed:", e);
        }
      }

      const avatarToSave = avatar || generateRandomAvatar();
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

      await setDoc(doc(db, "users", uid), userDoc);

      setErrorMsg("");
      // navigation.replace("HomeScreen");
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

  return (
    <DropProvider>
      <SafeAreaView style={styles.safe}>
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

          {/* Avatar Trigger Two Drag & Drop */}

          <View style={styles.dragAndDropContainer}>
            <Droppable
              id="go-login"
              style={styles.navDropZone}
              onDrop={openAvatarPicker}
              activeStyle={styles.dropZoneActive}
            >
              <Text style={{ color: "#F1EFE5", textAlign: "center" }}>
                Pick a Profile icon
              </Text>
            </Droppable>

            <Draggable id="register-icon" style={styles.navDraggable}>
              {loading ? (
                <ActivityIndicator color={brandColors[8]} />
              ) : (
                <MascotLight width={60} height={60} />
              )}
            </Draggable>
          </View>

          {/* Avatar preview & open sheet trigger */}
          {/* <TouchableOpacity
            style={styles.avatarPreviewRow}
            onPress={openAvatarPicker}
            activeOpacity={0.85}
          >
            <View style={styles.avatarPreview}>
              {avatar ? (
                <Image
                  source={{ uri: avatar.uri }}
                  style={styles.avatarImage}
                />
              ) : (
                <Mascot width={56} height={56} />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.pickTitle}>Pick a profile icon</Text>
              <Text style={styles.chosenText}>
                {avatar
                  ? `${avatar.seed} · ${avatar.style}`
                  : "Tap to pick one (or we'll assign a random icon)"}
              </Text>
            </View>
          </TouchableOpacity> */}

          {/* Drag & Drop: Submit / Login */}
          <View style={styles.dragAndDropContainer}>
            <Droppable
              id="go-login"
              style={styles.navDropZone}
              onDrop={() => navigation.navigate("LoginScreen")}
              activeStyle={styles.dropZoneActive}
            >
              <Text style={{ color: "#F1EFE5", textAlign: "center" }}>
                Go Login
              </Text>
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

          <View style={styles.tooltipMainContainer}>
            <View style={styles.tooltipContainerTwo}>
              <View style={styles.tooltipBox}>
                <Text style={styles.tooltipText}>
                  Drag & Drop Armo on Login
                </Text>
                <Text style={styles.tooltipSubText}>to Login</Text>
              </View>
            </View>
          </View>
        </View>

        {/* BottomSheetModal (present/dismiss programmatically) */}
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          backgroundStyle={{ backgroundColor: brandColors[0] }}
        >
          {/* Vital View as this is the actual sheet */}
          <BottomSheetView style={styles.sheetBaby}>
            <></>
          </BottomSheetView>
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Choose your avatar</Text>
            {/* Picker Component */}
            <AvatarPicker
              initialSeed={fullName || undefined}
              initialStyle={"adventurer"}
              onConfirm={onAvatarConfirm}
            />
          </View>
        </BottomSheetModal>
      </SafeAreaView>
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
  pickTitle: { color: brandColors[10], fontWeight: "700", marginBottom: 4 },
  chosenText: { color: brandColors[13], marginTop: 2, fontWeight: "600" },
  input: {
    backgroundColor: brandColors[0],
    color: brandColors[10],
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  avatarPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  avatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: brandColors[0],
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: brandColors[9],
  },
  avatarImage: { width: 68, height: 68, borderRadius: 34 },
  sheetBaby: { height: 150 },
  sheetContent: { flex: 1, padding: 12 },
  sheetTitle: {
    color: brandColors[10],
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
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
    marginTop: 18,
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
    top: 15,
    zIndex: 1000,
  },
  errorIcon: { marginRight: 8, fontSize: 18, color: brandColors[10] },
  errorText: { color: brandColors[10], fontSize: 14, flexShrink: 1 },
  tooltipMainContainer: { justifyContent: "center", alignItems: "center" },
  tooltipContainerTwo: { width: "70%", marginTop: 10 },
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
