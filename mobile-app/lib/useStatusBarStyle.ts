import { useEffect } from 'react';
import { setStatusBarStyle, setStatusBarBackgroundColor } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

type BarStyle = 'light-content' | 'dark-content' | 'default';

/**
 * Hook personnalisé pour gérer le StatusBar sur chaque page
 * @param barStyle - Style du StatusBar ('light-content' pour fond dégradé, 'dark-content' pour fond blanc)
 * @param backgroundColor - Couleur de fond du StatusBar (pour Android)
 */
export function useStatusBarStyle(
  barStyle: BarStyle = 'dark-content',
  backgroundColor: string = 'transparent'
) {
  // expo-status-bar utilise 'light' | 'dark' | 'auto', pas les valeurs RN historiques
  const style = barStyle === 'light-content' ? 'light' : barStyle === 'dark-content' ? 'dark' : 'auto';

  // Appliquer immédiatement au montage du composant
  useEffect(() => {
    setStatusBarStyle(style);
    if (backgroundColor !== 'transparent') {
      setStatusBarBackgroundColor(backgroundColor, true);
    }
  }, [style, backgroundColor]);

  // Gérer aussi le focus pour les changements de navigation
  useFocusEffect(() => {
    setStatusBarStyle(style);
    if (backgroundColor !== 'transparent') {
      setStatusBarBackgroundColor(backgroundColor, true);
    }

    // Restaurer à la valeur par défaut au quitter la page
    return () => {
      setStatusBarStyle('dark');
    };
  });
}
