// Shooty Design System Constants
// Based on photo-app color scheme and modern mobile app standards

export const COLORS = {
  // Brand Colors (from photo-app)
  primary: '#E8EAF6',      // Light purple - main brand color
  secondary: '#5C6BC0',     // Medium blue - secondary brand
  accent: '#130183',        // Dark purple - accent/CTA color
  background: '#F8F9FB',    // Light gray - main background
  
  // Semantic Colors
  success: '#10B981',       // Green for success states
  warning: '#F59E0B',       // Orange for warnings
  error: '#EF4444',         // Red for errors
  info: '#3B82F6',          // Blue for info
  
  // Text Colors
  text: {
    primary: '#1C1C1E',     // Main text color
    secondary: '#6B7280',   // Secondary text
    tertiary: '#9CA3AF',    // Placeholder/disabled text
    inverse: '#FFFFFF',     // Text on dark backgrounds
  },
  
  // UI Colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray Scale
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Card & Surface Colors
  surface: {
    primary: '#FFFFFF',     // Main card background
    secondary: '#F8F9FB',   // Secondary card background
    tertiary: '#F3F4F6',    // Tertiary surface
  },
  
  // Border Colors
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },
  
  // Shadow Colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.10)',
    dark: 'rgba(0, 0, 0, 0.15)',
  }
};

export const TYPOGRAPHY = {
  // Font Families
  fontFamily: {
    primary: 'System', // Uses system font by default
    mono: 'Courier New',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
    '6xl': 48,
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
  
  // Predefined Text Styles
  styles: {
    h1: {
      fontSize: 32,
      fontWeight: '800',
      lineHeight: 1.2,
      color: COLORS.text.primary,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 1.2,
      color: COLORS.text.primary,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 1.3,
      color: COLORS.text.primary,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.3,
      color: COLORS.text.primary,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.5,
      color: COLORS.text.primary,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 1.4,
      color: COLORS.text.secondary,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.3,
      color: COLORS.text.tertiary,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.2,
    },
  }
};

export const SPACING = {
  // Base spacing unit (4px)
  unit: 4,
  
  // Spacing scale
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 16,   // 16px
  lg: 24,   // 24px
  xl: 32,   // 32px
  '2xl': 48, // 48px
  '3xl': 64, // 64px
  
  // Component specific spacing
  component: {
    cardPadding: 20,
    buttonPadding: 16,
    inputPadding: 12,
    sectionMargin: 32,
  }
};

export const BORDER_RADIUS = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
  
  // Component specific
  button: 12,
  card: 16,
  input: 8,
  avatar: 9999,
};

export const SHADOWS = {
  none: 'none',
  sm: {
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  card: {
    shadowColor: COLORS.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    shadowColor: COLORS.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
};

export const ANIMATIONS = {
  // Duration
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Easing
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
  
  // Spring configurations for react-native-reanimated
  spring: {
    fast: {
      damping: 20,
      stiffness: 300,
    },
    normal: {
      damping: 15,
      stiffness: 200,
    },
    slow: {
      damping: 10,
      stiffness: 100,
    },
  },
};

export const BREAKPOINTS = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};

// Layout constants
export const LAYOUT = {
  headerHeight: 60,
  tabBarHeight: 80,
  statusBarHeight: 44, // iOS status bar height
  
  // Container padding
  containerPadding: SPACING.md,
  screenPadding: SPACING.lg,
  
  // Common dimensions
  buttonHeight: 48,
  inputHeight: 48,
  avatarSizes: {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 80,
  },
};

// Icon sizes
export const ICON_SIZES = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
};

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATIONS,
  BREAKPOINTS,
  LAYOUT,
  ICON_SIZES,
};