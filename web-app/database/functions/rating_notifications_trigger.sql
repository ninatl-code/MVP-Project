-- =====================================
-- SYSTÈME DE NOTIFICATIONS AUTOMATIQUE
-- =====================================
-- Remplace le système CRON par des triggers PostgreSQL automatiques
-- Se déclenche instantanément quand une commande devient 'delivered'
-- 1. Fonction pour créer une notification de rating automatiquement
-- Adaptée pour utiliser la table 'avis' existante avec ses colonnes
CREATE OR REPLACE FUNCTION create_rating_notification() RETURNS TRIGGER AS $$
DECLARE commande_info RECORD;
prestataire_info RECORD;
existing_avis RECORD;
BEGIN -- Vérifier si le statut change vers 'delivered'
IF NEW.status = 'delivered'
AND (
    OLD.status IS NULL
    OR OLD.status != 'delivered'
) THEN -- Récupérer les informations de la commande
SELECT c.id,
    c.particulier_id,
    c.annonce_id,
    a.titre as annonce_titre,
    a.prestataire as prestataire_id INTO commande_info
FROM commandes c
    JOIN annonces a ON c.annonce_id = a.id
WHERE c.id = NEW.id;
-- Vérifier qu'un avis n'existe pas déjà pour cette commande/particulier
SELECT id INTO existing_avis
FROM avis
WHERE particulier_id = commande_info.particulier_id
    AND prestataire_id = commande_info.prestataire_id;
-- Ne créer la notification que s'il n'y a pas encore d'avis
IF existing_avis.id IS NULL THEN -- Récupérer le nom du prestataire
SELECT nom INTO prestataire_info
FROM profiles
WHERE id = commande_info.prestataire_id;
-- Créer la notification de demande de rating
INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        commande_id,
        annonce_id,
        lu,
        created_at,
        updated_at
    )
VALUES (
        commande_info.particulier_id,
        'rating_request',
        'Commande reçue ! 📦',
        format(
            'Votre commande "%s" chez %s est arrivée ! Partagez votre avis pour aider la communauté.',
            commande_info.annonce_titre,
            COALESCE(prestataire_info.nom, 'le prestataire')
        ),
        NEW.id,
        commande_info.annonce_id,
        false,
        NOW(),
        NOW()
    );
-- Ajouter un log pour debug
RAISE LOG 'Notification de rating créée pour commande % (utilisateur %)',
NEW.id,
commande_info.particulier_id;
ELSE RAISE LOG 'Avis déjà existant pour particulier % et prestataire %, pas de notification créée',
commande_info.particulier_id,
commande_info.prestataire_id;
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 2. Créer le trigger sur la table commandes
DROP TRIGGER IF EXISTS trigger_rating_notification_on_delivery ON commandes;
CREATE TRIGGER trigger_rating_notification_on_delivery
AFTER
UPDATE OF status ON commandes FOR EACH ROW
    WHEN (NEW.status = 'delivered') EXECUTE FUNCTION create_rating_notification();
-- 3. Fonction similaire pour les réservations (optionnel)
-- Se déclenche 4h après la date de réservation
CREATE OR REPLACE FUNCTION create_reservation_rating_notification() RETURNS TRIGGER AS $$
DECLARE reservation_info RECORD;
prestataire_info RECORD;
time_diff INTERVAL;
BEGIN -- Calculer la différence de temps depuis la date de réservation
time_diff := NOW() - NEW.date;
-- Si la réservation s'est terminée il y a plus de 4 heures
-- ET qu'aucune notification n'a été envoyée
IF time_diff > INTERVAL '4 hours'
AND (
    NEW.notified_for_rating IS NULL
    OR NEW.notified_for_rating = false
) THEN -- Récupérer les informations de la réservation
SELECT r.id,
    r.particulier_id,
    r.annonce_id,
    a.titre as annonce_titre,
    a.prestataire as prestataire_id INTO reservation_info
FROM reservations r
    JOIN annonces a ON r.annonce_id = a.id
WHERE r.id = NEW.id;
-- Récupérer le nom du prestataire
SELECT nom INTO prestataire_info
FROM profiles
WHERE id = reservation_info.prestataire_id;
-- Créer la notification
INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        reservation_id,
        annonce_id,
        lu,
        created_at,
        updated_at
    )
VALUES (
        reservation_info.particulier_id,
        'rating_request',
        'Réservation terminée ! ⭐',
        format(
            'Votre réservation "%s" chez %s s''est bien passée ? Partagez votre expérience !',
            reservation_info.annonce_titre,
            COALESCE(prestataire_info.nom, 'le prestataire')
        ),
        NEW.id,
        reservation_info.annonce_id,
        false,
        NOW(),
        NOW()
    );
-- Marquer comme notifié
UPDATE reservations
SET notified_for_rating = true,
    updated_at = NOW()
WHERE id = NEW.id;
RAISE LOG 'Notification de rating créée pour réservation % (utilisateur %)',
NEW.id,
reservation_info.particulier_id;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 4. Trigger pour les réservations (vérifie périodiquement)
-- Note: Ce trigger se déclenche sur les updates, vous pourriez avoir besoin
-- d'un CRON job simple pour mettre à jour les réservations anciennes une fois par jour
DROP TRIGGER IF EXISTS trigger_reservation_rating_notification ON reservations;
CREATE TRIGGER trigger_reservation_rating_notification
AFTER
UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION create_reservation_rating_notification();
-- =====================================
-- ACTIVATION ET TESTS
-- =====================================
-- Pour tester le système, vous pouvez :
-- 1. Marquer une commande comme livrée :
--    UPDATE commandes SET status = 'delivered' WHERE id = [ID_COMMANDE];
-- 
-- 2. Vérifier qu'une notification a été créée :
--    SELECT * FROM notifications WHERE type = 'rating_request' ORDER BY created_at DESC LIMIT 5;
-- =====================================
-- COMMENT L'UTILISER
-- =====================================
-- 1. Exécutez ce script dans votre console Supabase SQL
-- 2. Supprimez l'ancien appel API de notification dans votre code frontend
-- 3. Les notifications se créeront automatiquement !
COMMENT ON FUNCTION create_rating_notification() IS 'Fonction trigger qui crée automatiquement une notification de rating quand une commande devient delivered';
COMMENT ON FUNCTION create_reservation_rating_notification() IS 'Fonction trigger qui crée automatiquement une notification de rating 4h après une réservation';