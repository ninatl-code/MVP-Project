import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  Star, ArrowLeft, Send, Camera, Calendar, 
  MapPin, Euro, CheckCircle, AlertCircle
} from 'lucide-react';

export default function CreateAvisPage() {
  const router = useRouter();
  const { reservationId } = router.query;
  const { user, activeRole } = useAuth();
  
  const [reservation, setReservation] = useState(null);
  const [note, setNote] = useState(0);
  const [hoverNote, setHoverNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingAvis, setExistingAvis] = useState(null);

  const isPhotographe = activeRole === 'photographe' || activeRole === 'prestataire';

  useEffect(() => {
    if (reservationId && user?.id) {
      fetchReservation();
    }
  }, [reservationId, user]);

  const fetchReservation = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          client:profiles!reservations_client_id_fkey(id, nom, avatar_url),
          photographe:profiles!reservations_photographe_id_fkey(id, nom, avatar_url)
        `)
        .eq('id', reservationId)
        .single();

      if (error) throw error;
      
      // Verify user can review this reservation
      if (data.client_id !== user.id && data.photographe_id !== user.id) {
        setError("Vous n'êtes pas autorisé à laisser un avis pour cette réservation.");
        setLoading(false);
        return;
      }

      // Check reservation status
      if (data.statut !== 'terminee' && data.statut !== 'completed') {
        setError("Vous ne pouvez laisser un avis que pour une prestation terminée.");
        setLoading(false);
        return;
      }

      setReservation(data);

      // Check if already reviewed
      const { data: existingReview } = await supabase
        .from('avis')
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('auteur_id', user.id)
        .single();

      if (existingReview) {
        setExistingAvis(existingReview);
        setNote(existingReview.note);
        setCommentaire(existingReview.commentaire || '');
      }
    } catch (error) {
      console.error('Error fetching reservation:', error);
      setError("Réservation introuvable.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (note === 0) {
      setError("Veuillez donner une note.");
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const destinataireId = isPhotographe 
        ? reservation.client_id 
        : reservation.photographe_id;

      const avisData = {
        reservation_id: reservationId,
        auteur_id: user.id,
        destinataire_id: destinataireId,
        note,
        commentaire: commentaire.trim() || null,
        type_auteur: isPhotographe ? 'photographe' : 'client',
        created_at: new Date().toISOString(),
      };

      if (existingAvis) {
        // Update existing review
        const { error } = await supabase
          .from('avis')
          .update({
            note,
            commentaire: commentaire.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAvis.id);

        if (error) throw error;
      } else {
        // Create new review
        const { error } = await supabase
          .from('avis')
          .insert(avisData);

        if (error) throw error;

        // Update photographer's average rating if client is reviewing
        if (!isPhotographe) {
          const { data: allReviews } = await supabase
            .from('avis')
            .select('note')
            .eq('destinataire_id', reservation.photographe_id);

          if (allReviews && allReviews.length > 0) {
            const moyenne = allReviews.reduce((sum, r) => sum + r.note, 0) / allReviews.length;
            
            await supabase
              .from('profils_photographe')
              .update({ 
                note_moyenne: moyenne,
                nombre_avis: allReviews.length 
              })
              .eq('user_id', reservation.photographe_id);
          }
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/shared/avis');
      }, 2000);
    } catch (error) {
      console.error('Error submitting review:', error);
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const ratingLabels = {
    1: 'Très insatisfait',
    2: 'Insatisfait',
    3: 'Correct',
    4: 'Satisfait',
    5: 'Excellent'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            href="/shared/avis"
            className="text-indigo-600 hover:text-indigo-800"
          >
            Retour aux avis
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {existingAvis ? 'Avis modifié !' : 'Merci pour votre avis !'}
          </h2>
          <p className="text-gray-600">
            Redirection vers vos avis...
          </p>
        </div>
      </div>
    );
  }

  const otherPerson = isPhotographe ? reservation.client : reservation.photographe;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/shared/avis"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour aux avis
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {existingAvis ? 'Modifier votre avis' : 'Laisser un avis'}
          </h1>
          <p className="text-gray-600">
            {isPhotographe 
              ? "Partagez votre expérience avec ce client"
              : "Partagez votre expérience avec ce photographe"}
          </p>
        </div>

        {/* Reservation Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
              {otherPerson?.avatar_url ? (
                <img 
                  src={otherPerson.avatar_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-semibold text-indigo-600">
                  {otherPerson?.nom?.charAt(0) || '?'}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{otherPerson?.nom}</h3>
              <p className="text-sm text-gray-500">
                {isPhotographe ? 'Client' : 'Photographe'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Camera className="w-4 h-4" />
              <span>{reservation.type_prestation || 'Prestation photo'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(reservation.date_prestation)}</span>
            </div>
            {reservation.lieu && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{reservation.lieu}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Euro className="w-4 h-4" />
              <span>{reservation.montant_total || reservation.prix}€</span>
            </div>
          </div>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
          {/* Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Votre note *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNote(star)}
                  onMouseEnter={() => setHoverNote(star)}
                  onMouseLeave={() => setHoverNote(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      (hoverNote || note) >= star
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-4 text-lg font-medium text-gray-700">
                {ratingLabels[hoverNote || note] || 'Sélectionnez une note'}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Votre commentaire (optionnel)
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={5}
              placeholder="Décrivez votre expérience..."
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500 mt-1">
              {commentaire.length}/500 caractères
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || note === 0}
            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {existingAvis ? 'Modifier mon avis' : 'Envoyer mon avis'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
