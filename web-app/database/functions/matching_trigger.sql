-- ============================================================
-- TRIGGER DE MATCHING AUTOMATIQUE — VERSION 5
-- ============================================================
-- Corrections v5 :
--   - Contrainte UNIQUE (demande_id, prestataire_id) créée explicitement
--     (la migration originale utilisait photographer_id/profils_photographe,
--      pas prestataire_id — donc ON CONFLICT échouait silencieusement)
--   - p_duree_heures : INTEGER → NUMERIC (correspond au type réel en base)
--   - notifications.user_id : utilisait p.auth_user_id (potentiellement NULL)
--     → corrigé : pp.id = profiles.id = auth.users.id (confirmé par AuthContext.js)
--   - SELECT épuré : suppression de p.auth_user_id (plus utilisé)
--   - RAISE WARNING enrichi avec SQLSTATE pour faciliter le debug
--
-- Schéma vérifié (schema_summary.json) :
--   profils_prestataire : id, specialisations, tarif_horaire_min, identite_verifiee,
--                         note_moyenne, statut_validation  (PAS de ville, statut, user_id)
--   profiles            : id (= auth UID), ville, auth_user_id
--   matchings           : demande_id, prestataire_id, match_score, status, created_at
--   notifications       : user_id, type, titre, contenu, demande_id, lu, created_at
--                         type utilisé : 'Mission suggerée' (titre: '🔥 Nouvelle demande qualifiée')
--                         notif envoyée uniquement si score >= 90, sans doublon
--
-- À exécuter dans : Supabase > SQL Editor
-- ============================================================


-- ============================================================
-- 1. NETTOYAGE
-- ============================================================
DROP TRIGGER IF EXISTS trigger_matching_on_new_demande ON demandes_client;
DROP FUNCTION IF EXISTS run_matching_on_new_demande();
DROP FUNCTION IF EXISTS compute_match_score(TEXT,TEXT,NUMERIC,NUMERIC,TEXT[],TEXT,NUMERIC,BOOLEAN,NUMERIC);
DROP FUNCTION IF EXISTS compute_match_score(TEXT,TEXT,NUMERIC,INTEGER,TEXT[],TEXT,NUMERIC,BOOLEAN,NUMERIC);


-- ============================================================
-- 2. CONTRAINTE UNIQUE sur matchings (nécessaire pour ON CONFLICT)
--    La migration originale avait photographer_id/profils_photographe,
--    pas prestataire_id → la contrainte n'existait probablement pas.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'matchings'::regclass
      AND contype = 'u'
      AND conname = 'matchings_demande_prestataire_unique'
  ) THEN
    ALTER TABLE matchings
      ADD CONSTRAINT matchings_demande_prestataire_unique
      UNIQUE (demande_id, prestataire_id);
  END IF;
END $$;


-- ============================================================
-- 3. FONCTION DE SCORING
-- Critères : spécialisation (40) + ville (30) + budget (20)
--            + vérification (10) + bonus note (5)
-- p_duree_heures en NUMERIC (correspond au type réel de duree_estimee_heures)
-- ============================================================
CREATE OR REPLACE FUNCTION compute_match_score(
  p_categorie       TEXT,
  p_ville           TEXT,
  p_budget_max      NUMERIC,
  p_duree_heures    NUMERIC,   -- NUMERIC (pas INTEGER) : correspond au type DB
  p_specialisations TEXT[],
  p_ville_presta    TEXT,
  p_tarif_min       NUMERIC,
  p_verifie         BOOLEAN,
  p_note_moyenne    NUMERIC
) RETURNS INTEGER AS $$
DECLARE
  score     INTEGER := 0;
  estimated NUMERIC;
BEGIN

  -- 1. Spécialisation (40 pts)
  IF p_specialisations IS NOT NULL AND p_categorie IS NOT NULL THEN
    IF p_categorie = ANY(p_specialisations) THEN
      score := score + 40;
    ELSIF EXISTS (
      SELECT 1 FROM unnest(p_specialisations) s
      WHERE lower(s) LIKE '%' || lower(p_categorie) || '%'
    ) THEN
      score := score + 20;
    END IF;
  END IF;

  -- 2. Ville (30 pts) — basé sur profiles.ville via JOIN
  IF p_ville IS NOT NULL AND p_ville_presta IS NOT NULL THEN
    IF lower(trim(p_ville)) = lower(trim(p_ville_presta)) THEN
      score := score + 30;
    ELSIF lower(p_ville_presta) LIKE '%' || lower(trim(p_ville)) || '%'
       OR lower(trim(p_ville))  LIKE '%' || lower(p_ville_presta)  || '%' THEN
      score := score + 15;
    END IF;
  ELSIF p_ville_presta IS NULL THEN
    score := score + 10; -- pas de ville renseignée : score neutre
  END IF;

  -- 3. Budget (20 pts)
  IF p_tarif_min IS NOT NULL AND p_budget_max IS NOT NULL THEN
    estimated := p_tarif_min * COALESCE(p_duree_heures, 2);
    IF estimated <= p_budget_max THEN
      score := score + 20;
    ELSIF estimated <= p_budget_max * 1.2 THEN
      score := score + 10;
    END IF;
  ELSIF p_tarif_min IS NULL THEN
    score := score + 15; -- tarif flexible
  END IF;

  -- 4. Vérification (10 pts)
  IF p_verifie = TRUE THEN
    score := score + 10;
  END IF;

  -- Bonus note (5 pts)
  IF p_note_moyenne IS NOT NULL AND p_note_moyenne >= 4.5 THEN
    score := score + 5;
  END IF;

  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- 4. FONCTION TRIGGER
-- - profiles.id = auth.users.id (confirmé par AuthContext.js ligne 36)
-- - notifications.user_id = pp.id (= profiles.id = auth UID)
-- - p.auth_user_id supprimé du SELECT (non utilisé, potentiellement NULL)
-- ============================================================
CREATE OR REPLACE FUNCTION run_matching_on_new_demande()
RETURNS TRIGGER AS $$
DECLARE
  presta     RECORD;
  calc_score INTEGER;
BEGIN

  FOR presta IN
    SELECT
      pp.id                AS presta_id,   -- = profiles.id = auth UID
      pp.specialisations,
      p.ville              AS ville,       -- ville depuis profiles (absent de profils_prestataire)
      pp.tarif_horaire_min,
      pp.identite_verifiee,
      pp.note_moyenne,
      pp.statut_validation
    FROM profils_prestataire pp
    JOIN profiles p ON p.id = pp.id        -- relation 1:1 confirmée par le schéma
    WHERE COALESCE(pp.statut_validation, '') != 'refuse'
  LOOP

    calc_score := compute_match_score(
      NEW.categorie,
      NEW.ville,
      NEW.budget_max,
      NEW.duree_estimee_heures,  -- NUMERIC en base → NUMERIC dans la fonction
      presta.specialisations,
      presta.ville,
      presta.tarif_horaire_min,
      presta.identite_verifiee,
      presta.note_moyenne
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
        NEW.id,
        presta.presta_id,
        calc_score,
        'pending',
        NOW()
      )
      ON CONFLICT ON CONSTRAINT matchings_demande_prestataire_unique
        DO UPDATE SET
          match_score = EXCLUDED.match_score,
          status      = 'pending';

      -- Notification in-app au prestataire (seulement si score >= 90, sans doublon)
      IF calc_score >= 90 THEN
        INSERT INTO notifications (
          user_id,
          type,
          titre,
          contenu,
          demande_id,
          lu,
          created_at
        )
        SELECT
          presta.presta_id,
          'Mission suggerée',
          '🔥 Nouvelle demande qualifiée',
          'Une nouvelle demande correspond à votre profil.',
          NEW.id,
          FALSE,
          NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id   = presta.presta_id
            AND type      = 'Mission suggerée'
            AND demande_id = NEW.id
        );
      END IF;

    END IF;

  END LOOP;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer l'INSERT du client, même si le matching échoue
  RAISE WARNING 'run_matching_on_new_demande ERREUR [%] : %', SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. TRIGGER
-- ============================================================
CREATE TRIGGER trigger_matching_on_new_demande
  AFTER INSERT ON demandes_client
  FOR EACH ROW
  EXECUTE FUNCTION run_matching_on_new_demande();


-- ============================================================
-- 6. VÉRIFICATION RAPIDE (à exécuter séparément si besoin)
-- ============================================================
-- Combien de prestataires sont disponibles pour le matching ?
-- SELECT COUNT(*) FROM profils_prestataire pp JOIN profiles p ON p.id = pp.id
-- WHERE COALESCE(pp.statut_validation, '') != 'refuse';

-- Contrainte bien créée ?
-- SELECT conname FROM pg_constraint WHERE conrelid = 'matchings'::regclass AND contype = 'u';

-- Derniers matchings créés :
-- SELECT * FROM matchings ORDER BY created_at DESC LIMIT 10;
