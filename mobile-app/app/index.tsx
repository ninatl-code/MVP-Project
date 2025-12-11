import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from './loading';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, loading, activeRole, profileId } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const handleRedirect = async () => {
      if (!loading && !redirecting) {
        if (isAuthenticated && activeRole && profileId) {
          setRedirecting(true);
          
          // Rediriger vers le menu spécifique au rôle actif
          if (activeRole === 'photographe') {
            router.replace('/photographe/menu');
          } else {
            // Pour les clients, rediriger vers le tableau de bord
            router.replace('/client/menu');
          }
        } else if (!loading) {
          router.replace('/auth/login');
        }
      }
    };

    handleRedirect();
  }, [isAuthenticated, loading, activeRole, profileId]);

  return <LoadingScreen />;
}
