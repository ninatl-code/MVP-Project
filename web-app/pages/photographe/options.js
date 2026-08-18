import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/HeaderPresta';
import { ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff, PiggyBank } from 'lucide-react';

const ACCENT = '#130183';

export default function OptionsPage() {
  const router = useRouter();
  const { photographeProfile } = useAuth();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [userId, setUserId] = useState(photographeProfile?.id || null);

  // Form state
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [prix, setPrix] = useState('');
  const [monnaie, setMonnaie] = useState('DH');
  const [actif, setActif] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const init = async () => {
      let uid = photographeProfile?.id;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
        if (uid) setUserId(uid);
      }
      if (uid) fetchOptions(uid);
    };
    init();
  }, [photographeProfile]);

  const fetchOptions = async (uid) => {
    const id = uid || userId || photographeProfile?.id;
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('options_photographe')
        .select('*')
        .eq('photographe_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (optionId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('options_photographe')
        .update({ actif: !currentStatus })
        .eq('id', optionId);

      if (error) throw error;
      const id = userId || photographeProfile?.id;
      if (id) fetchOptions(id);
    } catch (error) {
      console.error('Error toggling option:', error);
    }
  };

  const handleDelete = async (optionId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette option ?')) return;

    setDeleting(optionId);
    try {
      const { error } = await supabase
        .from('options_photographe')
        .delete()
        .eq('id', optionId);

      if (error) throw error;
      const id = userId || photographeProfile?.id;
      if (id) fetchOptions(id);
    } catch (error) {
      console.error('Error deleting option:', error);
    } finally {
      setDeleting(null);
    }
  };

  const openCreateForm = () => {
    setEditingOption(null);
    setNom('');
    setDescription('');
    setPrix('');
    setMonnaie('DH');
    setActif(true);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (option) => {
    setEditingOption(option);
    setNom(option.nom || '');
    setDescription(option.description || '');
    setPrix(option.prix != null ? String(option.prix) : '');
    setMonnaie(option.monnaie || 'DH');
    setActif(option.actif ?? true);
    setFormError('');
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingOption(null);
    setFormError('');
  };

  const validateForm = () => {
    if (!nom.trim()) {
      setFormError('Le nom est obligatoire');
      return false;
    }
    const prixValue = parseFloat(prix);
    if (isNaN(prixValue) || prixValue < 0) {
      setFormError('Le prix doit être un nombre supérieur ou égal à 0');
      return false;
    }
    return true;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const id = userId || photographeProfile?.id;
    if (!id) {
      setFormError('Utilisateur non authentifié');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nom: nom.trim(),
        description: description.trim() || null,
        prix: parseFloat(prix),
        monnaie: monnaie.trim() || 'DH',
        actif,
      };

      if (editingOption) {
        const { error } = await supabase
          .from('options_photographe')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingOption.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('options_photographe')
          .insert({ ...payload, photographe_id: id });
        if (error) throw error;
      }

      handleFormClose();
      fetchOptions(id);
    } catch (error) {
      console.error('Error saving option:', error);
      setFormError('Impossible de sauvegarder l\'option');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" style={{ color: ACCENT }} />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: ACCENT }}>
                <PiggyBank className="w-5 h-5" style={{ color: ACCENT }} />
                Mes Options
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Personnalisez les options proposées à vos clients
              </p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: ACCENT }}
          >
            <Plus className="w-4 h-4" />
            Nouvelle option
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: ACCENT }} />
          </div>
        ) : options.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <PiggyBank className="w-12 h-12 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-800">Aucune option créée</h3>
            <p className="mt-1 text-sm text-gray-500">
              Créez votre première option pour enrichir vos formules (ex: album, séance supplémentaire...)
            </p>
            <button
              onClick={openCreateForm}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: ACCENT }}
            >
              <Plus className="w-4 h-4" />
              Créer une option
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {options.map((option) => (
              <div key={option.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{option.nom}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          option.actif
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {option.actif ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: ACCENT }}>
                      {option.prix} {option.monnaie || 'DH'}
                    </span>
                  </div>

                  {option.description && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-3">{option.description}</p>
                  )}
                </div>

                <div className="border-t border-gray-100 p-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditForm(option)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleToggleActive(option.id, option.actif)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-amber-500 hover:opacity-90 transition-opacity"
                  >
                    {option.actif ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {option.actif ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => handleDelete(option.id)}
                    disabled={deleting === option.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-red-500 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulaire modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingOption ? 'Modifier l\'option' : 'Nouvelle option'}
              </h2>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Album photo premium"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez l'option..."
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prix}
                    onChange={(e) => setPrix(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monnaie</label>
                  <input
                    type="text"
                    value={monnaie}
                    onChange={(e) => setMonnaie(e.target.value)}
                    placeholder="DH"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Option active</label>
                <input
                  type="checkbox"
                  checked={actif}
                  onChange={(e) => setActif(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleFormClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                >
                  {saving
                    ? 'Enregistrement...'
                    : editingOption
                      ? 'Mettre à jour'
                      : 'Créer l\'option'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}