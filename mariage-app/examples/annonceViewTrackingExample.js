// Exemple d'utilisation dans une page d'annonce (ex: pages/annonces/[id].js)

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAnnonceViewTracking } from '../../lib/viewTracking';

export default function AnnoncePage() {
  const router = useRouter();
  const { id } = router.query;
  const { trackView } = useAnnonceViewTracking(id);

  useEffect(() => {
    // Tracker la vue quand la page se charge
    if (id) {
      // Petit délai pour s'assurer que c'est une vraie visite
      const timer = setTimeout(() => {
        trackView();
      }, 2000); // 2 secondes

      return () => clearTimeout(timer);
    }
  }, [id, trackView]);

  // Reste de ton composant...
  return (
    <div>
      {/* Contenu de ton annonce */}
    </div>
  );
}

// OU utilisation manuelle dans un useEffect :
/*
useEffect(() => {
  if (annonceId) {
    import('../../lib/viewTracking').then(({ trackAnnonceView }) => {
      trackAnnonceView(annonceId, 30); // 30 minutes de throttle
    });
  }
}, [annonceId]);
*/