// Updated theme using the new design system
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '@/lib/constants';
import { Platform } from 'react-native';

export const Colors = {
  ...COLORS,
  // Keep existing structure for compatibility but use new colors
  light: {
    text: COLORS.text.primary,
    background: COLORS.white,
    tint: COLORS.accent,
    icon: COLORS.gray[500],
    tabIconDefault: COLORS.gray[400],
    tabIconSelected: COLORS.accent,
  },
  dark: {
    text: COLORS.white,
    background: COLORS.gray[900],
    tint: COLORS.primary,
    icon: COLORS.gray[400],
    tabIconDefault: COLORS.gray[500],
    tabIconSelected: COLORS.primary,
  },
  // Direct access to design system colors
  tint: COLORS.accent,
  tabIconDefault: COLORS.gray[400],
  tabIconSelected: COLORS.accent,
};

export const Typography = TYPOGRAPHY;
export const Spacing = SPACING;
export const Shadows = SHADOWS;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export default {
  Colors,
  Typography,
  Spacing,
  Shadows,
  Fonts,
};