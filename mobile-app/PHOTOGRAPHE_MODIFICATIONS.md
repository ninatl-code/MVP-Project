# 📋 Modifications Photographe - Guide Complet

## ✅ COMPLÉTÉ

### 1. Correction devis.tsx
- ✅ Ajout des propriétés manquantes dans l'interface Devis
- ✅ Correction du type client (array → object)
- ✅ Fix de la route messages

### 2. Création devis-list.tsx
- ✅ Liste de tous les devis avec filtres
- ✅ Bouton "Créer un devis" → devis-create.tsx
- ✅ Clic sur carte → devis.tsx (détail)

### 3. Création devis-create.tsx
- ✅ Formulaire de création de devis
- ✅ Pré-remplissage si demandeId fourni
- ✅ Validation et envoi

## 📝 À COMPLÉTER

### 4. Invoices (Factures)

**Fichiers à créer:**
- `app/photographe/leads/invoices-list.tsx` - Liste des factures
- `app/photographe/leads/invoice-create.tsx` - Création facture
- `app/photographe/leads/invoice.tsx` - Détail facture (adapter l'existant)

**Fonctionnement:**
```
Devis accepté → Notification → Bouton "Générer facture" 
              → invoice-create.tsx (pré-rempli avec données devis)
              
invoices-list.tsx → Clic "Détails" → invoice.tsx (id passé en paramètre)
```

### 5. Menu - Section Profil Incomplet

Ajouter dans `menu.tsx` après les stats :
```tsx
{!profileComplete && (
  <View style={styles.incompleteCard}>
    <LinearGradient colors={['#FFA726', '#FF6F00']}>
      <Ionicons name="warning" />
      <Text>Profil incomplet</Text>
      <Text>Complétez pour recevoir des demandes</Text>
      {missingSteps.map(step => (
        <View key={step.key}>
          <Ionicons name={step.done ? "checkmark-circle" : "ellipse-outline"} />
          <Text>{step.label}</Text>
        </View>
      ))}
    </LinearGradient>
  </View>
)}
```

**Étapes à vérifier:**
- ✓ Informations de base (nom, email, téléphone)
- ✓ Spécialisations sélectionnées
- ✓ Photos portfolio (min 3)
- ✓ Description/bio
- ✓ Zone d'intervention définie
- ✓ Tarifs indicatifs renseignés

### 6. Menu - Remplacer Messages par Planning

Dans le tableau 4 carrés :
```tsx
// AVANT: Messages
// APRÈS: Planning

{
  title: "Planning",
  icon: "calendar",
  route: "/photographe/calendar/calendrier",
  color: COLORS.info
}
```

### 7. Demandes - Bouton "Voir détail" et "Envoyer devis"

Dans `demandes-list.tsx`, ajouter navigation:
```tsx
<TouchableOpacity 
  onPress={() => router.push(`/photographe/demandes/demande-detail?id=${demande.id}`)}
>
```

Dans `demande-detail.tsx`, ajouter bouton en bas:
```tsx
<TouchableOpacity 
  onPress={() => router.push(`/photographe/devis/devis-create?demandeId=${demande.id}`)}
>
  <Text>Envoyer un devis</Text>
</TouchableOpacity>
```

## 🗂️ RÉORGANISATION FICHIERS

### Fichiers à SUPPRIMER:
- ❌ `photographe/messages.tsx` → Utiliser `shared/messages/`
- ❌ `shared/payments.tsx` → Utiliser `shared/paiement/`
- ❌ `photographe/calendar/availability-calendar.tsx` → Redondant
- ❌ `photographe/calendar/blocked-slots.tsx` → Redondant
- ❌ `photographe/calendar/calendar-management.tsx` → Redondant
- ❌ `photographe/review/avis-liste.tsx` → Utiliser reviews-dashboard.tsx
- ❌ `photographe/kpis/kpis.tsx` → Utiliser analytics-dashboard.tsx

### Fichiers à GARDER:
- ✅ `photographe/calendar/calendrier.tsx` - Planning principal
- ✅ `photographe/review/reviews-dashboard.tsx` - Dashboard avis
- ✅ `photographe/review/respond-to-review.tsx` - Répondre aux avis
- ✅ `photographe/kpis/analytics-dashboard.tsx` - Stats complètes
- ✅ `shared/messages/` - Messages tous utilisateurs
- ✅ `shared/avis/` - Notifications avis
- ✅ `shared/paiement/` - Paiements

## 🔄 LAYOUT - Mise à jour routes

Modifier `photographe/_layout.tsx`:
```tsx
<Stack>
  <Stack.Screen name="menu" />
  <Stack.Screen name="demandes/demandes-list" />
  <Stack.Screen name="demandes/demande-detail" />
  <Stack.Screen name="devis/devis-list" />
  <Stack.Screen name="devis/devis-create" />
  <Stack.Screen name="devis/devis" />
  <Stack.Screen name="leads/invoices-list" />
  <Stack.Screen name="leads/invoice-create" />
  <Stack.Screen name="leads/invoice" />
  <Stack.Screen name="reservations/reservations" />
  <Stack.Screen name="calendar/calendrier" />
  <Stack.Screen name="media-library" />
  <Stack.Screen name="review/reviews-dashboard" />
  <Stack.Screen name="review/respond-to-review" />
  <Stack.Screen name="profil/profil" />
  <Stack.Screen name="kpis/analytics-dashboard" />
  <Stack.Screen name="notification" />
</Stack>
```

## 🎨 HEADERS - Style monAppMobile

Utiliser partout ce template:
```tsx
<LinearGradient
  colors={[COLORS.primary, COLORS.accent]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.header}
>
  <View style={styles.headerContent}>
    <TouchableOpacity onPress={() => router.back()}>
      <Ionicons name="arrow-back" size={24} color="#fff" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Titre</Text>
    <View style={{ width: 40 }} /> {/* Spacer */}
  </View>
</LinearGradient>
```

## 📱 REDIRECTIONS FOOTER

Le footer photographe doit pointer vers:
- Menu → `/photographe/menu`
- Messages → `/shared/messages/messages-list`
- Notifs → `/shared/avis/notifications`
- Profil → `/photographe/profil/profil`

## 🔗 FLUX COMPLETS

### Flux Devis:
1. Notification demande → demandes-list.tsx
2. Clic notif → demande-detail.tsx
3. Bouton "Envoyer devis" → devis-create.tsx (demandeId en param)
4. Création devis → Retour à devis-list.tsx
5. Clic sur devis → devis.tsx?id=xxx (détail)

### Flux Facture:
1. Notification "Devis accepté" → invoices-list.tsx
2. Bouton "Générer facture" → invoice-create.tsx (devisId en param)
3. Création facture → Retour à invoices-list.tsx
4. Clic sur facture → invoice.tsx?id=xxx (détail)

## ⚙️ VÉRIFICATIONS PROFIL

Fonction à ajouter dans `menu.tsx`:
```tsx
const checkProfileCompleteness = async (userId: string) => {
  const { data } = await supabase
    .from('profils_photographe')
    .select('*')
    .eq('id', userId)
    .single();
    
  const checks = {
    hasBasicInfo: data?.bio && data?.telephone,
    hasSpecialisations: data?.specialisations?.length > 0,
    hasPortfolio: data?.portfolio_photos?.length >= 3,
    hasZone: data?.rayon_deplacement_km > 0,
    hasTarifs: data?.tarifs_indicatifs && Object.keys(data.tarifs_indicatifs).length > 0
  };
  
  const missingSteps = [];
  if (!checks.hasBasicInfo) missingSteps.push({ key: 'info', label: 'Informations de base' });
  if (!checks.hasSpecialisations) missingSteps.push({ key: 'spec', label: 'Spécialisations' });
  if (!checks.hasPortfolio) missingSteps.push({ key: 'portfolio', label: 'Portfolio (3 photos min)' });
  if (!checks.hasZone) missingSteps.push({ key: 'zone', label: "Zone d'intervention" });
  if (!checks.hasTarifs) missingSteps.push({ key: 'tarifs', label: 'Tarifs indicatifs' });
  
  return {
    isComplete: missingSteps.length === 0,
    missingSteps
  };
};
```

## 🎯 PRIORITÉS

1. **URGENT** - Créer invoices-list.tsx et invoice-create.tsx
2. **URGENT** - Adapter invoice.tsx en détail
3. **IMPORTANT** - Ajouter section profil incomplet dans menu
4. **IMPORTANT** - Remplacer Messages par Planning dans menu
5. **MOYEN** - Mettre à jour _layout.tsx
6. **MOYEN** - Harmoniser tous les headers
7. **FAIBLE** - Supprimer fichiers redondants
