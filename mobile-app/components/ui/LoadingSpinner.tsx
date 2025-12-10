import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, ICON_SIZES } from '@/lib/constants';

export interface LoadingSpinnerProps {
  size?: 'small' | 'large' | number;
  color?: string;
  text?: string;
  overlay?: boolean;
  style?: ViewStyle;
}

export default function LoadingSpinner({
  size = 'large',
  color = COLORS.accent,
  text,
  overlay = false,
  style,
}: LoadingSpinnerProps) {
  const containerStyle = overlay ? styles.overlay : styles.container;

  return (
    <View style={[containerStyle, style]}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

// Page loading component
export function PageLoadingSpinner({ text }: { text?: string }) {
  return (
    <View style={styles.pageLoader}>
      <LoadingSpinner size="large" text={text} />
    </View>
  );
}

// Inline loading component (for buttons, etc.)
export function InlineLoadingSpinner({ 
  size = ICON_SIZES.sm, 
  color = COLORS.accent 
}: { 
  size?: number; 
  color?: string; 
}) {
  return (
    <ActivityIndicator 
      size={size} 
      color={color} 
      style={styles.inline}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  pageLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    fontWeight: '400' as any,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  inline: {
    marginHorizontal: SPACING.xs,
  },
});