import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { 
  Package, Plus, Edit, Trash2, Clock, Briefcase, Euro,
  Check, X, Eye, EyeOff, GripVertical, Star, ArrowLeft
} from 'lucide-react';

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
      const { data, error } = await supabase
        .from('packages_types')
        .select('*')
        .eq('prestataire_id', id)
        .order('ordre', { ascending: true });

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
      fetchPackages();
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
      fetchPackages();
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
    fetchPackages();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Retour au profil */}
        <button
          onClick={() => router.push('/photographe/profil')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au profil
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes forfaits</h1>
            <p className="text-gray-600 mt-1">
              {packages.length} forfait(s) • {packages.filter(p => p.actif).length} actif(s)
            </p>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nouveau forfait
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : packages.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun forfait créé
            </h3>
            <p className="text-gray-500 mb-6">
              Créez des forfaits pour présenter vos offres aux clients
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium"
            >
              <Plus className="w-5 h-5" />
              Créer mon premier forfait
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg, index) => (
              <div
                key={pkg.id}
                className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all ${
                  !pkg.actif ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Drag handle (visual only for now) */}
                  <div className="pt-1 text-gray-300 cursor-grab">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{pkg.nom}</h3>
                      {pkg.populaire && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-500" />
                          Populaire
                        </span>
                      )}
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
                        {pkg.duree_heures}h
                      </span>
                      {pkg.nombre_photos_incluses > 0 && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {pkg.nombre_photos_incluses} livrables
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
                    <p className="text-2xl font-bold text-indigo-600">{pkg.prix} DH</p>
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
      </main>

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
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    nom: pkg?.nom || '',
    description: pkg?.description || '',
    prix: pkg?.prix?.toString() || '',
    prix_barre: pkg?.prix_barre?.toString() || '',
    duree_heures: pkg?.duree_heures?.toString() || '1',
    nombre_photos_incluses: pkg?.nombre_photos_incluses?.toString() || '',
    categorie: pkg?.categorie || '',
    actif: pkg?.actif ?? true,
    populaire: pkg?.populaire ?? false,
  });

  useEffect(() => {
    supabase
      .from('prestations')
      .select('id, nom')
      .eq('actif', true)
      .order('ordre')
      .then(({ data }) => {
        if (data) setCategories(data.map(d => d.nom));
      });
  }, []);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        prestataire_id: photographeId,
        nom: formData.nom,
        description: formData.description,
        prix: parseFloat(formData.prix),
        prix_barre: formData.prix_barre ? parseFloat(formData.prix_barre) : null,
        duree_heures: parseInt(formData.duree_heures),
        nombre_photos_incluses: parseInt(formData.nombre_photos_incluses),
        categorie: formData.categorie || null,
        actif: formData.actif,
        populaire: formData.populaire,
      };

      if (pkg?.id) {
        const { error } = await supabase
          .from('packages_types')
          .update(data)
          .eq('id', pkg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('packages_types')
          .insert(data);
        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving package:', error);
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
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix (MAD) *
              </label>
              <input
                type="number"
                required
                value={formData.prix}
                onChange={(e) => updateFormData('prix', e.target.value)}
                placeholder="150"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix barré (MAD)
              </label>
              <input
                type="number"
                value={formData.prix_barre}
                onChange={(e) => updateFormData('prix_barre', e.target.value)}
                placeholder="200"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée estimée *
              </label>
              <select
                value={formData.duree_heures}
                onChange={(e) => updateFormData('duree_heures', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(h => (
                  <option key={h} value={h}>{h}h</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Livrables inclus
              </label>
              <input
                type="number"
                min="0"
                value={formData.nombre_photos_incluses}
                onChange={(e) => updateFormData('nombre_photos_incluses', e.target.value)}
                placeholder="Ex: 3 rapports, 5 livrables..."
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              value={formData.categorie}
              onChange={(e) => updateFormData('categorie', e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sélectionner...</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="Autre">Autre</option>
            </select>
          </div>

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
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.populaire}
                onChange={(e) => updateFormData('populaire', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Marquer comme populaire</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
