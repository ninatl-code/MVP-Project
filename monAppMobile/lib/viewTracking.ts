import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

/**
 * Incrémente le compteur de vues pour une annonce
 * @param {number} annonceId - ID de l'annonce
 * @returns {Promise<boolean>} - Succès de l'opération
 */
export const incrementAnnonceView = async (annonceId: number): Promise<boolean> => {
  try {
    // Essayer d'abord avec la fonction RPC
    const { error: rpcError } = await supabase.rpc('increment_annonce_views', {
      annonce_id: annonceId
    });

    if (!rpcError) {
      return true;
    }

    // Si la fonction RPC n'existe pas, utiliser une approche directe
    console.log('Fonction RPC non trouvée, utilisation de la méthode directe');
    
    // Récupérer le nombre actuel de vues
    const { data: currentAnnonce, error: fetchError } = await supabase
      .from('annonces')
      .select('vues')
      .eq('id', annonceId)
      .single();

    if (fetchError) {
      console.error('Erreur lors de la récupération des vues:', fetchError);
      return false;
    }

    // Incrémenter et mettre à jour
    const newVues = (currentAnnonce.vues || 0) + 1;
    const { error: updateError } = await supabase
      .from('annonces')
      .update({ vues: newVues })
      .eq('id', annonceId);

    if (updateError) {
      console.error('Erreur lors de la mise à jour des vues:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors du tracking des vues:', error);
    return false;
  }
};

/**
 * Tracker les vues avec throttling pour éviter les multiples comptages
 * @param {number} annonceId - ID de l'annonce
 * @param {number} throttleMinutes - Minutes avant de pouvoir recompter (défaut: 60)
 */
export const trackAnnonceView = async (annonceId: number, throttleMinutes: number = 60): Promise<boolean> => {
  try {
    // Vérifier si on a déjà compté cette vue récemment (AsyncStorage pour React Native)
    const viewKey = `annonce_view_${annonceId}`;
    const lastViewTime = await AsyncStorage.getItem(viewKey);
    const now = Date.now();
    
    if (lastViewTime) {
      const timeDiff = now - parseInt(lastViewTime);
      const throttleMs = throttleMinutes * 60 * 1000;
      
      if (timeDiff < throttleMs) {
        console.log(`Vue déjà comptée récemment pour l'annonce ${annonceId}`);
        return false;
      }
    }

    // Incrémenter la vue
    const success = await incrementAnnonceView(annonceId);
    
    if (success) {
      // Stocker le timestamp de cette vue
      await AsyncStorage.setItem(viewKey, now.toString());
      console.log(`✅ Vue comptée pour l'annonce ${annonceId}`);
    }

    return success;
  } catch (error) {
    console.error('Erreur lors du tracking de vue:', error);
    return false;
  }
};

/**
 * Hook pour tracker automatiquement les vues d'une annonce
 * À utiliser dans les composants React Native
 */
export const useAnnonceViewTracking = (annonceId: number | null) => {
  const trackView = () => {
    if (annonceId) {
      trackAnnonceView(annonceId);
    }
  };

  return { trackView };
};
