import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as Haptics from 'expo-haptics';

type LocationCoords = {
  latitude: number;
  longitude: number;
};

export default function MapScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { tripId, item } = route.params || {};
  const mapRef = useRef<MapView>(null);

  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [isTracking, setIsTracking] = useState(true);
  const [locationHistory, setLocationHistory] = useState<LocationCoords[]>([]);
  const [tripLocations, setTripLocations] = useState<{
    currentLocationCoords?: LocationCoords;
    destinationLocationCoords?: LocationCoords;
    lastKnownLocation?: LocationCoords;
    expiredLocation?: LocationCoords;
    completionTime?: string;
    expirationTime?: string;
    startTimeFormatted?: string;
    startTime?: any; // Firestore timestamp
    currentLocation?: string;
    destinationLocation?: string;
  }>({});

  // Get initial location and start tracking
  useEffect(() => {
    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission not granted');
          return;
        }

        // Get initial location
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setCurrentLocation(coords);
        setLocationHistory([coords]);

        // Center map on current location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
      } catch (err) {
        console.error('Error getting location:', err);
      }
    };

    startTracking();
  }, []);

  // Track location updates
  useEffect(() => {
    if (!isTracking) return;

    const locationInterval = setInterval(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };

        setCurrentLocation(coords);
        setLocationHistory((prev) => [...prev, coords]);

        // Update Firestore if tripId is available
        if (tripId) {
          try {
            await updateDoc(doc(db, 'trips', tripId), {
              lastKnownLocation: coords,
              lastLocationUpdate: new Date().toISOString(),
            });
          } catch (err) {
            console.warn('Error saving location update:', err);
          }
        }

        // Center map on current location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 500);
        }
      } catch (err) {
        console.error('Error updating location:', err);
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(locationInterval);
  }, [isTracking, tripId]);

  // Fetch trip location data
  useEffect(() => {
    if (!tripId) {
      // If no tripId, use item data if available
      if (item) {
        // Format start time if not already formatted
        let startTimeFormatted = item.startTimeFormatted;
        if (!startTimeFormatted && item.startTime) {
          try {
            const startDate = typeof item.startTime === 'string' ? new Date(item.startTime) : new Date(item.startTime);
            const hours = String(startDate.getHours()).padStart(2, '0');
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            startTimeFormatted = `${hours}:${minutes}`;
          } catch (e) {
            console.warn('Error formatting start time:', e);
          }
        }

        setTripLocations({
          currentLocationCoords: item.currentLocationCoords,
          destinationLocationCoords: item.destinationLocationCoords,
          lastKnownLocation: item.lastKnownLocation,
          expiredLocation: item.expiredLocation,
          startTimeFormatted: startTimeFormatted,
          startTime: item.startTime,
          currentLocation: typeof item.currentLocation === 'string' ? item.currentLocation : item.currentLocation?.name,
          destinationLocation: typeof item.destinationLocation === 'string' ? item.destinationLocation : item.destinationLocation?.name,
        });
      }
      return;
    }

    const tripRef = doc(db, 'trips', tripId);
    const unsub = onSnapshot(tripRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Format start time if not already formatted
        let startTimeFormatted = data.startTimeFormatted;
        if (!startTimeFormatted && data.startTime) {
          try {
            const startDate = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
            const hours = String(startDate.getHours()).padStart(2, '0');
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            startTimeFormatted = `${hours}:${minutes}`;
          } catch (e) {
            console.warn('Error formatting start time from timestamp:', e);
          }
        }
        
        console.log('MapScreen - startTimeFormatted:', startTimeFormatted, 'currentLocation:', data.currentLocation);

        setTripLocations({
          currentLocationCoords: data.currentLocationCoords,
          destinationLocationCoords: data.destinationLocationCoords,
          lastKnownLocation: data.lastKnownLocation,
          expiredLocation: data.expiredLocation,
          completionTime: data.completionTime,
          expirationTime: data.expirationTime,
          startTimeFormatted: startTimeFormatted,
          startTime: data.startTime,
          currentLocation: data.currentLocation,
          destinationLocation: data.destinationLocation,
        });
      }
    });

    return unsub;
  }, [tripId, item]);

  // Calculate region to show all markers
  const calculateRegion = () => {
    const locations: LocationCoords[] = [];
    
    if (currentLocation) locations.push(currentLocation);
    if (tripLocations.currentLocationCoords) locations.push(tripLocations.currentLocationCoords);
    if (tripLocations.destinationLocationCoords) locations.push(tripLocations.destinationLocationCoords);
    if (tripLocations.lastKnownLocation) locations.push(tripLocations.lastKnownLocation);
    if (tripLocations.expiredLocation) locations.push(tripLocations.expiredLocation);

    if (locations.length === 0) {
      return {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }

    const lats = locations.map((loc) => loc.latitude);
    const lngs = locations.map((loc) => loc.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDelta = (maxLat - minLat) * 1.5 || 0.01;
    const lngDelta = (maxLng - minLng) * 1.5 || 0.01;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };

  const toggleTracking = () => {
    setIsTracking(!isTracking);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Tracking</Text>
        <TouchableOpacity
          onPress={toggleTracking}
          style={[styles.trackButton, isTracking && styles.trackButtonActive]}
        >
          <Text style={styles.trackButtonText}>
            {isTracking ? '🟢 Tracking' : '⚪ Paused'}
          </Text>
        </TouchableOpacity>
      </View>

      {!currentLocation ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F8C1E1" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={calculateRegion()}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={isTracking}
        >
          {/* Current location marker */}
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Your Current Location"
              description={`Lat: ${currentLocation.latitude.toFixed(6)}, Lng: ${currentLocation.longitude.toFixed(6)}`}
              pinColor="#F8C1E1"
            />
          )}

          {/* Starting location marker */}
          {tripLocations.currentLocationCoords && (
            <Marker
              coordinate={tripLocations.currentLocationCoords}
              title="Starting Location"
              description={`Lat: ${tripLocations.currentLocationCoords.latitude.toFixed(6)}, Lng: ${tripLocations.currentLocationCoords.longitude.toFixed(6)}${tripLocations.startTimeFormatted ? `\nStarted: ${tripLocations.startTimeFormatted}` : ''}`}
              pinColor="#4CAF50"
            />
          )}

          {/* Destination marker */}
          {tripLocations.destinationLocationCoords && (
            <Marker
              coordinate={tripLocations.destinationLocationCoords}
              title="Destination"
              description={`Lat: ${tripLocations.destinationLocationCoords.latitude.toFixed(6)}, Lng: ${tripLocations.destinationLocationCoords.longitude.toFixed(6)}${tripLocations.completionTime ? `\nCompleted: ${tripLocations.completionTime}` : ''}`}
              pinColor="#ED1C25"
            />
          )}

          {/* Last known location marker */}
          {tripLocations.lastKnownLocation && (
            <Marker
              coordinate={tripLocations.lastKnownLocation}
              title="Last Known Location"
              description={`Lat: ${tripLocations.lastKnownLocation.latitude.toFixed(6)}, Lng: ${tripLocations.lastKnownLocation.longitude.toFixed(6)}`}
              pinColor="#FFA500"
            />
          )}

          {/* Expired location marker */}
          {tripLocations.expiredLocation && (
            <Marker
              coordinate={tripLocations.expiredLocation}
              title="Expired Location"
              description={`Lat: ${tripLocations.expiredLocation.latitude.toFixed(6)}, Lng: ${tripLocations.expiredLocation.longitude.toFixed(6)}${tripLocations.expirationTime ? `\nTime: ${tripLocations.expirationTime}` : ''}`}
              pinColor="#9E9E9E"
            />
          )}

          {/* Location history polyline */}
          {locationHistory.length > 1 && (
            <Polyline
              coordinates={locationHistory}
              strokeColor="#F8C1E1"
              strokeWidth={3}
            />
          )}

          {/* Route from start to destination */}
          {tripLocations.currentLocationCoords && tripLocations.destinationLocationCoords && (
            <Polyline
              coordinates={[tripLocations.currentLocationCoords, tripLocations.destinationLocationCoords]}
              strokeColor="#4CAF50"
              strokeWidth={2}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>
      )}

      {/* Info panel */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>Location Info</Text>
        {currentLocation && (
          <Text style={styles.infoText}>
            Current {tripLocations.currentLocation ? `(${tripLocations.currentLocation})` : `(${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)})`}
            {tripLocations.startTimeFormatted ? ` (started: ${tripLocations.startTimeFormatted})` : ''}
          </Text>
        )}
        {tripLocations.destinationLocationCoords && (
          <Text style={styles.infoText}>
            Destination: {tripLocations.destinationLocationCoords.latitude.toFixed(6)}, {tripLocations.destinationLocationCoords.longitude.toFixed(6)}
            {tripLocations.completionTime && ` (Completed: ${tripLocations.completionTime})`}
          </Text>
        )}
        {tripLocations.expiredLocation && tripLocations.expirationTime && (
          <Text style={styles.infoText}>
            Expired: {tripLocations.expirationTime}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#393031',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#232625',
    borderBottomWidth: 1,
    borderBottomColor: '#545456',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#F8C1E1',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#CBBC9F',
    flex: 1,
    textAlign: 'center',
  },
  trackButton: {
    backgroundColor: '#545456',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trackButtonActive: {
    backgroundColor: '#4CAF50',
  },
  trackButtonText: {
    color: '#F1EFE5',
    fontSize: 12,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#232625',
  },
  loadingText: {
    color: '#F1EFE5',
    marginTop: 10,
    fontSize: 16,
  },
  infoPanel: {
    backgroundColor: '#232625',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#545456',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8C1E1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#CBBC9F',
    fontFamily: 'monospace',
    marginVertical: 2,
  },
});

