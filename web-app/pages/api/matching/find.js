import { supabase } from '../../../lib/supabaseClient';

/**
 * Matching API - Find matching photographers for a demande
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { demande_id, limit = 10 } = req.body;

    if (!demande_id) {
      return res.status(400).json({ error: 'demande_id requis' });
    }

    // Get demande details
    const { data: demande, error: demandeError } = await supabase
      .from('demandes_client')
      .select('*')
      .eq('id', demande_id)
      .single();

    if (demandeError || !demande) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    // Get all active photographers with profiles
    const { data: photographers, error: photoError } = await supabase
      .from('profiles')
      .select(`
        id,
        nom,
        email,
        avatar_url,
        profils_photographe(
          specialisations,
          rayon_deplacement_km,
          tarif_horaire,
          localisation,
          is_verified,
          note_moyenne,
          nombre_avis,
          portfolio_photos
        )
      `)
      .eq('role', 'photographe')
      .eq('is_active', true);

    if (photoError) throw photoError;

    // Calculate match scores
    const matches = photographers
      .filter(p => p.profils_photographe)
      .map(photographer => {
        const profile = photographer.profils_photographe;
        let score = 0;
        const matchReasons = [];

        // 1. Specialization match (40 points)
        if (profile.specialisations && demande.categorie) {
          const specialisations = Array.isArray(profile.specialisations) 
            ? profile.specialisations 
            : [profile.specialisations];
          
          if (specialisations.some(s => 
            s.toLowerCase().includes(demande.categorie.toLowerCase()) ||
            demande.categorie.toLowerCase().includes(s.toLowerCase())
          )) {
            score += 40;
            matchReasons.push('Spécialité correspondante');
          }
        }

        // 2. Location/radius (30 points)
        if (profile.rayon_deplacement_km) {
          if (profile.rayon_deplacement_km >= 50) {
            score += 30;
            matchReasons.push('Large zone de déplacement');
          } else if (profile.rayon_deplacement_km >= 20) {
            score += 20;
            matchReasons.push('Zone de déplacement moyenne');
          } else {
            score += 10;
          }
        }

        // 3. Budget compatibility (20 points)
        if (profile.tarif_horaire && demande.budget_max) {
          const estimatedCost = profile.tarif_horaire * (demande.duree_estimee || 2);
          
          if (estimatedCost <= demande.budget_max) {
            score += 20;
            matchReasons.push('Budget compatible');
          } else if (estimatedCost <= demande.budget_max * 1.2) {
            score += 10;
            matchReasons.push('Budget proche');
          }
        }

        // 4. Verification status (10 points)
        if (profile.is_verified) {
          score += 10;
          matchReasons.push('Photographe vérifié');
        }

        // Bonus: High rating
        if (profile.note_moyenne >= 4.5) {
          score += 5;
          matchReasons.push('Excellentes notes');
        }

        return {
          photographe: {
            id: photographer.id,
            nom: photographer.nom,
            avatar_url: photographer.avatar_url,
            ...profile,
          },
          matchScore: Math.min(score, 100),
          matchReasons,
        };
      })
      .filter(m => m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    // Save matches to database
    for (const match of matches) {
      await supabase
        .from('matchings')
        .upsert({
          demande_id: demande_id,
          photographe_id: match.photographe.id,
          particulier_id: demande.particulier_id,
          match_score: match.matchScore,
          match_reasons: match.matchReasons,
          status: 'pending',
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'demande_id,photographe_id',
        });
    }

    res.status(200).json({
      demande,
      matches,
      total: matches.length,
    });

  } catch (err) {
    console.error('Erreur matching:', err);
    res.status(500).json({ error: err.message });
  }
}
