-- ============================================================
-- TRIGGER DE MATCHING INVERSE — prestataire → demandes ouvertes
-- Déclenché quand un prestataire s'inscrit ou met à jour son profil
-- ============================================================
-- Scénario couvert :
--   Un prestataire crée/met à jour son profil profils_prestataire
--   → on cherche toutes les demandes ouvertes qui matchent
--   → on insère les matchings et on notifie le client
--
-- Dépendances :
--   - compute_match_score() → déjà créée par matching_trigger.sql
--   - Contrainte UNIQUE matchings_demande_prestataire_unique → déjà créée
--   - Tables : demandes_client, matchings, notifications, profiles
-- ============================================================


-- ============================================================
-- 1. NETTOYAGE
-- ============================================================
DROP TRIGGER IF EXISTS trigger_matching_on_new_prestataire ON profils_prestataire;
DROP FUNCTION IF EXISTS run_matching_on_new_prestataire();


-- ============================================================
-- 2. FONCTION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION run_matching_on_new_prestataire()
RETURNS TRIGGER AS $$
DECLARE
  demande     RECORD;
  calc_score  INTEGER;
  ville_presta TEXT;
BEGIN

  -- Récupérer la ville du prestataire depuis profiles (absent de profils_prestataire)
  SELECT p.ville INTO ville_presta
  FROM profiles p
  WHERE p.id = NEW.id;

  -- Ne pas matcher les prestataires refusés
  IF COALESCE(NEW.statut_validation, '') = 'refuse' THEN
    RETURN NEW;
  END IF;

  -- Parcourir toutes les demandes ouvertes
  FOR demande IN
    SELECT
      dc.id,
      dc.titre,
      dc.categorie,
      dc.ville,
      dc.budget_max,
      dc.duree_estimee_heures,
      dc.client_id
    FROM demandes_client dc
    WHERE dc.statut = 'ouverte'
  LOOP

    calc_score := compute_match_score(
      demande.categorie,
      demande.ville,
      demande.budget_max,
      demande.duree_estimee_heures,
      NEW.specialisations,
      ville_presta,
      NEW.tarif_horaire_min,
      NEW.identite_verifiee,
      NEW.note_moyenne
    );

    IF calc_score >= 30 THEN

      -- Insérer / mettre à jour le matching
      INSERT INTO matchings (
        demande_id,
        prestataire_id,
        match_score,
        status,
        created_at
      )
      VALUES (
        demande.id,
        NEW.id,
        calc_score,
        'pending',
        NOW()
      )
      ON CONFLICT ON CONSTRAINT matchings_demande_prestataire_unique
        DO UPDATE SET
          match_score = EXCLUDED.match_score,
          status      = 'pending';

      -- Notification au prestataire : demande qui correspond à son profil
      INSERT INTO notifications (
        user_id,
        type,
        titre,
        contenu,
        demande_id,
        lu,
        created_at
      )
      VALUES (
        NEW.id,
        'nouveau_matching',
        'Demande correspondant à votre profil',
        'Un client recherche un prestataire dans votre ville pour : '
          || COALESCE(demande.titre, demande.categorie, 'une prestation'),
        demande.id,
        FALSE,
        NOW()
      )
      -- Éviter les doublons de notif si le trigger se re-déclenche (UPDATE du profil)
      ON CONFLICT DO NOTHING;

    END IF;

  END LOOP;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'run_matching_on_new_prestataire ERREUR [%] : %', SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. TRIGGER
-- Se déclenche sur INSERT (nouvelle inscription)
-- et UPDATE des colonnes qui influencent le matching
-- ============================================================
CREATE TRIGGER trigger_matching_on_new_prestataire
  AFTER INSERT OR UPDATE OF specialisations, tarif_horaire_min, identite_verifiee, statut_validation
  ON profils_prestataire
  FOR EACH ROW
  EXECUTE FUNCTION run_matching_on_new_prestataire();


-- ============================================================
-- 4. VÉRIFICATION
-- ============================================================
-- Trigger bien créé ?
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'profils_prestataire'::regclass;

-- Matchings créés pour un prestataire spécifique :
-- SELECT * FROM matchings WHERE prestataire_id = '<uuid>' ORDER BY created_at DESC;

-- Notifications envoyées :
-- SELECT * FROM notifications WHERE user_id = '<uuid>' AND type = 'nouveau_matching';
