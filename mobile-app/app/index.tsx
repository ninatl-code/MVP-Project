import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import LoadingScreen from './loading';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const handleRedirect = async () => {
      if (!loading && !redirecting) {
        if (isAuthenticated && user) {
          setRedirecting(true);
          
          // Récupérer le rôle de l'utilisateur depuis le profil
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          // Rediriger vers le menu spécifique au rôle
          if (profile?.role === 'prestataire') {
            router.replace('/photographe/menu');
          } else {
            // Pour les clients, rediriger vers la page de recherche
            router.replace('/client/search/search');
          }
        } else if (!loading) {
          router.replace('/auth/login');
        }
      }
    };

    handleRedirect();
  }, [isAuthenticated, loading, user]);

  return <LoadingScreen />;
}
