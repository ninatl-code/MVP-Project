import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { onUpdateDemande } from '../../../lib/matchingService';
import Header from '../../../components/HeaderParti';
import { categories} from '../../../constants/categories';
import { SPECIALITES_MAP } from '../../../constants/specialites';
import * as demandeService from '../../../lib/demandeService';

import {
  ArrowLeft, Calendar, MapPin, Clock, Users,
  Check, X, Info, Save
} from 'lucide-react';



export default function EditDemandePage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [villesList, setVillesList] = useState([]);
  const originalDataRef = useRef(null);

  const [formData, setFormData] = useState({
    titre: '',
    categorie: '',
    description: '',
    date_souhaitee: '',
    ville: '',
    lieu: '',
    duree_estimee: '2',
    budget_max: '',
    instructions_speciales: '',
    specialite: '',
    specialite_autre: '',
    langages_dev: '',
    matiere: '',
    niveau: '',
  });

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data, error: fetchError } = await demandeService.getDemandeById(id);

      if (fetchError || !data) {
        setError('Demande introuvable.');
        setLoading(false);
        return;
      }

      // Vérifier que c'est bien la demande de l'utilisateur
      if (data.client_id !== session.user.id) {
        router.push('/client/demandes');
        return;
      }

      // Vérifier que la demande est encore modifiable
      if (data.statut !== 'ouverte') {
        setError('Cette demande ne peut plus être modifiée.');
        setLoading(false);
        return;
      }

      const currentSpec = Array.isArray(data.type_prestation) ? data.type_prestation[0] || '' : data.type_prestation || '';
      const specs = SPECIALITES_MAP[data.categorie] || [];
      const isKnownSpec = specs.includes(currentSpec);
      const det = data.details || {};

      setFormData({
        titre: data.titre || '',
        categorie: data.categorie || '',
        description: data.description || '',
        date_souhaitee: data.date_souhaitee || '',
        ville: data.ville || '',
        lieu: data.lieu || '',
        duree_estimee: data.duree_estimee_heures?.toString() || '2',
        budget_max: data.budget_max?.toString() || '',
        instructions_speciales: data.instructions_speciales || '',
        specialite: isKnownSpec ? currentSpec : (currentSpec ? 'Autre' : ''),
        specialite_autre: isKnownSpec ? '' : currentSpec,
        langages_dev: det.langages || '',
        matiere: det.matiere || '',
        niveau: det.niveau || '',
      });
      originalDataRef.current = {
        type_prestation: data.type_prestation || null,
        ville: data.ville || null,
        date_souhaitee: data.date_souhaitee || null,
      };
      setLoading(false);
    };
    load();
  }, [id, router]);

  useEffect(() => {
    supabase.from('villes').select('id, ville').order('ville', { ascending: true })
      .then(({ data }) => setVillesList(data || []));
  }, []);

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const canSubmit = () =>
    formData.titre.trim() !== '' && formData.ville.trim() !== '' && formData.budget_max !== '' && formData.categorie !== '' && formData.description.trim() !== '' && formData.lieu.trim() !== '';

  const payload = {  titre: formData.titre,
          categorie: formData.categorie,
          description: formData.description || null,
          date_souhaitee: formData.date_souhaitee || null,
          ville: formData.ville,
          lieu: formData.lieu || null,
          duree_estimee_heures: parseInt(formData.duree_estimee) || null,
          budget_max: parseFloat(formData.budget_max) || null,
          instructions_speciales: formData.instructions_speciales || null,
          type_prestation: formData.specialite === 'Autre'
            ? [formData.specialite_autre?.trim() || 'Autre']
            : formData.specialite ? [formData.specialite] : null,
          details: (() => {
            const d = {};
            if (formData.specialite === 'Développement' && formData.langages_dev.trim()) d.langages = formData.langages_dev.trim();
            if (formData.specialite === 'Cours particuliers') {
              if (formData.matiere.trim()) d.matiere = formData.matiere.trim();
              if (formData.niveau.trim()) d.niveau = formData.niveau.trim();
            }
            return Object.keys(d).length > 0 ? d : null;
          })()
        };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await demandeService.updateDemande(id, payload);

      if (updateError) throw updateError;

      // Recompute matching scores after update (fire and forget)
      const newTypePrestation = formData.specialite === 'Autre'
        ? [formData.specialite_autre?.trim() || 'Autre']
        : formData.specialite ? [formData.specialite] : null;
      demandeService.updateDemande(id, originalDataRef.current, {
        type_prestation: newTypePrestation,
        ville: formData.ville,
        date_souhaitee: formData.date_souhaitee || null,
      });

      setSuccess(true);
      setTimeout(() => router.push(`/client/demandes/${id}`), 1500);
    } catch (err) {
      setError('Erreur : ' + (err.message || 'Une erreur est survenue.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error && !formData.titre) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => router.push('/client/demandes')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl">
            Retour aux demandes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.push(`/client/demandes/${id}`)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5" />
          Retour à la demande
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Modifier la demande</h1>
          <p className="text-gray-500 mt-1">Mettez à jour les informations de votre demande.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Catégorie */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Catégorie</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => update('categorie', cat.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.categorie === cat.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="text-2xl mb-1 block">{cat.icon}</span>
                  <h4 className="font-medium text-gray-900 text-sm">{cat.label}</h4>
                </button>
              ))}
            </div>
          </div>

          {/* Détails */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Détails</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titre *</label>
              <input
                type="text"
                value={formData.titre}
                onChange={(e) => update('titre', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Ex: Photographe pour mariage le 15 juin"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description <span className="text-red-500">*</span></label>
              <textarea
                value={formData.description}
                onChange={(e) => update('description', e.target.value)}
                rows={4}
                placeholder="Décrivez votre projet en détail..."
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {SPECIALITES_MAP[formData.categorie] && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Spécialité recherchée</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALITES_MAP[formData.categorie].map(spec => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => { update('specialite', spec); if (spec !== 'Autre') update('specialite_autre', ''); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                        formData.specialite === spec
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
                {formData.specialite === 'Autre' && (
                  <input
                    type="text"
                    value={formData.specialite_autre}
                    onChange={(e) => update('specialite_autre', e.target.value)}
                    placeholder="Précisez la spécialité..."
                    className="mt-3 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                )}
                {formData.specialite === 'Développement' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Langages de développement <span className="text-gray-400">(optionnel)</span></label>
                    <input
                      type="text"
                      value={formData.langages_dev}
                      onChange={(e) => update('langages_dev', e.target.value)}
                      placeholder="Ex : JavaScript, Python, React, PHP..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}
                {formData.specialite === 'Cours particuliers' && (
                  <div className="mt-3 grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Matière <span className="text-gray-400">(optionnel)</span></label>
                      <input
                        type="text"
                        value={formData.matiere}
                        onChange={(e) => update('matiere', e.target.value)}
                        placeholder="Ex : Mathématiques, Français..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Niveau <span className="text-gray-400">(optionnel)</span></label>
                      <input
                        type="text"
                        value={formData.niveau}
                        onChange={(e) => update('niveau', e.target.value)}
                        placeholder="Ex : CP, 3ème, Terminale, Bac+2..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date souhaitée
                </label>
                <input
                  type="date"
                  value={formData.date_souhaitee}
                  onChange={(e) => update('date_souhaitee', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Durée estimée (heures)
                </label>
                <select
                  value={formData.duree_estimee}
                  onChange={(e) => update('duree_estimee', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {[1,2,3,4,5,6,7,8,10,12].map(h => (
                    <option key={h} value={h}>{h} heure{h > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Ville de la prestation *
                </label>
                <input
                  type="text"
                  value={formData.ville}
                  onChange={(e) => update('ville', e.target.value)}
                  placeholder="Ex: Casablanca, Rabat..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Lieu exact <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lieu}
                  onChange={(e) => update('lieu', e.target.value)}
                  placeholder="Salle, adresse exacte..."
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions spécifiques (optionnel)</label>
              <textarea
                value={formData.instructions_speciales}
                onChange={(e) => update('instructions_speciales', e.target.value)}
                rows={3}
                placeholder="Contraintes particulières, style souhaité..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget</h2>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget maximum (DH) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">DH</span>
                <input
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => update('budget_max', e.target.value)}
                  placeholder="500"
                  min="0"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[150, 300, 500, 1000, 2000, 5000].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => update('budget_max', v.toString())}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    formData.budget_max === v.toString()
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {v} DH
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700">
              <X className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-green-700">
              <Check className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Demande mise à jour avec succès ! Redirection...</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => router.push(`/client/demandes/${id}`)}
              className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !canSubmit()}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Enregistrer les modifications
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
