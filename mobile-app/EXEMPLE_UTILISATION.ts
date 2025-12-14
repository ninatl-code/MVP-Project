/**
 * EXEMPLE D'UTILISATION - Système de Matching
 * Montre comment intégrer tous les composants ensemble
 */

// ============================================
// CÔTÉ PHOTOGRAPHE: Remplir son profil
// ============================================

/**
 * 1. Utilisateur photographe clique "Compléter mon profil"
 * 2. Ouvre: app/photographe/profil/profil-complet.tsx
 * 3. Remplit 5 onglets:
 */

export const EXEMPLE_PROFIL_PHOTOGRAPHE = {
  // Infos générales
  nom: 'Marie Dupont',
  email: 'marie@studio.fr',
  telephone: '06 12 34 56 78',
  
  // Info pro
  bio: 'Photographe spécialisée en portrait et mariage, 8 ans d\'expérience. Approche lumineuse et naturelle.',
  nom_entreprise: 'Studio Lumineux SARL',
  site_web: 'https://studio-lumineux.fr',
  annees_experience: 8,
  
  // Spécialités & styles
  specialisations: ['portrait', 'event', 'family'],
  styles_photo: ['luminous', 'lifestyle', 'vintage'],
  
  // Équipement
  materiel: {
    drones: false,
    lighting: true,
    studio: true,
    macro: true,
    wide_angle: true,
    stabilizers: false,
  },
  
  // Équipe
  equipe: {
    solo_only: false,
    num_assistants: 1,
    has_makeup: true,
    has_stylist: false,
    has_videographer: false,
  },
  
  // Tarifs
  tarifs: {
    portrait: { min: 200, max: 600 },
    event: { min: 800, max: 3000 },
    product: { min: 250, max: 1200 },
    real_estate: { min: 400, max: 1800 },
    fashion: { min: 500, max: 2200 },
    family: { min: 200, max: 800 },
    corporate: { min: 400, max: 1600 },
    reportage: { min: 600, max: 2500 },
  },
  
  tarif_deplacements: 0.5, // €/km
  tarif_studio: 50, // €/heure
  
  // Localisation
  rayon_deplacement: 100, // km
  mobile: true,
  studio: true,
  adresse_studio: '45 Rue de Paris, 75002 Paris',
  
  // Disponibilités
  disponibilite: {
    weekdays: true,
    weekends: true,
    evenings: true,
  },
  delai_min_booking: 14,
  
  // Portfolio
  portfolio_photos: [
    'https://storage.supabase.co/portfolio1.jpg',
    'https://storage.supabase.co/portfolio2.jpg',
    // ...
  ],
  
  // Réseaux
  instagram: '@mariedupont_photo',
  facebook: 'facebook.com/studio-lumineux',
  linkedin: 'linkedin.com/in/mariedupont',
  
  assurance_pro: true,
};

// ============================================
// CÔTÉ CLIENT: Créer une demande
// ============================================

/**
 * 1. Utilisateur client clique "Nouvelle demande"
 * 2. Ouvre: app/client/demandes/nouvelle-demande.tsx
 * 3. Remplit 5 étapes du wizard
 */

export const EXEMPLE_DEMANDE_CLIENT = {
  // Étape 1: Catégorie & Style
  category: 'family',
  styles_recherches: ['luminous', 'lifestyle'],
  
  // Étape 2: Localisation & Participants
  location_address: '120 Boulevard Saint-Germain',
  location_city: 'Paris',
  location_type: 'outdoor',
  studio_needed: false,
  total_people: 5,
  people_in_photos: 4,
  has_children: true,
  children_age: 6,
  has_babies: false,
  
  // Étape 3: Services & Livrables
  needs_makeup: false,
  needs_hair: false,
  needs_stylist: false,
  usage_types: ['album', 'social', 'prints'],
  num_photos: 80,
  retouching_level: 'standard',
  
  // Étape 4: Budget & Préférences
  budget_min: 400,
  budget_max: 800,
  atmosphere: 'natural',
  comfort_level: 'comfortable',
  special_requirements: 'Mon enfant est timide au départ mais se détend vite',
  
  // Étape 5: Logistique & Moodboard
  event_date: '2024-04-15',
  session_duration: 2.5,
  constraints: 'Parking limité à proximité, meilleure lumière le matin',
  reference_photos: [
    'https://pinterest.com/photo1',
    'https://pinterest.com/photo2',
  ],
  moodboard_notes: 'On aime la lumière douce, ambiance familiale détendue, pas de mise en scène',
};

// ============================================
// ALGORITHME: Matching
// ============================================

/**
 * Quand client soumet sa demande:
 * 1. Demande sauvegardée dans demandes_client table
 * 2. Algorithme runs: findMatchingPhotographers(demande_id, client_location)
 * 3. Calcule score pour TOUS les photographes
 * 4. Retourne TOP 10 avec raisons
 */

export const EXEMPLE_MATCHING_RESULTS = [
  {
    photographer_id: 'uuid-marie',
    photographer_name: 'Marie Dupont',
    photographer_rating: 4.8,
    photographer_reviews: 47,
    estimated_price: 650,
    match_score: 98,
    match_reasons: [
      '+30 points: Styles match (luminous, lifestyle)',
      '+20 points: Équipement générique',
      '+15 points: Disponibilité confirmée',
      '+15 points: Tarif compétitif (650€ ≤ budget)',
      '+10 points: Rating excellent (4.8⭐)',
      '+5 points: À proximité (8km)',
      '+3 points: Maquilleur disponible',
    ],
    distance_km: 8,
  },
  {
    photographer_id: 'uuid-pierre',
    photographer_name: 'Pierre Martin',
    photographer_rating: 4.5,
    photographer_reviews: 32,
    estimated_price: 550,
    match_score: 92,
    match_reasons: [
      '+30 points: Styles match',
      '+15 points: Tarif très compétitif',
      '+20 points: Équipement',
      '+15 points: Disponibilité',
      '+9 points: Rating très bon (4.5⭐)',
      '+3 points: Proche (12km)',
    ],
    distance_km: 12,
  },
  {
    photographer_id: 'uuid-sophie',
    photographer_name: 'Sophie Laurent',
    photographer_rating: 4.9,
    photographer_reviews: 58,
    estimated_price: 720,
    match_score: 87,
    match_reasons: [
      '+30 points: Styles match (luminous)',
      '+15 points: Tarif dans budget',
      '+15 points: Disponibilité',
      '+10 points: Rating excellent (4.9⭐)',
      '+12 points: Plus proche (3km)',
      '+5 points: Styliste disponible',
    ],
    distance_km: 3,
  },
  // ... 7 autres résultats
];

// ============================================
// AFFICHAGE: Résultats au client
// ============================================

/**
 * Résultats affichés dans: app/client/demandes/resultats.tsx
 * 
 * Pour chaque photographe:
 * - Avatar + Nom + Rating
 * - Score de matching en grand (98%)
 * - Raisons pourquoi matche (3 principales affichées)
 * - Tarif estimé
 * - Tags spécialités
 * - Boutons "Voir profil" / "Demander un devis"
 */

export const UI_EXEMPLE_CARD_PHOTOGRAPHE = `
┌─────────────────────────────────────────┐
│ Marie Dupont        [Avatar]      [98%] │ ← Score matching
│ ⭐ 4.8 (47 avis)                        │
│ Lumière naturelle et spontanée        │
├─────────────────────────────────────────┤
│ ✓ Styles match                          │
│ ✓ Tarif compétitif                      │
│ ✓ À proximité (8km)                     │
│ +4 raisons supplémentaires              │
├─────────────────────────────────────────┤
│ [Family] [Portrait] [+2]                │
├─────────────────────────────────────────┤
│ Tarif estimé: €650 - €800               │
├─────────────────────────────────────────┤
│  [Voir profil]  [Demander un devis]    │
└─────────────────────────────────────────┘
`;

// ============================================
// FLUX COMPLET: De demande à réservation
// ============================================

export const COMPLETE_FLOW_SEQUENCE = {
  step_1: 'Client crée demande (5 étapes)',
  step_2: 'INSERT demandes_client',
  step_3: 'Trigger déclenche matching',
  step_4: 'Algorithme score tous les photographes',
  step_5: 'INSERT matchings avec score & raisons',
  step_6: 'Client voit TOP 10 dans resultats.tsx',
  step_7: 'Client clique "Demander un devis"',
  step_8: 'UPDATE matchings status="quoted"',
  step_9: 'Notification: Photographe reçoit demande',
  step_10: 'Photographe ouvre inbox et voit demande',
  step_11: 'Photographe voit profil du client',
  step_12: 'Photographe envoie devis & message',
  step_13: 'UPDATE matchings avec quote',
  step_14: 'Notification: Client reçoit réponse',
  step_15: 'Client accepte devis ou négocie',
  step_16: 'UPDATE matchings status="booked"',
  step_17: 'Acompte Stripe (50% du prix)',
  step_18: 'Photo session day!',
  step_19: 'Photographe envoie photos',
  step_20: 'Client approuve et paie solde',
  step_21: 'Client laisse avis 5⭐',
  step_22: 'Rating photographe mis à jour auto',
};

// ============================================
// CODE EXEMPLE: Intégration dans composant
// ============================================

export const CODE_EXEMPLE_INTEGRATION = `
// Dans app/client/demandes/resultats.tsx

import { findMatchingPhotographers } from '../../../lib/matchingService';

function RésultatsRecherche() {
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      // 1. Récupérer dernière demande créée
      const { data: demandes } = await supabase
        .from('demandes_client')
        .select('id')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      // 2. Récupérer location du client
      const { data: profile } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', user.id)
        .single();

      // 3. Lancer matching
      const results = await findMatchingPhotographers(
        demandes[0].id,
        { lat: profile.latitude, lng: profile.longitude }
      );

      // 4. Afficher résultats
      setPhotographers(results);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FlatList
      data={photographers}
      renderItem={({ item }) => (
        <View style={styles.photographerCard}>
          <Text>{item.photographer_name}</Text>
          <Text>{item.match_score}% Match</Text>
          {item.match_reasons.map(reason => (
            <Text key={reason}>✓ {reason}</Text>
          ))}
          <Button 
            title="Demander un devis"
            onPress={() => requestQuote(item.photographer_id)}
          />
        </View>
      )}
      keyExtractor={item => item.photographer_id}
    />
  );
}
`;

// ============================================
// TEST DATA: Pour l'intégration
// ============================================

export const TEST_PHOTOGRAPHER = {
  id: 'test-photo-1',
  profiles: { nom: 'Jean Test', latitude: 48.8566, longitude: 2.3522 },
  specialisations: ['portrait', 'family', 'event'],
  styles_photo: ['luminous', 'lifestyle'],
  materiel: { lighting: true, studio: true, wide_angle: true },
  equipe: { solo_only: false, num_assistants: 1, has_makeup: true },
  tarifs_indicatifs: {
    portrait: { min: 150, max: 500 },
    family: { min: 150, max: 600 },
    event: { min: 500, max: 3000 },
  },
  rayon_deplacement_km: 100,
  mobile: true,
  studio: true,
  rating_moyen: 4.8,
  nombre_avis: 47,
};

export const TEST_CLIENT_REQUEST = {
  category: 'family',
  budget_min: 400,
  budget_max: 800,
  location_city: 'Paris',
  styles_recherches: ['luminous', 'lifestyle'],
};

// ============================================
// RÉSULTAT EXPECTED DU TEST
// ============================================

export const EXPECTED_MATCH_SCORE_TEST = {
  photographer: TEST_PHOTOGRAPHER,
  request: TEST_CLIENT_REQUEST,
  expected_score: 95,
  expected_reasons: [
    '+30 points: Styles match',
    '+20 points: Équipement générique',
    '+15 points: Disponibilité',
    '+15 points: Tarif compétitif',
    '+10 points: Rating excellent',
    '+5 points: Proximité',
  ],
};
`;

// ============================================
// EXPORTS
// ============================================

export {
  EXEMPLE_PROFIL_PHOTOGRAPHE,
  EXEMPLE_DEMANDE_CLIENT,
  EXEMPLE_MATCHING_RESULTS,
  TEST_PHOTOGRAPHER,
  TEST_CLIENT_REQUEST,
};
