import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderParti';
import * as avisService from '../../../lib/avisService';

import { Star, ArrowLeft, Search, Calendar, Pencil, Trash2, X, Loader2, CheckCircle } from 'lucide-react';

const COLORS = {
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
};

function StarRating({ note }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className="w-4 h-4"
          fill={s <= note ? '#FBBF24' : 'none'}
          stroke={s <= note ? '#FBBF24' : '#D1D5DB'}
        />
      ))}
    </div>
  );
}

// Version cliquable pour le formulaire d'édition
function StarRatingInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="p-0.5"
        >
          <Star
            className="w-6 h-6"
            fill={s <= value ? '#FBBF24' : 'none'}
            stroke={s <= value ? '#FBBF24' : '#D1D5DB'}
          />
        </button>
      ))}
    </div>
  );
}

const formatDate = (date, options) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString('fr-FR', options || {
    day: 'numeric', month: 'long', year: 'numeric'
  });
};

export default function AvisListPage() {
  const router = useRouter();
  const { user, profileId, loading: authLoading } = useAuth();
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Édition
  const [editingReview, setEditingReview] = useState(null);
  const [editNote, setEditNote] = useState(0);
  const [editCommentaire, setEditCommentaire] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  // Suppression
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (profileId) fetchAvis();
  }, [user, profileId, authLoading]);

  const fetchAvis = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await avisService.getClientReviews(profileId);

      if (error) throw error;

      setAvis(data || []);
    } catch (error) {
      console.error('Erreur chargement avis:', error);
      setLoadError("Impossible de charger vos avis pour le moment. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (review) => {
    setEditingReview(review);
    setEditNote(review.rating || 0);
    setEditCommentaire(review.comment || '');
    setEditError(null);
  };

  const closeEdit = () => {
    setEditingReview(null);
    setEditNote(0);
    setEditCommentaire('');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingReview || !editNote) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const { data, error } = await avisService.updateReview(editingReview.id, {
        note: editNote,
        commentaire: editCommentaire.trim(),
      });

      if (error) {
        setEditError(error.message || "Impossible de modifier cet avis.");
        return;
      }

      closeEdit();
      await fetchAvis();
    } catch (error) {
      console.error('Erreur modification avis:', error);
      setEditError("Une erreur est survenue lors de la modification.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (reviewId) => {
    setDeletingId(reviewId);
    try {
      const { error } = await avisService.deleteReview(reviewId);
      if (error) {
        alert(error.message || "Impossible de supprimer cet avis.");
        return;
      }
      setConfirmDeleteId(null);
      await fetchAvis();
    } catch (error) {
      console.error('Erreur suppression avis:', error);
      alert("Une erreur est survenue lors de la suppression.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = avis.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      a.prestataire?.prenom?.toLowerCase().includes(q) ||
      a.prestataire?.nom?.toLowerCase().includes(q) ||
      a.comment?.toLowerCase().includes(q) ||
      a.reservation?.annonces?.titre?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/client/menu')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#130183]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#130183]">Mes avis</h1>
            <p className="text-gray-500 text-sm mt-0.5">{avis.length} avis donnés</p>
          </div>
        </div>

        {/* Recherche */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par prestataire ou commentaire..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
            />
          </div>
        </div>

        {/* Erreur de chargement */}
        {loadError && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: COLORS.accent }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {avis.length === 0 ? 'Aucun avis' : 'Aucun résultat'}
            </h2>
            <p className="text-gray-500">
              {avis.length === 0
                ? "Vous n'avez pas encore laissé d'avis."
                : "Aucun avis ne correspond à votre recherche."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(a => {
              const prestataire = a.prestataire;
              const reservationTitre = a.reservation?.annonces?.titre || 'Prestation';
              const reservationDate = formatDate(a.reservation?.date_reservation);
              const avisDate = formatDate(a.created_at, {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              });
              const reponseDate = formatDate(a.date_reponse, {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              });
              const hasResponse = !!a.reponse_prestataire;
              const canEdit = !hasResponse;

              return (
                <div
                  key={a.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 flex-shrink-0 text-lg overflow-hidden">
                      {prestataire?.avatar_url ? (
                        <img src={prestataire.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        prestataire?.prenom?.charAt(0)?.toUpperCase() || prestataire?.nom?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-gray-900">
                          {prestataire?.prenom || ''} {prestataire?.nom || 'Prestataire'}
                        </p>
                        <StarRating note={a.rating || 0} />
                      </div>

                      {a.reservation_id ? (
                        <Link
                          href={`/client/reservations/${a.reservation_id}`}
                          className="text-sm text-gray-500 hover:text-[#130183] hover:underline"
                        >
                          {reservationTitre}
                        </Link>
                      ) : (
                        <p className="text-sm text-gray-500">{reservationTitre}</p>
                      )}
                      {reservationDate && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Prestation du {reservationDate}
                        </p>
                      )}

                      {a.comment && (
                        <p className="text-gray-600 text-sm mt-2">{a.comment}</p>
                      )}

                      {/* Réponse du prestataire + toutes ses infos */}
                      {hasResponse && (
                        <div className="bg-gray-50 rounded-lg p-3 mt-3 border-l-4" style={{ borderLeftColor: COLORS.accent }}>
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            <p className="text-xs font-medium" style={{ color: COLORS.accent }}>
                              Réponse de {prestataire?.prenom || 'votre prestataire'}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">{a.reponse_prestataire}</p>
                          {reponseDate && (
                            <p className="text-xs text-gray-400 mt-2">Répondu le {reponseDate}</p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        {avisDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            Avis publié le {avisDate}
                          </div>
                        )}

                        {/* Actions : modifier / supprimer, uniquement si pas encore de réponse */}
                        {canEdit && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(a)}
                              className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-[#130183] px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Modifier
                            </button>

                            {confirmDeleteId === a.id ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Confirmer ?</span>
                                <button
                                  onClick={() => handleDelete(a.id)}
                                  disabled={deletingId === a.id}
                                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                                >
                                  {deletingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Oui, supprimer'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-xs text-gray-400 hover:underline"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(a.id)}
                                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Supprimer
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {!canEdit && (
                        <p className="text-xs text-gray-400 mt-2 italic">
                          Le prestataire a déjà répondu, cet avis ne peut plus être modifié ni supprimé.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal d'édition */}
      {editingReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>Modifier mon avis</h2>
              <button onClick={closeEdit} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
              <StarRatingInput value={editNote} onChange={setEditNote} />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Commentaire</label>
              <textarea
                value={editCommentaire}
                onChange={(e) => setEditCommentaire(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {editError && (
              <p className="text-sm text-red-600 mb-4">{editError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeEdit}
                className="flex-1 px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editNote || savingEdit}
                className="flex-1 px-6 py-3 text-white rounded-xl transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: COLORS.accent }}
              >
                {savingEdit ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}