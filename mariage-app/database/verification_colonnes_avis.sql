-- Script de vérification et correction des colonnes pour le système d'avis
-- 1. Vérifier la structure des tables
SELECT table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN (
        'notifications',
        'reservations',
        'commandes',
        'annonces',
        'avis'
    )
ORDER BY table_name,
    ordinal_position;
-- 2. Ajouter les colonnes manquantes à notifications (si elles n'existent pas)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS commande_id UUID REFERENCES commandes(id),
    ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id),
    ADD COLUMN IF NOT EXISTS annonce_id UUID REFERENCES annonces(id);
-- 3. Vérifier les données problématiques
-- Réservations avec annonce_id manquant ou invalide
SELECT r.id,
    r.annonce_id,
    a.id as annonce_exists
FROM reservations r
    LEFT JOIN annonces a ON r.annonce_id = a.id
WHERE r.annonce_id IS NULL
    OR a.id IS NULL;
-- Commandes avec annonce_id manquant ou invalide
SELECT c.id,
    c.annonce_id,
    a.id as annonce_exists
FROM commandes c
    LEFT JOIN annonces a ON c.annonce_id = a.id
WHERE c.annonce_id IS NULL
    OR a.id IS NULL;
-- 4. Vérifier la colonne prestataire dans annonces
SELECT id,
    prestataire,
    titre
FROM annonces
WHERE prestataire IS NULL
LIMIT 5;
-- 5. Corriger les notifications existantes (ajouter les IDs manquants)
-- Pour les réservations terminées
UPDATE notifications
SET reservation_id = r.id,
    annonce_id = r.annonce_id
FROM reservations r
WHERE notifications.type = 'avis'
    AND notifications.user_id = r.particulier_id
    AND r.status = 'finished'
    AND notifications.reservation_id IS NULL;
-- Pour les commandes livrées  
UPDATE notifications
SET commande_id = c.id,
    annonce_id = c.annonce_id
FROM commandes c
WHERE notifications.type = 'avis'
    AND notifications.user_id = c.particulier_id
    AND c.status = 'delivered'
    AND notifications.commande_id IS NULL;