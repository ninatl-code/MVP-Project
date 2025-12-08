# Guide de Déploiement - Application Mobile Shooty

## Prérequis

### Environnement
- Node.js >= 18.x
- npm >= 9.x
- Expo CLI >= 49.x
- Compte Expo
- Comptes Apple Developer & Google Play (pour production)

### Variables d'environnement
Créer un fichier `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
EXPO_PUBLIC_API_URL=https://api.shooty.fr
```

---

## Déploiement sur Expo (Dev/Staging)

### 1. Build de développement
```bash
# Installation des dépendances
npm install

# Démarrage du serveur Expo
npx expo start

# Ou avec tunnel pour tests externes
npx expo start --tunnel
```

### 2. Publication OTA (Over-The-Air)
```bash
# Publication sur le canal "preview"
eas update --branch preview --message "Fix: Correction bug devis"

# Publication sur le canal "production"
eas update --branch production --message "Release v2.1.0"
```

---

## Build Production (EAS)

### Configuration EAS
Fichier `eas.json`:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Build iOS
```bash
# Build pour TestFlight
eas build --platform ios --profile production

# Soumission automatique à TestFlight
eas submit --platform ios --latest
```

### Build Android
```bash
# Build AAB pour Google Play
eas build --platform android --profile production

# Soumission automatique à Google Play (internal track)
eas submit --platform android --latest --track internal
```

---

## Optimisations

### 1. Performance
```javascript
// Image optimization
import { Image } from 'expo-image';

<Image
  source={uri}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>

// Code splitting
const HomeScreen = lazy(() => import('./screens/HomeScreen'));

// Memoization
const MemoizedComponent = React.memo(({ data }) => {
  return <ExpensiveComponent data={data} />;
});
```

### 2. Bundle Size
```bash
# Analyse du bundle
npx expo export --platform all
npx react-native-bundle-visualizer

# Optimisations
- Utiliser des imports spécifiques: import { Button } from 'package/button'
- Lazy loading des écrans lourds
- Compression des images avec expo-optimize
```

### 3. Caching
```javascript
// AsyncStorage pour données persistantes
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache des images
import * as FileSystem from 'expo-file-system';

const cacheImage = async (uri) => {
  const filename = uri.split('/').pop();
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists) {
    return fileUri;
  }
  
  await FileSystem.downloadAsync(uri, fileUri);
  return fileUri;
};
```

---

## Améliorations UX

### 1. Loading States
```tsx
// Skeleton screens
import { Skeleton } from '@/components/ui/Skeleton';

{loading ? (
  <Skeleton variant="card" count={3} />
) : (
  <DataList data={data} />
)}
```

### 2. Transitions
```tsx
import { Animated } from 'react-native';

const fadeAnim = useRef(new Animated.Value(0)).current;

Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,
}).start();

<Animated.View style={{ opacity: fadeAnim }}>
  {content}
</Animated.View>
```

### 3. Feedback Utilisateur
- Haptic feedback: `import * as Haptics from 'expo-haptics';`
- Toast notifications
- Pull-to-refresh
- Infinite scroll avec pagination

---

## Sécurité

### 1. Validation des données
```typescript
import * as yup from 'yup';

const demandeSchema = yup.object({
  titre: yup.string().required().min(5).max(100),
  budget_min: yup.number().required().min(0),
  budget_max: yup.number().required().min(yup.ref('budget_min')),
});
```

### 2. Stockage sécurisé
```javascript
import * as SecureStore from 'expo-secure-store';

// Stockage du token
await SecureStore.setItemAsync('auth_token', token);

// Récupération
const token = await SecureStore.getItemAsync('auth_token');
```

### 3. Row Level Security (Supabase)
```sql
-- Politique pour les demandes
CREATE POLICY "Users can view their own demandes"
ON demandes FOR SELECT
USING (auth.uid() = client_id);

-- Politique pour les devis
CREATE POLICY "Photographes can create devis"
ON devis FOR INSERT
WITH CHECK (
  auth.uid() = photographe_id
  AND EXISTS (
    SELECT 1 FROM profils_photographes
    WHERE user_id = auth.uid()
    AND statut_abonnement IN ('premium', 'pro')
  )
);
```

---

## CI/CD avec GitHub Actions

### Workflow `.github/workflows/deploy.yml`
```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build iOS
        run: eas build --platform ios --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          
      - name: Build Android
        run: eas build --platform android --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## Monitoring & Analytics

### 1. Sentry (Error Tracking)
```javascript
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  enableInExpoDevelopment: true,
  debug: __DEV__,
});
```

### 2. Analytics
```javascript
import * as Analytics from 'expo-firebase-analytics';

// Track screen views
Analytics.logEvent('screen_view', {
  screen_name: 'Demandes',
  screen_class: 'DemandesScreen',
});

// Track conversions
Analytics.logEvent('devis_accepted', {
  devis_id: devisId,
  montant: montantTotal,
});
```

### 3. Performance Monitoring
```javascript
import { startTrace, stopTrace } from '@react-native-firebase/perf';

const trace = await startTrace('load_demandes');
// ... fetch data ...
await stopTrace(trace);
```

---

## Rollback Strategy

### En cas de problème
```bash
# Rollback OTA immédiat
eas update --branch production --message "Rollback to v2.0.5"

# Réversion de build
# 1. Identifier la bonne version dans EAS
# 2. Re-publier la version précédente
eas submit --platform ios --id [BUILD_ID]
```

---

## Checklist Pré-Production

### Code
- [ ] Tests E2E passent à 100%
- [ ] Code review approuvé
- [ ] Pas de console.log oubliés
- [ ] Variables d'environnement à jour

### Build
- [ ] Version incrémentée (app.json)
- [ ] Icônes et splash screen OK
- [ ] Permissions déclarées (iOS/Android)
- [ ] Deep links configurés

### Backend
- [ ] Database migrations exécutées
- [ ] RLS policies vérifiées
- [ ] API rate limits configurés
- [ ] Monitoring actif

### Communication
- [ ] Release notes rédigées
- [ ] Support informé
- [ ] Utilisateurs notifiés (si breaking changes)

---

## Support Post-Déploiement

### Monitoring (premières 48h)
- Taux de crash < 1%
- Temps de réponse API < 500ms
- Taux d'erreur Stripe < 0.1%
- Feedback utilisateurs

### Hotfix Process
1. Créer une branche `hotfix/issue-description`
2. Fix + tests
3. Build preview pour validation
4. Merge et deploy production
5. OTA update si possible (sinon nouveau build)

---

## Contacts
- **DevOps**: devops@shooty.fr
- **On-call**: +33 X XX XX XX XX
- **Sentry**: sentry.io/organizations/shooty
- **EAS Dashboard**: expo.dev/accounts/shooty
