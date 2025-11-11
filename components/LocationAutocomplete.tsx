import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';

type LocationSuggestion = {
  name: string;
  address?: string;
  coordinates?: { latitude: number; longitude: number };
};

type LocationAutocompleteProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSelectLocation: (location: LocationSuggestion) => void;
  placeholder: string;
  style?: any;
};

export default function LocationAutocomplete({
  value,
  onChangeText,
  onSelectLocation,
  placeholder,
  style,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get current location as first suggestion
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const { latitude, longitude } = location.coords;

          // Reverse geocode to get address
          const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
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

            setSuggestions([
              {
                name: 'Current Location',
                address: addressString || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                coordinates: { latitude, longitude },
              },
            ]);
          }
        }
      } catch (err) {
        console.warn('Error getting current location:', err);
      }
    };

    getCurrentLocation();
  }, []);

  // Search for locations as user types
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    setShowSuggestions(true);

    debounceRef.current = setTimeout(async () => {
      try {
        // Use forward geocoding to search for locations
        const results = await Location.geocodeAsync(value);
        
        const locationSuggestions: LocationSuggestion[] = results.slice(0, 5).map((result) => {
          const addressParts = [
            result.street,
            result.city,
            result.region,
            result.country,
          ].filter(Boolean);

          return {
            name: addressParts.join(', ') || value,
            address: addressParts.join(', '),
            coordinates: {
              latitude: result.latitude,
              longitude: result.longitude,
            },
          };
        });

        setSuggestions(locationSuggestions);
      } catch (err) {
        console.warn('Error geocoding location:', err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleSelectLocation = (location: LocationSuggestion) => {
    onChangeText(location.name);
    onSelectLocation(location);
    setShowSuggestions(false);
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        onBlur={() => {
          // Delay hiding to allow selection
          setTimeout(() => setShowSuggestions(false), 200);
        }}
      />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#F8C1E1" />
        </View>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.name}-${index}`}
              style={styles.dropdownItem}
              onPress={() => handleSelectLocation(item)}
            >
              <Text style={styles.dropdownItemText} numberOfLines={2}>
                {item.name}
              </Text>
              {item.address && item.address !== item.name && (
                <Text style={styles.dropdownItemSubtext} numberOfLines={1}>
                  {item.address}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  input: {
    backgroundColor: '#232625',
    color: '#F1EFE5',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  loadingContainer: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 2,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#232625',
    borderRadius: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#545456',
    zIndex: 1000,
    marginTop: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#393031',
  },
  dropdownItemText: {
    color: '#F1EFE5',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    color: '#CBBC9F',
    fontSize: 12,
    marginTop: 2,
  },
});

