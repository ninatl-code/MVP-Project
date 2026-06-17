import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { categories } from '../../constants/categories';
import { SPECIALITES_MAP } from '../../constants/specialites';
import * as packageService from '../../lib/packageService';

import { 
  Package, Plus, Edit, Trash2, Clock, Briefcase, Euro,
  Check, X, Eye, EyeOff, GripVertical, Star, ArrowLeft, ChevronLeft, FileText
} from 'lucide-react';

const ACCENT = '#130183';

export default function PackagesPage() {
  const router = useRouter();
  const { photographeProfile } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [userId, setUserId] = useState(photographeProfile?.id || null);

  useEffect(() => {
    const init = async () => {
      let uid = photographeProfile?.id;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
        if (uid) setUserId(uid);
      }
      if (uid) fetchPackages(uid);
    };
    init();
  }, [photographeProfile]);

  const fetchPackages = async (uid) => {
    const id = uid || userId || photographeProfile?.id;
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await packageService.getPhotographerPackages (id, false);
      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (packageId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('packages_types')
        .update({ actif: !currentStatus })
        .eq('id', packageId);

      if (error) throw error;
      const id = userId || photographeProfile?.id;
      if (id) fetchPackages(id);
    } catch (error) {
      console.error('Error toggling package:', error);
    }
  };

  const handleDelete = async (packageId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce forfait ?')) return;
    
    setDeleting(packageId);
    try {
      const { error } = await supabase
        .from('packages_types')
        .delete()
        .eq('id', packageId);

      if (error) throw error;
      const id = userId || photographeProfile?.id;
      if (id) fetchPackages(id);
    } catch (error) {
      console.error('Error deleting package:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPackage(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    const id = userId || photographeProfile?.id;
    if (id) fetchPackages(id);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
      

        {/* Page header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <ArrowLeft className="w-5 h-5 text-[#130183]" />
                    </button>
                    <div>
                      <h1 className="text-2xl font-bold text-[#130183] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#130183]" />
                        Mes Forfaits
                      </h1>
                      <p className="text-xs text-gray-500">{packages.length} forfait(s) • {packages.filter(p => p.actif).length} actif(s)</p>
                    </div>
            </div>
            <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <Plus className="w-4 h-4" />
                    Nouveau forfait
            </button>
          </div>
              </div>
          
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : packages.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Aucun forfait créé
              </h2>
              <p className="text-gray-500 mb-6">
                Créez des forfaits pour présenter vos offres aux clients
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium"
              >
                <Plus className="w-5 h-5" />
                Créer mon premier forfait
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg, index) => (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all ${
                    !pkg.actif ? 'opacity-60' : ''
                  }`}
                >
                  <div className="p-4 flex items-center gap-4">
                    {/* Drag handle (visual only for now) */}
                    <div className="hidden sm:flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex-shrink-0">
                      <GripVertical className="w-5 h-5  text-indigo-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-lg font-semibold text-gray-900">{pkg.titre}</h2>
                        {!pkg.actif && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                            Inactif
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {pkg.duree_minutes ? `${Math.round(pkg.duree_minutes / 60)}h` : '—'}
                        </span>
                        {pkg.services_inclus > 0 && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {pkg.services_inclus} livrables
                          </span>
                        )}
                        {pkg.categorie && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-xs">
                            {pkg.categorie}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-600">{pkg.prix_fixe} DH</p>
                      {pkg.prix_barre && (
                        <p className="text-sm text-gray-400 line-through">{pkg.prix_barre} DH</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(pkg.id, pkg.actif)}
                        className={`p-2 rounded-lg transition-all ${
                          pkg.actif 
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={pkg.actif ? 'Désactiver' : 'Activer'}
                      >
                        {pkg.actif ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleEdit(pkg)}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        disabled={deleting === pkg.id}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Form Modal */}
      {showForm && (
        <PackageFormModal
          photographeId={userId || photographeProfile?.id}
          package={editingPackage}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

function PackageFormModal({ photographeId, package: pkg, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categorie, setcategorie] = useState([]);
  const [formData, setFormData] = useState({
    nom: pkg?.titre || '',
    description: pkg?.description || '',
    prix: pkg?.prix_fixe?.toString() || '',
    prix_barre: pkg?.prix_barre?.toString() || '',
    duree_heures: pkg?.duree_minutes ? Math.round(pkg.duree_minutes / 60).toString() : '1',
    services_inclus: pkg?.services_inclus?.toString() || '',
    categorie: pkg?.categorie || '',
    specialite: pkg?.specialite || '',
    details: Array.isArray(pkg?.details) ? (pkg.details[0] || {}) : (pkg?.details || {}),
    actif: pkg?.actif ?? true,
  });

  useEffect(() => {
    supabase
      .from('prestations')
      .select('id, nom')
      .eq('actif', true)
      .order('ordre')
      .then(({ data }) => {
        if (data) setcategorie(data.map(d => d.nom));
      });
  }, []);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!photographeId) {
      setError('Session expirée. Veuillez recharger la page.');
      setLoading(false);
      return;
    }

    try {
      const data = {
        prestataire_id: photographeId,
        titre: formData.nom,
        description: formData.description,
        prix_fixe: parseFloat(formData.prix),
        prix_barre: formData.prix_barre ? parseFloat(formData.prix_barre) : null,
        duree_minutes: parseInt(formData.duree_heures)*60,
        services_inclus: formData.services_inclus ? parseInt(formData.services_inclus) : null,
        categorie: formData.categorie || null,
        specialite: formData.specialite || null,
        details: Object.keys(formData.details).length > 0 ? [formData.details] : null,
        actif: formData.actif,
      };

      if (pkg?.id) {
        const { error: err } = await supabase
          .from('packages_types')
          .update(data)
          .eq('id', pkg.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('packages_types')
          .insert(data);
        if (err) throw err;
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving package:', err);
      setError(err.message || 'Une erreur est survenue. Vérifiez la console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {pkg ? 'Modifier le forfait' : 'Nouveau forfait'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du forfait *
            </label>
            <input
              type="text"
              required
              value={formData.nom}
              onChange={(e) => updateFormData('nom', e.target.value)}
              placeholder="Ex: Forfait Essentiel, Pack Standard..."
              className="w-full px-6 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Décrivez ce qui est inclus dans ce forfait..."
              rows={3}
              className="w-full px-6 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix forfait (MAD) *
              </label>
              <input
                type="number"
                required
                value={formData.prix}
                onChange={(e) => updateFormData('prix', e.target.value)}
                placeholder="150"
                className="w-full px-6 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix sans forfait (MAD)
              </label>
              <input
                type="number"
                value={formData.prix_barre}
                onChange={(e) => updateFormData('prix_barre', e.target.value)}
                placeholder="200"
                className="w-full px-6 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée estimée *
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={formData.duree_heures ?? 1}
                onChange={(e) =>
                  updateFormData('duree_heures', parseInt(e.target.value, 10) || 1)
                }
                className="w-full px-6 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Livrables inclus
              </label>
              <input
                type="text"
                min="0"
                value={formData.services_inclus}
                onChange={(e) => updateFormData('services_inclus', e.target.value)}
                placeholder="Ex: 3 rapports, 5 livrables..."
                className="w-full px-6 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              value={formData.categorie}
              onChange={(e) => {
                updateFormData('categorie', e.target.value);
                updateFormData('specialite', '');
              }}
              className="w-full px-6 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sélectionner...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Spécialité — dynamique selon catégorie */}
          {formData.categorie && SPECIALITES_MAP[formData.categorie] && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spécialité
            </label>
            <select
              value={formData.specialite}
              onChange={(e) => updateFormData('specialite', e.target.value)}
              className="w-full px-6 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sélectionner...</option>
              {SPECIALITES_MAP[formData.categorie].map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
          )}

          {/* Champs details conditionnels */}
          {formData.specialite === 'Développement' && (
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Langages de développement <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                value={formData.details?.langages || ''}
                onChange={(e) => updateFormData('details', { ...formData.details, langages: e.target.value })}
                placeholder="Ex : JavaScript, Python, React..."
                className="w-full px-6 py-2 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white text-sm"
              />
            </div>
          )}

          {formData.specialite === 'Cours particuliers' && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Matière <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.details?.matiere || ''}
                    onChange={(e) => updateFormData('details', { ...formData.details, matiere: e.target.value })}
                    placeholder="Ex : Mathématiques..."
                    className="w-full px-6 py-2 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Niveau <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.details?.niveau || ''}
                    onChange={(e) => updateFormData('details', { ...formData.details, niveau: e.target.value })}
                    placeholder="Ex : Lycée, Université..."
                    className="w-full px-6 py-2 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.actif}
                onChange={(e) => updateFormData('actif', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Forfait actif</span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {pkg ? 'Enregistrer' : 'Créer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
