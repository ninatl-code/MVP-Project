import { useEffect } from 'react';
import { StatusBar as RNStatusBar } from 'react-native';
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
  // Appliquer immédiatement au montage du composant
  useEffect(() => {
    RNStatusBar.setBarStyle(barStyle, true);
    if (backgroundColor !== 'transparent') {
      RNStatusBar.setBackgroundColor(backgroundColor, true);
    }
  }, [barStyle, backgroundColor]);

  // Gérer aussi le focus pour les changements de navigation
  useFocusEffect(() => {
    RNStatusBar.setBarStyle(barStyle, true);
    if (backgroundColor !== 'transparent') {
      RNStatusBar.setBackgroundColor(backgroundColor, true);
    }

    // Restaurer à la valeur par défaut au quitter la page
    return () => {
      RNStatusBar.setBarStyle('dark-content', true);
    };
  });
}
