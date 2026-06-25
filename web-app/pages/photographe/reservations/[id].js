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
  AlertCircle, Clock3, ListChecks, Plus // ✅ ajoute Plus
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
  const { photographeProfile, profileId } = useAuth();
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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    taux_tva: 0,
    montant_ht: 0,
    montant_tva: 0,
    montant_ttc: 0,
    lignes: [{ description: '', quantite: 1, prix_unitaire: 0, total: 0 }],
  });

    const safeDate = (date) => {
    try {
      return date ? parseISO(date) : null;
    } catch {
      return null;
    }
  };

  const reservationDate = safeDate(reservation?.date_prestation || reservation?.date);
  const isPastDate = reservationDate ? isPast(reservationDate) : false;

  const status = reservation?.statut;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const canConfirm  = status === 'pending';
  const canRefuse   = status === 'pending';
  const canCancel   = ['pending', 'confirmed', 'in_progress'].includes(status);
  const canComplete = status === 'confirmed' && isPastDate;

  useEffect(() => {
    if (router.isReady && id) {
      fetchReservation();
    }
  }, [id, photographeProfile?.id, router.isReady ]);

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

  /* =========================
     HELPERS
  ========================= */


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
    await notifyReservationConfirmed(reservation.client_id, reservation.date, reservation.id, reservation.demande_id, reservation.prestataire_id);

    const montant = parseFloat(reservation.montant_total) || 0;
    setInvoiceData({
      taux_tva: 0,
      montant_ht: montant,
      montant_tva: 0,
      montant_ttc: montant,
      lignes: [{
        description: reservation.titre || reservation.demande?.titre || 'Prestation',
        quantite: 1,
        prix_unitaire: montant,
        total: montant,
      }],
      // ✅ Pré-remplissage depuis la réservation
      destinataire_nom: client.nom || '',
      destinataire_email: client.email || '',
      destinataire_adresse: '',
      emetteur_nom: '',
      emetteur_adresse: '',
      emetteur_tel: '',
      emetteur_ice: '',
      logo_preview: null,
      notes: '',
      date_echeance: '',
    });

    setShowAcceptModal(false);
    setShowInvoiceModal(true);
  };

  // Après handleConfirmSubmit
  const updateLigne = (i, field, val) => {
    const lignes = invoiceData.lignes.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [field]: val };
      if (field === 'quantite' || field === 'prix_unitaire') {
        updated.total = (parseFloat(field === 'quantite' ? val : updated.quantite) || 0)
                      * (parseFloat(field === 'prix_unitaire' ? val : updated.prix_unitaire) || 0);
      }
      return updated;
    });
    const ht = lignes.reduce((s, l) => s + (parseFloat(l.total) || 0), 0);
    const tva = Math.round(ht * invoiceData.taux_tva) / 100;
    setInvoiceData(prev => ({ ...prev, lignes, montant_ht: ht, montant_tva: tva, montant_ttc: ht + tva }));
  };

  const addLigne = () => setInvoiceData(prev => ({
    ...prev,
    lignes: [...prev.lignes, { description: '', quantite: 1, prix_unitaire: 0, total: 0 }],
  }));

  const removeLigne = (i) => {
    const lignes = invoiceData.lignes.filter((_, idx) => idx !== i);
    const ht = lignes.reduce((s, l) => s + (parseFloat(l.total) || 0), 0);
    const tva = Math.round(ht * invoiceData.taux_tva) / 100;
    setInvoiceData(prev => ({ ...prev, lignes, montant_ht: ht, montant_tva: tva, montant_ttc: ht + tva }));
  };

  const updateTVA = (taux) => {
    const tva = Math.round(invoiceData.montant_ht * taux) / 100;
    setInvoiceData(prev => ({ ...prev, taux_tva: taux, montant_tva: tva, montant_ttc: prev.montant_ht + tva }));
  };

  const handleInvoiceSubmit = async () => {
    setActionLoading(true);
    try {
      // Générer un numéro de facture unique
      const now = new Date();
      const num_facture = `FAC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const { error } = await supabase.from('factures').insert({
        reservation_id: id,
        prestataire_id: photographeProfile?.id,
        num_facture,                                        // ✅ obligatoire
        montant_ht: parseFloat(invoiceData.montant_ht) || 0,
        montant_tva: parseFloat(invoiceData.montant_tva) || 0,
        montant_ttc: parseFloat(invoiceData.montant_ttc) || 0,
        facture: invoiceData.lignes,
        pdf_url: null,
      });

      if (error) throw error;

      setShowInvoiceModal(false);
      await fetchReservation();
    } catch (e) {
      console.error('Erreur création facture:', e);
    } finally {
      setActionLoading(false);
    }
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

  const handleComplete = async () => {
    await updateStatus('completed', {
      date_completion: new Date().toISOString(),
    });
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
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" />
      </div>
    </div>
  );

  if (!reservation) return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
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
                  <div><p className="text-xs text-gray-500">Date</p><p className="font-medium text-sm">{formatDate(reservation.date_prestation || reservation.date)}</p></div>
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

      {/* Modal Facture */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-4 overflow-hidden">
            
            {/* Header gradient */}
            <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #130183 0%, #5C6BC0 100%)' }}>
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-0.5">Nouvelle facture</p>
                <h2 className="font-bold text-white text-lg">
                  {`FAC-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}`}
                </h2>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

              {/* ── Émetteur / Destinataire ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Émetteur */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Votre entreprise</p>

                  {/* Logo upload */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Logo (optionnel)</label>
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                      onClick={() => document.getElementById('logo-upload-res').click()}
                    >
                      {invoiceData.logo_preview ? (
                        <img src={invoiceData.logo_preview} alt="Logo" className="h-10 mx-auto object-contain" />
                      ) : (
                        <div>
                          <div className="w-7 h-7 bg-gray-200 rounded-lg mx-auto mb-1 flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-400">Ajouter un logo</p>
                        </div>
                      )}
                      <input
                        id="logo-upload-res"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => setInvoiceData(prev => ({ ...prev, logo_preview: ev.target.result }));
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom / Raison sociale</label>
                    <input
                      type="text"
                      placeholder="Votre nom ou entreprise"
                      value={invoiceData.emetteur_nom || ''}
                      onChange={e => setInvoiceData(prev => ({ ...prev, emetteur_nom: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                    <textarea
                      placeholder="Adresse complète"
                      value={invoiceData.emetteur_adresse || ''}
                      onChange={e => setInvoiceData(prev => ({ ...prev, emetteur_adresse: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                      <input
                        type="text"
                        placeholder="+212..."
                        value={invoiceData.emetteur_tel || ''}
                        onChange={e => setInvoiceData(prev => ({ ...prev, emetteur_tel: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ICE / N° fiscal</label>
                      <input
                        type="text"
                        placeholder="Identifiant fiscal"
                        value={invoiceData.emetteur_ice || ''}
                        onChange={e => setInvoiceData(prev => ({ ...prev, emetteur_ice: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Destinataire — pré-rempli depuis la réservation */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Destinataire (client)</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom / Entreprise</label>
                    <input
                      type="text"
                      placeholder="Nom du client"
                      value={invoiceData.destinataire_nom || ''}
                      onChange={e => setInvoiceData(prev => ({ ...prev, destinataire_nom: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="client@email.com"
                      value={invoiceData.destinataire_email || ''}
                      onChange={e => setInvoiceData(prev => ({ ...prev, destinataire_email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                    <textarea
                      placeholder="Adresse du client"
                      value={invoiceData.destinataire_adresse || ''}
                      onChange={e => setInvoiceData(prev => ({ ...prev, destinataire_adresse: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date d'échéance</label>
                    <input
                      type="date"
                      value={invoiceData.date_echeance || ''}
                      onChange={e => setInvoiceData(prev => ({ ...prev, date_echeance: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ── Lignes de prestation ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prestations</p>
                  <button onClick={addLigne} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                    + Ajouter une ligne
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Description</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold w-16">Qté</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold w-28">P.U. (MAD)</th>
                        <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold w-24">Total</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.lignes.map((l, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <input value={l.description} onChange={e => updateLigne(i, 'description', e.target.value)}
                              className="w-full border-0 focus:outline-none bg-transparent text-sm" placeholder="Description" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="1" value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)}
                              className="w-full border-0 focus:outline-none bg-transparent text-sm text-right" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" value={l.prix_unitaire} onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)}
                              className="w-full border-0 focus:outline-none bg-transparent text-sm text-right" />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">{(parseFloat(l.total) || 0).toFixed(2)}</td>
                          <td className="px-2 py-2 text-center">
                            {invoiceData.lignes.length > 1 && (
                              <button onClick={() => removeLigne(i)} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Totaux + TVA ── */}
              <div className="flex justify-end">
                <div className="w-72 bg-gray-50 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Montant HT</span>
                    <span className="font-medium">{(parseFloat(invoiceData.montant_ht) || 0).toFixed(2)} MAD</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">TVA</span>
                    <div className="flex items-center gap-2">
                      <select value={invoiceData.taux_tva} onChange={e => updateTVA(parseFloat(e.target.value))}
                        className="border border-gray-200 rounded-lg px-2 py-0.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value={0}>0%</option>
                        <option value={7}>7%</option>
                        <option value={10}>10%</option>
                        <option value={14}>14%</option>
                        <option value={20}>20%</option>
                      </select>
                      <span className="font-medium">{(parseFloat(invoiceData.montant_tva) || 0).toFixed(2)} MAD</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
                    <span>Total TTC</span>
                    <span style={{ color: '#130183' }}>{(parseFloat(invoiceData.montant_ttc) || 0).toFixed(2)} MAD</span>
                  </div>
                </div>
              </div>

              {/* ── Notes ── */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notes / Conditions de paiement</label>
                <textarea
                  placeholder="Ex : Paiement par virement sous 30 jours. RIB : ..."
                  value={invoiceData.notes || ''}
                  onChange={e => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50">
              <button onClick={() => setShowInvoiceModal(false)} className="px-6 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 text-sm">
                Passer (plus tard)
              </button>
              <button disabled={actionLoading} onClick={handleInvoiceSubmit}
                className="flex-1 text-white px-6 py-2 rounded-xl font-medium disabled:opacity-50 text-sm"
                style={{ backgroundColor: '#130183' }}>
                {actionLoading ? 'Enregistrement...' : 'Enregistrer la facture'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}