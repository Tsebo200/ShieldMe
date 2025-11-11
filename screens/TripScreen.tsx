import React, { useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView, Image, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTrip } from '../context/TripContext';
import { useNavigation } from '@react-navigation/native';
import ETAPicker from '../components/ETAPicker';
import LocationAutocomplete from '../components/LocationAutocomplete';
import { startTrip } from '../services/tripService';
import * as Haptics from 'expo-haptics';


export default function TripScreen() {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [startCoords, setStartCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const { setTripData } = useTrip() as any;
  const navigation = useNavigation<any>();
  const [etaSeconds, setEtaSeconds] = useState(0);
  
  // Bottom sheet and map state
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedLocationType, setSelectedLocationType] = useState<'start' | 'destination' | null>(null);
  const snapPoints = useMemo(() => ['75%', '90%'], []);
  
const handleStartTrip = useCallback(async () => {
  if (start && destination && etaSeconds > 0) {
    try {
      console.log('TripScreen - Starting trip with:', {
        start,
        destination,
        startCoords,
        destinationCoords,
      });
      // If we have coordinates from autocomplete, use them; otherwise startTrip will geocode the location names
      const tripId = await startTrip(start, destination, etaSeconds, [], startCoords || undefined, destinationCoords || undefined);
      console.log('TripScreen - Trip created with ID:', tripId);
      // Store tripData in context
      setTripData({ 
        tripId, 
        currentLocation: start, 
        destinationLocation: destination, 
        eta: etaSeconds,
        ...(startCoords && { currentLocationCoords: startCoords }),
        ...(destinationCoords && { destinationLocationCoords: destinationCoords }),
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('TimerScreen', { etaSeconds, tripId });
    } catch (error) {
      console.error('Error starting trip:', error);
      Alert.alert('Error', 'Could not start trip. Please try again.');
    }
  } else {
    Alert.alert('Missing Info', 'Please complete Current, Destination, and ETA before starting the trip.');
  }
}, [start, destination, etaSeconds, startCoords, destinationCoords, setTripData, navigation]);

  const handleStartLocationSelect = useCallback((location: any) => {
    setStart(location.name);
    if (location.coordinates) {
      setStartCoords(location.coordinates);
    }
  }, []);

  const handleDestinationLocationSelect = useCallback((location: any) => {
    setDestination(location.name);
    if (location.coordinates) {
      setDestinationCoords(location.coordinates);
    }
  }, []);

  // Swap start and destination locations
  const handleSwapLocations = useCallback(() => {
    // Swap location names
    const tempStart = start;
    const tempDestination = destination;
    setStart(tempDestination);
    setDestination(tempStart);

    // Swap coordinates
    const tempStartCoords = startCoords;
    const tempDestinationCoords = destinationCoords;
    setStartCoords(tempDestinationCoords);
    setDestinationCoords(tempStartCoords);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [start, destination, startCoords, destinationCoords]);

  // Open map bottom sheet for location selection
  const openMapForLocation = useCallback((type: 'start' | 'destination') => {
    setSelectedLocationType(type);
    bottomSheetModalRef.current?.present();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Get current location when map opens
  const handleMapSheetOpen = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to use the map.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentLocation(coords);

      // Center map on current location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
      }
    } catch (err) {
      console.error('Error getting current location:', err);
    }
  }, []);

  // Handle map tap to select location
  const handleMapPress = useCallback(async (event: any) => {
    const { coordinate } = event.nativeEvent;
    if (!coordinate) return;
    
    const coords = { latitude: coordinate.latitude, longitude: coordinate.longitude };

    try {
      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync(coords);
      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const addressString = [
          address.street,
          address.city,
          address.region,
          address.country,
        ]
          .filter(Boolean)
          .join(', ');

        const locationName = addressString || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

        if (selectedLocationType === 'start') {
          setStart(locationName);
          setStartCoords(coords);
        } else if (selectedLocationType === 'destination') {
          setDestination(locationName);
          setDestinationCoords(coords);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        bottomSheetModalRef.current?.dismiss();
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err);
      Alert.alert('Error', 'Could not get address for this location.');
    }
  }, [selectedLocationType]);

  // Calculate region to show both markers
  const calculateRegion = useCallback(() => {
    const allCoords: { latitude: number; longitude: number }[] = [];
    if (currentLocation) allCoords.push(currentLocation);
    if (startCoords) allCoords.push(startCoords);
    if (destinationCoords) allCoords.push(destinationCoords);

    if (allCoords.length === 0) {
      return {
        latitude: currentLocation?.latitude || 0,
        longitude: currentLocation?.longitude || 0,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    let minLat = allCoords[0].latitude;
    let maxLat = allCoords[0].latitude;
    let minLng = allCoords[0].longitude;
    let maxLng = allCoords[0].longitude;

    allCoords.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    const latDelta = maxLat - minLat;
    const lngDelta = maxLng - minLng;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta * 1.5, 0.05),
      longitudeDelta: Math.max(lngDelta * 1.5, 0.05),
    };
  }, [currentLocation, startCoords, destinationCoords]);

  return (
    <SafeAreaView style={styles.Safety}>
      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
              {/* Header with Back to Friends */}
              <View style={styles.headerRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('FriendsScreen')}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
              </View>

        <Text style={styles.title}>Plan Your Safe Trip</Text>

        {/* Start and Destination in same row */}
        <View style={styles.locationRow}>
          <View style={styles.locationInputWrapper}>
            <LocationAutocomplete
              value={start}
              onChangeText={setStart}
              onSelectLocation={handleStartLocationSelect}
              placeholder="Start Location"
              style={styles.inputContainer}
            />
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => openMapForLocation('start')}
              activeOpacity={0.7}
            >
              <Text style={styles.mapButtonText}>📍 Map</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.arrowContainer}
            onPress={handleSwapLocations}
            activeOpacity={0.7}
          >
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.locationInputWrapper}>
            <LocationAutocomplete
              value={destination}
              onChangeText={setDestination}
              onSelectLocation={handleDestinationLocationSelect}
              placeholder="Destination"
              style={styles.inputContainer}
            />
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => openMapForLocation('destination')}
              activeOpacity={0.7}
            >
              <Text style={styles.mapButtonText}>📍 Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ETAPicker onDurationChange={(totalSeconds) => setEtaSeconds(totalSeconds)} />
        <Text style={styles.dropText}>Tap Armo to Start Trip</Text>
        <TouchableOpacity
          onPress={handleStartTrip}
          style={styles.dropZone}
          activeOpacity={0.7}
        >
          <Image 
            source={require('../assets/CrawlDark.png')} 
            style={{ width: 60, height: 60 }} 
            resizeMode="contain"
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Map Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
        onAnimate={(fromIndex, toIndex) => {
          if (toIndex >= 0) {
            handleMapSheetOpen();
          }
        }}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <Text style={styles.mapSheetTitle}>
            Select {selectedLocationType === 'start' ? 'Start' : 'Destination'} Location
          </Text>
          <Text style={styles.mapSheetSubtitle}>Tap on the map to select a location</Text>
          
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={calculateRegion()}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={true}
              onMapReady={() => {
                // Update map region when ready
                if (mapRef.current) {
                  const region = calculateRegion();
                  mapRef.current.animateToRegion(region, 1000);
                }
              }}
            >
              {/* Current location marker */}
              {currentLocation && (
                <Marker
                  coordinate={currentLocation}
                  title="Your Location"
                  pinColor="#F8C1E1"
                />
              )}

              {/* Start location marker */}
              {startCoords && (
                <Marker
                  coordinate={startCoords}
                  title="Start Location"
                  description={start}
                  pinColor="#4CAF50"
                />
              )}

              {/* Destination marker */}
              {destinationCoords && (
                <Marker
                  coordinate={destinationCoords}
                  title="Destination"
                  description={destination}
                  pinColor="#ED1C25"
                />
              )}

              {/* Route from start to destination */}
              {startCoords && destinationCoords && (
                <Polyline
                  coordinates={[startCoords, destinationCoords]}
                  strokeColor="#F8C1E1"
                  strokeWidth={3}
                />
              )}
            </MapView>
          </View>

          <View style={styles.mapActions}>
            <TouchableOpacity
              style={styles.useCurrentLocationButton}
              onPress={async () => {
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Location permission is needed.');
                    return;
                  }

                  const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                  });
                  const coords = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                  };

                  const addresses = await Location.reverseGeocodeAsync(coords);
                  if (addresses && addresses.length > 0) {
                    const address = addresses[0];
                    const addressString = [
                      address.street,
                      address.city,
                      address.region,
                      address.country,
                    ]
                      .filter(Boolean)
                      .join(', ');

                    if (selectedLocationType === 'start') {
                      setStart(addressString);
                      setStartCoords(coords);
                    } else if (selectedLocationType === 'destination') {
                      setDestination(addressString);
                      setDestinationCoords(coords);
                    }

                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    bottomSheetModalRef.current?.dismiss();
                  }
                } catch (err) {
                  console.error('Error getting current location:', err);
                  Alert.alert('Error', 'Could not get current location.');
                }
              }}
            >
              <Text style={styles.useCurrentLocationText}>Use Current Location</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  Safety:{
  flex: 1,
    backgroundColor: '#393031', // Same rich dark brown/gray background
  },
         headerRow: {
           flexDirection: 'row',
           alignItems: 'center',
           justifyContent: 'space-between',
           marginBottom: 10,
         },
         backButton: {
           paddingVertical: 6,
           paddingHorizontal: 10,
           backgroundColor: '#232625',
           borderRadius: 8,
         },
         backButtonText: {
           color: '#F8C1E1',
           fontSize: 14,
           fontWeight: '700',
         },
  container: {
    flexGrow: 1,
    backgroundColor: '#393031', // Rich dark brown/gray
    padding: 24,
    paddingBottom: 350, // Extra padding to allow dropdown to show
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    gap: 7,
  },
  locationInputWrapper: {
    flex: 1,
    zIndex: 10,
  },
  inputContainer: {
    marginBottom: 0,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 100,
  },
  arrowText: {
    fontSize: 24,
    color: '#CBBC9F',
    fontWeight: 'bold',
    marginTop: -70,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#CBBC9F', // Elegant cream
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#232625', // Deep charcoal
    color: '#F1EFE5',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  dropZone: {
    height: 80,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: '#755540', // Styled border
    borderWidth: 2,
    borderStyle: 'dashed',
    marginVertical: 24,
    backgroundColor: '#232625', // Same as input
    borderRadius: 100,
  },
  dropText: {
    color: '#F1EFE5', // Light cream
    fontSize: 16,
    alignSelf: 'center',
  },
  dragContainer: {
    alignItems: 'center',
  },
  token: {
    padding: 0,
    borderRadius: 40,
    alignItems: 'center',
  },
  tokenText: {
    color: '#F1EFE5', // Light cream
  },
  dropZoneActive: {
    transform: [{ scale: 1.07 }], //slightly enlarge hover state use transform property for smoothness
    backgroundColor: '#755540', // Warm brown for hover effect
    borderColor: '#F1EFE5', // Light cream border on hover
    borderStyle: 'solid',
  },
  mapButton: {
    backgroundColor: '#545456',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    color: '#F1EFE5',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSheetBackground: {
    backgroundColor: '#393031',
  },
  bottomSheetHandle: {
    backgroundColor: '#CBBC9F',
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  mapSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#CBBC9F',
    marginBottom: 5,
    textAlign: 'center',
  },
  mapSheetSubtitle: {
    fontSize: 14,
    color: '#F1EFE5',
    marginBottom: 15,
    textAlign: 'center',
  },
  mapContainer: {
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  mapActions: {
    marginTop: 10,
  },
  useCurrentLocationButton: {
    backgroundColor: '#F8C1E1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  useCurrentLocationText: {
    color: '#232625',
    fontSize: 16,
    fontWeight: '700',
  },
});