import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { SvgUri } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import BackButton from '../components/BackButton';
import { addEmergencyContact, removeEmergencyContact } from '../services/emergencyContactService';

const brandColors = [
  "#232625", "#393031", "#545456", "#282827", "#563F2F",
  "#46372D", "#635749", "#AB9E87", "#F8C1E1", "#ED1C25",
  "#F1EFE5", "#F0E4CB", "#731702", "#CBBC9F",
];

const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

type AvatarPayload = {
  seed?: string;
  style?: string;
  uri?: string;
};

type EmergencyContact = {
  uid: string;
  name: string;
  email: string;
  avatar?: AvatarPayload;
};

type Friend = {
  uid: string;
  name: string;
  email: string;
  avatar?: AvatarPayload;
};

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
  const [showAddFriends, setShowAddFriends] = useState(false);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          Alert.alert('Error', 'User not logged in');
          navigation.goBack();
          return;
        }

        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          setDisplayName(data.displayName || data.fullName || data.name || '');
          setUsername(data.username || '');
          setPhone(data.phone || '');
          const emergencyContactUids = (data.emergencyContacts as string[]) || [];
          await fetchEmergencyContactDetails(emergencyContactUids);
          await fetchAvailableFriends(emergencyContactUids);
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Listen for changes to emergency contacts
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const emergencyContactUids = (data.emergencyContacts as string[]) || [];
        await fetchEmergencyContactDetails(emergencyContactUids);
        await fetchAvailableFriends(emergencyContactUids);
      }
    });

    return () => unsub();
  }, []);

  // Fetch emergency contact details
  const fetchEmergencyContactDetails = useCallback(async (uids: string[]) => {
    if (uids.length === 0) {
      setEmergencyContacts([]);
      return;
    }

    try {
      const contactPromises = uids.map(async (uid) => {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          return {
            uid,
            name: data.fullName || data.displayName || data.name || data.email?.split('@')[0] || 'Unknown',
            email: data.email || '',
            avatar: data.avatar,
          } as EmergencyContact;
        }
        return null;
      });

      const contacts = (await Promise.all(contactPromises)).filter(Boolean) as EmergencyContact[];
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error fetching emergency contact details:', error);
    }
  }, []);

  // Fetch available friends
  const fetchAvailableFriends = useCallback(async (emergencyContactUids: string[]) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data() as any;
      const friendUids: string[] = userData.friends || [];
      const availableUids = friendUids.filter(uid => !emergencyContactUids.includes(uid));

      if (availableUids.length === 0) {
        setAvailableFriends([]);
        return;
      }

      const friendPromises = availableUids.map(async (uid) => {
        const friendRef = doc(db, 'users', uid);
        const friendSnap = await getDoc(friendRef);
        if (friendSnap.exists()) {
          const data = friendSnap.data() as any;
          return {
            uid,
            name: data.fullName || data.displayName || data.name || data.email?.split('@')[0] || 'Unknown',
            email: data.email || '',
            avatar: data.avatar,
          } as Friend;
        }
        return null;
      });

      const friends = (await Promise.all(friendPromises)).filter(Boolean) as Friend[];
      setAvailableFriends(friends);
    } catch (error) {
      console.error('Error fetching available friends:', error);
    }
  }, []);

  // Save profile (displayName and username)
  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Nickname cannot be empty');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    // Validate username format (alphanumeric and underscores only)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    try {
      setSavingProfile(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { 
        displayName: displayName.trim(),
        fullName: displayName.trim(), // Also update fullName for consistency
        username: username.trim().toLowerCase(), // Store username in lowercase
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save phone number
  const handleSavePhone = async () => {
    try {
      setSaving(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { phone });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Phone number updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update phone number');
    } finally {
      setSaving(false);
    }
  };

  // Add emergency contact
  const handleAddEmergencyContact = async (friendUid: string) => {
    try {
      await addEmergencyContact(friendUid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add emergency contact');
    }
  };

  // Remove emergency contact
  const handleRemoveEmergencyContact = async (friendUid: string) => {
    try {
      await removeEmergencyContact(friendUid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove emergency contact');
    }
  };

  // Render avatar
  const renderAvatar = (contact: EmergencyContact | Friend, size: number = 40) => {
    const avatarFromDoc = contact.avatar;
    let avatarUri: string | undefined;

    if (avatarFromDoc?.uri) {
      avatarUri = avatarFromDoc.uri;
    } else if (avatarFromDoc?.seed && avatarFromDoc?.style) {
      avatarUri = `${DICEBEAR_BASE}/${avatarFromDoc.style}/svg?seed=${encodeURIComponent(
        avatarFromDoc.seed.trim().replace(/\s+/g, "_")
      )}`;
    } else {
      const seed = (contact.name || "anonymous").trim().replace(/\s+/g, "_");
      avatarUri = `${DICEBEAR_BASE}/adventurer/svg?seed=${encodeURIComponent(seed)}`;
    }

    if (!avatarUri) return null;

    const isPng = avatarUri.includes("/png") || avatarUri.toLowerCase().endsWith(".png");

    return isPng ? (
      <Image
        source={{ uri: avatarUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    ) : (
      <SvgUri width={size} height={size} uri={avatarUri} />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={brandColors[8]} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <Text style={styles.inputLabel}>Nickname</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your nickname"
            placeholderTextColor={brandColors[13]}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />

          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor={brandColors[13]}
            value={username}
            onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9_]/g, ''))} // Only allow alphanumeric and underscores
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.inputHint}>Username can only contain letters, numbers, and underscores</Text>

          <TouchableOpacity
            style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color={brandColors[0]} />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Phone Number Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            placeholderTextColor={brandColors[13]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSavePhone}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={brandColors[0]} />
            ) : (
              <Text style={styles.saveButtonText}>Save Phone Number</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <Text style={styles.sectionSubtitle}>
            {emergencyContacts.length} contact(s) added
          </Text>

          {/* Emergency Contacts List */}
          {emergencyContacts.length > 0 && (
            <View style={styles.contactsContainer}>
              {emergencyContacts.map((contact) => (
                <View key={contact.uid} style={styles.contactItem}>
                  {renderAvatar(contact, 36)}
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    {contact.email && (
                      <Text style={styles.contactEmail}>{contact.email}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveEmergencyContact(contact.uid)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add Friends Button */}
          <TouchableOpacity
            onPress={() => setShowAddFriends(!showAddFriends)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>
              {showAddFriends ? 'Hide' : 'Add'} Friends to Emergency Contacts
            </Text>
          </TouchableOpacity>

          {/* Available Friends List */}
          {showAddFriends && availableFriends.length > 0 && (
            <View style={styles.friendsContainer}>
              <Text style={styles.friendsTitle}>Available Friends</Text>
              {availableFriends.map((friend) => (
                <View key={friend.uid} style={styles.friendItem}>
                  {renderAvatar(friend, 36)}
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{friend.name}</Text>
                    {friend.email && (
                      <Text style={styles.contactEmail}>{friend.email}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleAddEmergencyContact(friend.uid)}
                    style={styles.addContactButton}
                  >
                    <Text style={styles.addContactButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {showAddFriends && availableFriends.length === 0 && (
            <Text style={styles.noFriendsText}>No friends available to add</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors[0],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: brandColors[10],
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: brandColors[10],
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  section: {
    backgroundColor: brandColors[1],
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors[10],
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: brandColors[13],
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors[10],
    marginBottom: 8,
    marginTop: 5,
  },
  inputHint: {
    fontSize: 12,
    color: brandColors[13],
    marginTop: 4,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: brandColors[0],
    color: brandColors[10],
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: brandColors[2],
  },
  saveButton: {
    backgroundColor: brandColors[8],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: brandColors[0],
    fontSize: 16,
    fontWeight: '700',
  },
  contactsContainer: {
    marginTop: 15,
    gap: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors[0],
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors[10],
  },
  contactEmail: {
    fontSize: 12,
    color: brandColors[13],
    marginTop: 2,
  },
  removeButton: {
    backgroundColor: brandColors[9],
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: brandColors[8],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: brandColors[0],
    fontSize: 16,
    fontWeight: '700',
  },
  friendsContainer: {
    marginTop: 15,
    gap: 10,
  },
  friendsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors[10],
    marginBottom: 10,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors[0],
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  addContactButton: {
    backgroundColor: brandColors[7],
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addContactButtonText: {
    color: brandColors[0],
    fontSize: 12,
    fontWeight: '600',
  },
  noFriendsText: {
    fontSize: 14,
    color: brandColors[13],
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
});

