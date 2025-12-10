// UI Components Index
// Export all reusable UI components

export { default as Button } from './Button';
export type { ButtonProps } from './Button';

export { default as Card, CardHeader, CardContent, CardFooter } from './Card';
export type { CardProps } from './Card';

export { default as Input } from './Input';
export type { InputProps } from './Input';

export { 
  default as LoadingSpinner, 
  PageLoadingSpinner, 
  InlineLoadingSpinner 
} from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';

export { default as SearchBar } from './SearchBar';
export type { SearchBarProps } from './SearchBar';

export { default as ImagePicker } from './ImagePicker';
export type { ImagePickerComponentProps } from './ImagePicker';

export { default as PaymentSheet } from './PaymentSheet';

export { default as ErrorBoundary, ErrorMessage } from './ErrorBoundary';

// Re-export design system constants for easy access
export {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATIONS,
  LAYOUT,
  ICON_SIZES,
} from '@/lib/constants';