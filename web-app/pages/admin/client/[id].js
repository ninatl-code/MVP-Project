import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import adminLayout from '../../../components/layout/AdminLayout';
import * as avisService from '../../../lib/avisService';
import * as reservationService from  '../../../lib/reservationService';
import * as demandeService from  '../../../lib/demandeService';

import {
  User, MapPin, Star, Phone, Mail, Instagram, Globe,
  Facebook, Linkedin, Briefcase, ArrowLeft,
  CheckCircle, MessageSquare, Shield, Calendar,
  Clock, Award, Camera, TrendingUp, Image, ChevronRight, Heart, Flag, X
} from 'lucide-react';

export default function UserAdminView() {
  const router = useRouter();
  const { id } = router.query;
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [prestations, setPrestations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('presentation');



  const fetchAll = async (userId) => {
    setLoading(true);
    try {
      const [{ data: base }, { data: revs }, { data: demandes }, { data: prests }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        avisService.getClientReviews(userId),
        demandeService.getClientDemandes(userId),
        reservationService.getClientReservations(userId),
      ]);
      if (base) 
      setProfile({ ...base});
      setReviews(revs || []);
      setDemandes(demandes || []);
      setPrestations(prests || []);
      
    } catch (err) {
      console.error('Erreur chargement profil:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
    fetchAll(id);
    }
  }, [id]);

  const getAnciennete = () => {
    if (!profile?.created_at) return null;
    const diff = Math.floor((new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24 * 30));
    if (diff < 1) return 'Nouveau';
    if (diff < 12) return `${diff} mois`;
    const years = Math.floor(diff / 12);
    return `${years} an${years > 1 ? 's' : ''}`;
  };


  const renderStars = (rating, size = 'sm') => {
    const s = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`${s} ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
        ))}
      </div>
    );
  };

  const tabs = [
    { key: 'presentation', label: 'Présentation' },
    { key: 'demandes', label: `Demandes (${demandes.length || 0})` },
    { key: 'reservations', label: `Réservations (${prestations.length || 0})` },
    { key: 'avis', label: `Avis (${profile?.nb_avis || 0})` },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <adminLayout />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <adminLayout />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profil introuvable</h2>
          <p className="text-gray-500 mb-6">Ce prestataire n'existe pas ou a supprimé son compte.</p>
          <button onClick={() => router.back()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
            Retour
          </button>
        </div>
      </div>
    );
  }

  const initials = profile.nom
    ? profile.nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  const anciennete = getAnciennete();
  const noteArrondie = profile.note_moyenne ? Math.round(profile.note_moyenne * 10) / 10 : null;



  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <adminLayout />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Bouton retour */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {/* ── Carte profil ── */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-6" >
          {/* Info card */}
          <div className="bg-white px-6 pt-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Avatar */}
              <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.nom} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-indigo-600">{initials}</span>
                  </div>
                )}
              </div>

              {/* Infos principales */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        {profile.nom || 'Utilisateur'}
                      </h1>
                      <div className="flex items-center gap-3 flex-wrap">
                        {profile.suspendu != 'true' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Profil actif
                          </span>
                        )} 
                        {profile.suspendu === 'true' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            <X className="w-3.5 h-3.5" />
                            Profil suspendu
                            <p> Raison de suspension : {profile.suspension_reason}</p>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                      {profile.ville && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {profile.ville}
                        </span>
                      )}
                      {profile.adresse && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {profile.adresse}
                        </span>
                      )}
                      {profile.telephone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {profile.telephone}
                        </span>
                      )}
                      {profile.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {profile.email}
                        </span>
                      )}
                      
                      {anciennete && anciennete !== 'Nouveau' && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Membre depuis {anciennete}
                        </span>
                      )}
                      {anciennete === 'Nouveau' && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                           Nouveau membre
                        </span>
                      )}
                      
                      
                    </div>
                  </div>
                  {/* Bouton contacter et favori */}
                  <div className="flex gap-2">
                     <button
                      onClick={() => router.push(`/messages?prestataire=${id}`)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm whitespace-nowrap"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Contacter
                    </button>
                  </div>
                </div>            
              </div>
            </div>       
        
          </div>
        </div>



        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-2 rounded-xl font-medium text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenu onglets ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Présentation */}
          {activeTab === 'presentation' && (
            <div className="space-y-6">
              {/* Bio */}
                <div>
                  <h2 className="font-semibold text-gray-900 mb-2">À propos</h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{profile.description}</p>
                </div>

              {/* Prestations récentes */}
              {prestations.length > 0 && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-500" />
                    Prestations récentes
                  </h2>
                  <div className="space-y-2">
                    {prestations.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Camera className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">{p.titre || p.categorie || 'Prestation'}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                            {p.date && <span>{new Date(p.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>}
                            {p.lieu && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.lieu}</span>}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Terminée</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        
            {/* Demandes */}
          {activeTab === 'demandes' && (
            <div className="space-y-6">

              {/* Demandes récentes */}
              
              {demandes.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">Aucune demande par cet utilisateur</p>
                </div>
              ) : (          
                <div>
                  <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-500" />
                    Demandes créées
                  </h2>
                  <div className="space-y-2">
                    {demandes.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">{d.titre || d.categorie || 'Demande'}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                            {d.date && <span>{new Date(d.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>}
                            {d.lieu && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{d.lieu}</span>}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-black-100 text-white-700 text-xs rounded-full font-medium">{d.statut}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Réservations */}
          {activeTab === 'reservations' && (
            <div className="space-y-6">

              {/* Réservations récentes */}
              {prestations.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">Aucune réservation par cet utilisateur</p>
                </div>
              ) : (  
                <div>
                  <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-500" />
                    Réservations créées
                  </h2>
                  <div className="space-y-2">
                    {prestations.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Camera className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">{d.titre}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                            {d.date && <span>{new Date(d.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>}
                            {d.lieu && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{d.lieu}</span>}
                            {d.description && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{d.description}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            )}
            </div>
          )}

          {/* Avis */}
          {activeTab === 'avis' && (
            <div>
              {/* Résumé note */}
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">Aucun avis par cet utilisateur</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => {
                    const prestataireInitials = r.prestataire_id?.nom
                      ? r.prestataire_id.nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'P';
                    return (
                      <div key={r.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0 flex items-center justify-center">
                            {r.prestataire_id?.avatar_url ? (
                              <img src={r.prestataire_id.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-indigo-600">{prestataireInitials}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-sm text-gray-800">{r.prestataire_id?.nom || 'Prestataire'}</p>
                              <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="mt-0.5 mb-2">{renderStars(r.rating)}</div>
                            {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

 
        </div>
      </main>

    </div>
  );
}
