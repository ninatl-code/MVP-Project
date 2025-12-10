import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, LAYOUT, ICON_SIZES } from '@/lib/constants';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  disabled?: boolean;
}

const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outlined',
  size = 'md',
  containerStyle,
  inputStyle,
  labelStyle,
  disabled = false,
  ...textInputProps
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BORDER_RADIUS.input,
      flexDirection: 'row',
      alignItems: 'center',
    };

    // Size styles
    const sizeStyles = {
      sm: {
        minHeight: 40,
        paddingHorizontal: SPACING.sm,
      },
      md: {
        minHeight: LAYOUT.inputHeight,
        paddingHorizontal: SPACING.md,
      },
      lg: {
        minHeight: 56,
        paddingHorizontal: SPACING.lg,
      },
    };

    // Variant styles
    const variantStyles = {
      default: {
        backgroundColor: COLORS.surface.secondary,
        borderWidth: 0,
      },
      filled: {
        backgroundColor: COLORS.gray[100],
        borderWidth: 0,
      },
      outlined: {
        backgroundColor: COLORS.surface.primary,
        borderWidth: 1,
        borderColor: isFocused 
          ? COLORS.accent
          : error 
          ? COLORS.error 
          : COLORS.border.light,
      },
    };

    // Disabled style
    const disabledStyle = disabled
      ? {
          backgroundColor: COLORS.gray[100],
          borderColor: COLORS.border.light,
          opacity: 0.6,
        }
      : {};

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...disabledStyle,
    };
  };

  const getInputStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: TYPOGRAPHY.styles.body.fontSize,
      fontWeight: TYPOGRAPHY.styles.body.fontWeight as any,
      lineHeight: TYPOGRAPHY.styles.body.lineHeight,
      flex: 1,
      color: disabled ? COLORS.text.tertiary : COLORS.text.primary,
    };

    // Size text styles
    const sizeTextStyles = {
      sm: {
        fontSize: TYPOGRAPHY.fontSize.sm,
      },
      md: {
        fontSize: TYPOGRAPHY.fontSize.base,
      },
      lg: {
        fontSize: TYPOGRAPHY.fontSize.lg,
      },
    };

    return {
      ...baseStyle,
      ...sizeTextStyles[size],
    };
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return ICON_SIZES.sm;
      case 'lg':
        return ICON_SIZES.lg;
      default:
        return ICON_SIZES.md;
    }
  };

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, labelStyle, error && styles.labelError]}>
          {label}
        </Text>
      )}
      
      <View style={getContainerStyle()}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={getIconSize()}
            color={isFocused ? COLORS.accent : COLORS.text.tertiary}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          ref={ref}
          style={[getInputStyle(), inputStyle]}
          placeholderTextColor={COLORS.text.tertiary}
          editable={!disabled}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          {...textInputProps}
        />
        
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.rightIconContainer}
          >
            <Ionicons
              name={rightIcon}
              size={getIconSize()}
              color={COLORS.text.tertiary}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
      
      {hint && !error && (
        <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

export default Input;

const styles = StyleSheet.create({
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    fontWeight: '500' as any,
  },
  labelError: {
    color: COLORS.error,
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  rightIconContainer: {
    marginLeft: SPACING.sm,
    padding: SPACING.xs,
  },
  error: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
    fontWeight: '400' as any,
  },
  hint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
    fontWeight: '400' as any,
  },
});