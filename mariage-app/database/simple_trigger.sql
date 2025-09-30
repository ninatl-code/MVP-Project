-- =====================================
-- TRIGGER AVANCÉ - Commandes ET Réservations
-- =====================================
-- Fonction pour les commandes (delivered)
CREATE OR REPLACE FUNCTION create_avis_notification_commande() RETURNS TRIGGER AS $$
DECLARE commande_info RECORD;
prestataire_nom TEXT;
existing_avis RECORD;
BEGIN -- Quand une commande devient 'delivered'
IF NEW.status = 'delivered'
AND (
    OLD.status IS NULL
    OR OLD.status != 'delivered'
) THEN -- Récupérer infos commande + annonce
SELECT c.id,
    c.particulier_id,
    c.annonce_id,
    a.titre as annonce_titre,
    a.prestataire as prestataire_id INTO commande_info
FROM commandes c
    JOIN annonces a ON c.annonce_id = a.id
WHERE c.id = NEW.id;
-- Vérifier si avis existe déjà pour cette commande
SELECT id INTO existing_avis
FROM avis
WHERE commande_id = commande_info.id;
-- Si pas d'avis, créer notification
IF existing_avis.id IS NULL THEN -- Nom du prestataire
SELECT nom INTO prestataire_nom
FROM profiles
WHERE id = commande_info.prestataire_id;
-- Insertion notification type = 'avis'
INSERT INTO notifications (user_id, type, contenu, lu, created_at)
VALUES (
        commande_info.particulier_id,
        'avis',
        format(
            '🎉 Votre commande "%s" chez %s est arrivée ! Partagez votre avis pour aider la communauté.',
            commande_info.annonce_titre,
            COALESCE(prestataire_nom, 'le prestataire')
        ),
        false,
        NOW()
    );
RAISE LOG 'Notification avis créée pour commande % → utilisateur %',
NEW.id,
commande_info.particulier_id;
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Fonction pour les réservations (finished)
CREATE OR REPLACE FUNCTION create_avis_notification_reservation() RETURNS TRIGGER AS $$
DECLARE reservation_info RECORD;
prestataire_nom TEXT;
existing_avis RECORD;
BEGIN -- Quand une réservation devient 'finished'
IF NEW.status = 'finished'
AND (
    OLD.status IS NULL
    OR OLD.status != 'finished'
) THEN -- Récupérer infos réservation + annonce
SELECT r.id,
    r.particulier_id,
    r.annonce_id,
    a.titre as annonce_titre,
    a.prestataire as prestataire_id INTO reservation_info
FROM reservations r
    JOIN annonces a ON r.annonce_id = a.id
WHERE r.id = NEW.id;
-- Vérifier si avis existe déjà pour cette réservation
SELECT id INTO existing_avis
FROM avis
WHERE reservation_id = reservation_info.id;
-- Si pas d'avis, créer notification
IF existing_avis.id IS NULL THEN -- Nom du prestataire
SELECT nom INTO prestataire_nom
FROM profiles
WHERE id = reservation_info.prestataire_id;
-- Insertion notification type = 'avis'
INSERT INTO notifications (user_id, type, contenu, lu, created_at)
VALUES (
        reservation_info.particulier_id,
        'avis',
        format(
            '✨ Votre réservation "%s" chez %s est terminée ! Partagez votre avis pour aider la communauté.',
            reservation_info.annonce_titre,
            COALESCE(prestataire_nom, 'le prestataire')
        ),
        false,
        NOW()
    );
RAISE LOG 'Notification avis créée pour réservation % → utilisateur %',
NEW.id,
reservation_info.particulier_id;
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Créer les triggers
DROP TRIGGER IF EXISTS trigger_avis_notification_commande ON commandes;
DROP TRIGGER IF EXISTS trigger_avis_notification_reservation ON reservations;
CREATE TRIGGER trigger_avis_notification_commande
AFTER
UPDATE OF status ON commandes FOR EACH ROW
    WHEN (NEW.status = 'delivered') EXECUTE FUNCTION create_avis_notification_commande();
CREATE TRIGGER trigger_avis_notification_reservation
AFTER
UPDATE OF status ON reservations FOR EACH ROW
    WHEN (NEW.status = 'finished') EXECUTE FUNCTION create_avis_notification_reservation();
-- Commentaires
COMMENT ON FUNCTION create_avis_notification_commande() IS 'Notification avis quand commande = delivered';
COMMENT ON FUNCTION create_avis_notification_reservation() IS 'Notification avis quand reservation = finished';
-- =====================================
-- TRIGGER POUR RECALCULER LES MOYENNES
-- =====================================
-- Fonction pour recalculer la moyenne d'une annonce
CREATE OR REPLACE FUNCTION update_annonce_rate() RETURNS TRIGGER AS $$
DECLARE annonce_id_to_update UUID;
moyenne_note NUMERIC;
BEGIN -- Récupérer l'ID de l'annonce à partir de la commande ou réservation
IF NEW.commande_id IS NOT NULL THEN
SELECT annonce_id INTO annonce_id_to_update
FROM commandes
WHERE id = NEW.commande_id;
ELSIF NEW.reservation_id IS NOT NULL THEN
SELECT annonce_id INTO annonce_id_to_update
FROM reservations
WHERE id = NEW.reservation_id;
END IF;
-- Si on a trouvé une annonce, calculer la nouvelle moyenne
IF annonce_id_to_update IS NOT NULL THEN -- Calculer la moyenne des avis pour cette annonce
SELECT AVG(note) INTO moyenne_note
FROM avis a
    LEFT JOIN commandes c ON a.commande_id = c.id
    LEFT JOIN reservations r ON a.reservation_id = r.id
WHERE (
        c.annonce_id = annonce_id_to_update
        OR r.annonce_id = annonce_id_to_update
    )
    AND note IS NOT NULL;
-- Mettre à jour le rate de l'annonce
IF moyenne_note IS NOT NULL THEN
UPDATE annonces
SET rate = ROUND(moyenne_note::numeric, 1)
WHERE id = annonce_id_to_update;
RAISE LOG 'Rate annonce % mis à jour: %',
annonce_id_to_update,
ROUND(moyenne_note::numeric, 1);
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Fonction pour recalculer la moyenne d'un prestataire
CREATE OR REPLACE FUNCTION update_prestataire_rate() RETURNS TRIGGER AS $$
DECLARE prestataire_id_to_update UUID;
moyenne_annonces NUMERIC;
BEGIN -- Récupérer l'ID du prestataire
prestataire_id_to_update := NEW.prestataire_id;
-- Calculer la moyenne des rates des annonces du prestataire
SELECT AVG(rate) INTO moyenne_annonces
FROM annonces
WHERE prestataire = prestataire_id_to_update
    AND rate IS NOT NULL
    AND rate > 0;
-- Mettre à jour le rate du prestataire
IF moyenne_annonces IS NOT NULL THEN
UPDATE profiles
SET rate = ROUND(moyenne_annonces::numeric, 1)
WHERE id = prestataire_id_to_update;
RAISE LOG 'Rate prestataire % mis à jour: %',
prestataire_id_to_update,
ROUND(moyenne_annonces::numeric, 1);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Créer les triggers pour les moyennes
DROP TRIGGER IF EXISTS trigger_update_annonce_rate ON avis;
DROP TRIGGER IF EXISTS trigger_update_prestataire_rate ON avis;
CREATE TRIGGER trigger_update_annonce_rate
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON avis FOR EACH ROW EXECUTE FUNCTION update_annonce_rate();
CREATE TRIGGER trigger_update_prestataire_rate
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON avis FOR EACH ROW EXECUTE FUNCTION update_prestataire_rate();
-- Commentaires
COMMENT ON FUNCTION update_annonce_rate() IS 'Recalcule automatiquement le rate des annonces';
COMMENT ON FUNCTION update_prestataire_rate() IS 'Recalcule automatiquement le rate des prestataires';
SELECT '🎯 Triggers d''avis installés pour commandes ET réservations !' as message;
SELECT '📊 Triggers de calcul automatique des moyennes installés !' as message;