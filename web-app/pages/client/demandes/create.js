import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { onNewDemande } from '../../../lib/matchingService';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import { getEventTypes, getPhotoStyles } from '../../../lib/photoTaxonomyService';
import { createDemande } from '../../../lib/demandeService';

import {
  ArrowLeft, Calendar, MapPin, Users, Clock, Euro,
  Sparkles, MessageSquare, Send
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
};

export default function CreateDemandePage() {
  const router = useRouter();
  const { profileId: authProfileId } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  // Taxonomie Supabase
  const [eventTypes, setEventTypes] = useState([]);
  const [photoStyles, setPhotoStyles] = useState([]);
  const [loadingTaxo, setLoadingTaxo] = useState(true);

  // Groupes de données
  const [formData, setFormData] = useState({
    type_evenement_id: '',
    date_souhaitee: new Date().toISOString().split('T')[0],
    heure: '09:00',
    lieu: '',
    ville: '',
    nb_personnes: '1',
    duree_estimee_heures: '2',
    budget_max: '',
    style_photo_id: '',
    commentaire: '',
  });

  // Charger la taxonomie au montage
  useEffect(() => {
    const init = async () => {
      setLoadingTaxo(true);
      try {
        const [types, styles] = await Promise.all([getEventTypes(), getPhotoStyles()]);
        setEventTypes(types || []);
        setPhotoStyles(styles || []);
      } catch (e) {
        console.error('Erreur chargement taxonomie:', e);
        setError('Impossible de charger les types d\'événements et styles photo');
      } finally {
        setLoadingTaxo(false);
      }
    };
    init();
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login?redirect=/client/demandes/create');
      } else {
        setUserId(session.user.id);
      }
    });
  }, [router]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!formData.type_evenement_id) {
      setError('Veuillez choisir le type d\'événement');
      return false;
    }
    if (!formData.date_souhaitee) {
      setError('Veuillez indiquer la date');
      return false;
    }
    if (!formData.lieu.trim()) {
      setError('Veuillez indiquer le lieu');
      return false;
    }
    if (!formData.ville.trim()) {
      setError('Veuillez indiquer la ville');
      return false;
    }
    const personnes = parseInt(formData.nb_personnes, 10);
    if (isNaN(personnes) || personnes < 1) {
      setError('Nombre de personnes invalide');
      return false;
    }
    const duree = parseFloat(formData.duree_estimee_heures);
    if (isNaN(duree) || duree < 1) {
      setError('Durée invalide');
      return false;
    }
    if (formData.budget_max && parseFloat(formData.budget_max) < 0) {
      setError('Budget invalide');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    const resolvedId = authProfileId || userId || (await supabase.auth.getSession()).data.session?.user?.id;
    if (!resolvedId) {
      setError('Vous devez être connecté pour créer une demande.');
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        clientId: resolvedId,
        type_evenement_id: formData.type_evenement_id,
        date_souhaitee: formData.date_souhaitee,
        lieu: formData.lieu.trim(),
        ville: formData.ville.trim(),
        nb_personnes: parseInt(formData.nb_personnes, 10),
        duree_estimee_heures: parseFloat(formData.duree_estimee_heures),
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        style_photo_id: formData.style_photo_id || null,
        commentaire: formData.commentaire.trim() || null,
      };

      const { data, error: createError } = await createDemande(payload);
      if (createError) throw createError;

      // Déclencher le matching
      try {
        await onNewDemande(data.id, data);
      } catch (matchingError) {
        console.warn('⚠️ Erreur matching (la demande est créée) :', matchingError);
      }

      // Naviguer vers les résultats de cette demande
      router.push(`/client/demandes/${data.id}`);
    } catch (e) {
      console.error('Erreur création demande:', e);
      setError('Impossible de créer la demande. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTaxo) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
        <Header />
        <div className="flex justify-center items-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: COLORS.accent }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      <Header />

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.accent }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.accent }}>
              Nouvelle demande photo
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Décrivez votre événement et recevez des propositions de photographes
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-7">
          {/* 1. Type d'événement */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <Calendar className="w-4 h-4" style={{ color: COLORS.accent }} />
              1. Type d'événement
            </label>
            <div className="flex flex-wrap gap-2">
              {eventTypes.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun type d'événement disponible</p>
              ) : (
                eventTypes.map((et) => (
                  <button
                    key={et.id}
                    type="button"
                    onClick={() => updateFormData('type_evenement_id', et.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      formData.type_evenement_id === et.id
                        ? 'text-white border-transparent'
                        : 'text-gray-700 border-gray-300 hover:border-indigo-400'
                    }`}
                    style={formData.type_evenement_id === et.id ? { backgroundColor: COLORS.accent } : {}}
                  >
                    {et.nom}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 2. Date / heure */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <Clock className="w-4 h-4" style={{ color: COLORS.accent }} />
              2. Date / heure
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={formData.date_souhaitee}
                onChange={(e) => updateFormData('date_souhaitee', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="time"
                value={formData.heure}
                onChange={(e) => updateFormData('heure', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 3. Lieu */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <MapPin className="w-4 h-4" style={{ color: COLORS.accent }} />
              3. Lieu
            </label>
            <input
              type="text"
              value={formData.lieu}
              onChange={(e) => updateFormData('lieu', e.target.value)}
              placeholder="Adresse de l'événement"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            />
            <input
              type="text"
              value={formData.ville}
              onChange={(e) => updateFormData('ville', e.target.value)}
              placeholder="Ville"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 4. Nombre de personnes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <Users className="w-4 h-4" style={{ color: COLORS.accent }} />
              4. Nombre de personnes
            </label>
            <input
              type="number"
              min="1"
              value={formData.nb_personnes}
              onChange={(e) => updateFormData('nb_personnes', e.target.value)}
              placeholder="Ex: 30"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 5. Heures de présence */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <Clock className="w-4 h-4" style={{ color: COLORS.accent }} />
              5. Heures de présence
            </label>
            <input
              type="number"
              min="1"
              step="0.5"
              value={formData.duree_estimee_heures}
              onChange={(e) => updateFormData('duree_estimee_heures', e.target.value)}
              placeholder="Ex: 4"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 6. Budget */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <Euro className="w-4 h-4" style={{ color: COLORS.accent }} />
              6. Budget maximum
            </label>
            <input
              type="number"
              min="0"
              value={formData.budget_max}
              onChange={(e) => updateFormData('budget_max', e.target.value)}
              placeholder="Ex: 3000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 7. Style photo */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <Sparkles className="w-4 h-4" style={{ color: COLORS.accent }} />
              7. Style photo
            </label>
            <div className="flex flex-wrap gap-2">
              {photoStyles.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun style photo disponible</p>
              ) : (
                photoStyles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => updateFormData('style_photo_id', style.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      formData.style_photo_id === style.id
                        ? 'text-white border-transparent'
                        : 'text-gray-700 border-gray-300 hover:border-indigo-400'
                    }`}
                    style={formData.style_photo_id === style.id ? { backgroundColor: COLORS.accent } : {}}
                  >
                    {style.nom}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 8. Commentaire */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <MessageSquare className="w-4 h-4" style={{ color: COLORS.accent }} />
              8. Commentaire
            </label>
            <textarea
              value={formData.commentaire}
              onChange={(e) => updateFormData('commentaire', e.target.value)}
              placeholder="Décrivez votre événement, vos attentes..."
              rows="4"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: COLORS.accent }}
            >
              {submitting ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? 'Création...' : 'Créer ma demande'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}