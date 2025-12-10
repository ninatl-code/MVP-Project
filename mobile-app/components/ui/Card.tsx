import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING } from '@/lib/constants';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outlined';
  pressable?: boolean;
  onPress?: () => void;
}

export default function Card({
  children,
  style,
  padding = 'md',
  variant = 'default',
  pressable = false,
  onPress,
}: CardProps) {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: COLORS.surface.primary,
      borderRadius: BORDER_RADIUS.card,
    };

    // Padding styles
    const paddingStyles = {
      none: { padding: 0 },
      sm: { padding: SPACING.sm },
      md: { padding: SPACING.component.cardPadding },
      lg: { padding: SPACING.lg },
    };

    // Variant styles
    const variantStyles = {
      default: {
        ...SHADOWS.card,
      },
      elevated: {
        ...SHADOWS.lg,
      },
      outlined: {
        borderWidth: 1,
        borderColor: COLORS.border.light,
        shadowOpacity: 0,
        elevation: 0,
      },
    };

    return {
      ...baseStyle,
      ...paddingStyles[padding],
      ...variantStyles[variant],
    };
  };

  if (pressable && onPress) {
    return (
      <TouchableOpacity
        style={[getCardStyle(), style]}
        onPress={onPress}
        activeOpacity={0.95}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[getCardStyle(), style]}>{children}</View>;
}

// Predefined card layouts
export function CardHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function CardContent({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function CardFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    marginBottom: SPACING.md,
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    marginTop: SPACING.md,
  },
});