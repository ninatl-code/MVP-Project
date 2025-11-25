# 🧪 Guide de test - Géolocalisation

## 📍 Configuration initiale

### 1. Données de test dans Supabase

Avant de tester, assurez-vous d'avoir des prestataires avec coordonnées GPS :

```sql
-- Exemple : Ajouter des prestataires à Paris
UPDATE profiles
SET
  latitude = 48.8566,
  longitude = 2.3522,
  ville = 'Paris',
  adresse = '123 Rue de Rivoli',
  code_postal = '75001',
  rayon_intervention = 20,
  zones_intervention = ARRAY['Paris 1er', 'Paris 2ème', 'Paris 3ème']
WHERE id = 'votre-prestataire-id-1';

-- Autre prestataire à Lyon
UPDATE profiles
SET
  latitude = 45.7640,
  longitude = 4.8357,
  ville = 'Lyon',
  adresse = '45 Rue de la République',
  code_postal = '69002',
  rayon_intervention = 15,
  zones_intervention = ARRAY['Lyon 2ème', 'Lyon 3ème']
WHERE id = 'votre-prestataire-id-2';

-- Prestataire à Marseille
UPDATE profiles
SET
  latitude = 43.2965,
  longitude = 5.3698,
  ville = 'Marseille',
  adresse = '78 La Canebière',
  code_postal = '13001',
  rayon_intervention = 25,
  zones_intervention = ARRAY['Marseille 1er', 'Marseille 2ème']
WHERE id = 'votre-prestataire-id-3';
```

### 2. Vérifier les migrations SQL

Assurez-vous que la migration de géolocalisation est bien exécutée :

```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('latitude', 'longitude', 'ville', 'rayon_intervention');

-- Tester la fonction de distance
SELECT calculate_distance(48.8566, 2.3522, 45.7640, 4.8357) as distance_paris_lyon;
-- Devrait retourner environ 392 km

-- Tester la recherche par proximité
SELECT * FROM search_prestataires_proximite(
  p_latitude := 48.8566,
  p_longitude := 2.3522,
  p_rayon_km := 50,
  p_service_type := NULL,
  p_note_min := 0,
  p_limit := 10
);
```

---

## 📱 Tests sur Simulateur/Émulateur

### iOS Simulator

#### Option 1 : Position personnalisée

1. Lancer l'app dans le simulateur
2. Menu **Features → Location → Custom Location...**
3. Entrer des coordonnées :
   - **Paris** : Latitude `48.8566`, Longitude `2.3522`
   - **Lyon** : Latitude `45.7640`, Longitude `4.8357`
   - **Marseille** : Latitude `43.2965`, Longitude `5.3698`
4. Appuyer sur le bouton de localisation 📍 dans l'app

#### Option 2 : Positions prédéfinies

1. Menu **Features → Location**
2. Choisir parmi :
   - **Apple** (Cupertino, CA)
   - **City Bicycle Ride** (San Francisco)
   - **City Run** (déplacement dans la ville)
   - **Freeway Drive** (autoroute)

#### Option 3 : GPX File (simulation de trajet)

1. Créer un fichier `route.gpx` :

```xml
<?xml version="1.0"?>
<gpx version="1.1" creator="Xcode">
  <wpt lat="48.8566" lon="2.3522"><name>Paris</name></wpt>
  <wpt lat="48.8606" lon="2.3376"><name>Tour Eiffel</name></wpt>
  <wpt lat="48.8738" lon="2.2950"><name>Arc de Triomphe</name></wpt>
</gpx>
```

2. Menu **Features → Location → Custom Location... → Load GPX File**

### Android Emulator

#### Option 1 : Extended Controls

1. Lancer l'émulateur
2. Cliquer sur **⋮** (More) dans la barre latérale
3. Aller dans **Location**
4. Onglet **Single points** :
   - Latitude : `48.8566`
   - Longitude : `2.3522`
   - Cliquer **SEND**

#### Option 2 : Google Maps

1. Dans Extended Controls → Location
2. Onglet **Google Maps**
3. Chercher une adresse (ex: "Paris, France")
4. Cliquer **SET LOCATION**

#### Option 3 : Routes (simulation de trajet)

1. Extended Controls → Location → Routes
2. Créer des waypoints
3. Cliquer **PLAY ROUTE**

### Via Android Studio Command Line

```bash
# Envoyer des coordonnées GPS
adb emu geo fix 2.3522 48.8566

# 2.3522 = longitude
# 48.8566 = latitude
```

---

## 🔧 Tests sur Appareil Physique

### iPhone/iPad

1. **Activer la localisation** :

   - Réglages → Confidentialité → Localisation → Activé
   - Trouver l'app → Sélectionner "Lors de l'utilisation"

2. **Améliorer la précision** :

   - Aller en extérieur pour meilleure réception GPS
   - Attendre 10-30 secondes pour la première fix
   - Vérifier que le WiFi est activé (assistance GPS)

3. **Mode Développeur** (facultatif) :
   - Xcode → Window → Devices and Simulators
   - Sélectionner l'appareil
   - Cocher "Connect via network"

### Android

1. **Activer la localisation** :

   - Paramètres → Localisation → Activé
   - Mode : "Haute précision" (GPS + WiFi + Mobile)

2. **Permissions de l'app** :

   - Paramètres → Applications → Votre app
   - Autorisations → Localisation → "Autoriser uniquement pendant l'utilisation"

3. **Developer Options** (facultatif) :
   - Activer les options de développeur
   - "Select mock location app" → Votre app de test

---

## ✅ Scénarios de test

### Test 1 : Première localisation

**Objectif** : Vérifier que l'app demande la permission et récupère la position

1. Lancer l'app (première fois)
2. Aller sur "Carte Prestataires"
3. **Vérifier** : Popup de permission s'affiche
4. Accepter la permission
5. **Vérifier** :
   - Icône de localisation animée (chargement)
   - Carte se centre sur votre position
   - Point bleu apparaît sur la carte
   - Liste de prestataires se charge

### Test 2 : Recherche par proximité

**Objectif** : Trouver des prestataires dans un rayon donné

1. Se localiser (bouton 📍)
2. **Par défaut** : Rayon 20km
3. Ouvrir les filtres
4. Tester différents rayons :
   - 5 km → Peu de résultats
   - 10 km → Quelques résultats
   - 50 km → Beaucoup de résultats
5. **Vérifier** :
   - Compteur de résultats mis à jour
   - Markers affichés sur la carte
   - Distance affichée pour chaque prestataire

### Test 3 : Recherche par ville

**Objectif** : Chercher sans GPS actif

1. Ouvrir les filtres
2. Champ "Recherche par ville" → Saisir "Paris"
3. Appliquer
4. **Vérifier** :
   - Carte se centre sur Paris
   - Prestataires de Paris affichés
   - Pas de distance (car pas de position utilisateur)

### Test 4 : Filtres combinés

**Objectif** : Affiner la recherche

1. Se localiser
2. Ouvrir les filtres
3. Configurer :
   - Service : "Photographie"
   - Rayon : 20 km
   - Note min : 4.0
   - Trier par : "Note"
4. Appliquer
5. **Vérifier** :
   - Seuls les photographes s'affichent
   - Note >= 4.0
   - Triés du mieux noté au moins bien noté
   - Dans le rayon de 20km

### Test 5 : Mode Liste vs Carte

**Objectif** : Tester les deux modes d'affichage

1. **Mode Carte** (par défaut) :

   - Markers colorés selon note
   - Cliquer sur un marker → Card info
   - Badge (👑, ⭐, ✅) affiché

2. Basculer en **Mode Liste** (icône 📋) :

   - Liste déroulante
   - Photos + infos
   - Badge "Dispo" si disponible
   - Distance, note, prix affichés

3. Cliquer sur un item de liste :
   - Bascule en mode carte
   - Zoom sur le prestataire
   - Card info ouverte

### Test 6 : Suggestions de recherche

**Objectif** : Auto-complétion des services

1. Cliquer sur barre de recherche
2. Taper "photo" (2 caractères minimum)
3. **Vérifier** :
   - Liste de suggestions apparaît
   - Ex: "Photographie", "Photographie de mariage", "Photographe événementiel"
4. Cliquer sur une suggestion
5. **Vérifier** :
   - Champ rempli automatiquement
   - Recherche lancée

### Test 7 : Tri des résultats

**Objectif** : Vérifier les différents tris

1. Charger des prestataires
2. Trier par **Distance** :
   - Le plus proche en premier
3. Trier par **Note** :
   - 5 étoiles en premier, puis 4.5, etc.
4. Trier par **Prix** :
   - Moins cher en premier
5. Trier par **Avis** :
   - Plus de reviews en premier

### Test 8 : Performance

**Objectif** : Vérifier la fluidité

1. Charger 50+ prestataires
2. **Vérifier** :
   - Carte fluide (pas de lag)
   - Zoom/Pan réactif
   - Scroll liste fluide
   - Pas de freeze au changement de filtre

### Test 9 : Gestion d'erreurs

**Objectif** : Tester les cas d'erreur

1. **Permission refusée** :

   - Refuser la localisation
   - **Vérifier** : Alert explicite + bouton réglages

2. **Pas de GPS** :

   - Mode Avion activé
   - **Vérifier** : Message d'erreur + suggestion d'utiliser recherche par ville

3. **Pas de résultats** :

   - Filtres très restrictifs (note 5.0, rayon 1km)
   - **Vérifier** : Message "Aucun prestataire trouvé"

4. **Erreur réseau** :
   - Couper le WiFi/4G
   - **Vérifier** : Message d'erreur + bouton réessayer

---

## 🔍 Vérification des données

### Logs à vérifier

```javascript
// Dans la console
console.log("User location:", userLocation);
console.log("Prestataires found:", prestataires.length);
console.log("Filters applied:", { rayonKm, noteMin, sortBy });
```

### Données attendues

```javascript
// Format prestataire
{
  id: "uuid",
  nom: "Dupont",
  prenom: "Jean",
  photo: "https://...",
  latitude: 48.8566,
  longitude: 2.3522,
  ville: "Paris",
  note_moyenne: 4.5,
  total_avis: 42,
  badge: "elite",
  specialite: "Photographie",
  distance_km: 3.2,  // Si recherche par proximité
  tarif_horaire: 50,
  disponible: true
}
```

---

## 🐛 Problèmes courants

### Localisation ne fonctionne pas

**Symptômes** : Bouton localisation ne fait rien

**Solutions** :

1. Vérifier permission dans settings iOS/Android
2. Redémarrer l'app
3. Vérifier `expo-location` installé : `npm list expo-location`
4. Rebuilder l'app : `npx expo prebuild --clean`

### Prestataires n'apparaissent pas

**Symptômes** : Compteur = 0

**Solutions** :

1. Vérifier données dans Supabase (latitude/longitude NOT NULL)
2. Augmenter le rayon de recherche
3. Retirer les filtres (note minimale)
4. Vérifier que RLS policies permettent SELECT

### Distance incorrecte

**Symptômes** : Distance affichée aberrante

**Solutions** :

1. Vérifier fonction `calculate_distance` en SQL
2. Vérifier que latitude/longitude sont en DECIMAL(10,8) et DECIMAL(11,8)
3. Tester manuellement :

```sql
SELECT calculate_distance(48.8566, 2.3522, 45.7640, 4.8357);
-- Devrait retourner ~392 km
```

### Markers ne s'affichent pas

**Symptômes** : Carte vide mais compteur > 0

**Solutions** :

1. Vérifier que `react-native-maps` est installé
2. Vérifier Google Maps API key (Android)
3. Zoom out pour voir si markers hors écran
4. Console : vérifier que `prestataires` array contient des données

### Suggestions ne fonctionnent pas

**Symptômes** : Pas d'auto-complétion

**Solutions** :

1. Vérifier que `specialite` est rempli en DB
2. Taper au moins 2 caractères
3. Vérifier query ILIKE dans code
4. Test manuel :

```sql
SELECT DISTINCT specialite
FROM profiles
WHERE role = 'prestataire'
AND specialite ILIKE '%photo%';
```

---

## 📊 Métriques de succès

### ✅ Tests réussis si :

- ✅ Localisation demandée au premier lancement
- ✅ Position récupérée en < 10 secondes
- ✅ Markers affichés avec bonnes couleurs
- ✅ Distance calculée correctement (±10%)
- ✅ Filtres appliqués instantanément
- ✅ Mode liste/carte bascule sans bug
- ✅ Tri fonctionne correctement
- ✅ Suggestions pertinentes
- ✅ Pas de crash pendant 5 minutes d'utilisation
- ✅ Fluidité 60 FPS (pas de lag visible)

### ❌ Échecs critiques :

- ❌ Permission bloque l'app
- ❌ Crash au changement de filtre
- ❌ Distance calculée > 50% d'erreur
- ❌ Markers ne s'affichent pas
- ❌ Lag important (< 30 FPS)
- ❌ Données sensibles exposées (logs)

---

## 🎯 Checklist finale

### Avant de déployer :

- [ ] Testé sur iOS Simulator
- [ ] Testé sur Android Emulator
- [ ] Testé sur iPhone physique
- [ ] Testé sur Android physique
- [ ] Permissions demandées correctement
- [ ] Erreurs gérées gracefully
- [ ] Performance OK (pas de lag)
- [ ] Tous les filtres fonctionnent
- [ ] Mode liste + carte OK
- [ ] Suggestions pertinentes
- [ ] Distance calculée précisément
- [ ] Tri correct pour chaque critère
- [ ] Pas de données sensibles en logs
- [ ] Tests avec 0, 1, 10, 100+ prestataires
- [ ] Testé en mode Avion
- [ ] Testé sans permission localisation

---

## 📝 Rapporter un bug

Si vous rencontrez un problème, notez :

1. **Plateforme** : iOS 17 / Android 14
2. **Appareil** : iPhone 15 / Pixel 8 / Simulateur
3. **Étapes** : Comment reproduire
4. **Attendu** : Ce qui devrait se passer
5. **Observé** : Ce qui se passe réellement
6. **Logs** : Console errors/warnings
7. **Screenshots** : Si pertinent

Exemple :

```
Plateforme: iOS 17.2
Appareil: iPhone 15 Pro (simulateur)
Étapes:
1. Lancer app
2. Aller sur Carte Prestataires
3. Cliquer bouton localisation
Attendu: Carte se centre sur ma position
Observé: Erreur "Permission denied"
Logs: [Error] Location permission not granted
```
