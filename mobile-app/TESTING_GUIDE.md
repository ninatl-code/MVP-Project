# Guide de Tests - Application Mobile Shooty

## Vue d'ensemble
Ce document décrit les procédures de test pour l'application mobile Shooty.

## Tests E2E Prioritaires

### 1. Flux de Demande Client
**Objectif**: Vérifier qu'un client peut créer et gérer une demande

**Étapes**:
1. Connexion en tant que client
2. Navigation vers "Mes Demandes"
3. Clic sur "Créer une demande"
4. Remplissage du formulaire:
   - Titre: "Test - Séance Portrait"
   - Catégorie: Portrait
   - Date: Date future
   - Lieu: Paris
   - Budget: 100-200€
5. Soumission du formulaire
6. Vérification que la demande apparaît dans la liste
7. Accès aux détails de la demande
8. Vérification des photographes intéressés/notifiés

**Résultats attendus**:
- ✅ Formulaire validé correctement
- ✅ Demande créée avec statut "active"
- ✅ Demande visible dans "Mes Demandes"
- ✅ Notifications envoyées aux photographes matchés

---

### 2. Flux de Devis Photographe
**Objectif**: Vérifier qu'un photographe peut envoyer un devis

**Étapes**:
1. Connexion en tant que photographe
2. Navigation vers "Demandes"
3. Sélection d'une demande active
4. Visualisation des détails
5. Clic sur "Proposer un devis"
6. Remplissage du formulaire devis:
   - Prestation: Description détaillée
   - Tarif horaire: 80€
   - Durée estimée: 3h
   - Montant total calculé automatiquement
7. Envoi du devis

**Résultats attendus**:
- ✅ Formulaire devis accessible
- ✅ Calculs automatiques corrects
- ✅ Devis envoyé au client
- ✅ Statut "envoyé" visible pour le photographe
- ✅ Notification envoyée au client

---

### 3. Flux d'Acceptation Devis Client
**Objectif**: Vérifier l'acceptation d'un devis et création de réservation

**Étapes**:
1. Connexion client
2. Navigation vers "Mes Devis"
3. Badge "NOUVEAU" visible sur devis non lus
4. Ouverture d'un devis
5. Lecture des détails (statut passe à "lu")
6. Comparaison si plusieurs devis disponibles
7. Clic "Accepter le devis"
8. Confirmation du popup
9. Création automatique de la réservation

**Résultats attendus**:
- ✅ Devis marqué comme "lu"
- ✅ Comparaison fonctionnelle (si applicable)
- ✅ Réservation créée automatiquement
- ✅ Statuts mis à jour (devis: accepté, demande: pourvue)
- ✅ Redirection vers la page de paiement
- ✅ Notification envoyée au photographe

---

### 4. Flux de Recherche & Matching
**Objectif**: Vérifier l'algorithme de matching

**Étapes**:
1. Création d'une demande avec:
   - Catégorie: Mariage
   - Localisation: Paris (75001)
   - Date: Dans 30 jours
   - Budget: 500-800€
2. Vérification côté photographe:
   - Photographes spécialisés "Mariage" notifiés
   - Score de matching affiché
   - Raisons du match visibles
3. Recherche manuelle client:
   - Filtres par catégorie
   - Filtres par localisation
   - Tri par pertinence/prix/note

**Résultats attendus**:
- ✅ Matching automatique fonctionnel
- ✅ Scores calculés correctement (0-100)
- ✅ Notifications ciblées aux bons photographes
- ✅ Recherche manuelle avec filtres opérationnels
- ✅ Résultats triés correctement

---

## Tests Unitaires Importants

### Services
```bash
# demandeService.ts
- createDemande()
- getClientDemandes()
- updateDemande()
- markDemandePourvue()

# devisService.ts
- createDevis()
- acceptDevis()
- refuseDevis()
- checkExpiredDevis()

# matchingService.ts
- findMatchingPhotographes()
- calculateMatchScore()
- notifyMatchedPhotographes()
```

### Composants
```bash
# DemandeCard.tsx
- Affichage correct des statuts
- Formatage des dates
- Gestion du clic

# DevisCard.tsx
- Badge "NOUVEAU" sur devis non lus
- Affichage des statuts colorés
- Calculs de montants

# PhotographeCard.tsx
- Affichage des notes
- Badges de spécialisation
- Distance (si disponible)
```

---

## Tests de Régression

### Après chaque déploiement
1. ✅ Authentification (login/logout)
2. ✅ Navigation entre écrans
3. ✅ Création de demande
4. ✅ Envoi de devis
5. ✅ Acceptation/refus devis
6. ✅ Système de notifications temps réel
7. ✅ Upload de photos (portfolio, galerie)
8. ✅ Paiements (sandbox Stripe)

---

## Outils de Test

### Environnement
- **React Native Testing Library** pour tests composants
- **Jest** pour tests unitaires
- **Detox** (optionnel) pour E2E
- **Expo Go** pour tests manuels

### Commandes
```bash
# Tests unitaires
npm test

# Tests avec coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Checklist Avant Release

### Fonctionnel
- [ ] Tous les flux E2E passent
- [ ] Pas d'erreurs console
- [ ] Notifications fonctionnelles
- [ ] Paiements en sandbox OK

### Performance
- [ ] Temps de chargement < 2s
- [ ] Pas de memory leaks
- [ ] Images optimisées

### Sécurité
- [ ] Tokens JWT valides
- [ ] Row Level Security (RLS) activé
- [ ] Validation des inputs

### UX
- [ ] Pas de bugs visuels
- [ ] Transitions fluides
- [ ] Messages d'erreur clairs

---

## Contacts Support
- **Tech Lead**: [email]
- **QA**: [email]
- **Product Owner**: [email]
