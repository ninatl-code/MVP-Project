/**
 * TROUBLESHOOTING - Erreurs TypeScript & Solutions
 */

// ============================================
// ERREURS COURANTES & SOLUTIONS
// ============================================

// 1. ERROR: "Cannot find module" pour les imports
// ════════════════════════════════════════════════════
/**
 * PROBLÈME:
 * Cannot find module '../../../lib/matchingService'
 * 
 * SOLUTION:
 * - Vérifier le chemin du fichier existe
 * - Vérifier l'export: "export const findMatchingPhotographers = ..."
 * - Vérifier le chemin relatif:
 *   app/client/demandes/resultats.tsx
 *   ../../../lib/matchingService.ts ✓
 * 
 * - Rebuild app: npx expo prebuild --clean
 */

// 2. ERROR: "Type 'string[]' is not assignable to type 'undefined'"
// ════════════════════════════════════════════════════
/**
 * PROBLÈME:
 * specialisations: string[] n'accepte pas array vide
 * 
 * SOLUTION:
 * - Initialiser avec DEFAULT:
 *   specialisations: string[] | undefined = [],
 * 
 * - Ou typer correctement dans interface:
 *   interface PhotographerProfile {
 *     specialisations?: string[];  // Optional
 *   }
 * 
 * - Ou initialiser au create:
 *   specialisations: profile.specialisations || []
 */

// 3. ERROR: "Property 'bio' does not exist on type"
// ════════════════════════════════════════════════════
/**
 * PROBLÈME:
 * Property 'bio' does not exist on type 'PhotographerProfile'
 * 
 * SOLUTION:
 * - Ajouter 'bio' à l'interface:
 *   interface PhotographerProfile {
 *     bio: string;
 *   }
 * 
 * - Ou le rendre optionnel:
 *   bio?: string;
 * 
 * - Puis utiliser:
 *   photographer.bio || 'Pas de bio'
 */

// 4. ERROR: "Argument of type 'number' is not assignable to parameter of type 'string'"
// ════════════════════════════════════════════════════
/**
 * PROBLÈME:
 * setRequest({ ...request, session_duration: parseInt(text) })
 * Error: number not assignable to string
 * 
 * SOLUTION:
 * - Vérifier le type dans l'interface:
 *   session_duration: number;  ✓ correct
 * 
 * - Si le type est string, convertir à string:
 *   session_duration: parseInt(text).toString()
 * 
 * - Ou convertir le type:
 *   session_duration: number;
 *   // then cast
 *   onChangeText={text => setRequest({
 *     ...request,
 *     session_duration: Number(text)  ✓ ou parseFloat
 *   })}
 */

// 5. ERROR: "Argument of type 'Date' is not assignable to parameter of type 'string'"
// ════════════════════════════════════════════════════
/**
 * PROBLÈME:
 * event_date: Date envoyé mais Supabase attend string
 * 
 * SOLUTION:
 * - Avant d'envoyer à Supabase:
 *   event_date: request.event_date.toISOString()
 * 
 * - Ou convertir à date:
 *   event_date: request.event_date.toLocaleDateString('fr-FR')
 * 
 * - Dans la table SQL:
 *   event_date DATE  ✓ Supabase convertit auto
 */

// 6. ERROR: "Cannot read property 'nom' of undefined"
// ════════════════════════════════════════════════════
/**
 * PROBLÈME:
 * photographer.profiles?.nom
 * Error: Cannot read 'nom' - profiles est undefined
 * 
 * SOLUTION:
 * - Utiliser optional chaining:
 *   photographer.profiles?.nom || 'Inconnu'
 * 
 * - Ou vérifier:
 *   if (photographer.profiles) {
 *     return photographer.profiles.nom;
 *   }
 * 
 * - Ou typer la query correctement:
 *   .select(`..., profiles:profiles(nom, ...)`).single()
 */

// 7. ERROR: "Type 'any' is not assignable to parameter of type"
// ════════════════════════════════════════════════════
/**
 * PROBLÈME:
 * const photo = match.photographer as any
 * Error: Type 'any' conflicts with strict mode
 * 
 * SOLUTION:
 * - Définir un type proper au lieu de 'any':
 *   interface PhotographerWithMatching {
 *     id: string;
 *     profiles: { nom: string; avatar_url: string };
 *     specialisations: string[];
 *     rating_moyen: number;
 *     // ...
 *   }
 * 
 *   const photo: PhotographerWithMatching = match.photographer;
 * 
 * - Ou désactiver strict mode temporairement:
 *   // @ts-ignore
 *   const photo = match.photographer as any
 */

// 8. ERROR: "Element is not assignable to type 'never'"
// ════════════════════════════════════════════════════
/**
 * PROBLÈME:
 * profile_photos.push(url)
 * Error: Element not assignable to never
 * 
 * SOLUTION:
 * - Initialiser l'array avec le bon type:
 *   portfolio_photos: string[] = []  ✓
 * 
 * - Pas:
 *   portfolio_photos = []  ✗ inféré comme never[]
 * 
 * - Ou utiliser spread operator:
 *   setProfile(prev => ({
 *     ...prev,
 *     portfolio_photos: [...prev.portfolio_photos, url]
 *   }))
 */

// 9. ERROR: "Module not found '@react-native-community/datetimepicker'"
// ════════════════════════════════════════════════════
/**
 * PROBLÈME:
 * DateTimePicker import fails
 * 
 * SOLUTION:
 * - Installer le package:
 *   npm install @react-native-community/datetimepicker
 *   ou
 *   expo install @react-native-community/datetimepicker
 * 
 * - Rebuild app:
 *   npx expo prebuild --clean
 */

// 10. ERROR: "Cannot find 'users' relationship in Supabase"
// ════════════════════════════════════════════════════
/**
 * PROBLÈME:
 * .select('*, users(nom)')
 * Error: Table 'users' not found
 * 
 * SOLUTION:
 * - La table s'appelle 'profiles', pas 'users':
 *   .select(`..., profiles:profiles(nom, ...)`)
 * 
 * - Ou utiliser le FK correct:
 *   .select('*, client:profiles(nom)')
 */

// ============================================
// CHECKLIST AVANT DÉPLOIEMENT
// ============================================

export const PRE_DEPLOYMENT_CHECKLIST = {
  typescript: [
    'npm run tsc --noEmit  // Vérifier pas d\'erreurs TS',
    'Tous les types importés de lib/',
    'Pas de "any" types sauf justifiés',
    'Toutes les props sont typées',
  ],

  imports: [
    'Tous les imports ont chemins corrects',
    'Tous les fichiers existent',
    'Pas de imports circulaires',
  ],

  database: [
    'Migrations SQL exécutées',
    'Tables créées: demandes_client, matchings, reviews, messages',
    'Colonnes ajoutées à profils_photographe',
    'RLS policies activées',
    'Indexes créés',
  ],

  components: [
    'profil-complet.tsx: Tous les onglets fonctionnent',
    'nouvelle-demande.tsx: Les 5 étapes marchent',
    'resultats.tsx: Affiche les photographes',
    'matchingService.ts: Exporte les fonctions',
  ],

  routing: [
    'Routes configurées pour les composants',
    'Navigation fonctionne',
    'Pas d\'erreurs dans router.push()',
  ],

  testing: [
    'Créer profil photographe test',
    'Créer demande client test',
    'Vérifier matching score raisonnable',
    'Vérifier données sauvegardées',
  ],

  performance: [
    'FlatList: scrollEnabled={true} pour démo',
    'Pas d\'infinite loops',
    'useEffect has dependencies',
    'Images optimisées',
  ],

  security: [
    'RLS policies activées',
    'Pas de secrets dans le code',
    'Auth.uid() utilisé correctement',
    'Supabase client configuré',
  ],
};

// ============================================
// TESTS RAPIDES À EXÉCUTER
// ============================================

export const QUICK_TESTS = {
  test_1_database: `
    // Exécuter dans Supabase SQL Editor
    SELECT COUNT(*) FROM demandes_client;
    SELECT COUNT(*) FROM matchings;
    SELECT COUNT(*) FROM profils_photographe;
    SELECT * FROM profils_photographe LIMIT 1 \\gset
  `,

  test_2_typescript: `
    // Dans le terminal
    npx tsc --noEmit
    
    // Checker les erreurs
    // Fixer jusqu'à 0 erreurs
  `,

  test_3_app_flow: `
    1. npm start
    2. Ouvrir app sur téléphone/émulateur
    3. Connecter en tant que photographe
    4. Naviguer à /photographe/profil-complet
    5. Remplir le profil → Sauvegarder
    6. Vérifier dans Supabase que profils_photographe est rempli
    
    7. Connecter en tant que client
    8. Naviguer à /client/demandes/nouvelle-demande
    9. Remplir demande → Soumettre
    10. Vérifier dans Supabase que demandes_client est créé
    11. Vérifier que matchings sont créés
    12. Voir /client/demandes/resultats
    13. Photographes doivent apparaître avec scores
  `,

  test_4_matching_score: `
    // Dans matchingService.ts, ajouter des logs:
    console.log('Photographe:', photographer.profiles?.nom);
    console.log('Score:', finalScore);
    console.log('Raisons:', matchReasons);
    
    // Vérifier que scores font sens:
    // - Même catégorie: ≥ 80%
    // - Budget ok: + 15 points
    // - Style match: + 30 points max
    // - Rating 5⭐: + 10 points
    // TOTAL MAX = 100%
  `,

  test_5_ui_rendering: `
    // Dans resultats.tsx, afficher les logs:
    console.log('Photographers loaded:', photographers.length);
    photographers.forEach(p => {
      console.log(\`\${p.photographer_name}: \${p.match_score}%\`);
    });
    
    // Vérifier dans devtools React Native:
    // - Images chargent
    // - Texte visible
    // - Boutons cliquables
    // - Pas de layout issues
  `,
};

// ============================================
// RESSOURCES UTILES
// ============================================

export const RESOURCES = {
  supabase_docs: 'https://supabase.com/docs',
  react_native_docs: 'https://reactnative.dev/docs',
  expo_router: 'https://expo.dev/routing',
  typescript: 'https://www.typescriptlang.org/docs',
  
  // Notre docs
  system_architecture: '../lib/systemArchitecture.md',
  matching_algorithm: '../lib/matchingService.ts',
  sql_migrations: '../database/migrations_matching_system.sql',
  setup_guide: './SETUP_MATCHING_SYSTEM.md',
  examples: './EXEMPLE_UTILISATION.ts',
};

// ============================================
// SUPPORT
// ============================================

export const SUPPORT = {
  error_404: 'Fichier non trouvé → vérifier le chemin du fichier',
  error_permission: 'Permission denied → vérifier RLS policies Supabase',
  error_timeout: 'Timeout → vérifier internet, ou augmenter le délai',
  error_type: 'Type mismatch → vérifier les interfaces TypeScript',
  error_import: 'Module not found → vérifier exports/imports',
  
  contact: 'Créer une issue sur GitHub ou contacter l\'équipe',
};

export default {
  PRE_DEPLOYMENT_CHECKLIST,
  QUICK_TESTS,
  RESOURCES,
  SUPPORT,
};
