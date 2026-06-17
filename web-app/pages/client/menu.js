import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Header from '../../components/HeaderParti'
import RealTimeNotifications from '../../components/RealTimeNotifications'
import { useCameraSplashNavigation } from '../../components/CameraSplash'
import { useAuth } from '../../contexts/AuthContext'
import * as DevisService from '../../lib/devisService'
import {
  Search, Minus, Plus, Calendar, Package, FileText,
  Star, Clock, CheckCircle, AlertCircle, User,
  ArrowRight, ArrowLeft, Filter, Grid3X3, List, Eye,
  TrendingUp, Activity, Award, Heart, RefreshCcw, X,
  Megaphone, ChevronRight
} from "lucide-react";

// Palette Shooty
const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// ─── StatusBadge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:   { label: 'En attente',  bg: '#FEF3C7', color: '#92400E' },
    answered:  { label: 'Répondu',     bg: '#DBEAFE', color: '#1E40AF' },
    accepted:  { label: 'Accepté',     bg: '#D1FAE5', color: '#065F46' },
    refused:   { label: 'Refusé',      bg: '#FEE2E2', color: '#991B1B' },
    confirmed: { label: 'Confirmé',    bg: '#D1FAE5', color: '#065F46' },
    cancelled: { label: 'Annulé',      bg: '#FEE2E2', color: '#991B1B' },
    TBC:       { label: 'À confirmer', bg: '#EDE9FE', color: '#5B21B6' },
    paid:      { label: 'Payé',        bg: '#D1FAE5', color: '#065F46' },
    delivered: { label: 'Terminé',     bg: '#F3F4F6', color: '#374151' },
  };
  const s = map[status] || { label: status || '—', bg: '#F3F4F6', color: '#374151' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: 20, padding: '2px 10px',
      fontSize: 12, fontWeight: 600
    }}>{s.label}</span>
  );
}

// ─── MiniCalendar ────────────────────────────────────────────────────────────
function MiniCalendar({ dateFilter, onSelect, onClose }) {
  const [calendarDate, setCalendarDate] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const { year, month } = calendarDate;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div style={{
      position: 'absolute',
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      padding: 12,
      zIndex: 1000,
      top: 40,
      left: 0,
      minWidth: 200
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          style={{ background: '#f6f6f6', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 15, cursor: 'pointer' }}
          onClick={() => setCalendarDate(d => {
            let newMonth = d.month - 1, newYear = d.year;
            if (newMonth < 0) { newMonth = 11; newYear -= 1; }
            return { year: newYear, month: newMonth };
          })}
        >◀</button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{monthNames[month]} {year}</span>
        <button
          style={{ background: '#f6f6f6', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 15, cursor: 'pointer' }}
          onClick={() => setCalendarDate(d => {
            let newMonth = d.month + 1, newYear = d.year;
            if (newMonth > 11) { newMonth = 0; newYear += 1; }
            return { year: newYear, month: newMonth };
          })}
        >▶</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((j, i) => (
          <div key={i} style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>{j}</div>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          return (
            <button
              key={dateStr}
              style={{
                border: 'none',
                background: dateFilter === dateStr ? '#6bbf7b' : '#f6f6f6',
                color: dateFilter === dateStr ? '#fff' : '#222',
                borderRadius: 6, width: 24, height: 24, fontSize: 13, cursor: 'pointer', margin: 1
              }}
              onClick={() => { onSelect(dateStr); onClose(); }}
            >{i + 1}</button>
          );
        })}
      </div>
      <button
        style={{ marginTop: 8, background: '#eee', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 13, cursor: 'pointer', width: '100%' }}
        onClick={() => { onSelect('all'); onClose(); }}
      >Réinitialiser</button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
function ParticularHomeMenu() {
  const router = useRouter();
  const { navigateWithSplash, CameraSplashComponent } = useCameraSplashNavigation(router, 2000);
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [devis, setDevis] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [prestations, setPrestations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [prestationFilter, setPrestationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [loadingDevisAction, setLoadingDevisAction] = useState(false);
  const [existingAvis, setExistingAvis] = useState([]);
  const [stats, setStats] = useState({ demandes: 0, devis: 0, reservations: 0, avis: 0 });
  const [unreadCounts, setUnreadCounts] = useState({ demandes: 0, devis: 0, reservations: 0 });
  const [showRatingForm, setShowRatingForm] = useState(null);
  const [triggerAvisNotification, setTriggerAvisNotification] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelReservation, setSelectedCancelReservation] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationConditions, setCancellationConditions] = useState(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  const { availableProfiles, switchProfile, profileId } = useAuth();
  const hasMultipleProfiles = availableProfiles?.length > 1;

  // ── helpers ────────────────────────────────────────────────────────────────
  const hasAvis = (type, id) => {
    return existingAvis.some(a => a.reservation_id === id);
  };

  // ── fetchReservations (standalone so it can be called anywhere) ────────────
  const fetchReservations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('reservations')
      .select('*, profiles!reservations_prestataire_id_fkey(nom, email), prestations_photographe!reservations_annonce_id_fkey(titre, conditions_annulation)')
      .eq('particulier_id', user.id);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (prestationFilter !== 'all') query = query.eq('prestation', prestationFilter);
    if (dateFilter !== 'all') query = query.eq('date', dateFilter);

    const { data, error } = await query;
    if (error) console.error(error);
    else setReservations(data || []);
  }, [statusFilter, prestationFilter, dateFilter]);

  // ── initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('nom, avatar_url')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      const { data: devisData } = await supabase
        .from('devis')
        .select('*, prestations_photographe!devis_annonce_id_fkey(titre), profiles!devis_prestataire_id_fkey(nom, email)')
        .eq('particulier_id', user.id);
      setDevis(devisData || []);

      await fetchReservations();
      await loadStats(user.id);
      await loadUnreadCounts(user.id);
    };
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  // ── prestations ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPrestations = async () => {
      const { data, error } = await supabase.from('prestations').select('id, nom');
      if (!error) setPrestations(data || []);
    };
    fetchPrestations();
  }, []);

  // ── unread counts ─────────────────────────────────────────────────────────
  const loadUnreadCounts = async (uid) => {
    if (!uid) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('type, devis_id, reservation_id, demande_id')
        .eq('user_id', uid)
        .eq('lu', false);
      if (!data) return;
      setUnreadCounts({
        devis: data.filter(n => n.type === 'devis' || n.devis_id).length,
        reservations: data.filter(n => n.type === 'reservation' || n.reservation_id).length,
        demandes: data.filter(n => n.type === 'demande' || n.demande_id).length,
      });
    } catch { /* silent */ }
  };

  // ── stats ─────────────────────────────────────────────────────────────────
  const loadStats = async (pid) => {
    if (!pid) return;
    try {
      const [
        { count: demandesCount },
        { count: devisCount },
        { count: reservationsCount },
        { count: avisCount },
      ] = await Promise.all([
        supabase.from('demandes_client').select('*', { count: 'exact', head: true }).eq('client_id', pid),
        supabase.from('devis').select('*', { count: 'exact', head: true }).eq('particulier_id', pid),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('particulier_id', pid),
        supabase.from('reviews_presta').select('*', { count: 'exact', head: true }).eq('client_id', pid),
      ]);
      setStats({
        demandes: demandesCount || 0,
        devis: devisCount || 0,
        reservations: reservationsCount || 0,
        avis: avisCount || 0,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  // ── switch profile ────────────────────────────────────────────────────────
  const handleSwitchToPhotographe = async () => {
    const photographeProfile = availableProfiles?.find(p => p.role === 'photographe' || p.role === 'prestataire');
    if (photographeProfile) {
      await switchProfile(photographeProfile.id);
      setShowSwitchModal(false);
      router.push('/photographe/menu');
    }
  };

  // ── cancellation conditions ───────────────────────────────────────────────
  const checkCancellationConditions = async (reservation) => {
    if (!reservation?.annonce_id || !reservation?.date) {
      return { canCancel: false, reason: 'Données de réservation incomplètes' };
    }
    try {
      const { data: annonceData, error } = await supabase
        .from('prestations_photographe')
        .select('conditions_annulation')
        .eq('id', reservation.annonce_id)
        .single();

      if (error || !annonceData) {
        return { canCancel: false, reason: "Impossible de récupérer les conditions d'annulation" };
      }

      const conditionAnnulation = annonceData.conditions_annulation;
      const reservationDate = new Date(reservation.date);
      const currentDate = new Date();
      const timeDiff = reservationDate.getTime() - currentDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      const hoursDiff = Math.ceil(timeDiff / (1000 * 3600));

      switch (conditionAnnulation) {
        case 'Flexible':
          return hoursDiff >= 24
            ? { canCancel: true, refundPercentage: 100, message: 'Annulation gratuite (plus de 24h avant)' }
            : { canCancel: false, reason: 'Annulation impossible (moins de 24h avant la prestation)' };

        case 'Modéré':
          if (daysDiff >= 7) return { canCancel: true, refundPercentage: 100, message: 'Annulation gratuite (plus de 7 jours avant)' };
          if (daysDiff >= 1) return { canCancel: true, refundPercentage: 50, message: 'Annulation possible avec remboursement de 50%' };
          return { canCancel: false, reason: 'Annulation impossible (moins de 24h avant la prestation)' };

        case 'Strict':
          return { canCancel: true, refundPercentage: 0, message: 'Annulation possible uniquement pour force majeure (aucun remboursement)', forceMajeure: true };

        default:
          return hoursDiff >= 24
            ? { canCancel: true, refundPercentage: 100, message: 'Annulation gratuite (plus de 24h avant)' }
            : { canCancel: false, reason: 'Annulation impossible (moins de 24h avant la prestation)' };
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des conditions:', error);
      return { canCancel: false, reason: 'Erreur lors de la vérification des conditions' };
    }
  };

  // ── cancel reservation ────────────────────────────────────────────────────
  const handleCancelReservation = async () => {
    if (!selectedCancelReservation) return;
    setIsCancelling(true);
    try {
      const cancellationCheck = await checkCancellationConditions(selectedCancelReservation);
      if (!cancellationCheck.canCancel) {
        alert(cancellationCheck.reason);
        setIsCancelling(false);
        return;
      }
      if (cancellationCheck.forceMajeure && (!cancelReason || cancelReason.trim().length < 20)) {
        alert("Veuillez fournir une justification détaillée pour l'annulation (minimum 20 caractères)");
        setIsCancelling(false);
        return;
      }
      if (!userId || !selectedCancelReservation?.id) {
        alert('Erreur: données manquantes');
        setIsCancelling(false);
        return;
      }

      const refundResponse = await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedCancelReservation.id,
          cancelReason: cancelReason || 'Annulation selon conditions',
          userId,
        }),
      });
      const refundResult = await refundResponse.json();

      if (!refundResponse.ok) {
        const errorMsg = refundResult.debug
          ? `Debug: ${JSON.stringify(refundResult.debug, null, 2)}`
          : (refundResult.error || 'Erreur lors du remboursement');
        alert('Erreur détaillée:\n' + errorMsg);
        throw new Error(refundResult.error || 'Erreur lors du remboursement');
      }

      if (refundResult.success) {
        alert(refundResult.message || 'Réservation annulée avec succès');
        setShowCancelModal(false);
        setSelectedCancelReservation(null);
        setCancelReason('');
        setCancellationConditions(null);
        await fetchReservations();
      }

      // Notify prestataire
      await supabase.from('notifications').insert([{
        user_id: selectedCancelReservation.prestataire_id,
        type: 'reservation',
        contenu: `Réservation annulée par le client${refundResult.refundPercentage < 100 ? ` (remboursement ${refundResult.refundPercentage}%)` : ''}`,
      }]);

      let message = 'Réservation annulée avec succès !';
      if (refundResult.refundAmount > 0) {
        message += `\n💰 Remboursement: ${refundResult.refundAmount} MAD (${refundResult.refundPercentage}%)`;
        message += `\n⏰ Le remboursement sera traité sous 5-10 jours ouvrés.`;
      } else if (refundResult.refundPercentage === 0) {
        message += `\n📋 Votre demande d'annulation pour force majeure a été enregistrée.`;
        message += `\nElle sera examinée par notre équipe sous 24-48h.`;
      }
      alert(message);
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      alert('Erreur lors du traitement: ' + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  // ── devis actions ─────────────────────────────────────────────────────────
  async function handleAcceptDevis(d) {
    setLoadingDevisAction(true);
    try {
      const { error: devisError } = await supabase
        .from('devis').update({ status: 'accepted' }).eq('id', d.id);
      if (devisError) { alert("Erreur lors de l'acceptation du devis :\n" + devisError.message); return; }

      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert([{
          status: 'TBC', devis_id: d.id, montant: d.montant,
          montant_acompte: d.montant_acompte, particulier_id: d.particulier_id,
          prestataire_id: d.prestataire_id, annonce_id: d.annonce_id,
          duree: d.duree, endroit: d.endroit, ville: d.ville,
          participants: d.participants || d.nb_personnes, photos: d.photos || [],
          unit_tarif: d.unit_tarif, date: d.date,
          client_nom: d.client_nom || '', client_email: d.client_email || '',
        }])
        .select().single();

      if (reservationError || !reservationData) {
        alert("Erreur lors de la création de la réservation :\n" + (reservationError?.message || 'Aucune donnée retournée.'));
        return;
      }

      await supabase.from('notifications').insert([{
        user_id: d.prestataire_id, type: 'devis', contenu: 'votre devis a été accepté',
      }]);

      setSelectedDevis(null);
      router.push(`/annonces/${d.annonce_id}/reservations?reservation_id=${reservationData.id}`);
    } catch (err) {
      alert('Erreur inattendue :\n' + (err.message || JSON.stringify(err)));
    } finally {
      setLoadingDevisAction(false);
    }
  }

  async function handleRefuseDevis(d) {
    setLoadingDevisAction(true);
    const { error } = await supabase.from('devis').update({ status: 'refused' }).eq('id', d.id);
    if (error) { alert('Erreur lors du refus du devis.'); setLoadingDevisAction(false); return; }
    await supabase.from('notifications').insert([{
      user_id: d.prestataire_id, type: 'devis', contenu: 'votre devis a été refusé',
    }]);
    setLoadingDevisAction(false);
    setSelectedDevis(null);
  }

  // ── rating ────────────────────────────────────────────────────────────────
  const submitRatingFromMenu = async () => {
    if (!showRatingForm || ratingValue === 0) return;
    setIsSubmittingRating(true);
    try {
      await supabase.from('reviews_presta').insert([{
        client_id: userId,
        reservation_id: showRatingForm.reservation_id,
        annonce_id: showRatingForm.annonce_id,
        note: ratingValue,
        commentaire: ratingComment,
      }]);
      setExistingAvis(prev => [...prev, { reservation_id: showRatingForm.reservation_id, note: ratingValue }]);
      setShowRatingForm(null);
      setRatingValue(0);
      setRatingComment('');
    } catch (e) {
      alert('Erreur lors de la soumission : ' + e.message);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // ── handleUpdate ──────────────────────────────────────────────────────────
  const handleUpdate = async (id, status) => {
    if (status === 'cancelled') {
      setShowConfirm(false);
      setPendingCancelId(null);
    }
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
    if (error) {
      alert('Erreur lors de la mise à jour du statut.');
    } else {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  // ── sorted lists ──────────────────────────────────────────────────────────
  const devisSorted = [...devis].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const reservationsSorted = [...reservations].sort((a, b) => new Date(b.date) - new Date(a.date));

  // ── CancelReservationButton ───────────────────────────────────────────────
  function CancelReservationButton({ reservation }) {
    const [isChecking, setIsChecking] = useState(false);

    const handleCancelClick = async () => {
      setIsChecking(true);
      try {
        const conditions = await checkCancellationConditions(reservation);
        setCancellationConditions(conditions);
        if (conditions.canCancel) {
          setSelectedCancelReservation(reservation);
          setShowCancelModal(true);
        } else {
          alert(conditions.reason);
        }
      } catch (error) {
        alert('Erreur: ' + error.message);
      } finally {
        setIsChecking(false);
      }
    };

    return (
      <button
        onClick={handleCancelClick}
        disabled={isChecking}
        style={{
          background: isChecking ? '#f5f5f5' : '#fbe7ee',
          color: isChecking ? '#999' : '#e67c73',
          border: 'none', borderRadius: 8, padding: '8px 18px',
          fontWeight: 600, fontSize: 15,
          cursor: isChecking ? 'not-allowed' : 'pointer',
          opacity: isChecking ? 0.6 : 1,
        }}
      >
        {isChecking ? 'Vérification...' : 'Annuler'}
      </button>
    );
  }

  // ── DevisCard ─────────────────────────────────────────────────────────────
  function DevisCard({ r }) {
    return (
      <div style={{
        background: '#fff', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        padding: 24, marginBottom: 18, display: 'flex', alignItems: 'center',
        gap: 18, border: '1px solid #f1f1f1'
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%', background: '#f3f3f3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 22, color: '#888', flexShrink: 0
        }}>
          {(r.profiles?.nom || r.nom_prestataire || '?').split(' ').map(n => n[0]).join('').toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{r.profiles?.nom || r.nom_prestataire || 'Prestataire inconnu'}</span>
            <StatusBadge status={r.status} />
          </div>
          <div style={{ color: '#888', fontSize: 15, marginTop: 2 }}>{r.profiles?.email || 'Email non disponible'}</div>
          <div style={{ color: '#130183', fontSize: 15, marginTop: 6, fontWeight: 600 }}>
            <span style={{ color: '#130183', fontSize: 15, fontWeight: 600 }}>Service demandé : </span>
            <span style={{ color: '#000', fontSize: 15, fontWeight: 400 }}>{r.annonces?.titre || r.prestations_photographe?.titre || 'Service'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: 15 }}>
              📍 {r.endroit || 'Lieu inconnu'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: 15 }}>
              👥 {r.participants || r.nb_personnes ? `${r.participants || r.nb_personnes} pers.` : 'Non renseigné'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: 15 }}>
              🕐 {r.date ? new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : 'Date non définie'}
            </span>
          </div>
        </div>
        <button
          style={{ background: '#130183', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
          onClick={() => setSelectedDevis(r)}
        >
          Afficher les détails
        </button>
      </div>
    );
  }

  // ── ReservationCard ───────────────────────────────────────────────────────
  function ReservationCard({ r }) {
    return (
      <div style={{
        background: '#fff', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        padding: 24, marginBottom: 18, display: 'flex', alignItems: 'center',
        gap: 18, border: '1px solid #f1f1f1', flexWrap: 'wrap'
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%', background: '#f3f3f3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 22, color: '#888', flexShrink: 0
        }}>
          {(r.profiles?.nom || '?').split(' ').map(n => n[0]).join('').toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{r.profiles?.nom || 'Nom inconnu'}</span>
            <StatusBadge status={r.status} />
          </div>
          <div style={{ color: '#888', fontSize: 15, marginTop: 2 }}>{r.profiles?.email}</div>
          <div style={{ color: '#130183', fontSize: 15, marginTop: 6, fontWeight: 600 }}>
            <span style={{ color: '#130183', fontSize: 15, fontWeight: 600 }}>Annonce réservée : </span>
            <span style={{ color: '#000', fontSize: 15, fontWeight: 400 }}>{r.annonces?.titre || r.prestations_photographe?.titre || 'Annonce inconnue'}</span>
            {r.num_reservation && <span style={{ color: '#666', fontSize: 14, fontWeight: 400 }}> #{r.num_reservation}</span>}
          </div>
          {r.prestation && (
            <div style={{ color: '#130183', fontSize: 15, marginTop: 2, fontWeight: 600 }}>
              Prestation : {prestations.find(p => p.id === r.prestation)?.nom || ''}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ color: '#666', fontSize: 15 }}>📍 {r.endroit || 'Lieu inconnu'}</span>
            {r.nb_personnes && <span style={{ color: '#666', fontSize: 15 }}>👥 {r.nb_personnes} pers.</span>}
            <span style={{ color: '#666', fontSize: 15 }}>
              🕐 {r.date ? new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : ''}
              {r.heure ? `, ${r.heure}:00` : ''}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            style={{ background: '#130183', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
            onClick={() => setSelectedReservation(r)}
          >
            Afficher les détails
          </button>
          {(r.status === 'pending' || r.status === 'paid') && (
            <CancelReservationButton reservation={r} />
          )}
        </div>

        {/* Avis déjà donné */}
        {r.status === 'delivered' && hasAvis('reservation', r.id) && (
          <div style={{ width: '100%', marginTop: 12, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, border: '1px solid #0ea5e9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0369a1' }}>✅ Avis déjà donné</span>
              <span style={{ fontSize: 12, color: '#0369a1', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                {existingAvis.find(a => a.reservation_id === r.id)?.note || 0}⭐
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#0369a1', fontStyle: 'italic' }}>Merci d'avoir partagé votre expérience !</div>
          </div>
        )}

        {/* Zone de notation */}
        {r.status === 'delivered' && !hasAvis('reservation', r.id) && (
          <div style={{ width: '100%', marginTop: 12, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #22c55e' }}>
            <button
              onClick={() => {
                setTriggerAvisNotification({
                  id: `avis-reservation-${r.id}`,
                  type: 'avis',
                  reservation_id: r.id,
                  annonce_id: r.annonce_id,
                  contenu: 'Donnez votre avis sur cette prestation.',
                  user_id: userId,
                });
              }}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#fff', border: 'none', borderRadius: 6,
                padding: '6px 12px', fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}
            >
              ⭐ Noter maintenant
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── DevisInfoModal ────────────────────────────────────────────────────────
  function DevisInfoModal({ devis, onClose }) {
    if (!devis) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #635BFF 0%, #5048E5 100%)', padding: '24px 32px', borderRadius: '20px 20px 0 0', color: '#fff', position: 'relative' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 24, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 18, color: '#fff', cursor: 'pointer' }}>×</button>
            <h2 style={{ fontWeight: 700, fontSize: 24, margin: 0 }}>📋 Devis</h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>
              Demandé le {devis.created_at ? new Date(devis.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
          <div style={{ padding: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 32 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333' }}>👤 Prestataire</h2>
                <div style={{ fontSize: 16, color: '#555', marginBottom: 8 }}><strong>{devis.profiles?.nom || devis.nom_prestataire || 'Non renseigné'}</strong></div>
                <div style={{ fontSize: 14, color: '#888' }}>{devis.profiles?.email || 'Email non disponible'}</div>
                <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Service : {devis.annonces?.titre || devis.prestations_photographe?.titre || 'Non renseigné'}</div>
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333' }}>📅 Détails</h2>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}><strong>Date :</strong> {devis.date ? new Date(devis.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Non définie'}</div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}><strong>Durée :</strong> {devis.duree || 'Non renseignée'} {devis.unit_tarif || ''}</div>
                <div style={{ fontSize: 14, color: '#555' }}><strong>Lieu :</strong> {devis.endroit || 'Non renseigné'}</div>
              </div>
            </div>

            {(devis.montant || devis.montant_acompte) && (
              <div style={{ background: '#F8F9FB', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333' }}>💰 Tarification</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, color: '#555' }}>Montant total HT :</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{devis.montant || 0} MAD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, color: '#555' }}>Acompte demandé :</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#635BFF' }}>{devis.montant_acompte || 0} MAD</span>
                </div>
                {(devis.participants || devis.nb_personnes) && (
                  <div style={{ marginTop: 12, fontSize: 14, color: '#555' }}>
                    <strong>Participants :</strong> {devis.participants || devis.nb_personnes} personne{(devis.participants || devis.nb_personnes) > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}

            {devis.comment_client && (
              <div style={{ background: '#FFF9E6', border: '1px solid #FFD369', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#856404' }}>💬 Votre demande</h4>
                <p style={{ margin: 0, fontSize: 14, color: '#856404', fontStyle: 'italic' }}>"{devis.comment_client}"</p>
              </div>
            )}

            {devis.comment_presta && (
              <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#4338CA' }}>💬 Réponse du prestataire</h4>
                <p style={{ margin: 0, fontSize: 14, color: '#4338CA', fontStyle: 'italic' }}>"{devis.comment_presta}"</p>
                {devis.date_reponse && <div style={{ marginTop: 8, fontSize: 12, color: '#6366F1' }}>Répondu le {new Date(devis.date_reponse).toLocaleDateString('fr-FR')}</div>}
              </div>
            )}

            {Array.isArray(devis.devis_pdf) && devis.devis_pdf.length > 0 && devis.devis_pdf[0] && (
              <div style={{ background: 'linear-gradient(135deg, #E8EAF6 0%, #F8F9FB 100%)', border: '2px solid #635BFF', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#130183' }}>📄 Devis PDF</h4>
                <button
                  style={{ background: '#635BFF', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%' }}
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = 'data:application/pdf;base64,' + devis.devis_pdf[0];
                    link.download = `Devis-${devis.num_devis || devis.id}.pdf`;
                    link.click();
                  }}
                >⬇️ Télécharger le PDF</button>
                {devis.num_devis && <div style={{ marginTop: 12, fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>Numéro de devis : {devis.num_devis}</div>}
              </div>
            )}

            {(devis.status === 'accepted' || devis.status === 'refused') && (
              <div style={{ background: devis.status === 'accepted' ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${devis.status === 'accepted' ? '#10B981' : '#EF4444'}`, borderRadius: 12, padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: devis.status === 'accepted' ? '#065F46' : '#991B1B' }}>
                  {devis.status === 'accepted' ? '✅ Devis accepté' : '🚫 Devis refusé'}
                </h4>
              </div>
            )}

            {devis.status === 'answered' && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                  disabled={loadingDevisAction}
                  onClick={() => handleAcceptDevis(devis)}
                >
                  {loadingDevisAction ? 'Traitement...' : '✓ Accepter le devis'}
                </button>
                <button
                  style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                  disabled={loadingDevisAction}
                  onClick={() => handleRefuseDevis(devis)}
                >
                  {loadingDevisAction ? 'Traitement...' : '✕ Refuser le devis'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ReservationInfoModal ──────────────────────────────────────────────────
  function ReservationInfoModal({ reservation, onClose }) {
    if (!reservation) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #FF7F50 0%, #FF6347 100%)', padding: '24px 32px', borderRadius: '20px 20px 0 0', color: '#fff', position: 'relative' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 24, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 18, color: '#fff', cursor: 'pointer' }}>×</button>
            <h2 style={{ fontWeight: 700, fontSize: 24, margin: 0 }}>🎉 Réservation {reservation.num_reservation && <span style={{ fontSize: 18, opacity: 0.9 }}>#{reservation.num_reservation}</span>}</h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>{reservation.annonces?.titre || reservation.prestations_photographe?.titre || 'Service'}</p>
          </div>
          <div style={{ padding: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 32 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333' }}>👤 Prestataire</h2>
                <div style={{ fontSize: 16, color: '#555', marginBottom: 8 }}><strong>{reservation.profiles?.nom || 'Non renseigné'}</strong></div>
                <div style={{ fontSize: 14, color: '#888' }}>{reservation.profiles?.email || 'Email non disponible'}</div>
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333' }}>📅 Planning</h2>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}><strong>Date :</strong> {reservation.date ? new Date(reservation.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Non définie'}</div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}><strong>Durée :</strong> {reservation.duree || 'Non renseignée'} {reservation.unit_tarif || ''}</div>
                <div style={{ fontSize: 14, color: '#555' }}><strong>Lieu :</strong> {reservation.endroit || 'Non renseigné'}</div>
              </div>
            </div>

            <div style={{ background: '#F8F9FB', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#333' }}>💰 Facturation</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: '#555' }}>Montant total HT :</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{reservation.montant || 0} MAD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#555' }}>Acompte payé :</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#FF7F50' }}>{reservation.montant_acompte || 0} MAD</span>
              </div>
              {reservation.nb_personnes && (
                <div style={{ marginTop: 12, fontSize: 14, color: '#555' }}>
                  <strong>Participants :</strong> {reservation.nb_personnes} personne{reservation.nb_personnes > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {reservation.commentaire && (
              <div style={{ background: '#FFF9E6', border: '1px solid #FFD369', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#856404' }}>💬 Votre message</h4>
                <p style={{ margin: 0, fontSize: 14, color: '#856404', fontStyle: 'italic' }}>"{reservation.commentaire}"</p>
              </div>
            )}

            {Array.isArray(reservation.photos) && reservation.photos.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>📸 Photos jointes</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
                  {reservation.photos.map((b64, idx) => (
                    <img key={idx} src={`data:image/*;base64,${b64}`} alt={`Photo ${idx + 1}`}
                      style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #e5e7eb', cursor: 'pointer' }}
                      onClick={() => {
                        const modal = document.createElement('div');
                        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
                        modal.innerHTML = `<img src="data:image/*;base64,${b64}" style="max-width:90%;max-height:90%;border-radius:8px">`;
                        modal.onclick = () => document.body.removeChild(modal);
                        document.body.appendChild(modal);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {(reservation.status === 'confirmed' || reservation.status === 'cancelled' || reservation.status === 'refused') && (
              <div style={{ background: reservation.status === 'confirmed' ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${reservation.status === 'confirmed' ? '#10B981' : '#EF4444'}`, borderRadius: 12, padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: reservation.status === 'confirmed' ? '#065F46' : '#991B1B' }}>
                  {reservation.status === 'confirmed' ? '✅ Confirmée' : reservation.status === 'cancelled' ? '❌ Annulée' : '🚫 Refusée'}
                </h4>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <Header />
      <RealTimeNotifications userId={userId} triggerNotification={triggerAvisNotification} />

      {/* Modal de notation */}
      {showRatingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full mx-4 overflow-hidden">
            <div className="flex justify-end p-2">
              <button onClick={() => { setShowRatingForm(null); setRatingValue(0); setRatingComment(''); }} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 pb-4">
              <div className="text-center mb-4">
                <div className="flex justify-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setRatingValue(star)} className={`transition-all duration-200 hover:scale-110 ${star <= ratingValue ? 'text-yellow-400' : 'text-gray-300'}`}>
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
                {ratingValue > 0 && (
                  <p className="text-sm text-gray-600">
                    {ratingValue === 5 && '🌟 Excellent !'}
                    {ratingValue === 4 && '😊 Très bien'}
                    {ratingValue === 3 && '👍 Bien'}
                    {ratingValue === 2 && '😐 Moyen'}
                    {ratingValue === 1 && '😞 Décevant'}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder="Votre commentaire (optionnel)..." className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm" rows={3} maxLength={200} />
                <div className="text-right text-xs text-gray-400 mt-1">{ratingComment.length}/200</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowRatingForm(null); setRatingValue(0); setRatingComment(''); }} disabled={isSubmittingRating} className="flex-1 px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium">Annuler</button>
                <button onClick={submitRatingFromMenu} disabled={isSubmittingRating || ratingValue === 0} className={`flex-1 px-6 py-2 rounded-lg text-sm font-medium ${ratingValue === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'}`}>
                  {isSubmittingRating ? 'Envoi...' : '✨ Publier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ minHeight: '100vh', background: COLORS.background, color: COLORS.text }}>
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

          {/* Hero */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3" style={{ color: COLORS.text }}>
                  Bonjour {profile?.nom ? profile.nom.split(' ')[0] : ' '}
                  <span className="text-4xl">👋</span>
                </h1>
                <p className="text-lg" style={{ color: COLORS.text + 'CC' }}>Bienvenu sur votre tableau de bord.</p>
              </div>
            </div>
          </div>

          {/* Switch profil */}
          {hasMultipleProfiles && (
            <button
              onClick={() => setShowSwitchModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all mb-6"
              style={{ background: COLORS.primary, border: `1px solid ${COLORS.secondary}`, color: COLORS.accent }}
            >
              <RefreshCcw className="w-5 h-5" />
              <span className="font-semibold text-sm">Mode Prestataire</span>
            </button>
          )}

          {/* Stats */}
          <div className="flex justify-between items-center px-6 py-3 rounded-xl mb-8" style={{ background: COLORS.secondary }}>
            <div className="text-center flex-1 border-r border-white/30">
              <p className="text-2xl font-bold text-white">{stats.demandes}</p>
              <p className="text-xs text-white/80">Demandes</p>
            </div>
            <div className="text-center flex-1 border-r border-white/30">
              <p className="text-2xl font-bold text-white">{stats.devis}</p>
              <p className="text-xs text-white/80">Devis</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-white">{stats.reservations}</p>
              <p className="text-xs text-white/80">Réservations</p>
            </div>
          </div>
          {/* Comment trouver un prestataire */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>💡 Comment trouver un prestataire ?</h2>
            <p className="text-sm mb-6" style={{ color: COLORS.text + 'AA' }}>Choisissez la méthode qui vous convient</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Poster une demande */}
              <div className="relative rounded-2xl p-6 cursor-pointer transition-all hover:shadow-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }} onClick={() => router.push('/client/demandes/create')}>
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#10B981', color: 'white' }}>⭐ Recommandé</div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}><Megaphone className="w-7 h-7 text-white" /></div>
                  <div className="flex-1"><h3 className="text-lg font-bold text-white">Poster une demande</h3><p className="text-sm text-white/80">Recevez plusieurs devis</p></div>
                  <ArrowRight className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-sm text-white/90">Gratuit et sans engagement</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-sm text-white/90">Les prestataires viennent à vous</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-sm text-white/90">Comparez facilement les offres</span></div>
                </div>
              </div>
              {/* Rechercher activement */}
              <div className="rounded-2xl p-6 cursor-pointer transition-all hover:shadow-lg border-2" style={{ background: 'white', borderColor: '#E5E7EB' }} onClick={() => router.push('/client/recherche')}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: COLORS.primary }}><Search className="w-7 h-7" style={{ color: COLORS.accent }} /></div>
                  <div className="flex-1"><h2 className="text-lg font-bold" style={{ color: COLORS.accent }}>Rechercher activement</h2><p className="text-sm" style={{ color: COLORS.text + '99' }}>Parcourez les profils</p></div>
                  <ArrowRight className="w-8 h-8" style={{ color: COLORS.accent }} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" style={{ color: COLORS.secondary }} /><span className="text-sm" style={{ color: COLORS.text + 'CC' }}>Consultez les portfolios</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" style={{ color: COLORS.secondary }} /><span className="text-sm" style={{ color: COLORS.text + 'CC' }}>Filtres détaillés (budget, lieu...)</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" style={{ color: COLORS.secondary }} /><span className="text-sm" style={{ color: COLORS.text + 'CC' }}>Contactez directement</span></div>
                </div>
              </div>
            </div>
          </div>


          {/* Mes espaces */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>Mes espaces</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Demandes */}
              <div onClick={() => router.push('/client/demandes')} className="group relative cursor-pointer rounded-2xl p-5 flex flex-col items-center gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', border: '1px solid #C7D2FE' }}>
                {unreadCounts.demandes > 0 && <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">{unreadCounts.demandes}</span>}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: COLORS.accent }}><FileText className="w-6 h-6 text-white" /></div>
                <div className="text-center"><p className="font-bold text-sm" style={{ color: COLORS.accent }}>Demandes</p><p className="text-xs text-indigo-400 mt-0.5">Vos publications</p></div>
              </div>
              {/* Devis */}
              <div onClick={() => router.push('/client/devis/devis-list')} className="group relative cursor-pointer rounded-2xl p-5 flex flex-col items-center gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '1px solid #BFDBFE' }}>
                {unreadCounts.devis > 0 && <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">{unreadCounts.devis}</span>}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#3B82F6' }}><Package className="w-6 h-6 text-white" /></div>
                <div className="text-center"><p className="font-bold text-sm text-blue-700">Devis</p><p className="text-xs text-blue-400 mt-0.5">Propositions reçues</p></div>
              </div>
              {/* Réservations */}
              <div onClick={() => router.push('/client/reservations')} className="group relative cursor-pointer rounded-2xl p-5 flex flex-col items-center gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', border: '1px solid #BBF7D0' }}>
                {unreadCounts.reservations > 0 && <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">{unreadCounts.reservations}</span>}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#10B981' }}><Calendar className="w-6 h-6 text-white" /></div>
                <div className="text-center"><p className="font-bold text-sm text-green-700">Réservations</p><p className="text-xs text-green-400 mt-0.5">Vos prestations</p></div>
              </div>
              {/* Avis */}
              <div onClick={() => router.push('/client/avis/avis-list')} className="group relative cursor-pointer rounded-2xl p-5 flex flex-col items-center gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '1px solid #FDE68A' }}>
                {stats.avis > 0 && <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">{stats.avis}</span>}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#F59E0B' }}><Star className="w-6 h-6 text-white" /></div>
                <div className="text-center"><p className="font-bold text-sm text-amber-700">Avis</p><p className="text-xs text-amber-400 mt-0.5">Vos évaluations</p></div>
              </div>
            </div>
          </div>         

        </main>
      </div>

      {/* Modals */}
      <DevisInfoModal devis={selectedDevis} onClose={() => setSelectedDevis(null)} />
      <ReservationInfoModal reservation={selectedReservation} onClose={() => setSelectedReservation(null)} />

      {/* Modal annulation */}
      {showCancelModal && selectedCancelReservation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => { setShowCancelModal(false); setSelectedCancelReservation(null); setCancelReason(''); setCancellationConditions(null); }}>
          <div style={{ background: '#fff', borderRadius: 20, maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', padding: 32, borderRadius: '20px 20px 0 0', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Annuler la réservation</h2>
            </div>
            <div style={{ padding: 32 }}>
              {/* Détails */}
              <div style={{ marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#334155' }}>📅 Détails de la réservation</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: 14 }}>
                  <strong style={{ color: '#475569' }}>Service :</strong>
                  <span style={{ color: '#64748b' }}>{selectedCancelReservation?.annonces?.titre || selectedCancelReservation?.prestations_photographe?.titre || 'Non spécifié'}</span>
                  <strong style={{ color: '#475569' }}>Prestataire :</strong>
                  <span style={{ color: '#64748b' }}>{selectedCancelReservation?.profiles?.nom || 'Non spécifié'}</span>
                  <strong style={{ color: '#475569' }}>Date :</strong>
                  <span style={{ color: '#64748b' }}>{selectedCancelReservation?.date ? new Date(selectedCancelReservation.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Non spécifiée'}</span>
                </div>
              </div>

              {/* Conditions */}
              {cancellationConditions && (
                <div style={{ marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#334155' }}>📋 Conditions d'annulation</h2>
                  <div style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 16, background: cancellationConditions.canCancel ? '#dcfce7' : '#fecaca', color: cancellationConditions.canCancel ? '#15803d' : '#dc2626' }}>
                    {cancellationConditions.canCancel ? '✅ Annulation autorisée' : '❌ Annulation non autorisée'}
                  </div>
                  {cancellationConditions.canCancel && (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <strong style={{ fontSize: 14, color: '#475569' }}>Remboursement :</strong>
                        <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 600, color: cancellationConditions.refundPercentage === 100 ? '#059669' : cancellationConditions.refundPercentage === 50 ? '#d97706' : '#dc2626' }}>
                          {cancellationConditions.refundPercentage}%
                        </span>
                      </div>
                      <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8, borderLeft: '4px solid #3b82f6', fontSize: 13, color: '#475569' }}>
                        {cancellationConditions.message}
                      </div>
                    </>
                  )}
                  {!cancellationConditions.canCancel && (
                    <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, borderLeft: '4px solid #ef4444', fontSize: 13, color: '#dc2626' }}>
                      {cancellationConditions.reason}
                    </div>
                  )}
                  {cancellationConditions.forceMajeure && (
                    <div style={{ marginTop: 12, padding: 12, background: '#fffbeb', borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
                      <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>⚠️ Annulation pour force majeure uniquement</span><br />
                      <span style={{ fontSize: 12, color: '#92400e' }}>Une justification détaillée est requise (minimum 20 caractères)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Motif */}
              {cancellationConditions?.canCancel && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#333' }}>
                    {cancellationConditions.forceMajeure ? 'Justification détaillée (obligatoire)' : "Motif d'annulation"}
                    {cancellationConditions.forceMajeure && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder={cancellationConditions.forceMajeure ? "Veuillez expliquer en détail les circonstances exceptionnelles..." : "Pourquoi souhaitez-vous annuler cette réservation ?"}
                    style={{ width: '100%', minHeight: cancellationConditions.forceMajeure ? 120 : 80, padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  {cancellationConditions.forceMajeure && cancelReason && cancelReason.trim().length < 20 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>Justification trop courte ({cancelReason.trim().length}/20 caractères minimum)</div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowCancelModal(false); setSelectedCancelReservation(null); setCancelReason(''); setCancellationConditions(null); }}
                  style={{ background: '#6b7280', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >Fermer</button>
                {cancellationConditions?.canCancel && (
                  <button
                    onClick={handleCancelReservation}
                    disabled={isCancelling || (cancellationConditions.forceMajeure && (!cancelReason || cancelReason.trim().length < 20))}
                    style={{
                      background: (isCancelling || (cancellationConditions.forceMajeure && (!cancelReason || cancelReason.trim().length < 20))) ? '#d1d5db' : '#ef4444',
                      color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 14, fontWeight: 600,
                      cursor: (isCancelling || (cancellationConditions.forceMajeure && (!cancelReason || cancelReason.trim().length < 20))) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isCancelling ? 'Annulation...' : cancellationConditions.refundPercentage === 100 ? 'Confirmer (remboursement intégral)' : cancellationConditions.refundPercentage === 50 ? 'Confirmer (remboursement 50%)' : 'Confirmer (aucun remboursement)'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal switch profil */}
      {showSwitchModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowSwitchModal(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: 20, maxWidth: 400, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ backgroundColor: '#5C6BC020', padding: 16, borderRadius: 16, display: 'inline-flex', marginBottom: 16 }}>
                <RefreshCcw style={{ width: 32, height: 32, color: '#130183' }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 8 }}>Changer de profil</h2>
              <p style={{ fontSize: 14, color: '#1C1C1EAA' }}>Voulez-vous passer en mode Prestataire ?</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowSwitchModal(false)} style={{ flex: 1, padding: '12px 24px', borderRadius: 10, border: '1px solid #e5e7eb', backgroundColor: 'white', color: '#1C1C1E', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSwitchToPhotographe} style={{ flex: 1, padding: '12px 24px', borderRadius: 10, border: 'none', backgroundColor: '#130183', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <CheckCircle style={{ width: 16, height: 16 }} /> Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {CameraSplashComponent}
    </>
  );
}

export default ParticularHomeMenu;