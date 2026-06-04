import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderPresta';
import {
  ArrowLeft, Calendar, MapPin, Clock, User, Tag,
  Banknote, FileText, Send, CheckCircle, AlertCircle, Package
} from 'lucide-react';

const CATEGORIE_LABELS = {
  'services-domicile': 'Services à domicile',
  'beaute-bien-etre': 'Beauté & Bien-être',
  'evenementiel': 'Événementiel',
  'transport': 'Transport',
  'digital': 'Digital',
  'education': 'Éducation',
};

const STATUT_CONFIG = {
  ouverte:  { label: 'Ouverte',  bg: '#DCFCE7', text: '#16A34A' },
  pourvue:  { label: 'Pourvue',  bg: '#DBEAFE', text: '#1D4ED8' },
  fermee:   { label: 'Fermée',   bg: '#F3F4F6', text: '#6B7280' },
  annulee:  { label: 'Annulée',  bg: '#FEE2E2', text: '#DC2626' },
  expiree:  { label: 'Expirée',  bg: '#F3F4F6', text: '#6B7280' },
};

export default function PhotographeDemandeDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [demande, setDemande] = useState(null);
  const [dejaEnvoye, setDejaEnvoye] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (id && user) fetchDemande();
  }, [id, user]);

  const fetchDemande = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('demandes_client')
        .select(`
          *,
          profiles!demandes_client_client_id_fkey(nom, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error || !data) { setNotFound(true); return; }
      setDemande(data);

      // Vérifier si un devis a déjà été envoyé
      const { data: existingDevis } = await supabase
        .from('devis')
        .select('id')
        .eq('demande_id', id)
        .eq('prestataire_id', user.id)
        .maybeSingle();
      setDejaEnvoye(!!existingDevis);
    } catch (err) {
      console.error(err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return 'Non précisée';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  if (notFound || !demande) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Demande introuvable</p>
          <Link href="/photographe/demandes" className="inline-flex items-center gap-2 mt-4 text-indigo-600 font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" />Retour aux demandes
          </Link>
        </div>
      </div>
    );
  }

  const statut = STATUT_CONFIG[demande.statut] || STATUT_CONFIG.ouverte;
  const details = Array.isArray(demande.details) ? demande.details[0] : demande.details;
  const isOpen = demande.statut === 'ouverte';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Retour */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="space-y-5">
          {/* En-tête */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: statut.bg, color: statut.text }}
                  >
                    {statut.label}
                  </span>
                  {demande.categorie && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                      <Tag className="w-3 h-3" />
                      {CATEGORIE_LABELS[demande.categorie] || demande.categorie}
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">{demande.titre}</h1>
                {demande.profiles?.nom && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {demande.profiles.nom}
                  </p>
                )}
              </div>

              {/* Bouton devis */}
              {isOpen && (
                <div className="shrink-0">
                  {dejaEnvoye ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" />Devis envoyé
                    </div>
                  ) : (
                    <Link
                      href={`/photographe/demandes/${id}/devis`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: '#130183' }}
                    >
                      <Send className="w-4 h-4" />Envoyer un devis
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {demande.description && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />Description
              </h2>
              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{demande.description}</p>
            </div>
          )}

          {/* Informations clés */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Informations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {demande.date_souhaitee && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Date souhaitée</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(demande.date_souhaitee)}</p>
                  </div>
                </div>
              )}
              {(demande.ville || demande.lieu) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Lieu</p>
                    <p className="text-sm font-semibold text-gray-900">{demande.ville}{demande.ville && demande.lieu ? ' — ' : ''}{demande.lieu}</p>
                  </div>
                </div>
              )}
              {demande.budget_max && (
                <div className="flex items-start gap-3">
                  <Banknote className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Budget max</p>
                    <p className="text-sm font-bold text-green-600">{Number(demande.budget_max).toLocaleString('fr-FR')} MAD</p>
                  </div>
                </div>
              )}
              {demande.duree_estimee_heures && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Durée estimée</p>
                    <p className="text-sm font-semibold text-gray-900">{demande.duree_estimee_heures}h</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Spécialité & détails */}
          {(demande.type_prestation?.length > 0 || details) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />Spécialité & détails
              </h2>
              <div className="flex flex-wrap gap-2">
                {(demande.type_prestation || []).map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700">{s}</span>
                ))}
                {details?.langages && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
                    Langages : {details.langages}
                  </span>
                )}
                {details?.matiere && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                    Matière : {details.matiere}
                  </span>
                )}
                {details?.niveau && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
                    Niveau : {details.niveau}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Instructions spéciales */}
          {demande.instructions_speciales && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Instructions spéciales</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{demande.instructions_speciales}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
