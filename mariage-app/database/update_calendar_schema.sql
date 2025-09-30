-- Script de mise à jour pour le calendrier moderne
-- À exécuter dans Supabase SQL Editor si nécessaire
-- 1. Mise à jour de la table profiles pour ajouter le role si pas déjà fait
DO $$ BEGIN -- Vérifier si la colonne role existe, sinon l'ajouter
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'role'
) THEN
ALTER TABLE profiles
ADD COLUMN role VARCHAR(20) DEFAULT 'particulier';
END IF;
END $$;
-- 2. Mise à jour de la table profiles pour renommer phone en telephone si nécessaire
DO $$ BEGIN -- Vérifier si la colonne phone existe et telephone n'existe pas
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'phone'
)
AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'telephone'
) THEN
ALTER TABLE profiles
    RENAME COLUMN phone TO telephone;
END IF;
END $$;
-- 3. Mise à jour des politiques RLS si nécessaire
-- Politique pour permettre aux prestataires de créer des profils clients
DO $$ BEGIN -- Supprimer la politique existante si elle existe
DROP POLICY IF EXISTS "Prestataires can create client profiles" ON profiles;
-- Créer la nouvelle politique
CREATE POLICY "Prestataires can create client profiles" ON profiles FOR
INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND role = 'particulier'
    );
END $$;
-- 4. Vérification des index pour les performances
-- Index pour les recherches de reservations par prestataire et date
CREATE INDEX IF NOT EXISTS idx_reservations_prestataire_date ON reservations(prestataire_id, date);
-- Index pour les recherches de blocked_slots par prestataire et date
CREATE INDEX IF NOT EXISTS idx_blocked_slots_prestataire_date ON blocked_slots(prestataire_id, date);
-- Index pour les annonces actives par prestataire
CREATE INDEX IF NOT EXISTS idx_annonces_prestataire_actif ON annonces(prestataire, actif)
WHERE actif = true;
-- 5. Fonction pour nettoyer automatiquement les anciens créneaux bloqués (optionnel)
CREATE OR REPLACE FUNCTION cleanup_old_blocked_slots() RETURNS void LANGUAGE plpgsql AS $$ BEGIN -- Supprimer les créneaux bloqués de plus de 6 mois
DELETE FROM blocked_slots
WHERE date < NOW() - INTERVAL '6 months';
END;
$$;
-- Commentaires sur l'utilisation
COMMENT ON FUNCTION cleanup_old_blocked_slots() IS 'Fonction pour nettoyer automatiquement les anciens créneaux bloqués. 
Peut être appelée manuellement ou via un cron job.';
-- 6. Vue pour les statistiques rapides du prestataire
CREATE OR REPLACE VIEW prestataire_stats AS
SELECT p.id as prestataire_id,
    COUNT(
        CASE
            WHEN r.status = 'confirmed' THEN 1
        END
    ) as reservations_confirmees,
    COUNT(
        CASE
            WHEN r.status = 'pending' THEN 1
        END
    ) as reservations_en_attente,
    COUNT(bs.id) as creneaux_bloques,
    COALESCE(
        SUM(
            CASE
                WHEN r.status = 'confirmed' THEN r.montant
            END
        ),
        0
    ) as chiffre_affaires
FROM auth.users p
    LEFT JOIN reservations r ON r.prestataire_id = p.id
    AND r.date >= date_trunc('month', CURRENT_DATE)
    AND r.status != 'cancelled'
    LEFT JOIN blocked_slots bs ON bs.prestataire_id = p.id
    AND bs.date >= date_trunc('month', CURRENT_DATE)
GROUP BY p.id;
COMMENT ON VIEW prestataire_stats IS 'Vue pour obtenir rapidement les statistiques mensuelles des prestataires';
-- 7. Politique RLS pour la vue des statistiques
DROP POLICY IF EXISTS "Prestataires can view their stats" ON prestataire_stats;
CREATE POLICY "Prestataires can view their stats" ON prestataire_stats FOR
SELECT USING (prestataire_id = auth.uid());
ALTER TABLE prestataire_stats ENABLE ROW LEVEL SECURITY;
-- 8. Trigger pour mettre à jour automatiquement la colonne updated_at des annonces
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Créer le trigger si il n'existe pas déjà
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_annonces_updated_at'
) THEN CREATE TRIGGER update_annonces_updated_at BEFORE
UPDATE ON annonces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF;
END $$;
-- Informations finales
SELECT 'Mise à jour du schéma terminée. Le calendrier est maintenant prêt à fonctionner!' as message;