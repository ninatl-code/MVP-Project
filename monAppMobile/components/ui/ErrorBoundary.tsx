import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, ICON_SIZES } from '../../lib/constants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons
              name="warning-outline"
              size={ICON_SIZES['2xl']}
              color={COLORS.error}
              style={styles.icon}
            />
            <Text style={styles.title}>Une erreur s'est produite</Text>
            <Text style={styles.message}>
              Désolé, quelque chose s'est mal passé. Veuillez réessayer.
            </Text>
            {__DEV__ && this.state.error && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>{this.state.error.toString()}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => this.setState({ hasError: false, error: undefined })}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Simple error message component for non-critical errors
export function ErrorMessage({
  message,
  onRetry,
  style,
}: {
  message: string;
  onRetry?: () => void;
  style?: any;
}) {
  return (
    <View style={[styles.errorMessage, style]}>
      <Ionicons
        name="alert-circle-outline"
        size={ICON_SIZES.md}
        color={COLORS.error}
        style={styles.errorIcon}
      />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryLink}>
          <Text style={styles.retryLinkText}>Réessayer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    maxWidth: '90%',
  },
  icon: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: '700' as any,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '400' as any,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  debugContainer: {
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  debugTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600' as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  debugText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '400' as any,
    color: COLORS.text.secondary,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: '600' as any,
    color: COLORS.white,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    margin: SPACING.md,
  },
  errorIcon: {
    marginRight: SPACING.sm,
  },
  errorText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '400' as any,
    color: COLORS.error,
  },
  retryLink: {
    marginLeft: SPACING.sm,
  },
  retryLinkText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '500' as any,
    color: COLORS.accent,
  },
});