import { supabase } from './supabaseClient';
import { notifyNewDemande } from './notificationService';

// ─────────────────────────────────────────────────────────
// SCORE MATCHING
// ─────────────────────────────────────────────────────────
export const calculateMatchScore = (demande, prestataire) => {
  let score = 0;
  const matchReasons = [];

  const demandeSpecs = Array.isArray(demande.type_prestation)
    ? demande.type_prestation.filter(Boolean)
    : demande.type_prestation
      ? [demande.type_prestation]
      : [];

  const fallbackSpecs = demandeSpecs.length > 0
    ? demandeSpecs
    : demande.categorie
      ? [demande.categorie]
      : [];

  const prestaSpecs = Array.isArray(prestataire.specialisations)
    ? prestataire.specialisations.filter(Boolean)
    : prestataire.specialisations
      ? [prestataire.specialisations]
      : [];

  // 1. spécialité obligatoire (+55)
  const matchedSpec = fallbackSpecs.find(spec =>
    prestaSpecs.some(ps =>
      ps.toLowerCase() === spec.toLowerCase() ||
      ps.toLowerCase().includes(spec.toLowerCase()) ||
      spec.toLowerCase().includes(ps.toLowerCase())
    )
  );

  if (!matchedSpec) return { score: 0, matchReasons: [] };

  score += 55;
  matchReasons.push(`Même spécialité : ${matchedSpec} (+55)`);

  // 2. ville (+35)
  if (demande.ville && prestataire.ville) {
    if (
      demande.ville.toLowerCase().trim() ===
      prestataire.ville.toLowerCase().trim()
    ) {
      score += 35;
      matchReasons.push(`Même ville : ${demande.ville} (+35)`);
    }
  }

  // 3. disponibilité supprimée → bonus fixe (+10)
  score += 10;
  matchReasons.push(`Bonus disponibilité système (+10)`);

  return {
    score: Math.min(score, 100),
    matchReasons
  };
};

// ─────────────────────────────────────────────────────────
// UI COLOR
// ─────────────────────────────────────────────────────────
export const getMatchScoreColor = (score) => {
  if (score >= 90) return 'green';
  if (score >= 65) return 'orange';
  return 'gray';
};

// ─────────────────────────────────────────────────────────
// TRIGGER: NEW DEMANDE
// ─────────────────────────────────────────────────────────
export const onNewDemande = async (demandeId, demandeData) => {
  try {
    let demande = demandeData;

    if (!demande.type_prestation && !demande.categorie) {
      const { data } = await supabase
        .from('demandes_client')
        .select('*')
        .eq('id', demandeId)
        .single();

      if (data) demande = data;
    }

    const { data: prestataires } = await supabase
      .from('profils_prestataire')
      .select('id, specialisations');

    if (!prestataires?.length) return { error: null };

    // récupérer villes depuis profiles (source unique)
    const { data: profilesVille } = await supabase
      .from('profiles')
      .select('id, ville')
      .in('id', prestataires.map(p => p.id));

    const villeMap = Object.fromEntries(
      (profilesVille || []).map(p => [p.id, p.ville])
    );

    const scored = prestataires.map(p => {
      const prestataire = {
        ...p,
        ville: villeMap[p.id] || null
      };

      const { score, matchReasons } = calculateMatchScore(demande, prestataire);

      return {
        prestataire_id: p.id,
        score,
        matchReasons
      };
    });

    const toInsert = scored.filter(m => m.score >= 55);

    if (!toInsert.length) return { error: null };

    await supabase
      .from('matchings')
      .delete()
      .eq('demande_id', demandeId);

    const { error: insertError } = await supabase
      .from('matchings')
      .insert(
        toInsert.map(m => ({
          demande_id: demandeId,
          prestataire_id: m.prestataire_id,
          match_score: m.score,
          match_reasons: m.matchReasons,
          status: 'pending'
        }))
      );

    if (insertError) throw insertError;

    // notifications ≥ 90
    await Promise.all(
      toInsert
        .filter(m => m.score >= 90)
        .map(async (m) => {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', m.prestataire_id)
            .eq('type', 'mission_suggeree')
            .eq('demande_id', demandeId)
            .maybeSingle();

          if (!existing) {
            await notifyNewDemande(m.prestataire_id, demandeId);
          }
        })
    );

    return { error: null };
  } catch (error) {
    console.error('[onNewDemande]', error);
    return { error };
  }
};

// ─────────────────────────────────────────────────────────
// UPDATE DEMANDE
// ─────────────────────────────────────────────────────────
export const onUpdateDemande = async (demandeId, oldData, newData) => {
  const changed =
    JSON.stringify(oldData.type_prestation) !== JSON.stringify(newData.type_prestation) ||
    oldData.ville !== newData.ville ||
    oldData.date_souhaitee !== newData.date_souhaitee;

  if (!changed) return { error: null };

  try {
    await supabase
      .from('matchings')
      .delete()
      .eq('demande_id', demandeId);

    return await onNewDemande(demandeId, newData);
  } catch (error) {
    console.error('[onUpdateDemande]', error);
    return { error };
  }
};

// ─────────────────────────────────────────────────────────
// NEW PRESTATAIRE
// ─────────────────────────────────────────────────────────
export const onNewPrestataire = async (prestataireId, prestataireData) => {
  try {
    const specs = Array.isArray(prestataireData.specialisations)
      ? prestataireData.specialisations.filter(Boolean)
      : prestataireData.specialisations
        ? [prestataireData.specialisations]
        : [];

    if (!specs.length) return { error: null };

    let ville = prestataireData.ville;

    if (!ville) {
      const { data } = await supabase
        .from('profiles')
        .select('ville')
        .eq('id', prestataireId)
        .maybeSingle();

      ville = data?.ville || null;
    }

    const presta = { ...prestataireData, ville };

    const { data: demandes } = await supabase
      .from('demandes_client')
      .select('*')
      .eq('statut', 'ouverte');

    if (!demandes?.length) return { error: null };

    const now = new Date();

    const scored = demandes
      .filter(d => !d.date_souhaitee || new Date(d.date_souhaitee) >= now)
      .map(d => {
        const { score, matchReasons } = calculateMatchScore(d, presta);

        return {
          demande_id: d.id,
          score,
          matchReasons
        };
      });

    const toInsert = scored.filter(m => m.score >= 55);

    if (!toInsert.length) return { error: null };

    await supabase
      .from('matchings')
      .delete()
      .eq('prestataire_id', prestataireId);

    const { error: insertError } = await supabase
      .from('matchings')
      .insert(
        toInsert.map(m => ({
          demande_id: m.demande_id,
          prestataire_id: prestataireId,
          match_score: m.score,
          match_reasons: m.matchReasons,
          status: 'pending'
        }))
      );

    if (insertError) throw insertError;

    const top = toInsert.filter(m => m.score >= 90);

    if (top.length) {
      const { data: already } = await supabase
        .from('notifications')
        .select('demande_id')
        .eq('user_id', prestataireId)
        .eq('type', 'mission_suggeree')
        .in('demande_id', top.map(m => m.demande_id));

      const alreadySet = new Set((already || []).map(n => n.demande_id));

      await Promise.all(
        top
          .filter(m => !alreadySet.has(m.demande_id))
          .map(m => notifyNewDemande(prestataireId, m.demande_id))
      );
    }

    return { error: null };
  } catch (error) {
    console.error('[onNewPrestataire]', error);
    return { error };
  }
};

// ─────────────────────────────────────────────────────────
// UPDATE PRESTATAIRE
// ─────────────────────────────────────────────────────────
export const onUpdatePrestataire = async (prestataireId, oldData, newData) => {
  const changed =
    JSON.stringify(oldData.specialisations) !== JSON.stringify(newData.specialisations) ||
    oldData.ville !== newData.ville;

  if (!changed) return { error: null };

  try {
    await supabase
      .from('matchings')
      .delete()
      .eq('prestataire_id', prestataireId);

    return await onNewPrestataire(prestataireId, newData);
  } catch (error) {
    console.error('[onUpdatePrestataire]', error);
    return { error };
  }
};