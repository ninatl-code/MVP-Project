import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import Header from '../../../../components/HeaderPresta';
import { 
  ArrowLeft, Calendar, MapPin, Euro, Clock, Users,
  Plus, Minus, Check, Send, Info, FileText
} from 'lucide-react';

export default function CreateDevisPage() {
  const router = useRouter();
  const { id } = router.query; // demande_id
  const { photographeProfile } = useAuth();
  
  const [demande, setDemande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    montant: '',
    validite_jours: 30,
    prestations_incluses: '',
    details: [{ label: '', montant: '' }],
  });

  useEffect(() => {
    if (id) {
      fetchDemande();
    }
  }, [id]);

  const fetchDemande = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('demandes_client')
        .select(`
          *,
          client:profiles!demandes_client_particulier_id_fkey(nom, prenom)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setDemande(data);

      // Pre-fill title based on demande
      setFormData(prev => ({
        ...prev,
        titre: `Devis pour: ${data.titre}`,
      }));
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
      setError('Erreur: profil photographe non trouvé');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const validDetails = formData.details.filter(d => d.label && d.montant);

      const { data, error: insertError } = await supabase
        .from('devis')
        .insert({
          demande_id: id,
          photographe_id: photographeProfile.id,
          titre: formData.titre,
          description: formData.description,
          montant: parseFloat(formData.montant),
          validite_jours: formData.validite_jours,
          prestations_incluses: formData.prestations_incluses,
          details_prix: validDetails.length > 0 ? JSON.stringify(validDetails) : null,
          statut: 'en_attente',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create notification for the client
      await supabase.from('notifications').insert({
        user_id: demande.particulier_id,
        type: 'nouveau_devis',
        titre: 'Nouveau devis reçu',
        message: `${photographeProfile.nom_entreprise || 'Un photographe'} vous a envoyé un devis pour "${demande.titre}"`,
        data: { devis_id: data.id, demande_id: id },
      });

      router.push(`/photographe/devis/${data.id}?success=true`);
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

  const getCategoryIcon = (category) => {
    const icons = {
      'mariage': '💒', 'portrait': '👤', 'evenement': '🎉', 'corporate': '🏢',
      'produit': '📦', 'immobilier': '🏠', 'famille': '👨‍👩‍👧‍👦', 'grossesse': '🤰',
      'nouveau-ne': '👶', 'animalier': '🐕', 'culinaire': '🍽️',
    };
    return icons[category?.toLowerCase()] || '📷';
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

  if (!demande) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Demande introuvable</h2>
          <button
            onClick={() => router.push('/photographe/demandes')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium"
          >
            Retour aux demandes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
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
                <h1 className="text-xl font-bold text-gray-900">Créer un devis</h1>
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
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
                          type="number"
                          value={detail.montant}
                          onChange={(e) => updateDetailLine(index, 'montant', e.target.value)}
                          placeholder="€"
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
                    Montant total (€) *
                  </label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.montant}
                      onChange={(e) => updateFormData('montant', e.target.value)}
                      placeholder="500"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              <h3 className="font-semibold text-gray-900 mb-4">La demande</h3>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{getCategoryIcon(demande.categorie)}</span>
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
                {demande.duree_estimee && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>{demande.duree_estimee}h estimées</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Euro className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium">
                    Budget: {demande.budget_min && demande.budget_max 
                      ? `${demande.budget_min}€ - ${demande.budget_max}€`
                      : demande.budget_max 
                      ? `Max ${demande.budget_max}€`
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
                {formData.montant ? `${formData.montant}€` : '---'}
              </p>
              {formData.montant && (
                <p className="text-xs text-gray-500 mt-2">
                  Acompte client: {Math.round(parseFloat(formData.montant) * 0.3)}€ (30%)
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
