// context/TripContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Alert } from "react-native";
import { auth, db } from "firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, updateDoc, serverTimestamp,} from "firebase/firestore";

/**
 * TripContext - provides: { user, loading, refreshUser, setUserField, tripData, setTripData }
 * user is the Firestore user doc normalized to a consistent shape
 */
const TripContext = createContext(null);

export const TripProvider = ({ children }) => {
  const [tripData, setTripData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUserDoc = null;
    let unsubAuth = null;

    unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // signed out
      if (!firebaseUser) {
        // cleanup doc listener if present
        if (typeof unsubUserDoc === "function") {
          try { unsubUserDoc(); } catch (e) { /* ignore */ }
          unsubUserDoc = null;
        }
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const uid = firebaseUser.uid;
      const userRef = doc(db, "users", uid);

      try {
        // ensure user doc exists (creates a minimal doc if missing)
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const defaultProfile = {
            uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "",
            fullName: firebaseUser.displayName || "",
            friends: [],
            createdAt: serverTimestamp(),
          };
          // merge so we don't overwrite later fields
          await setDoc(userRef, defaultProfile, { merge: true });
        }
      } catch (err) {
        console.warn("TripProvider: error ensuring user doc exists:", err);
      }

      // subscribe to user's Firestore doc in real-time
      unsubUserDoc = onSnapshot(
        userRef,
        (snap) => {
          if (!snap.exists()) {
            setUser(null);
            setLoading(false);
            return;
          }

          const data = snap.data() || {};

          // normalize the shape we expose to app
          const profile = {
            uid: data.uid || uid,
            email: data.email ?? firebaseUser.email ?? "",
            displayName: data.displayName ?? data.fullName ?? firebaseUser.displayName ?? "",
            fullName: data.fullName ?? data.displayName ?? firebaseUser.displayName ?? "",
            username: data.username ?? "",
            phone: data.phone ?? "",
            avatar: data.avatar ?? undefined,
            friends: Array.isArray(data.friends) ? data.friends : [],
            // include everything else if you want:
            ...data,
          };

          setUser(profile);
          setLoading(false);
        },
        (err) => {
          // If permission-denied happens while signing out, ignore it (expected race condition)
          const code = err && (err.code || err.code === 403 ? err.code : undefined);
          if (code === "permission-denied" && !auth.currentUser) {
            console.debug("TripProvider: ignoring permission-denied snapshot error after sign-out");
            return;
          }

          // otherwise log — useful to surface real issues
          console.error("TripProvider: onSnapshot error:", err);
          setLoading(false);
        }
      );
    });

    return () => {
      // cleanup both auth & doc listeners
      try { if (typeof unsubAuth === "function") unsubAuth(); } catch (e) { /* ignore */ }
      try { if (typeof unsubUserDoc === "function") unsubUserDoc(); } catch (e) { /* ignore */ }
    };
  }, []);

  // refresh user once (useful if you need manual fetch)
  const refreshUser = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setUser(null);
      return;
    }
    try {
      const userRef = doc(db, "users", current.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        setUser(null);
        return;
      }
      const data = snap.data() || {};
      setUser({
        uid: current.uid,
        email: data.email ?? current.email ?? "",
        displayName: data.displayName ?? data.fullName ?? current.displayName ?? "",
        fullName: data.fullName ?? data.displayName ?? current.displayName ?? "",
        username: data.username ?? "",
        phone: data.phone ?? "",
        avatar: data.avatar ?? undefined,
        friends: Array.isArray(data.friends) ? data.friends : [],
        ...data,
      });
    } catch (err) {
      console.error("TripProvider.refreshUser error:", err);
    }
  }, []);

  // helper to patch user document fields (merge behaviour)
  const setUserField = useCallback(async (patch) => {
    const current = auth.currentUser;
    if (!current) throw new Error("Not authenticated");
    const userRef = doc(db, "users", current.uid);
    try {
      // prefer updateDoc (faster/readable), fallback to setDoc merge
      await updateDoc(userRef, patch);
    } catch (err) {
      // maybe doc missing — try setDoc merge
      try {
        await setDoc(userRef, patch, { merge: true });
      } catch (e) {
        console.error("TripProvider.setUserField failed:", e);
        throw e;
      }
    }
  }, []);

  return (
    <TripContext.Provider value={{ tripData, setTripData, user, setUser, loading, refreshUser, setUserField }}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used inside TripProvider");
  return ctx;
};
