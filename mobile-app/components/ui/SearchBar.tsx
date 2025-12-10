import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS, ICON_SIZES } from '@/lib/constants';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch?: (text: string) => void;
  placeholder?: string;
  showFilterButton?: boolean;
  onFilterPress?: () => void;
  autoFocus?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

export default function SearchBar({
  value,
  onChangeText,
  onSearch,
  placeholder = 'Rechercher...',
  showFilterButton = false,
  onFilterPress,
  autoFocus = false,
  style,
  inputStyle,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText('');
  };

  const handleSearch = () => {
    onSearch?.(value);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.searchContainer, isFocused && styles.searchContainerFocused]}>
        <Ionicons
          name="search-outline"
          size={ICON_SIZES.md}
          color={COLORS.text.tertiary}
          style={styles.searchIcon}
        />
        
        <TextInput
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text.tertiary}
          autoFocus={autoFocus}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons
              name="close-circle"
              size={ICON_SIZES.md}
              color={COLORS.text.tertiary}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {showFilterButton && (
        <TouchableOpacity
          onPress={onFilterPress}
          style={styles.filterButton}
        >
          <Ionicons
            name="options-outline"
            size={ICON_SIZES.md}
            color={COLORS.accent}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.secondary,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '400' as any,
    color: COLORS.text.primary,
  },
  clearButton: {
    marginLeft: SPACING.sm,
    padding: SPACING.xs,
  },
  filterButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface.secondary,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
});