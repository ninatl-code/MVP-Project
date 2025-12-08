import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS, LAYOUT } from '../../lib/constants';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BORDER_RADIUS.button,
      ...SHADOWS.button,
    };

    // Size styles
    const sizeStyles = {
      sm: {
        paddingHorizontal: SPACING.sm * 2,
        paddingVertical: SPACING.sm,
        minHeight: 36,
      },
      md: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm * 1.5,
        minHeight: LAYOUT.buttonHeight,
      },
      lg: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        minHeight: 56,
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: COLORS.accent,
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: COLORS.secondary,
        borderWidth: 0,
      },
      accent: {
        backgroundColor: COLORS.primary,
        borderWidth: 0,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.border.medium,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
    };

    // Disabled style
    const disabledStyle = disabled
      ? {
          backgroundColor: COLORS.gray[300],
          borderColor: COLORS.gray[300],
        }
      : {};

    // Full width style
    const widthStyle = fullWidth ? { width: '100%' as const } : {};

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...disabledStyle,
      ...widthStyle,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: TYPOGRAPHY.styles.button.fontSize,
      fontWeight: TYPOGRAPHY.styles.button.fontWeight as any,
      lineHeight: TYPOGRAPHY.styles.button.lineHeight,
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

    // Variant text styles
    const variantTextStyles = {
      primary: {
        color: COLORS.text.inverse,
      },
      secondary: {
        color: COLORS.text.inverse,
      },
      accent: {
        color: COLORS.text.primary,
      },
      outline: {
        color: COLORS.text.primary,
      },
      ghost: {
        color: COLORS.accent,
      },
    };

    // Disabled text style
    const disabledTextStyle = disabled
      ? {
          color: COLORS.text.tertiary,
        }
      : {};

    return {
      ...baseStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
      ...disabledTextStyle,
    };
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={
              variant === 'primary' || variant === 'secondary'
                ? COLORS.text.inverse
                : COLORS.accent
            }
          />
          <Text style={[getTextStyle(), styles.loadingText]}>{title}</Text>
        </View>
      );
    }

    if (icon) {
      return (
        <View style={styles.contentContainer}>
          {iconPosition === 'left' && icon}
          <Text style={[getTextStyle(), icon ? styles.textWithIcon : null]}>{title}</Text>
          {iconPosition === 'right' && icon}
        </View>
      );
    }

    return <Text style={getTextStyle()}>{title}</Text>;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    marginLeft: SPACING.xs,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  textWithIcon: {
    marginHorizontal: SPACING.xs,
  },
});