// components/ETAShareServiceContext.tsx
import React, { createContext, useContext } from "react";
import { Alert } from "react-native";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

export type Friend = { id: string; name: string };

export type ShareResult = {
  friendId: string;
  refId: string;
}[];

type ETAShareServiceValue = {
  /**
   * Sends ETA share docs to the provided friends for a given trip.
   * - tripId: id of the trip being shared
   * - remainingTime: minutes (number) used to compute etaIso
   * - friends: array of Friend objects to receive the share
   *
   * Throws an error on failure.
   */
  shareETAToFriends: (opts: {
    tripId: string;
    remainingTime?: number | null;
    friends: Friend[];
  }) => Promise<ShareResult>;
};

const ETAShareServiceContext = createContext<ETAShareServiceValue | undefined>(undefined);

export const ETAShareServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // core share function
  const shareETAToFriends = async ({
    tripId,
    remainingTime,
    friends,
  }: {
    tripId: string;
    remainingTime?: number | null;
    friends: Friend[];
  }): Promise<ShareResult> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // Read trip
    const tripRef = doc(db, "trips", tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) {
      throw new Error("Trip not found");
    }
    const tripData = tripSnap.data() || {};

    // update trip.sharedFriends
    const friendIDs = friends.map((f) => f.id);
    await updateDoc(tripRef, { sharedFriends: friendIDs });

    // compute ETA fields
    const etaIso =
      typeof remainingTime === "number"
        ? new Date(Date.now() + remainingTime * 60_000).toISOString()
        : new Date().toISOString();

    const etaFriendly =
      typeof remainingTime === "number" ? `Arrives in ${remainingTime}m` : "ETA available";

    // prepare payloads and write
    const results: ShareResult = [];
    for (const f of friends) {
      const payload = {
        fromUid: user.uid,
        fromDisplayName: user.displayName || user.email || "Friend",
        toUid: f.id,
        tripId,
        currentLocation: tripData.currentLocation || tripData.startName || "Now",
        destinationLocation: tripData.destinationLocation || tripData.destinationName || "Destination",
        etaIso,
        etaFriendly,
        message: `${user.displayName || "A friend"} shared their ETA with you.`,
        createdAt: serverTimestamp(),
        read: false,
      };

      const docRef = await addDoc(collection(db, "eta_shares"), payload);
      results.push({ friendId: f.id, refId: docRef.id });
    }

    return results;
  };

  return (
    <ETAShareServiceContext.Provider value={{ shareETAToFriends }}>
      {children}
    </ETAShareServiceContext.Provider>
  );
};

export const useETAShareService = (): ETAShareServiceValue => {
  const ctx = useContext(ETAShareServiceContext);
  if (!ctx) throw new Error("useETAShareService must be used within ETAShareServiceProvider");
  return ctx;
};
