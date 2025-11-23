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
          
          // Récupérer le rôle de l'utilisateur
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile?.role === 'prestataire') {
            router.replace('/prestataires/menu');
          } else if (profile?.role === 'particulier') {
            router.replace('/particuliers/menu');
          } else {
            // Fallback si pas de rôle défini
            router.replace('/menu');
          }
        } else if (!loading) {
          router.replace('/login');
        }
      }
    };

    handleRedirect();
  }, [isAuthenticated, loading, user]);

  return <LoadingScreen />;
}
