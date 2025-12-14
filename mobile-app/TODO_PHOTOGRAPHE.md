# 🎯 PLAN D'ACTION PHOTOGRAPHE - À COMPLÉTER

## ✅ TERMINÉ (Points 1, 4 partiels)

### 1. Correction devis.tsx ✅
- Interface Devis complétée avec propriétés manquantes
- Fix client array → object
- Fix route messages

### 4. Création fichiers devis ✅
- ✅ `devis-list.tsx` - Liste avec filtres
- ✅ `devis-create.tsx` - Formulaire création
- ⚠️ `devis.tsx` - Déjà existe, juste corrigé

### 7. Création fichiers invoices (partiel) ✅
- ✅ `leads/invoices-list.tsx` - Liste factures créée
- ❌ `leads/invoice-create.tsx` - À CRÉER
- ❌ `leads/invoice.tsx` - À ADAPTER (existe déjà)

## 📝 FICHIERS À CRÉER URGENTS

### 1. `/photographe/leads/invoice-create.tsx`
**Copier/adapter depuis `devis-create.tsx`**

```tsx
// Points clés:
- Accepter devisId en paramètre
- Pré-remplir avec données du devis
- Générer numéro facture auto
- Ajouter lignes de facturation
- Calculer TTC/TVA
- Enregistrer dans table 'factures'
```

### 2. Adapter `/photographe/leads/invoice.tsx`
**Transformer en vue détail** (actuellement c'est une liste)

```tsx
// Points clés:
- Recevoir id en paramètre useLocalSearchParams()
- Afficher détail complet facture
- Bouton télécharger PDF
- Bouton marquer comme payée
- Historique paiements
```

## 🔧 MODIFICATIONS MENU.TSX

### 2. Section Profil Incomplet

Ajouter après les stats:

```tsx
const [profileStatus, setProfileStatus] = useState({
  isComplete: true,
  missingSteps: []
});

// Dans useEffect
const checkProfile = async () => {
  const { data } = await supabase
    .from('profils_photographe')
    .select('*')
    .eq('id', userId)
    .single();
    
  const steps = [
    { 
      key: 'basic', 
      label: 'Informations de base',
      done: data?.bio && data?.telephone 
    },
    { 
      key: 'spec', 
      label: 'Spécialisations',
      done: data?.specialisations?.length > 0 
    },
    { 
      key: 'portfolio', 
      label: 'Portfolio (3 photos min)',
      done: data?.portfolio_photos?.length >= 3 
    },
    { 
      key: 'zone', 
      label: "Zone d'intervention",
      done: data?.rayon_deplacement_km > 0 
    },
    { 
      key: 'tarifs', 
      label: 'Tarifs indicatifs',
      done: data?.tarifs_indicatifs && Object.keys(data.tarifs_indicatifs).length > 0 
    }
  ];
  
  const missing = steps.filter(s => !s.done);
  setProfileStatus({
    isComplete: missing.length === 0,
    missingSteps: missing
  });
};

// Dans JSX, avant les stats:
{!profileStatus.isComplete && (
  <LinearGradient
    colors={['#FFA726', '#FF6F00']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.warningCard}
  >
    <Ionicons name="warning" size={32} color="#fff" />
    <View style={styles.warningContent}>
      <Text style={styles.warningTitle}>Profil incomplet</Text>
      <Text style={styles.warningText}>
        Complétez votre profil pour recevoir des demandes
      </Text>
      {profileStatus.missingSteps.map(step => (
        <View key={step.key} style={styles.stepRow}>
          <Ionicons 
            name="ellipse-outline" 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.stepText}>{step.label}</Text>
        </View>
      ))}
      <TouchableOpacity 
        style={styles.completeButton}
        onPress={() => router.push('/photographe/profil/profil')}
      >
        <Text style={styles.completeButtonText}>
          Compléter maintenant
        </Text>
      </TouchableOpacity>
    </View>
  </LinearGradient>
)}

// Styles à ajouter:
warningCard: {
  flexDirection: 'row',
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  alignItems: 'flex-start',
},
warningContent: {
  flex: 1,
  marginLeft: 12,
},
warningTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#fff',
  marginBottom: 4,
},
warningText: {
  fontSize: 14,
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: 12,
},
stepRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 6,
},
stepText: {
  fontSize: 13,
  color: '#fff',
  marginLeft: 8,
},
completeButton: {
  backgroundColor: '#fff',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 20,
  marginTop: 12,
  alignSelf: 'flex-start',
},
completeButtonText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#FF6F00',
},
```

### 3. Remplacer Messages par Planning

Dans le tableau 4 carrés (quickActions), modifier:

```tsx
const quickActions = [
  {
    title: "Réservations",
    icon: "calendar",
    count: stats.reservations,
    color: COLORS.success,
    onPress: () => router.push('/photographe/reservations/reservations'),
  },
  {
    title: "Planning",  // CHANGÉ DE "Messages"
    icon: "calendar-outline",  // CHANGÉ
    count: 0,  // Pas de count pour planning
    color: COLORS.info,
    onPress: () => router.push('/photographe/calendar/calendrier'),
  },
  {
    title: "Devis envoyés",
    icon: "document-text",
    count: stats.devis_envoyes,
    color: COLORS.warning,
    onPress: () => router.push('/photographe/devis/devis-list' as any),
  },
  {
    title: "Demandes vues",
    icon: "eye",
    count: stats.demandes_vues,
    color: COLORS.purple,
    onPress: () => router.push('/photographe/demandes/demandes-list'),
  },
];
```

## 🔄 MODIFICATIONS DEMANDES

### Dans demande-detail.tsx

Ajouter en bas du ScrollView, avant le footer:

```tsx
<View style={styles.actionButtons}>
  <TouchableOpacity
    style={styles.primaryButton}
    onPress={() => router.push(`/photographe/devis/devis-create?demandeId=${demande.id}` as any)}
  >
    <Ionicons name="document-text" size={20} color="#fff" />
    <Text style={styles.primaryButtonText}>Envoyer un devis</Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={styles.secondaryButton}
    onPress={() => router.push(`/shared/messages/messages-list?recipientId=${demande.client_id}` as any)}
  >
    <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
    <Text style={styles.secondaryButtonText}>Contacter le client</Text>
  </TouchableOpacity>
</View>

// Styles:
actionButtons: {
  padding: 20,
  gap: 12,
},
primaryButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: COLORS.primary,
  padding: 16,
  borderRadius: 12,
},
primaryButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#fff',
  marginLeft: 8,
},
secondaryButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff',
  padding: 16,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: COLORS.primary,
},
secondaryButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: COLORS.primary,
  marginLeft: 8,
},
```

## 📱 MISE À JOUR _LAYOUT.TSX

**Remplacer complètement par:**

```tsx
import { Stack } from 'expo-router';

export default function PrestataireLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      {/* Menu principal */}
      <Stack.Screen name="menu" options={{ title: 'Menu' }} />
      
      {/* Demandes */}
      <Stack.Screen name="demandes" options={{ title: 'Demandes' }} />
      
      {/* Devis */}
      <Stack.Screen name="devis" options={{ title: 'Devis' }} />
      
      {/* Leads (Invoices) */}
      <Stack.Screen name="leads" options={{ title: 'Factures' }} />
      
      {/* Réservations */}
      <Stack.Screen name="reservations" options={{ title: 'Réservations' }} />
      
      {/* Calendar */}
      <Stack.Screen name="calendar" options={{ title: 'Planning' }} />
      
      {/* Review */}
      <Stack.Screen name="review" options={{ title: 'Avis' }} />
      
      {/* KPIs */}
      <Stack.Screen name="kpis" options={{ title: 'Statistiques' }} />
      
      {/* Profil */}
      <Stack.Screen name="profil" options={{ title: 'Profil' }} />
      
      {/* Media Library */}
      <Stack.Screen name="media-library" options={{ title: 'Médiathèque' }} />
      
      {/* Notifications */}
      <Stack.Screen name="notification" options={{ title: 'Notifications' }} />
      
      {/* Autres */}
      <Stack.Screen name="packages" options={{ title: 'Packages' }} />
      <Stack.Screen name="remboursements" options={{ title: 'Remboursements' }} />
      <Stack.Screen name="cancellation-policies" options={{ title: 'Politiques d\'annulation' }} />
      <Stack.Screen name="integrations" options={{ title: 'Intégrations' }} />
      <Stack.Screen name="ma-localisation" options={{ title: 'Ma localisation' }} />
    </Stack>
  );
}
```

## 📋 CHECKLIST FINALE

### Fichiers à créer:
- [ ] `/photographe/leads/invoice-create.tsx`
- [ ] Adapter `/photographe/leads/invoice.tsx` en détail

### Modifications menu.tsx:
- [ ] Ajouter section profil incomplet
- [ ] Remplacer "Messages" par "Planning" dans quickActions
- [ ] Modifier route devis vers devis-list

### Modifications demande-detail.tsx:
- [ ] Ajouter bouton "Envoyer un devis"
- [ ] Ajouter bouton "Contacter le client"

### Modification _layout.tsx:
- [ ] Mettre à jour toutes les routes

### Harmonisation headers:
- [ ] Vérifier tous les fichiers utilisent le même header gradient
- [ ] Bouton retour à gauche
- [ ] Titre au centre
- [ ] Action à droite (si applicable)

### Nettoyage:
- [ ] Supprimer `photographe/messages.tsx`
- [ ] Supprimer fichiers calendar redondants
- [ ] Supprimer `photographe/review/avis-liste.tsx`
- [ ] Supprimer `photographe/kpis/kpis.tsx`
- [ ] Supprimer `shared/payments.tsx`

## 🎨 TEMPLATE HEADER STANDARD

À utiliser partout:

```tsx
<LinearGradient
  colors={[COLORS.primary, COLORS.accent]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.header}
>
  <View style={styles.headerContent}>
    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color="#fff" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Titre de la Page</Text>
    <View style={{ width: 40 }} /> {/* Spacer ou bouton action */}
  </View>
</LinearGradient>

// Styles:
header: {
  paddingTop: 60,
  paddingBottom: 20,
  paddingHorizontal: 20,
},
headerContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
backButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  alignItems: 'center',
  justifyContent: 'center',
},
headerTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#fff',
},
```

## 📞 CONTACTS & MESSAGES

**Footer doit pointer vers:**
- Messages → `/shared/messages/messages-list`
- Notifs → `/shared/avis/notifications`
- Profil → `/photographe/profil/profil`
- Menu → `/photographe/menu`
