# 🎯 PHOTOGRAPHE - RÉSUMÉ DES MODIFICATIONS

## ✅ COMPLÉTÉ (6/13 points)

### 1. ✅ Correction devis.tsx
- Interface Devis complétée (message_client, reponse_prestataire, valide_jusqu_a)
- Fix transformation client/annonces (array → object)
- Route messages corrigée

### 3. ✅ Remplacement Messages → Planning dans menu
- Carte 4 "Messages" remplacée par "Planning"
- Icône changée: chatbubbles → calendar-outline
- Route: `/photographe/calendar/calendrier`
- Affichage: devis_acceptes au lieu de messages

### 4. ✅ Création système Devis complet
**Fichiers créés:**
- ✅ `devis/devis-list.tsx` - Liste tous devis avec filtres (tous/en_attente/envoye/accepte/refuse)
- ✅ `devis/devis-create.tsx` - Formulaire création devis (peut recevoir demandeId)
- ✅ `devis/devis.tsx` - Adapté pour afficher détails (existe déjà, juste corrigé)

**Flux:**
```
devis-list → Clic "Créer" → devis-create
devis-list → Clic carte → devis?id=xxx
demande-detail → "Envoyer devis" → devis-create?demandeId=xxx
```

### 7. ✅ Création invoices-list.tsx (1/3)
- ✅ `leads/invoices-list.tsx` créé avec filtres
- ❌ `leads/invoice-create.tsx` À CRÉER
- ❌ `leads/invoice.tsx` À ADAPTER

### 12. ✅ Mise à jour _layout.tsx
Routes organisées par dossier:
- demandes, devis, leads, reservations
- calendar, review, kpis, profil
- media-library, notification, packages
- remboursements, cancellation-policies, integrations, ma-localisation

## ❌ À COMPLÉTER (7/13 points)

### 2. ⚠️ Section Profil Incomplet dans menu.tsx
**Code fourni dans TODO_PHOTOGRAPHE.md**

Vérifications à faire:
- [ ] Bio + téléphone renseignés
- [ ] Spécialisations (min 1)
- [ ] Portfolio (min 3 photos)
- [ ] Zone intervention définie
- [ ] Tarifs indicatifs renseignés

Afficher carte warning orange avec liste étapes manquantes + bouton "Compléter maintenant"

### 5-6-8-9-10-11. ✅ Réponses aux questions (documentées)

**Calendar files:** Garder `calendrier.tsx` seulement
**Review files:** Garder `reviews-dashboard.tsx` + `respond-to-review.tsx`
**Messages:** Supprimer `photographe/messages.tsx`, utiliser `shared/messages/`
**Avis:** Garder `photographe/review/` pour gestion, `shared/avis/` pour notifs
**Paiement:** Garder `shared/paiement/`, supprimer `shared/payments.tsx`
**KPIs:** Garder `analytics-dashboard.tsx` seulement

### 7. ⚠️ Compléter système Factures

**À créer:**

#### `leads/invoice-create.tsx` (URGENT)
```tsx
// Structure similaire à devis-create.tsx
// Paramètres: devisId (optionnel pour pré-remplissage)
// Champs:
- Numéro facture (auto-généré)
- Client (sélection ou pré-rempli)
- Date émission
- Date échéance
- Lignes de facturation (description, qté, px unitaire)
- Total HT, TVA (20%), Total TTC
- Conditions paiement
- Notes

// Enregistrement dans table 'factures'
```

#### Adapter `leads/invoice.tsx`
```tsx
// ACTUELLEMENT: Liste de factures
// TRANSFORMER EN: Détail d'une facture

// Recevoir: useLocalSearchParams() → id
// Afficher:
- Numéro, dates
- Client (nom, email, adresse)
- Lignes détaillées
- Totaux HT/TVA/TTC
- Statut (payée/en_attente/annulée)
- Historique paiements

// Actions:
- Télécharger PDF
- Marquer comme payée
- Envoyer reminder
- Annuler
```

### 4. ⚠️ Ajouter boutons dans demande-detail.tsx

En bas du ScrollView:
```tsx
<View style={styles.actionButtons}>
  <TouchableOpacity
    style={styles.primaryButton}
    onPress={() => router.push(`/photographe/devis/devis-create?demandeId=${demande.id}`)}
  >
    <Ionicons name="document-text" size={20} color="#fff" />
    <Text>Envoyer un devis</Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={styles.secondaryButton}
    onPress={() => router.push(`/shared/messages/messages-list?recipientId=${demande.client_id}`)}
  >
    <Ionicons name="chatbubble-outline" size={20} />
    <Text>Contacter le client</Text>
  </TouchableOpacity>
</View>
```

### 13. ⚠️ Harmoniser tous les headers

Template standard à appliquer partout:
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
    <Text style={styles.headerTitle}>Titre</Text>
    <View style={{ width: 40 }} /> {/* Spacer ou action */}
  </View>
</LinearGradient>
```

**Fichiers à vérifier:**
- [ ] demandes/demandes-list.tsx
- [ ] demandes/demande-detail.tsx
- [ ] reservations/reservations.tsx
- [ ] calendar/calendrier.tsx
- [ ] review/reviews-dashboard.tsx
- [ ] kpis/analytics-dashboard.tsx
- [ ] profil/profil.tsx
- [ ] media-library.tsx

## 📋 CHECKLIST PRIORITÉS

### 🔴 URGENT (blocant fonctionnalités)
1. [ ] Créer `leads/invoice-create.tsx`
2. [ ] Adapter `leads/invoice.tsx` en détail
3. [ ] Ajouter boutons dans `demande-detail.tsx`

### 🟠 IMPORTANT (UX)
4. [ ] Ajouter section profil incomplet dans `menu.tsx`
5. [ ] Harmoniser headers (13 fichiers)

### 🟡 MOYEN (nettoyage)
6. [ ] Supprimer fichiers redondants:
   - `photographe/messages.tsx`
   - `calendar/availability-calendar.tsx`
   - `calendar/blocked-slots.tsx`
   - `calendar/calendar-management.tsx`
   - `review/avis-liste.tsx`
   - `kpis/kpis.tsx`
   - `shared/payments.tsx`

## 📱 REDIRECTIONS FINALES

### Footer Photographe:
- **Menu** → `/photographe/menu`
- **Messages** → `/shared/messages/messages-list`
- **Notifs** → `/shared/avis/notifications`
- **Profil** → `/photographe/profil/profil`

### Menu (cartes 4):
1. **Réservations** → `/photographe/reservations/reservations`
2. **Demandes vues** → `/photographe/demandes/demandes-list`
3. **Devis envoyés** → `/photographe/devis/devis-list`
4. **Planning** → `/photographe/calendar/calendrier`

### Menu (section Gestion):
- **Planning** → `/photographe/calendar/calendrier`
- **Médiathèque** → `/photographe/media-library`
- **Avis clients** → `/photographe/review/reviews-dashboard`

### Menu (section Finances):
- **Tableau de bord** → `/photographe/kpis/analytics-dashboard`
- **Factures** → `/photographe/leads/invoices-list`

## 🎯 FLUX COMPLETS

### Flux Devis:
```
Notification demande
  ↓
demandes-list.tsx (liste)
  ↓
demande-detail.tsx (clic ou notif)
  ↓
Bouton "Envoyer devis"
  ↓
devis-create.tsx?demandeId=xxx
  ↓
Sauvegarde → Retour devis-list.tsx
  ↓
Clic carte → devis.tsx?id=xxx (détail)
```

### Flux Facture (À IMPLÉMENTER):
```
Notification "Devis accepté"
  ↓
invoices-list.tsx
  ↓
Bouton "Générer facture"
  ↓
invoice-create.tsx?devisId=xxx (pré-rempli)
  ↓
Sauvegarde → Retour invoices-list.tsx
  ↓
Clic carte → invoice.tsx?id=xxx (détail)
```

## 📚 FICHIERS CRÉÉS

1. ✅ `app/photographe/devis/devis-list.tsx` (420 lignes)
2. ✅ `app/photographe/devis/devis-create.tsx` (340 lignes)
3. ✅ `app/photographe/leads/invoices-list.tsx` (380 lignes)
4. ✅ `TODO_PHOTOGRAPHE.md` - Guide complet avec code
5. ✅ `PHOTOGRAPHE_MODIFICATIONS.md` - Récapitulatif détaillé

## 🔧 FICHIERS MODIFIÉS

1. ✅ `app/photographe/devis/devis.tsx` - Interface corrigée
2. ✅ `app/photographe/menu.tsx` - Messages→Planning
3. ✅ `app/photographe/_layout.tsx` - Routes organisées

## 💡 PROCHAINES ÉTAPES

1. **Créer invoice-create.tsx** (copier/adapter devis-create.tsx)
2. **Adapter invoice.tsx** en détail (recevoir id param, afficher détails)
3. **Ajouter section profil incomplet** dans menu.tsx (code fourni)
4. **Ajouter boutons** dans demande-detail.tsx
5. **Harmoniser headers** sur tous les fichiers

**Temps estimé restant: 3-4 heures**

---

📖 Consultez `TODO_PHOTOGRAPHE.md` pour le code complet à copier/coller
