import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { notifyDevisAccepted, notifyDevisRefused } from '../../../lib/notificationService';
import Header from '../../../components/HeaderParti';
import { 
  ArrowLeft, Calendar, MapPin, Camera, 
  Star, MessageSquare, Check, X, Clock, Shield,
  FileText, AlertCircle, CheckCircle, Clock3,
  Banknote, Tag, Users, Package, Info, ListChecks
} from 'lucide-react';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
};

const STATUS_CONFIG = {
  en_attente: { label: 'En attente de réponse', color: 'bg-yellow-100 text-yellow-700' },
  envoye:     { label: 'En attente de réponse', color: 'bg-yellow-100 text-yellow-700' },
  lu:         { label: 'Lu',                   color: 'bg-blue-100 text-blue-700' },
  accepte:    { label: 'Accepté',              color: 'bg-green-100 text-green-700' },
  refuse:     { label: 'Refusé',              color: 'bg-red-100 text-red-700' },
  expire:     { label: 'Expiré',              color: 'bg-gray-100 text-gray-700' },
};

export default function DevisDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, profileId } = useAuth();
  
  const [devis, setDevis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');
  const [actionError, setActionError] = useState(null);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [createdReservationId, setCreatedReservationId] = useState(null);

  useEffect(() => {
    if (router.isReady && id) {
      fetchDevis();
    }
  }, [id, router.isReady]);

  const fetchDevis = async () => {
    setLoading(true);
    try {
      // Étape 1 : récupérer le devis + demande liée
      const { data: devisData, error: devisError } = await supabase
        .from('devis')
        .select(`
          *,
          demande:demandes_client(
            id, titre, categorie, date_souhaitee, lieu, budget_max
          )
        `)
        .eq('id', id)
        .single();

      if (devisError) {
        console.error('Erreur devis:', devisError);
        throw devisError;
      }

      // Étape 2 : récupérer le profil du prestataire séparément
      let prestataire = null;
      if (devisData.prestataire_id) {
        const { data: prestData } = await supabase
          .from('profiles')
          .select('nom, avatar_url')
          .eq('id', devisData.prestataire_id)
          .single();
        prestataire = prestData;
      }

      // Auto-expire si conditions remplies (fire-and-forget)
      if (['en_attente', 'envoye', 'lu'].includes(devisData.statut)) {
        const today = new Date().toISOString().split('T')[0];
        const demandeExpired = devisData.demande?.date_souhaitee
          ? devisData.demande.date_souhaitee < today
          : false;
        let devisValExpired = false;
        if (devisData.created_at && devisData.duree_validite_jours) {
          const expiry = new Date(
            new Date(devisData.created_at).getTime() + devisData.duree_validite_jours * 86400000
          );
          devisValExpired = expiry < new Date();
        }
        if (demandeExpired || devisValExpired) {
          devisData.statut = 'expire';
          supabase
            .from('devis')
            .update({ statut: 'expire', expire_at: new Date().toISOString() })
            .eq('id', id)
            .then(({ error }) => { if (error) console.error('expire fallback:', error); });
        }
      }

      setDevis({ ...devisData, prestataire });
    } catch (error) {
      console.error('Error fetching devis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setActionError(null);
    try {
      // 1. Update devis status
      const { error: devisError } = await supabase
        .from('devis')
        .update({ statut: 'accepte', accepte_at: new Date().toISOString() })
        .eq('id', id);

      if (devisError) throw devisError;

      // Update local state immediately so UI reflects acceptance
      setDevis(prev => ({ ...prev, statut: 'accepte' }));

      // 2. Update demande status + refuse other pending devis
      if (devis.demande_id) {
        await supabase
          .from('demandes_client')
          .update({ statut: 'pourvue', pourvue_at: new Date().toISOString() })
          .eq('id', devis.demande_id);

        // Refuser tous les autres devis en attente sur cette demande
        await supabase
          .from('devis')
          .update({ statut: 'refuse', refuse_at: new Date().toISOString() })
          .eq('demande_id', devis.demande_id)
          .neq('id', id)
          .eq('statut', 'en_attente');
      }

      // 3. Create reservation from devis data
      const demande = devis.demande;
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          client_id: devis.client_id,
          prestataire_id: devis.prestataire_id,
          devis_id: id,
          demande_id: devis.demande_id || null,
          titre: "Reservation " + demande?.titre,
          description: "Reservation " + (devis.description || ''),
          categorie: demande?.categorie || 'À définir',
          date: demande?.date_souhaitee || new Date().toISOString().split('T')[0],
          lieu: demande?.lieu || 'À définir',
          montant_total: devis.montant_total,
          duree_heures: devis.duree_prestation_heures || null,
          services_inclus: devis.services_inclus || null,
          monnaie: devis.monnaie || 'MAD',
          source: 'devis',
          // statut defaults to 'pending' via DB default
        })
        .select('id')
        .single();

      if (reservationError) {
        console.error('Reservation creation error:', reservationError);
        setAcceptSuccess(true);
        return;
      }

      // 4. Notify photographer
      if (devis.prestataire_id) {
        notifyDevisAccepted(devis.prestataire_id, id, devis.demande_id);
      }

      // 5. Show success banner with link (no auto-redirect)
      setCreatedReservationId(reservation.id);
      setAcceptSuccess(true);
    } catch (error) {
      console.error('Error accepting devis:', error);
      setActionError('Une erreur est survenue lors de l\'acceptation. Veuillez réessayer.');
    } finally {
      setAccepting(false);
    }
  };

  const handleRefuse = async () => {
    setRefusing(true);
    try {
      const { error } = await supabase
        .from('devis')
        .update({ 
          statut: 'refuse', 
          refuse_at: new Date().toISOString(),
          raison_refus: refuseReason || null
        })
        .eq('id', id);

      if (error) throw error;
      
      setDevis(prev => ({ ...prev, statut: 'refuse' }));
      setShowRefuseModal(false);

      // Notify photographer
      if (devis.prestataire_id) {
        notifyDevisRefused(devis.prestataire_id, id, devis.demande_id);
      }
    } catch (error) {
      console.error('Error refusing devis:', error);
    } finally {
      setRefusing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Non définie';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getExpirationInfo = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Validité fixée par le prestataire
    let devisValExpired = false;
    let daysLeft = null;
    if (devis?.created_at && devis?.duree_validite_jours) {
      const expiry = new Date(
        new Date(devis.created_at).getTime() + devis.duree_validite_jours * 86400000
      );
      if (expiry < today) {
        devisValExpired = true;
      } else {
        daysLeft = Math.ceil((expiry - today) / 86400000);
      }
    }

    // Date souhaitée de la demande
    const demandeExpired = devis?.demande?.date_souhaitee
      ? devis.demande.date_souhaitee < todayStr
      : false;

    return { devisValExpired, demandeExpired, daysLeft };
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

  if (!devis) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Devis introuvable</h2>
          <p className="text-gray-600 mb-6">Ce devis n'existe pas ou a été supprimé.</p>
          <button
            onClick={() => router.push('/client/demandes')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium"
          >
            Retour aux demandes
          </button>
        </div>
      </div>
    );
  }

  const photographe = devis.prestataire;
  const profile = devis.prestataire;
  const demande = devis.demande;
  const statusConfig = STATUS_CONFIG[devis.statut] || STATUS_CONFIG.en_attente;
  const { devisValExpired, demandeExpired, daysLeft } = getExpirationInfo();
  const canRespond = ['en_attente', 'envoye', 'lu'].includes(devis.statut);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── En-tête du devis ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm text-gray-500">Devis #{id.substring(0, 8)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {devis.titre || demande?.titre || 'Devis prestataire'}
                  </h1>
                  <p className="text-sm text-gray-400 mt-1">Reçu le {formatDate(devis.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-indigo-600">{devis.montant_total ?? devis.tarif_base} DH</p>
                  {devis.statut === 'expire' && (
                    <p className="text-sm text-red-500 max-w-xs text-right mt-1">
                      {devisValExpired && demandeExpired
                        ? `Expiré : la durée de validité du devis et la date de la demande (${formatDate(devis.demande?.date_souhaitee)}) sont toutes deux dépassées.`
                        : devisValExpired
                        ? 'Expiré : la durée de validité fixée par le prestataire est dépassée.'
                        : `Expiré : la date souhaitée de la demande (${formatDate(devis.demande?.date_souhaitee)}) est passée.`}
                    </p>
                  )}
                  {['en_attente', 'lu'].includes(devis.statut) && daysLeft !== null && (
                    <p className={`text-sm mt-1 ${daysLeft <= 3 ? 'text-red-500' : 'text-gray-500'}`}>
                      Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Message personnalisé */}
              {devis.message_personnalise && (
                <div className="mb-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-sm font-medium text-indigo-800 mb-1">Message du prestataire</p>
                  <p className="text-sm text-indigo-700 whitespace-pre-line">{devis.message_personnalise}</p>
                </div>
              )}

              {/* Description */}
              {devis.description && (
                <div className="mb-4">
                  <h2 className="font-medium text-gray-900 mb-1">Description de la prestation</h2>
                  <p className="text-gray-600 text-sm whitespace-pre-line">{devis.description}</p>
                </div>
              )}

              {/* Durée */}
              {devis.duree_prestation_heures > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Clock3 className="w-4 h-4 text-indigo-400" />
                  <span>Durée de prestation : <strong>{devis.duree_prestation_heures} heure{devis.duree_prestation_heures > 1 ? 's' : ''}</strong></span>
                </div>
              )}
            </div>

            {/* ── Dates & Horaires proposés ── */}
            {(devis.dates_disponibles?.length > 0 || devis.horaires_proposes) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  Dates &amp; horaires proposés
                </h2>

                {devis.dates_disponibles?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Dates disponibles</p>
                    <div className="flex flex-wrap gap-2">
                      {devis.dates_disponibles.map((d, i) => (
                        <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-lg border border-indigo-100">
                          {formatDate(d)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {devis.horaires_proposes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Horaires proposés</p>
                    {(() => {
                      const h = devis.horaires_proposes;
                      // Format { detail: "..." } ou { note: "..." } → afficher la valeur directement
                      const texte = typeof h === 'object' ? (h.detail || h.note || Object.values(h)[0]) : h;
                      if (typeof texte === 'string') {
                        return (
                          <div className="flex items-start gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="whitespace-pre-line">{texte}</span>
                          </div>
                        );
                      }
                      // Objet complexe → affichage clé/valeur
                      return (
                        <div className="space-y-1">
                          {Object.entries(h).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2 text-sm text-gray-700">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="capitalize font-medium">{k} :</span> <span>{v}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ── Services inclus ── */}
            {devis.services_inclus && (Array.isArray(devis.services_inclus) ? devis.services_inclus.length > 0 : Object.keys(devis.services_inclus).length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-green-500" />
                  Services inclus
                </h2>
                <ul className="space-y-2">
                  {Array.isArray(devis.services_inclus)
                    ? devis.services_inclus.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))
                    : Object.entries(devis.services_inclus).map(([k, v]) => (
                        <li key={k} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span><span className="font-medium capitalize">{k}</span>{v && v !== true ? ` : ${v}` : ''}</span>
                        </li>
                      ))
                  }
                </ul>
              </div>
            )}

            {/* ── Options supplémentaires ── */}
            {devis.options_supplementaires && Object.keys(devis.options_supplementaires).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-500" />
                  Options supplémentaires
                </h2>
                <ul className="space-y-2">
                  {Array.isArray(devis.options_supplementaires)
                    ? devis.options_supplementaires.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))
                    : Object.entries(devis.options_supplementaires).map(([k, v]) => (
                        <li key={k} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                          <span><span className="font-medium capitalize">{k}</span>{v && v !== true ? ` : ${v}` : ''}</span>
                        </li>
                      ))
                  }
                </ul>
              </div>
            )}

            {/* ── Détail du prix ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-indigo-500" />
                Détail du prix
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tarif de base</span>
                  <span className="font-medium">{devis.tarif_base} DH</span>
                </div>
                {devis.frais_deplacement > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Frais de déplacement</span>
                    <span className="font-medium">{devis.frais_deplacement} DH</span>
                  </div>
                )}
                {devis.frais_additionnels && Object.entries(devis.frais_additionnels).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">{k}</span>
                    <span className="font-medium">{v} DH</span>
                  </div>
                ))}
                {(devis.remise_montant > 0 || devis.remise_percent > 0) && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      Remise{devis.remise_percent > 0 ? ` (${devis.remise_percent}%)` : ''}
                    </span>
                    <span className="font-medium">- {devis.remise_montant} DH</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
                  <span className="font-medium text-gray-900">Total</span>
                  <span className="font-bold text-lg text-indigo-600">{devis.montant_total ?? devis.tarif_base} DH</span>
                </div>
              </div>

              {/* Acompte */}
              {devis.acompte_percent > 0 && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-xl">
                  <h4 className="font-medium text-indigo-900 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Conditions de paiement
                  </h4>
                  <ul className="text-sm text-indigo-700 space-y-1">
                    <li>• Acompte de {devis.acompte_percent}% : <strong>{devis.acompte_montant} DH</strong></li>
                    <li>• Solde : <strong>{(devis.montant_total ?? 0) - (devis.acompte_montant ?? 0)} DH</strong></li>
                  </ul>
                </div>
              )}

              {/* Modalités de paiement */}
              {devis.modalites_paiement?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Modes de paiement acceptés</p>
                  <div className="flex flex-wrap gap-2">
                    {devis.modalites_paiement.map((m, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Échéancier */}
              {devis.echeancier_paiement && Object.keys(devis.echeancier_paiement).length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Échéancier</p>
                  <div className="space-y-1">
                    {Object.entries(devis.echeancier_paiement).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm text-gray-700">
                        <span className="capitalize">{k}</span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Conditions d'annulation ── */}
            {(devis.conditions_annulation || devis.penalites_annulation) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-orange-400" />
                  Conditions d'annulation
                </h2>
                {devis.conditions_annulation && (
                  <p className="text-sm text-gray-600 mb-3 whitespace-pre-line">{devis.conditions_annulation}</p>
                )}
                {devis.penalites_annulation && Object.keys(devis.penalites_annulation).length > 0 && (
                  <div className="space-y-1">
                    {Object.entries(devis.penalites_annulation).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm text-gray-700">
                        <span className="capitalize">{k}</span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Demande associée ── */}
            {demande && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Demande associée</h2>
                <div
                  onClick={() => router.push(`/client/demandes/${demande.id}`)}
                  className="p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-all"
                >
                  <h4 className="font-medium text-gray-900 mb-2">{demande.titre || demande.categorie}</h4>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {demande.date_souhaitee && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(demande.date_souhaitee)}
                      </span>
                    )}
                    {demande.lieu && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {demande.lieu}
                      </span>
                    )}
                    {demande.budget_max && (
                      <span className="flex items-center gap-1">
                        <Banknote className="w-4 h-4" />
                        Budget max : {demande.budget_max} DH
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Success banner (devis accepted but reservation failed) ── */}
            {acceptSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Devis accepté avec succès !</p>
                  <p className="text-sm text-green-700 mt-1">
                    Votre accord a été enregistré. Le prestataire va être notifié et vous contactera pour confirmer les détails.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {createdReservationId && (
                      <button
                        onClick={() => router.push(`/client/reservations/${createdReservationId}`)}
                        className="text-sm text-green-700 font-medium underline hover:no-underline text-left"
                      >
                        Voir ma réservation →
                      </button>
                    )}
                    <button
                      onClick={() => router.push('/client/reservations')}
                      className="text-sm text-green-600 hover:no-underline text-left"
                    >
                      Toutes mes réservations →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Error banner ── */}
            {actionError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{actionError}</p>
              </div>
            )}

            {/* ── Actions ── */}
            {canRespond && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Répondre au devis</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {accepting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Acceptation...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Accepter le devis
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRefuseModal(true)}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Refuser
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Photographer info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Le photographe</h2>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden">
                  {photographe?.avatar_url ? (
                    <img
                      src={photographe.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {photographe?.nom || 'Photographe'}
                  </h4>
                </div>
              </div>

              {photographe?.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {photographe.description}
                </p>
              )}

              {photographe?.specialites && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Spécialités</p>
                  <div className="flex flex-wrap gap-1">
                    {photographe.specialites.slice(0, 4).map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/shared/messages?prestataire=${devis.prestataire_id}&devis=${devis.id}`)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Contacter
                </button>
                <button
                  onClick={() => router.push(`/client/photographes/${devis.prestataire_id}`)}
                  className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  Voir le profil complet
                </button>
              </div>
            </div>

            {/* Expiration warning */}
            {['en_attente', 'lu'].includes(devis.statut) && daysLeft !== null && daysLeft <= 5 && daysLeft > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Devis bientôt expiré</p>
                    <p className="text-sm text-yellow-700">
                      Ce devis expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}.
                      Pensez à y répondre rapidement.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Help */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">
                <strong>Besoin d'aide ?</strong> Notre équipe est disponible pour répondre à vos questions.
              </p>
              <button
                onClick={() => router.push('/support')}
                className="text-sm text-indigo-600 font-medium mt-2 hover:underline"
              >
                Contacter le support →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Refuse modal */}
      {showRefuseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Refuser ce devis ?
            </h2>
            <p className="text-gray-600 mb-4">
              Vous pouvez indiquer la raison de votre refus (optionnel). Le photographe sera notifié.
            </p>
            
            <textarea
              value={refuseReason}
              onChange={(e) => setRefuseReason(e.target.value)}
              placeholder="Raison du refus (optionnel)..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowRefuseModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuse}
                disabled={refusing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {refusing ? 'Refus en cours...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
