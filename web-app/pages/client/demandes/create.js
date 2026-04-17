import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import Header from '../../../components/HeaderParti';
import { 
  ArrowLeft, Camera, Calendar, MapPin, Euro, 
  Clock, Users, ChevronRight, Check, X, Info
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
};

const STEPS = [
  { id: 'category', title: 'Catégorie', subtitle: 'Type de prestation' },
  { id: 'details', title: 'Détails', subtitle: 'Informations essentielles' },
  { id: 'budget', title: 'Budget', subtitle: 'Votre budget' },
  { id: 'review', title: 'Récapitulatif', subtitle: 'Vérification' },
];

export default function CreateDemandePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const categories = [
    { id: 'services-domicile', label: 'Services à domicile', icon: '🔧', description: 'Plomberie, électricité, ménage, jardinage...' },
    { id: 'beaute-bien-etre', label: 'Beauté & Bien-être', icon: '💆', description: 'Coiffure, maquillage, massage, soins...' },
    { id: 'evenementiel', label: 'Événementiel', icon: '🎉', description: 'Organisation de mariages, anniversaires, séminaires...' },
    { id: 'transport', label: 'Transport', icon: '🚗', description: 'Déménagement, livraison, chauffeur...' },
    { id: 'digital', label: 'Digital', icon: '💻', description: 'Développement web, design, marketing digital...' },
    { id: 'education', label: 'Éducation', icon: '📚', description: 'Cours particuliers, formation, coaching...' },
  ];

  const [formData, setFormData] = useState({
    titre: '',
    categorie: '',
    description: '',
    date_souhaitee: '',
    date_flexible: false,
    ville: '',
    lieu: '',
    duree_estimee: '2',
    nombre_personnes: '1',
    budget_min: '',
    budget_max: '',
    exigences_specifiques: '',
  });

  // Redirect if not authenticated (instant — reads from local storage)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login?redirect=/client/demandes/create');
      }
    });
  }, [router]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.categorie !== '';
      case 1:
        return formData.titre.trim() !== '' && formData.ville.trim() !== '';
      case 2:
        return formData.budget_max !== '';
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const profileId = session?.user?.id;

      if (!profileId) {
        setError('Vous devez être connecté pour créer une demande.');
        return;
      }

      const { error: insertError } = await supabase
        .from('demandes_client')
        .insert({
          client_id: profileId,
          titre: formData.titre,
          categorie: formData.categorie,
          description: formData.description || null,
          date_souhaitee: formData.date_souhaitee || null,
          ville: formData.ville,
          lieu: formData.lieu || null,
          duree_estimee_heures: parseInt(formData.duree_estimee) || null,
          budget_max: parseFloat(formData.budget_max) || null,
          statut: 'ouverte',
        });

      if (insertError) throw insertError;

      router.push('/client/demandes');
    } catch (err) {
      console.error('Error creating demande:', err);
      setError('Erreur : ' + (err.message || 'Une erreur est survenue lors de la création de votre demande.'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              index < currentStep
                ? 'bg-green-500 text-white'
                : index === currentStep
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={`w-12 h-1 mx-1 ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderCategoryStep = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Quel type de service recherchez-vous ?
      </h2>
      <p className="text-gray-600 mb-6">
        Sélectionnez la catégorie qui correspond le mieux à votre besoin.
      </p>

      {categories.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Chargement des catégories...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateFormData('categorie', cat.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                formData.categorie === cat.id
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="text-3xl mb-2 block">{cat.icon}</span>
              <h4 className="font-medium text-gray-900">{cat.label}</h4>
              <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Parlez-nous de votre projet
      </h2>
      <p className="text-gray-600 mb-6">
        Ces informations aideront les prestataires à comprendre vos besoins.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Titre de votre demande *
        </label>
        <input
          type="text"
          value={formData.titre}
          onChange={(e) => updateFormData('titre', e.target.value)}
          placeholder="Ex: Photographe pour mariage le 15 juin"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description détaillée
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Décrivez votre projet en détail..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date souhaitée
          </label>
          <input
            type="date"
            value={formData.date_souhaitee}
            onChange={(e) => updateFormData('date_souhaitee', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={formData.date_flexible}
              onChange={(e) => updateFormData('date_flexible', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Dates flexibles
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Ville de la prestation *
          </label>
          <input
            type="text"
            value={formData.ville}
            onChange={(e) => updateFormData('ville', e.target.value)}
            placeholder="Ex: Casablanca, Rabat, Marrakech..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Lieu exact (optionnel)
          </label>
          <input
            type="text"
            value={formData.lieu}
            onChange={(e) => updateFormData('lieu', e.target.value)}
            placeholder="Ex: Salle des fêtes Al Amal, 12 rue Hassan II..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            Durée estimée (heures)
          </label>
          <select
            value={formData.duree_estimee}
            onChange={(e) => updateFormData('duree_estimee', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((h) => (
              <option key={h} value={h}>{h} heure{h > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        {formData.categorie === 'evenementiel' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Nombre de personnes
            </label>
            <select
              value={formData.nombre_personnes}
              onChange={(e) => updateFormData('nombre_personnes', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>{n} personne{n > 1 ? 's' : ''}</option>
              ))}
              <option value="100+">Plus de 100</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Exigences spécifiques (optionnel)
        </label>
        <textarea
          value={formData.exigences_specifiques}
          onChange={(e) => updateFormData('exigences_specifiques', e.target.value)}
          placeholder="Ex: Style de photos souhaité, équipements particuliers, contraintes..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );

  const renderBudgetStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Quel est votre budget ?
      </h2>
      <p className="text-gray-600 mb-6">
        Indiquez une fourchette de budget pour que les prestataires puissent vous proposer des offres adaptées.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Conseil</p>
            <p>
              Pour une prestation de type "{categories.find(c => c.id === formData.categorie)?.label || 'service'}", 
              les prix varient selon la nature et la durée de la prestation.
              N'hésitez pas à indiquer une fourchette large pour recevoir plus d'offres.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Budget minimum (MAD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              DH
            </span>
            <input
              type="number"
              value={formData.budget_min}
              onChange={(e) => updateFormData('budget_min', e.target.value)}
              placeholder="100"
              min="0"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Budget maximum (MAD) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
             DH
            </span>
          <input
              type="number"
              value={formData.budget_max}
              onChange={(e) => updateFormData('budget_max', e.target.value)}
              placeholder="500"
              min="0"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Quick budget selection */}
      <div className="mt-6">
        <p className="text-sm text-gray-600 mb-3">Ou sélectionnez une fourchette :</p>
        <div className="flex flex-wrap gap-2">
          {[
            { min: 50, max: 150, label: '50 DH - 150 DH' },
            { min: 150, max: 300, label: '150 DH - 300 DH' },
            { min: 300, max: 500, label: '300 DH - 500 DH' },
            { min: 500, max: 1000, label: '500 DH - 1000 DH' },
            { min: 1000, max: 2000, label: '1000 DH - 2000 DH' },
            { min: 2000, max: 5000, label: '2000 DH+' },
          ].map((range) => (
            <button
              key={range.label}
              onClick={() => {
                updateFormData('budget_min', range.min.toString());
                updateFormData('budget_max', range.max.toString());
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                formData.budget_min === range.min.toString() && formData.budget_max === range.max.toString()
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const selectedCategory = categories.find(c => c.id === formData.categorie);
    
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Vérifiez votre demande
        </h2>
        <p className="text-gray-600 mb-6">
          Assurez-vous que toutes les informations sont correctes avant de publier.
        </p>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* Category */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedCategory?.icon}</span>
              <div>
                <p className="text-sm text-gray-500">Catégorie</p>
                <p className="font-medium">{selectedCategory?.label}</p>
              </div>
            </div>
            <button
              onClick={() => setCurrentStep(0)}
              className="text-indigo-600 text-sm font-medium hover:text-indigo-700"
            >
              Modifier
            </button>
          </div>

          {/* Title & Description */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Titre</p>
              <button
                onClick={() => setCurrentStep(1)}
                className="text-indigo-600 text-sm font-medium hover:text-indigo-700"
              >
                Modifier
              </button>
            </div>
            <p className="font-medium mb-3">{formData.titre}</p>
            {formData.description && (
              <>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-700 text-sm">{formData.description}</p>
              </>
            )}
          </div>

          {/* Details */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Date
                </p>
                <p className="font-medium">
                  {formData.date_souhaitee 
                    ? new Date(formData.date_souhaitee).toLocaleDateString('fr-FR', { 
                        day: 'numeric', month: 'long', year: 'numeric' 
                      })
                    : 'Non définie'}
                  {formData.date_flexible && ' (flexible)'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Lieu
                </p>
                <p className="font-medium">{formData.lieu}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Durée
                </p>
                <p className="font-medium">{formData.duree_estimee}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Users className="w-4 h-4" /> Personnes
                </p>
                <p className="font-medium">{formData.nombre_personnes}</p>
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Budget</p>
              <button
                onClick={() => setCurrentStep(2)}
                className="text-indigo-600 text-sm font-medium hover:text-indigo-700"
              >
                Modifier
              </button>
            </div>
            <p className="font-medium text-lg">
              {formData.budget_min && formData.budget_max 
                ? `${formData.budget_min} DH - ${formData.budget_max} DH`
                : formData.budget_max 
                ? `Maximum ${formData.budget_max} DH`
                : 'Non défini'}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Prêt à publier !</p>
              <p>
                Une fois publiée, votre demande sera visible par les prestataires qui correspondent à vos critères.
                Vous recevrez des devis directement sur votre espace.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-700">
              <X className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderCategoryStep();
      case 1:
        return renderDetailsStep();
      case 2:
        return renderBudgetStep();
      case 3:
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        {/* Step indicator */}
        {renderStepIndicator()}

        {/* Step title */}
        <div className="text-center mb-8">
          <p className="text-sm text-indigo-600 font-medium">
            Étape {currentStep + 1} sur {STEPS.length}
          </p>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
          >
            {currentStep === 0 ? 'Annuler' : 'Précédent'}
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                canProceed()
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continuer
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Publication...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Publier ma demande
                </>
              )}
            </button>
          )}
        </div>

        {/* Erreur globale — toujours visible sous les boutons */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700">
            <X className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}
