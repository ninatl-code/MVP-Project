# Testing Checklist - App Mobile

## 🔐 Authentification

### Inscription/Connexion

- [ ] Signup particulier avec email/password
- [ ] Signup prestataire avec email/password
- [ ] Login avec credentials valides : OK
- [ ] Logout et redirection : OK

## 👤 Particuliers

### Recherche & Découverte

- [ ] Search page - recherche par critères (service, ville, date)
- [ ] Provider profile - voir profil prestataire avec photos et avis
- [ ] Favoris - ajouter/retirer des favoris

### Réservations & Paiements

- [ ] Booking flow - réserver une prestation
- [ ] Paiements - payer via Stripe
- [ ] Reservations - voir liste des réservations
- [ ] Cancel booking - annuler une réservation
- [ ] Devis - voir et accepter devis

### Avis & Messages

- [ ] Laisser avis - noter prestataire après réservation
- [ ] Messages - envoyer/recevoir messages
- [ ] Notifications - recevoir notifications temps réel

### Fidélité & IA

- [ ] Loyalty dashboard - voir points fidélité
- [ ] Achievements - débloquer succès
- [ ] Rewards catalog - échanger points contre récompenses

### Profil & Paramètres

- [ ] Profil - modifier infos personnelles
- [ ] Preferences - gérer préférences
- [ ] Menu - accès à toutes les features

## 🎯 Prestataires

### Gestion Calendrier

- [ ] Calendrier - voir réservations du jour/semaine/mois
- [ ] Availability calendar - définir disponibilités
- [ ] Blocked slots - bloquer créneaux
- [ ] Calendar management - gérer paramètres
- [ ] Instant booking settings - configuration réservation instantanée

### Prestations & Devis

- [ ] Prestations - créer/modifier services
- [ ] Devis - créer et envoyer devis
- [ ] Reservations - gérer réservations clients
- [ ] Reservation detail - voir détails réservation

### Avis & Communication

- [ ] Reviews dashboard - voir tous les avis
- [ ] Respond to review - répondre aux avis
- [ ] Messages - communiquer avec clients
- [ ] Notification settings - gérer préférences notifications

### Finances & Analytics

- [ ] KPIs - tableau de bord statistiques
- [ ] Invoice - générer factures
- [ ] Pricing rules - règles tarifaires dynamiques
- [ ] Seasonal pricing - tarifs saisonniers
- [ ] Price simulator - simuler prix
- [ ] Remboursements - gérer remboursements

### Média & Profil

- [ ] Media library - gérer photos/vidéos/documents
- [ ] Profil - modifier infos prestataire
- [ ] Ma localisation - définir zone intervention
- [ ] Verification - vérification identité
- [ ] Integrations - connecter services externes

### Menu & Navigation

- [ ] Menu - accès 3 sections (Gestion, Finances, Paramètres)
- [ ] Footer - navigation persistante sur toutes pages
- [ ] Back button - retour sur pages secondaires

## 🔔 Notifications (Temps Réel)

### Particuliers

- [ ] Notification nouvelle réservation confirmée
- [ ] Notification nouveau message
- [ ] Notification nouveau devis reçu
- [ ] Notification rappel réservation

### Prestataires

- [ ] Notification nouvelle réservation
- [ ] Notification annulation
- [ ] Notification paiement reçu
- [ ] Notification nouvel avis
- [ ] Notification nouveau message
- [ ] Rappels 24h et 2h avant rendez-vous

## 🎨 UX/UI

### Navigation Générale

- [ ] Footer présent sur toutes les pages
- [ ] Bouton retour sur pages secondaires
- [ ] Transitions fluides entre écrans
- [ ] Loading states corrects

### États Visuels

- [ ] Empty states affichés correctement
- [ ] Error handling avec messages clairs
- [ ] Success confirmations visibles
- [ ] Couleurs cohérentes (primary: #5C6BC0 / #007AFF)

## 🔗 Intégrations

### Services Externes

- [ ] Supabase - authentification et données
- [ ] Stripe - paiements
- [ ] Expo Push Notifications
- [ ] React Native Maps - géolocalisation

### Temps Réel

- [ ] RealTimeNotifications - badge et liste
- [ ] Messages instantanés
- [ ] Mise à jour live réservations
