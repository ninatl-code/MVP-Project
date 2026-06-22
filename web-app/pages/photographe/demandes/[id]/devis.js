import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import Header from '../../../../components/HeaderPresta';
import * as demandeService from '../../../../lib/demandeService';
import * as photographerService from  '../../../../lib/photographerService';
import {getDevisTemplate}  from  '../../../../constants/specialites';
import { createDevis } from '../../../../lib/devisService';
import { categories } from '../../../../constants/categories';
import { 
  ArrowLeft, Calendar, MapPin, Euro, Clock, Users,
  Plus, Minus, Check, Send, Info, FileText, Percent
} from 'lucide-react';

export default function CreateDevisPage() {
  const router = useRouter();
  const { id } = router.query; // demande_id
  const { photographeProfile, user } = useAuth();
  
  const [demande, setDemande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    montant: '',
    acompte_percent: 0,
    validite_jours: 30,
    prestations_incluses: '',
    details: [{ label: '', montant: '' }],
    acompte_montant: 0,
  });

  // Génère les valeurs pré-remplies selon la demande + profil prestataire
  const buildPrefill = (data, tarif) => {
    const duree = parseFloat(data.duree_estimee_heures) || 3;
    const cat = (data.categorie || '').toLowerCase();
    const lieu = data.lieu || data.ville || '';
    const dateStr = data.date_souhaitee
      ? new Date(data.date_souhaitee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    // Titre
    const titre = data.titre
      ? `Devis – ${data.titre}`
      : 'Devis pour votre projet';

    // Description
    const descParts = [
      `Bonjour,`,
      `Suite à votre demande${data.titre ? ` « ${data.titre} »` : ''}, je vous propose ci-dessous mon offre personnalisée.`,
    ];
    if (data.description) descParts.push(`\nVotre projet : ${data.description}`);
    if (lieu) descParts.push(`Lieu : ${lieu}`);
    if (dateStr) descParts.push(`Date souhaitée : ${dateStr}`);
    descParts.push(`\nN’hésitez pas à me contacter pour toute question.`);
    const description = descParts.join('\n');

    // Prestations incluses selon catégorie
    const specialite = Array.isArray(data.type_prestation)
      ? data.type_prestation[0] || ''
      : data.type_prestation || '';
    const prestations_incluses = getDevisTemplate(specialite, data.categorie, duree, data);

    // Montant : budget_max du client, ou tarif horaire × durée
    let montant = '';
    if (data.budget_max) {
      montant = String(data.budget_max);
    } else if (tarif) {
      montant = String(Math.round(tarif * duree));
    }

    // Détail des lignes de prix
    const details = [];
    if (tarif && duree) {
      details.push({ label: `Prestation (${duree}h × ${tarif} DH/h)`, montant: String(Math.round(tarif * duree)) });
    } else if (montant) {
      details.push({ label: 'Prestation principale', montant });
    } else {
      details.push({ label: '', montant: '' });
    }

    return { titre, description, montant, prestations_incluses, details, validite_jours: 30 };
  };

  useEffect(() => {
    if (id) {
      fetchDemande();
    }
  }, [id]);

  const fetchDemande = async () => {
    setLoading(true);
    try {
      const [{ data, error }, { data: { user } }] = await Promise.all([
        demandeService.getDemandeById(id),
        supabase.auth.getUser(),
      ]);

      if (error) throw error;
      setDemande(data);

      // Fetch prestataire tarif_horaire_min pour suggestion de prix
      let tarif = null;
      if (user?.id) {
        const { data: prest } = await photographerService.getPhotographerPrice(user.id);
        tarif = prest?.tarif_horaire_min || null;
      }

      // Pré-remplir tous les champs
      setFormData(buildPrefill(data, tarif));
    } catch (error) {
      console.error('Error fetching demande:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addDetailLine = () => {
    setFormData(prev => ({
      ...prev,
      details: [...prev.details, { label: '', montant: '' }],
    }));
  };

  const removeDetailLine = (index) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index),
    }));
  };

  const updateDetailLine = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const calculateTotal = () => {
    const detailsTotal = formData.details.reduce((sum, d) => 
      sum + (parseFloat(d.montant) || 0), 0
    );
    return detailsTotal || parseFloat(formData.montant) || 0;
  };

  const handleSubmit = async () => {
    if (!formData.titre || !formData.montant) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!photographeProfile?.id) {
      setError('Erreur: profil prestataire non trouvé');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const validDetails = formData.details.filter(
        d => d.label && d.montant
      );

      const prestataireId = photographeProfile?.id || user?.id;

      if (!prestataireId) {
        setError('Erreur: profil prestataire non trouvé');
        return;
      }
      const { data: devis, error: devisError } = await createDevis({
        photographeId: prestataireId,
        clientId: demande.client_id,
        demandeId: id,
        tarif_base: parseFloat(formData.montant),
        options_supplementaires: validDetails,
        frais_deplacement: 0,
        message_personnalise: formData.description,
        date_expiration: new Date(Date.now() + formData.validite_jours * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duree_prestation_heures: demande.duree_estimee_heures || null,
        titre: formData.titre,
        description: formData.prestations_incluses,
        acompte_percent: formData.acompte_percent ? parseFloat(formData.acompte_percent) : 0,
        acompte_montant: Math.round(calculateTotal() * (formData.acompte_percent ? parseFloat(formData.acompte_percent) : 0) / 100),
      });
      console.log('devis:', devis);
      console.log('devisError:', devisError);

      if (devisError || !devis) {
        throw new Error('Création du devis impossible');
      }

      console.log('photographeProfile:', photographeProfile);
      console.log('user:', user);
      console.log('demande.client_id:', demande?.client_id);
      router.push(`/photographe/devis/${devis.id}?success=true`);
    } catch (err) {
      console.error('Error creating devis:', err);
      setError('Une erreur est survenue lors de la création du devis');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Flexible';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <Header />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!demande) {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Demande introuvable</h2>
          <button
            onClick={() => router.push('/photographe/demandes')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium"
          >
            Retour aux demandes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-bold text-[#130183]">Créer un devis</h1>
              </div>

              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre du devis *
                  </label>
                  <input
                    type="text"
                    value={formData.titre}
                    onChange={(e) => updateFormData('titre', e.target.value)}
                    placeholder="Ex: Reportage photo mariage"
                    className="w-full px-6 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description de votre offre
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Décrivez votre prestation, votre approche, ce que le client peut attendre..."
                    rows={4}
                    className="w-full px-6 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* What's included */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ce qui est inclus
                  </label>
                  <textarea
                    value={formData.prestations_incluses}
                    onChange={(e) => updateFormData('prestations_incluses', e.target.value)}
                    placeholder="- 4 heures de shooting&#10;- 100 photos retouchées&#10;- Livraison en galerie en ligne&#10;- ..."
                    rows={4}
                    className="w-full px-6 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Utilisez des tirets (-) pour chaque élément inclus
                  </p>
                </div>

                {/* Price breakdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Détail du prix (optionnel)
                  </label>
                  <div className="space-y-2">
                    {formData.details.map((detail, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={detail.label}
                          onChange={(e) => updateDetailLine(index, 'label', e.target.value)}
                          placeholder="Ex: Shooting 4h"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={detail.montant}
                          onChange={(e) => {updateDetailLine(index, 'montant', e.target.value)
                            const value = e.target.value.replace(/\D/g, '');}
                          }
                          placeholder=" DH"
                          className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        {formData.details.length > 1 && (
                          <button
                            onClick={() => removeDetailLine(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                        )}

                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addDetailLine}
                    className="mt-2 text-sm text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-700"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une ligne
                  </button>
                </div>

                {/* Total price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant total (MAD) *
                  </label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.montant}
                      onChange={(e) => {updateFormData('montant', e.target.value)
                        const value = e.target.value.replace(/\D/g, '');
                      }}
                      placeholder="500"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-semibold"
                    />
                  </div>
                </div>

                {/* Total acompte */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Acompte (%) *
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.acompte_percent}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        updateFormData('acompte_percent', value);
                      }}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-semibold"
                    />
                  </div>
                </div>

                {/* Validity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Validité du devis
                  </label>
                  <select
                    value={formData.validite_jours}
                    onChange={(e) => updateFormData('validite_jours', parseInt(e.target.value))}
                    className="w-full px-6 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value={7}>7 jours</option>
                    <option value={14}>14 jours</option>
                    <option value={30}>30 jours</option>
                    <option value={60}>60 jours</option>
                  </select>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full px-6 py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Envoyer le devis
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar - Demande info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">La demande</h2>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">
                  {categories.find(c => c.id === demande.categorie)?.icon || '📋'}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{demande.titre}</p>
                  <p className="text-sm text-gray-500">
                    {demande.client?.prenom} {demande.client?.nom}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>{formatDate(demande.date_souhaitee)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>{demande.lieu || 'Non précisé'}</span>
                </div>
                {demande.duree_estimee_heures && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>{demande.duree_estimee_heures}h estimées</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Euro className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium">
                    Budget: {demande.budget_max 
                      ? `Max ${demande.budget_max} DH`
                      : 'Non défini'}
                  </span>
                </div>
              </div>

              {demande.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 font-medium mb-1">Description</p>
                  <p className="text-sm text-gray-600">{demande.description}</p>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-indigo-50 rounded-xl p-4">
              <h4 className="font-medium text-indigo-900 mb-2 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Conseils
              </h4>
              <ul className="text-sm text-indigo-700 space-y-2">
                <li>• Soyez précis dans votre description</li>
                <li>• Détaillez ce qui est inclus</li>
                <li>• Proposez un prix dans le budget du client</li>
                <li>• Personnalisez votre offre</li>
              </ul>
            </div>

            {/* Preview total */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">Montant du devis</p>
              <p className="text-3xl font-bold text-indigo-600">
                {formData.montant ? `${formData.montant} DH` : '---'}
              </p>
              {formData.montant && (
                <p className="text-xs text-gray-500 mt-2">
                  Acompte client: {Math.round(parseFloat(formData.montant) * (parseFloat(formData.acompte_percent) || 0) / 100)} DH ({parseFloat(formData.acompte_percent) || 0}%)
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
