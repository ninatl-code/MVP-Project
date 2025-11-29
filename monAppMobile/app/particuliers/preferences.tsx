import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';

const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#D1D1D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

interface UserPreferences {
  user_id: string;
  preferred_categories: string[];
  preferred_locations: string[];
  price_range_min: number;
  price_range_max: number;
  preferred_providers: string[];
  search_history: any[];
  view_history: any[];
  booking_patterns: any;
  notification_preferences: any;
  ai_enabled: boolean;
}

const CATEGORIES = [
  { id: 'photographie', label: 'Photography', icon: 'camera' },
  { id: 'videographie', label: 'Videography', icon: 'videocam' },
  { id: 'montage', label: 'Editing', icon: 'film' },
  { id: 'drone', label: 'Drone', icon: 'airplane' },
  { id: 'studio', label: 'Studio', icon: 'business' },
  { id: 'mariage', label: 'Wedding', icon: 'heart' },
  { id: 'evenements', label: 'Events', icon: 'calendar' },
  { id: 'corporate', label: 'Corporate', icon: 'briefcase' },
];

const PRICE_RANGES = [
  { min: 0, max: 100, label: '$0 - $100' },
  { min: 100, max: 250, label: '$100 - $250' },
  { min: 250, max: 500, label: '$250 - $500' },
  { min: 500, max: 1000, label: '$500 - $1000' },
  { min: 1000, max: 99999, label: '$1000+' },
];

export default function UserPreferencesScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 99999,
  });
  const [aiEnabled, setAiEnabled] = useState(true);
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data);
        setSelectedCategories(data.preferred_categories || []);
        setSelectedPriceRange({
          min: data.price_range_min || 0,
          max: data.price_range_max || 99999,
        });
        setLocations(data.preferred_locations || []);
        setAiEnabled(data.ai_enabled !== false);
      } else {
        // No preferences yet - create default
        const newPrefs: UserPreferences = {
          user_id: user.id,
          preferred_categories: [],
          preferred_locations: [],
          price_range_min: 0,
          price_range_max: 99999,
          preferred_providers: [],
          search_history: [],
          view_history: [],
          booking_patterns: {},
          notification_preferences: {},
          ai_enabled: true,
        };
        setPreferences(newPrefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const prefsToSave = {
        user_id: user.id,
        preferred_categories: selectedCategories,
        preferred_locations: locations,
        price_range_min: selectedPriceRange.min,
        price_range_max: selectedPriceRange.max,
        ai_enabled: aiEnabled,
        search_history: preferences?.search_history || [],
        view_history: preferences?.view_history || [],
        booking_patterns: preferences?.booking_patterns || {},
        notification_preferences: preferences?.notification_preferences || {},
        preferred_providers: preferences?.preferred_providers || [],
      };

      const { error } = await supabase
        .from('user_preferences')
        .upsert(prefsToSave);

      if (error) throw error;

      Alert.alert('Success', 'Preferences saved successfully');
      router.back();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const addLocation = () => {
    if (newLocation.trim()) {
      setLocations((prev) => [...prev, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const removeLocation = (location: string) => {
    setLocations((prev) => prev.filter((l) => l !== location));
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <TouchableOpacity onPress={savePreferences} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* AI Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="sparkles" size={24} color={COLORS.primary} />
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>AI Recommendations</Text>
                <Text style={styles.sectionSubtitle}>
                  Get personalized service suggestions
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.switch, aiEnabled && styles.switchActive]}
              onPress={() => setAiEnabled(!aiEnabled)}
            >
              <View style={[styles.switchThumb, aiEnabled && styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferred Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferred Categories</Text>
          <Text style={styles.sectionDescription}>
            Select the types of services you're interested in
          </Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategories.includes(category.id) && styles.categoryChipSelected,
                ]}
                onPress={() => toggleCategory(category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={20}
                  color={
                    selectedCategories.includes(category.id)
                      ? COLORS.primary
                      : COLORS.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategories.includes(category.id) &&
                      styles.categoryChipTextSelected,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Range */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Price Range</Text>
          <Text style={styles.sectionDescription}>
            Set your preferred budget range
          </Text>
          <View style={styles.priceRanges}>
            {PRICE_RANGES.map((range) => (
              <TouchableOpacity
                key={`${range.min}-${range.max}`}
                style={[
                  styles.priceRangeChip,
                  selectedPriceRange.min === range.min &&
                    selectedPriceRange.max === range.max &&
                    styles.priceRangeChipSelected,
                ]}
                onPress={() => setSelectedPriceRange({ min: range.min, max: range.max })}
              >
                <Text
                  style={[
                    styles.priceRangeText,
                    selectedPriceRange.min === range.min &&
                      selectedPriceRange.max === range.max &&
                      styles.priceRangeTextSelected,
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferred Locations */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferred Locations</Text>
          <Text style={styles.sectionDescription}>
            Add cities or areas where you need services
          </Text>
          <View style={styles.locationInput}>
            <TextInput
              style={styles.locationTextInput}
              placeholder="Enter city or area"
              value={newLocation}
              onChangeText={setNewLocation}
              onSubmitEditing={addLocation}
            />
            <TouchableOpacity
              style={[styles.addButton, !newLocation.trim() && styles.addButtonDisabled]}
              onPress={addLocation}
              disabled={!newLocation.trim()}
            >
              <Ionicons name="add" size={20} color={COLORS.surface} />
            </TouchableOpacity>
          </View>
          {locations.length > 0 && (
            <View style={styles.locationChips}>
              {locations.map((location, index) => (
                <View key={index} style={styles.locationChip}>
                  <Text style={styles.locationChipText}>{location}</Text>
                  <TouchableOpacity
                    onPress={() => removeLocation(location)}
                    style={styles.removeLocationButton}
                  >
                    <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Activity Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <View style={styles.activityItem}>
                <Ionicons name="search" size={20} color={COLORS.primary} />
                <View style={styles.activityItemText}>
                  <Text style={styles.activityValue}>
                    {preferences?.search_history?.length || 0}
                  </Text>
                  <Text style={styles.activityLabel}>Searches</Text>
                </View>
              </View>
              <View style={styles.activityItem}>
                <Ionicons name="eye" size={20} color={COLORS.warning} />
                <View style={styles.activityItemText}>
                  <Text style={styles.activityValue}>
                    {preferences?.view_history?.length || 0}
                  </Text>
                  <Text style={styles.activityLabel}>Views</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Clear Data */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert(
                'Clear Activity Data',
                'This will clear your search and view history. Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;

                        await supabase
                          .from('user_preferences')
                          .update({
                            search_history: [],
                            view_history: [],
                          })
                          .eq('user_id', user.id);

                        await loadPreferences();
                        Alert.alert('Success', 'Activity data cleared');
                      } catch (error) {
                        console.error('Error clearing data:', error);
                        Alert.alert('Error', 'Failed to clear data');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            <Text style={styles.dangerButtonText}>Clear Activity Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 56,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.surface,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    padding: 2,
  },
  switchActive: {
    backgroundColor: COLORS.success,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  categoryChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  categoryChipTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  priceRanges: {
    gap: 8,
  },
  priceRangeChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  priceRangeChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  priceRangeText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  priceRangeTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  locationInput: {
    flexDirection: 'row',
    gap: 8,
  },
  locationTextInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  locationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  locationChipText: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: 4,
  },
  removeLocationButton: {
    padding: 2,
  },
  activityCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  activityRow: {
    flexDirection: 'row',
    gap: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityItemText: {
    gap: 2,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  activityLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: `${COLORS.error}10`,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.error,
  },
});
