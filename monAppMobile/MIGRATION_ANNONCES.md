# Migration vers Architecture Annonces

## ✅ Changement Effectué

La page `carte-prestataires.tsx` a été **complètement refactorisée** pour rechercher par **annonces** au lieu de **profiles de prestataires**.

## 🎯 Problème Résolu

**AVANT** : ❌ La recherche interrogeait la table `profiles` en cherchant des prestataires avec `latitude`/`longitude` via des fonctions RPC qui n'existent pas.

**APRÈS** : ✅ La recherche interroge la table `annonces` avec les `zones_intervention` comme fait dans `photo-app`.

---

## 📊 Architecture Adoptée

### Tables Utilisées

```
annonces
├── id (PK)
├── titre
├── description
├── photos[] (array)
├── tarif_unit
├── unit_tarif
├── rate
├── nb_avis
├── prestataire (FK → profiles)
└── prestation (FK → prestations)

zones_intervention
├── annonce_id (FK → annonces)
├── ville_centre
├── rayon_km
├── latitude
├── longitude
└── active

prestations
├── id (PK)
└── nom

profiles
├── id (PK)
├── nom
├── prenom
└── photo
```

---

## 🔄 Modifications Apportées

### 1. Interface TypeScript

```typescript
// AVANT
interface Prestataire {
  id: string;
  nom: string;
  prenom: string;
  photo: string;
  latitude: number;
  longitude: number;
  ville: string;
  note_moyenne: number;
  total_avis: number;
  specialite: string;
  tarif_horaire?: number;
  distance_km?: number;
}

// APRÈS
interface Annonce {
  id: string;
  titre: string;
  description: string;
  tarif_unit: number;
  unit_tarif: string;
  rate: number;
  nb_avis: number;
  photos: string[];
  prestataire: string;
  prestation: string;
  profiles?: {
    nom: string;
    prenom: string;
    photo: string;
  };
  prestations?: {
    nom: string;
  };
  zones_intervention?: {
    ville_centre: string;
    rayon_km: number;
    latitude: number;
    longitude: number;
  }[];
  distance_km?: number;
}
```

### 2. Fonction de Chargement

**AVANT** : Utilisait des fonctions RPC

```typescript
const { data } = await supabase.rpc("search_prestataires_proximite", {
  p_latitude: userLocation.coords.latitude,
  p_longitude: userLocation.coords.longitude,
  p_rayon_km: rayonKm,
});
```

**APRÈS** : Requêtes Supabase directes (pattern de `photo-app`)

```typescript
const loadAnnonces = async () => {
  // 1. Filtrer par ville si sélectionnée
  let annonceIds: string[] = [];
  if (searchVille) {
    const { data: zonesData } = await supabase
      .from("zones_intervention")
      .select("annonce_id, latitude, longitude")
      .eq("active", true)
      .eq("ville_centre", searchVille);
    annonceIds = zonesData?.map((z) => z.annonce_id) || [];
  }

  // 2. Requête annonces avec jointures
  let query = supabase
    .from("annonces")
    .select(
      `
      *,
      profiles:prestataire(nom, prenom, email, telephone, photo),
      prestations:prestation(nom)
    `
    )
    .eq("actif", true);

  if (searchQuery) {
    // Chercher la prestation par nom
    const { data: prestationData } = await supabase
      .from("prestations")
      .select("id")
      .ilike("nom", `%${searchQuery}%`)
      .single();
    if (prestationData) {
      query = query.eq("prestation", prestationData.id);
    }
  }

  if (noteMin > 0) {
    query = query.gte("rate", noteMin);
  }

  if (annonceIds.length > 0) {
    query = query.in("id", annonceIds);
  }

  // Tri
  switch (sortBy) {
    case "note":
      query = query.order("rate", { ascending: false });
      break;
    case "prix":
      query = query.order("tarif_unit", { ascending: true });
      break;
    case "avis":
      query = query.order("nb_avis", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data: annoncesData } = await query.limit(100);

  // 3. Enrichir avec zones_intervention
  const annoncesAvecZones = await Promise.all(
    (annoncesData || []).map(async (annonce) => {
      const { data: zones } = await supabase
        .from("zones_intervention")
        .select("ville_centre, rayon_km, latitude, longitude")
        .eq("annonce_id", annonce.id)
        .eq("active", true);

      // Calculer distance si localisation disponible
      let distance_km;
      if (userLocation && zones && zones[0]) {
        distance_km = calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          zones[0].latitude,
          zones[0].longitude
        );
      }

      return {
        ...annonce,
        zones_intervention: zones || [],
        distance_km,
      };
    })
  );

  // Filtrer par rayon si pas de recherche par ville
  let filtered = annoncesAvecZones;
  if (userLocation && !searchVille) {
    filtered = annoncesAvecZones.filter(
      (a) => a.distance_km && a.distance_km <= rayonKm
    );
  }

  setAnnonces(filtered);
};
```

### 3. Suggestions de Recherche

**AVANT** : Recherchait dans `profiles.specialite`

```typescript
const { data } = await supabase
  .from("profiles")
  .select("specialite")
  .eq("role", "prestataire")
  .ilike("specialite", `%${query}%`);
```

**APRÈS** : Recherche dans `prestations.nom`

```typescript
const { data } = await supabase
  .from("prestations")
  .select("nom")
  .ilike("nom", `%${query}%`)
  .limit(5);
```

### 4. Affichage des Marqueurs (Map)

**AVANT** : Coordonnées directes du prestataire

```typescript
<Marker
  coordinate={{
    latitude: prestataire.latitude,
    longitude: prestataire.longitude,
  }}
/>
```

**APRÈS** : Coordonnées de la première zone d'intervention

```typescript
{
  annonces.map((annonce) => {
    if (!annonce.zones_intervention || annonce.zones_intervention.length === 0)
      return null;
    const firstZone = annonce.zones_intervention[0];
    if (!firstZone.latitude || !firstZone.longitude) return null;

    return (
      <Marker
        key={annonce.id}
        coordinate={{
          latitude: firstZone.latitude,
          longitude: firstZone.longitude,
        }}
        onPress={() => handleMarkerPress(annonce)}
      >
        <View style={styles.customMarker}>
          <Image source={{ uri: annonce.photos[0] }} />
        </View>
      </Marker>
    );
  });
}
```

### 5. Affichage Liste et Carte Popup

**AVANT** : Affichait nom, photo, spécialité, ville du prestataire
**APRÈS** : Affiche titre, photos[], prestation, zones, tarif de l'annonce

```typescript
// Liste
<Text>{annonce.titre}</Text>
<Text>{annonce.prestations?.nom} • {annonce.profiles?.nom}</Text>
<Text>{annonce.tarif_unit}€/{annonce.unit_tarif}</Text>

// Carte popup
<Image source={{ uri: annonce.photos[0] }} />
<Text>{annonce.titre}</Text>
<Text>
  {annonce.zones_intervention?.map(z => z.ville_centre).join(', ')}
</Text>
```

### 6. Navigation

**AVANT** : Vers profil prestataire

```typescript
router.push(`/prestataires/profil?prestataireId=${prestataire.id}`);
```

**APRÈS** : Vers détail annonce (ou profil prestataire si besoin)

```typescript
// Voir l'annonce
router.push(`/annonces/${annonce.id}`);

// Voir le prestataire
router.push(`/prestataires/profil?prestataireId=${annonce.prestataire}`);
```

---

## 🎨 État Variables

```typescript
// AVANT
const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
const [selectedPrestataire, setSelectedPrestataire] =
  useState<Prestataire | null>(null);

// APRÈS
const [annonces, setAnnonces] = useState<Annonce[]>([]);
const [selectedAnnonce, setSelectedAnnonce] = useState<Annonce | null>(null);
```

---

## 📍 Gestion Géolocalisation

### Calcul de Distance

Nouvelle fonction `calculateDistance` ajoutée :

```typescript
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
```

### Filtrage par Rayon

Si **pas de recherche par ville** et **localisation disponible** :

- Calcule la distance entre l'utilisateur et la première zone de chaque annonce
- Filtre les annonces dont `distance_km <= rayonKm`

Si **recherche par ville** :

- Filtre via `zones_intervention.ville_centre`
- Distance calculée mais pas utilisée pour filtrer

---

## 🔧 Fonctions Supprimées

- ❌ `sortPrestataires()` → Tri intégré dans la requête Supabase
- ❌ Appels RPC : `search_prestataires_proximite`, `search_prestataires_ville`, `get_prestataires_carte`

---

## ✨ Nouvelles Fonctionnalités

1. **Filtrage par prestation** : Recherche dans la table `prestations` pour obtenir l'ID, puis filtre les annonces
2. **Affichage zones multiples** : Une annonce peut avoir plusieurs zones d'intervention affichées
3. **Photos d'annonces** : Affiche les photos du service au lieu de la photo du prestataire
4. **Tri dynamique** : Note, prix, nombre d'avis, date de création

---

## 🧪 Tests à Effectuer

### 1. Sans Localisation

- [ ] La carte affiche les annonces en France (région par défaut)
- [ ] Le compteur affiche le bon nombre d'annonces

### 2. Avec Localisation

- [ ] Les annonces sont filtrées par rayon (20 km par défaut)
- [ ] Le tri par distance fonctionne
- [ ] Les distances affichées sont correctes

### 3. Recherche par Service

- [ ] Taper "Plomberie" filtre les annonces de plombiers
- [ ] Les suggestions apparaissent après 2 caractères
- [ ] Sélectionner une suggestion recharge les résultats

### 4. Recherche par Ville

- [ ] Sélectionner "Paris" affiche les annonces avec zones à Paris
- [ ] Le filtre par ville ignore le rayon km
- [ ] Les distances sont calculées si localisation activée

### 5. Tri

- [ ] Tri par note : du plus haut au plus bas
- [ ] Tri par prix : du moins cher au plus cher
- [ ] Tri par avis : du plus d'avis au moins

### 6. Navigation

- [ ] Cliquer sur un marqueur affiche la carte popup
- [ ] "Voir le prestataire" ouvre le profil du prestataire
- [ ] "Voir l'annonce" ouvre la page détail de l'annonce (à créer si n'existe pas)

### 7. Mode Liste

- [ ] Bascule entre carte et liste
- [ ] Cliquer sur un item liste centre la carte sur l'annonce
- [ ] Les infos affichées correspondent à l'annonce

---

## 📋 Prérequis Base de Données

### Tables Nécessaires

1. **`annonces`** avec colonnes :

   - `id`, `titre`, `description`, `photos[]`, `tarif_unit`, `unit_tarif`
   - `rate`, `nb_avis`, `actif`, `prestataire`, `prestation`
   - Foreign Keys vers `profiles` et `prestations`

2. **`zones_intervention`** avec colonnes :

   - `annonce_id`, `ville_centre`, `rayon_km`, `latitude`, `longitude`, `active`
   - Foreign Key vers `annonces`

3. **`prestations`** avec colonnes :

   - `id`, `nom`

4. **`profiles`** avec colonnes existantes :
   - `id`, `nom`, `prenom`, `photo`, `email`, `telephone`

### Données de Test Recommandées

```sql
-- Exemple : Ajouter des prestations
INSERT INTO prestations (nom) VALUES
  ('Plomberie'),
  ('Électricité'),
  ('Peinture'),
  ('Jardinage'),
  ('Ménage');

-- Exemple : Ajouter une annonce
INSERT INTO annonces (
  titre, description, photos, tarif_unit, unit_tarif,
  rate, nb_avis, actif, prestataire, prestation
) VALUES (
  'Réparation fuite d''eau',
  'Intervention rapide pour tous types de fuites',
  ARRAY['https://example.com/photo1.jpg'],
  80,
  'intervention',
  4.5,
  12,
  true,
  'uuid-prestataire',
  'uuid-prestation-plomberie'
);

-- Exemple : Ajouter une zone d'intervention
INSERT INTO zones_intervention (
  annonce_id, ville_centre, rayon_km, latitude, longitude, active
) VALUES (
  'uuid-annonce',
  'Paris',
  25,
  48.8566,
  2.3522,
  true
);
```

---

## 🚀 Prochaines Étapes

1. **Créer la page `/annonces/[id]`** pour afficher le détail d'une annonce
2. **Ajouter un geocoding service** pour convertir les villes en coordonnées si manquantes
3. **Optimiser les requêtes** : Possibilité de créer une vue matérialisée ou fonction RPC pour les requêtes complexes
4. **Ajouter plus de filtres** : Prix min/max, disponibilité immédiate, certifications

---

## 📚 Référence

Cette implémentation suit exactement le pattern utilisé dans :

- **`photo-app/pages/particuliers/search.js`** (lignes 1-457)

Avantages de ce pattern :
✅ Pas de dépendance aux fonctions RPC
✅ Queries Supabase standards et maintenables
✅ Flexibilité pour ajouter des filtres
✅ Architecture évolutive
