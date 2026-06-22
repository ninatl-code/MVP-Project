import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import Header from '../../../components/HeaderPresta';

import { notifyReservationConfirmed, notifyReservationCancelled } from '../../../lib/notificationService';
import {
  ArrowLeft, User, Calendar, Clock, MapPin,
  MessageSquare, Check, X, Camera,
  FileText, CheckCircle, Mail, Phone, Banknote,
  AlertCircle, Clock3, ListChecks
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG = {
  pending:    { label: 'En attente',  color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200', bg: 'bg-yellow-50',  description: 'En attente de votre confirmation' },
  confirmed:  { label: 'Confirmée',   color: 'bg-green-100 text-green-700',   border: 'border-green-200',  bg: 'bg-green-50',   description: 'Prestation confirmée' },
  in_progress:   { label: 'En cours',    color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200', bg: 'bg-indigo-50',  description: 'Prestation en cours' },
  completed:   { label: 'Terminée',    color: 'bg-blue-100 text-blue-700',     border: 'border-blue-200',   bg: 'bg-blue-50',    description: 'Prestation terminée avec succès' },
  cancelled:    { label: 'Annulée',     color: 'bg-red-100 text-red-700',       border: 'border-red-200',    bg: 'bg-red-50',     description: 'Cette réservation a été annulée' },
};



export default function PhotographeReservationDetailPage() {
  const generateInvoicePDF = async (factureData) => {
  const element = document.getElementById('invoice');

    if (!element) {
      console.error("Element #invoice introuvable");
      return null;
    }

    const worker = html2pdf().from(element).outputPdf();

    const pdf = await worker;
    const blob = pdf.output('blob');

    const filePath = `factures/${factureData.id}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('factures')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('factures')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };
  const router = useRouter();
  const { id } = router.query;
  const { photographeProfile } = useAuth();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [acceptComment, setAcceptComment] = useState('');
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [facture, setFacture] = useState(null);

  /* =========================
     FETCH SAFE
  ========================= */
  const fetchReservation = async () => {
    if (!id || !photographeProfile?.id) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          client:profiles!reservations_client_id_fkey(
            id, nom, email, telephone, avatar_url
          ),
          devis:devis_id (
            id, montant_total, message_personnalise,
            tarif_base, frais_deplacement,
            modalites_paiement
          ),
          demande:demandes_client!reservations_demande_id_fkey(
            id, titre, description, categorie
          )
        `)
        .eq('id', id)
        .eq('prestataire_id', photographeProfile.id)
        .single();

      if (error) throw error;

      setReservation(data || null);

      // Fetch linked invoice
      try {
        const { data: factureData } = await supabase
          .from('factures')
          .select('*')
          .eq('reservation_id', id)
          .maybeSingle();
        setFacture(factureData || null);
      } catch (_) {}
    } catch (err) {
      console.error(err);
      router.push('/photographe/reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservation();
  }, [id, photographeProfile?.id]);

  /* =========================
     HELPERS
  ========================= */
  const safeDate = (date) => {
    try {
      return date ? parseISO(date) : null;
    } catch {
      return null;
    }
  };

  const reservationDate = safeDate(reservation?.date);
  const isPastDate = reservationDate ? isPast(reservationDate) : false;

  const status = reservation?.statut;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const canConfirm = ['pending', 'en_attente'].includes(status);
  const canRefuse  = ['pending', 'en_attente'].includes(status);
  const canCancel  = ['pending', 'en_attente', 'confirmee', 'en_cours'].includes(status);
  const canComplete = status === 'confirmee' && isPastDate;

  /* =========================
     ACTIONS
  ========================= */
  const updateStatus = async (newStatus, extra = {}) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ statut: newStatus, ...extra })
        .eq('id', id);
      if (error) throw error;
      await fetchReservation();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm  = () => { setAcceptComment(''); setShowAcceptModal(true); };


  const handleConfirmSubmit = async () => {
    await updateStatus('confirmed', {
      notes_prestataire: acceptComment || null,
      date_confirmation: new Date().toISOString(),
    });
    await notifyReservationConfirmed (reservation.client_id, reservation.date,reservation.id, reservation.demande_id, reservation.prestataire_id);
    setShowAcceptModal(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await updateStatus('cancelled', { motif_annulation: cancelReason, annule_par: photographeProfile?.id, date_annulation: new Date().toISOString() });
    await notifyReservationCancelled({userId: reservation?.client_id, role: 'photographe', reservationId: reservation?.id, cancelledByName: photographeProfile?.id, demandeId: reservation?.demande_id});
    setShowCancelModal(false);
  };

  const handleRefuse = async () => {
    await updateStatus('cancelled', { motif_annulation: refuseReason || 'Refusé par le prestataire', annule_par: photographeProfile?.id, date_annulation: new Date().toISOString() });
    await notifyReservationCancelled({userId: reservation?.client_id, role: 'photographe', reservationId: reservation?.id, cancelledByName: photographeProfile?.id, demandeId: reservation?.demande_id});
    setShowRefuseModal(false);
  };

  const handleMessage = () => router.push(`/messages?client=${reservation?.client_id}&reservation=${id}`);

  const formatDate = (d) => {
    try { return d ? format(parseISO(d), 'EEEE d MMMM yyyy', { locale: fr }) : 'Non définie'; }
    catch { return 'Non définie'; }
  };
  const formatTime = (t) => t ? t.substring(0, 5) : '';

  /* =========================
     STATES UI
  ========================= */
  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB]"><Header />
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" />
      </div>
    </div>
  );

  if (!reservation) return (
    <div className="min-h-screen bg-[#F8F9FB]"><Header />
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Réservation introuvable</h2>
        <button onClick={() => router.push('/photographe/reservations')} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium">
          Retour aux réservations
        </button>
      </div>
    </div>
  );

  const client  = reservation.client  || {};
  const devis   = reservation.devis   || null;
  const demande = reservation.demande || {};
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8">

        <Link href="/photographe/reservations" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5" /> Retour aux réservations
        </Link>

        {/* Status banner */}
        <div className={`${sc.bg} border ${sc.border} rounded-xl p-4 mb-6 flex items-center gap-3`}>
          <Clock3 className={`w-5 h-5 ${sc.color.split(' ')[1]}`} />
          <div>
            <p className={`font-semibold ${sc.color.split(' ')[1]}`}>{sc.label}</p>
            <p className={`text-sm ${sc.color.split(' ')[1]} opacity-80`}>{sc.description}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Main ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Infos prestation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-5">
                {reservation.titre || demande.titre || 'Prestation'}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <div><p className="text-xs text-gray-500">Date</p><p className="font-medium text-sm">{formatDate(reservation.date)}</p></div>
                </div>
                {reservation.heure_debut && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Clock className="w-5 h-5 text-purple-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Horaires</p>
                      <p className="font-medium text-sm">{formatTime(reservation.heure_debut)}{reservation.heure_fin && ` → ${formatTime(reservation.heure_fin)}`}</p>
                    </div>
                  </div>
                )}
                {(reservation.lieu || reservation.ville) && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl sm:col-span-2">
                    <MapPin className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Lieu</p>
                      <p className="font-medium text-sm">{reservation.lieu || reservation.ville}</p>
                      {reservation.adresse_complete && <p className="text-xs text-gray-400 mt-0.5">{reservation.adresse_complete}</p>}
                    </div>
                  </div>
                )}
              </div>
              {demande.description && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700 text-sm whitespace-pre-line">{demande.description}</p>
                </div>
              )}
              {reservation.notes_client && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Note du client</p>
                  <p className="text-sm text-indigo-700">{reservation.notes_client}</p>
                </div>
              )}
              {reservation.motif_annulation && status === 'cancelled' && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-semibold text-red-500 uppercase mb-1">Motif d'annulation</p>
                  <p className="text-sm text-red-700">{reservation.motif_annulation}</p>
                </div>
              )}
            </div>

            {/* Devis */}
            {devis && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> Devis associé
                </h2>
                {devis.message_personnalise && (
                  <div className="mb-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Votre message</p>
                    <p className="text-sm text-indigo-700 italic">"{devis.message_personnalise}"</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  {devis.tarif_base != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tarif de base</span>
                      <span className="font-medium">{devis.tarif_base} MAD</span>
                    </div>
                  )}
                  {devis.frais_deplacement > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Frais de déplacement</span>
                      <span className="font-medium">{devis.frais_deplacement} MAD</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg text-indigo-700">{reservation.montant_total ?? devis.montant_total} MAD</span>
                  </div>
                </div>
                {devis.modalites_paiement?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {devis.modalites_paiement.map((m, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{m}</span>
                    ))}
                  </div>
                )}
                <Link href={`/photographe/devis/${devis.id}`} className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline font-medium">
                  <FileText className="w-4 h-4" /> Voir le devis complet →
                </Link>
              </div>
            )}

            {/* Facture */}
            {facture && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" /> Facture émise
                </h2>
                {facture?.pdf_url && (
                  <a
                    href={facture.pdf_url}
                    target="_blank"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Télécharger la facture PDF
                  </a>
                )}
                <div className="bg-green-50 rounded-xl border border-green-100 p-3 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">N° Facture</p>
                    <p className="font-bold text-gray-900">{facture.num_facture || `#${facture.id}`}</p>
                  </div>
                  <button onClick={() => router.push('/photographe/factures')} className="text-xs text-indigo-600 hover:underline font-medium">Voir toutes →</button>
                </div>
                {Array.isArray(facture.facture) && facture.facture.length > 0 && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs text-gray-500">Description</th>
                          <th className="text-right px-3 py-2 text-xs text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facture.facture.map((l, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2">{l.description}</td>
                            <td className="px-3 py-2 text-right font-medium">{(parseFloat(l.total) || 0).toFixed(2)} MAD</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="space-y-1.5">
                  {facture.montant_ht > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-gray-500">HT</span><span>{(parseFloat(facture.montant_ht) || 0).toFixed(2)} MAD</span></div>
                  )}
                  {facture.montant_tva > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-gray-500">TVA</span><span>{(parseFloat(facture.montant_tva) || 0).toFixed(2)} MAD</span></div>
                  )}
                  <div className="flex justify-between font-bold border-t border-gray-100 pt-2">
                    <span>Total TTC</span>
                    <span className="text-green-700 text-lg">{(parseFloat(facture.montant_ttc) || 0).toFixed(2)} MAD</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">

            {/* Client */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Client</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {client.avatar_url ? <img src={client.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-indigo-400" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{client.nom || 'Client'}</p>
                  {client.email && <p className="text-xs text-gray-400 truncate">{client.email}</p>}
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600"><Mail className="w-4 h-4" />{client.email}</a>}
                {client.telephone && <a href={`tel:${client.telephone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600"><Phone className="w-4 h-4" />{client.telephone}</a>}
              </div>
              <button onClick={handleMessage} className="w-full px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5" /> Envoyer un message
              </button>
            </div>

            {/* Montant */}
            {reservation.montant_total != null && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-indigo-500" /> Montant
                </h2>
                <p className="text-3xl font-bold text-indigo-600">{reservation.montant_total} MAD</p>
                {reservation.acompte_paye && <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Acompte reçu</p>}
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {canConfirm && (
                  <button disabled={actionLoading} onClick={handleConfirm}
                    className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" /> Accepter
                  </button>
                )}
                {canRefuse && (
                  <button disabled={actionLoading} onClick={() => setShowRefuseModal(true)}
                    className="w-full bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <X className="w-5 h-5" /> Refuser
                  </button>
                )}
                <button onClick={handleMessage}
                  className="w-full border border-indigo-200 text-indigo-600 py-2.5 rounded-xl font-medium hover:bg-indigo-50 flex items-center justify-center gap-2">
                  <MessageSquare className="w-5 h-5" /> Demander des infos
                </button>
                {canComplete && (
                  <button disabled={actionLoading} onClick={handleComplete}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Marquer terminée
                  </button>
                )}
                {canCancel && !canRefuse && (
                  <button onClick={() => setShowCancelModal(true)}
                    className="w-full border border-red-200 text-red-600 py-2.5 rounded-xl font-medium hover:bg-red-50 flex items-center justify-center gap-2">
                    <X className="w-5 h-5" /> Annuler la réservation
                  </button>
                )}
              </div>
            </div>

            {demande.id && (
              <Link href={`/photographe/demandes/${demande.id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:border-indigo-200 transition-all">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Voir la demande associée</p>
                    {demande.titre && <p className="text-xs text-gray-400 truncate">{demande.titre}</p>}
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Modal Accepter */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Accepter cette réservation ?</h2>
            <p className="text-gray-500 text-sm mb-4">Le client recevra une notification de confirmation.</p>
            <textarea value={acceptComment} onChange={(e) => setAcceptComment(e.target.value)}
              className="w-full border border-gray-200 p-3 rounded-xl resize-none focus:ring-2 focus:ring-green-500 text-sm" rows={3} placeholder="Message pour le client (optionnel)" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAcceptModal(false)} className="flex-1 px-6 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Annuler</button>
              <button disabled={actionLoading} onClick={handleConfirmSubmit}
                className="flex-1 bg-green-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50">
                {actionLoading ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Refuser */}
      {showRefuseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Refuser cette réservation ?</h2>
            <p className="text-gray-500 text-sm mb-4">Le client sera notifié de votre refus.</p>
            <textarea value={refuseReason} onChange={(e) => setRefuseReason(e.target.value)}
              className="w-full border border-gray-200 p-3 rounded-xl resize-none focus:ring-2 focus:ring-red-500 text-sm" rows={3} placeholder="Raison du refus (optionnel)" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRefuseModal(false)} className="flex-1 px-6 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Annuler</button>
              <button disabled={actionLoading} onClick={handleRefuse}
                className="flex-1 bg-red-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? 'En cours...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Annuler */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Annuler cette réservation ?</h2>
            <p className="text-gray-600 text-sm mb-4">Le client sera notifié. Cette action peut avoir des implications sur le paiement.</p>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              className="w-full border border-gray-200 p-3 rounded-xl resize-none focus:ring-2 focus:ring-red-500 text-sm" rows={3} placeholder="Motif de l'annulation (obligatoire)" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 px-6 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Retour</button>
              <button disabled={actionLoading || !cancelReason.trim()} onClick={handleCancel}
                className="flex-1 bg-red-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? 'Annulation...' : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}