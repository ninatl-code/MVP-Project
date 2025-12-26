# 📄 Checklist de Déploiement Production

## ✅ Infrastructure Backend

### Supabase
- [ ] Projet Supabase créé et configuré
- [ ] Toutes les tables créées (profiles, profils_photographe, demandes_client, devis, reservations, avis, messages, notifications)
- [ ] Row Level Security (RLS) activé sur toutes les tables sensibles
- [ ] Policies RLS configurées pour chaque rôle (client, photographe, admin)
- [ ] Bucket storage `photos` créé avec policies publiques en lecture
- [ ] Variables d'environnement Supabase ajoutées (.env)

### Stripe
- [ ] Compte Stripe créé et vérifié
- [ ] Mode live activé (passer de test à production)
- [ ] Stripe Connect configuré pour marketplace
- [ ] Webhooks configurés sur URL de production
- [ ] Clés API ajoutées (.env) : publishable key (client) + secret key (backend)
- [ ] Webhook secret ajouté (.env)
- [ ] Tests de paiement réussis avec vraies cartes

### Google Maps
- [ ] Projet Google Cloud créé
- [ ] APIs activées : Maps JavaScript API + Places API
- [ ] Clé API créée et restreinte (HTTP referrers)
- [ ] Facturation activée (300$ de crédit gratuit)
- [ ] Clé API ajoutée (.env)
- [ ] Tests de recherche d'adresse réussis

### Backend API
- [ ] Choix fait : Supabase Edge Functions OU Next.js API Routes
- [ ] 4 endpoints créés et déployés :
  - POST /api/payments/create
  - POST /api/payments/confirm
  - POST /api/payments/transfer
  - POST /api/payments/refund
- [ ] Endpoint webhook Stripe créé et testé
- [ ] URL backend ajoutée dans .env
- [ ] Tests end-to-end paiement réussis

---

## ✅ Code & Qualité

### Bugs critiques corrigés
- [x] ✅ Bug `demandes_service` → `demandes_client` corrigé
- [x] ✅ Service d'erreurs centralisé créé (errorService.ts)
- [x] ✅ Service de logging créé (logger.ts)
- [x] ✅ Validations robustes créées (validation.ts)

### Validation & Sécurité
- [ ] Toutes les entrées utilisateur validées (validateDemande, validatePhotographeProfile)
- [ ] Sanitization des inputs (sanitizeString)
- [ ] Rate limiting implémenté (max 10 demandes/heure par user)
- [ ] Protection CSRF sur les formulaires
- [ ] Headers de sécurité configurés (CORS, CSP)

### Tests
- [ ] Tests unitaires passent (npm test)
- [ ] Tests d'intégration Supabase réussis
- [ ] Tests de paiement Stripe réussis
- [ ] Tests sur iOS réels (TestFlight)
- [ ] Tests sur Android réels (Play Store beta)
- [ ] Tests de notifications push
- [ ] Tests de navigation complète

---

## ✅ Monitoring & Observabilité

### Crash Reporting
- [ ] Sentry configuré et testé
- [ ] DSN Sentry ajouté dans .env
- [ ] Breadcrumbs configurés pour tracer les actions utilisateur
- [ ] Source maps uploadées pour stack traces lisibles

### Logging
- [ ] Logger service intégré dans tous les services critiques
- [ ] Logs structurés avec contexte (userId, action, screen)
- [ ] Métriques business trackées (demandes créées, devis envoyés, paiements)
- [ ] Alertes configurées pour erreurs critiques

### Analytics
- [ ] Google Analytics ou Mixpanel configuré
- [ ] Événements métier trackés (signup, demande_created, payment_succeeded)
- [ ] Funnel de conversion configuré (demande → devis → réservation → paiement)

---

## ✅ Performance & UX

### Optimisations
- [ ] Images optimisées (compression, webp si possible)
- [ ] Lazy loading des images (FastImage)
- [ ] Cache AsyncStorage pour données non-critiques
- [ ] Skeleton loaders ajoutés (demandes, devis, profils)
- [ ] Pagination sur listes longues (demandes, avis)
- [ ] Debounce sur recherche adresse (300ms)

### Offline Mode
- [ ] Détection de connexion réseau
- [ ] Messages d'erreur réseau user-friendly
- [ ] Retry automatique sur échec réseau
- [ ] Queue de synchronisation pour actions offline

---

## ✅ Notifications & Communication

### Push Notifications
- [ ] Expo Push Notifications configurées
- [ ] Token push sauvegardé en base (profiles.push_token)
- [ ] Notifications envoyées pour :
  - Nouveau devis reçu (client)
  - Nouveau message (client + photographe)
  - Réservation confirmée (client + photographe)
  - Paiement reçu (photographe)
  - Rappel J-1 avant prestation (client + photographe)

### Emails (optionnel)
- [ ] Service email configuré (SendGrid, Mailgun, ou Resend)
- [ ] Templates créés (confirmation réservation, reçu paiement)
- [ ] Emails transactionnels envoyés pour actions critiques

---

## ✅ Légal & Conformité

### RGPD
- [ ] Politique de confidentialité rédigée et affichée
- [ ] CGU rédigées et acceptées à l'inscription
- [ ] Consentement cookies si analytics web
- [ ] Droit à l'oubli implémenté (suppression compte)
- [ ] Export des données utilisateur disponible

### Paiements
- [ ] Mentions légales présentes
- [ ] Numéro SIRET de la plateforme visible
- [ ] Frais de service (15%) clairement affichés
- [ ] Reçus de paiement générés automatiquement
- [ ] Politique de remboursement affichée

---

## ✅ Déploiement

### iOS (App Store)
- [ ] Certificats Apple Developer configurés
- [ ] Bundle identifier unique (com.votre-entreprise.app)
- [ ] App Icon et Splash Screen configurés
- [ ] Screenshots préparés (tous les formats iPhone/iPad)
- [ ] Description App Store rédigée
- [ ] Build EAS iOS réussi
- [ ] TestFlight installé et testé par bêta-testeurs
- [ ] Review Apple soumise

### Android (Play Store)
- [ ] Package name unique (com.votre_entreprise.app)
- [ ] Keystore créé et sauvegardé
- [ ] App Icon et Splash Screen configurés
- [ ] Screenshots préparés (tous les formats)
- [ ] Description Play Store rédigée
- [ ] Build EAS Android réussi
- [ ] Play Store beta testée
- [ ] Review Google soumise

### Backend
- [ ] Backend déployé (Vercel, Railway, ou Supabase Edge Functions)
- [ ] Variables d'environnement configurées sur plateforme
- [ ] SSL/HTTPS actif
- [ ] Health check endpoint créé (/api/health)
- [ ] Monitoring actif (Vercel Analytics, Railway logs)

---

## ✅ Post-Lancement

### Support
- [ ] Email support configuré (support@votre-app.com)
- [ ] FAQ créée (questions fréquentes)
- [ ] Chat support intégré (Intercom, Crisp) - optionnel
- [ ] Process de gestion des bugs défini

### Marketing
- [ ] Landing page créée
- [ ] SEO optimisé
- [ ] Réseaux sociaux configurés
- [ ] Press kit préparé
- [ ] Campagne de lancement planifiée

### Métriques à suivre
- [ ] Nombre d'inscriptions (clients + photographes)
- [ ] Taux de conversion demande → réservation
- [ ] Panier moyen
- [ ] Taux de satisfaction (avis)
- [ ] Taux de rétention (D7, D30)

---

## 🚨 Erreurs à Éviter

### ❌ Ne JAMAIS faire en production
- ❌ Commiter le fichier .env dans Git
- ❌ Utiliser les clés Stripe test en production
- ❌ Désactiver RLS sur les tables Supabase
- ❌ Logger les données sensibles (mots de passe, tokens)
- ❌ Exposer les clés secrètes côté client (STRIPE_SECRET_KEY)
- ❌ Oublier de valider les inputs utilisateur
- ❌ Laisser des console.log() dans le code
- ❌ Déployer sans tester sur vrais devices

### ⚠️ Vérifications essentielles avant go-live
1. **Tester un paiement complet** : création demande → devis → réservation → paiement → transfert photographe
2. **Vérifier les permissions** : un client ne peut pas voir les demandes d'un autre
3. **Tester les notifications** : chaque événement déclenche bien une notif
4. **Vérifier les performances** : app fluide même avec 100+ demandes
5. **Tester le offline** : messages d'erreur clairs si pas de connexion

---

## 📞 Ressources Utiles

- **Supabase Dashboard** : https://app.supabase.com
- **Stripe Dashboard** : https://dashboard.stripe.com
- **Google Cloud Console** : https://console.cloud.google.com
- **Expo Dashboard** : https://expo.dev
- **Sentry Dashboard** : https://sentry.io

---

**Date de dernière mise à jour** : [À remplir]  
**Version de l'app** : [À remplir]  
**Responsable technique** : [À remplir]
