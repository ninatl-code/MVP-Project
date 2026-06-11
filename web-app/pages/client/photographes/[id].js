import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import Header from '../../../components/HeaderParti';
import * as avisService from '../../../lib/avisService';
import { getPhotographerPackages } from '../../../lib/packageService';

import {
  User, MapPin, Star, Phone, Mail, Instagram, Globe,
  Facebook, Linkedin, Briefcase, ArrowLeft,
  CheckCircle, MessageSquare, Shield, Calendar,
  Clock, Award, Camera, TrendingUp, Image, ChevronRight, Heart
} from 'lucide-react';

export default function PhotographeClientView() {
  const router = useRouter();
  const { id } = router.query;
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [prestations, setPrestations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('presentation');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [packages, setPackages] = useState([]);



  const fetchAll = async (userId) => {
    setLoading(true);
    try {
      const [{ data: base }, { data: extra }, { data: revs }, { data: prests }, { data: packs }] = await Promise.all([
        supabase.from('profiles').select('id, nom, email, telephone, ville, avatar_url, created_at').eq('id', userId).single(),
        supabase.from('profils_prestataire').select('*').eq('id', userId).single(),
        avisService.getPhotographerReviews(userId, 20),
        supabase.from('reservations')
          .select('id, titre, categorie, date, lieu, statut')
          .eq('prestataire_id', userId)
          .eq('statut', 'completed')
          .order('date', { ascending: false })
          .limit(4),
        getPhotographerPackages(userId, true),
      ]);
      if (base) setProfile({ ...base, ...extra });
      setReviews(revs || []);
      setPrestations(prests || []);
      setPackages(packs || []);
      
    } catch (err) {
      console.error('Erreur chargement profil:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
    fetchAll(id);
    checkFavorite(id);
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

  const checkFavorite = async (userId) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data } = await supabase
    .from('favoris')
    .select('id')
    .eq('client_id', user.id)
    .eq('prestataire_id', userId)
    .maybeSingle();

  setIsFavorite(!!data);
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
    { key: 'avis', label: `Avis (${profile?.nb_avis || 0})` },
    { key: 'forfaits', label: 'Forfaits'},
    { key: 'portfolio', label: 'Portfolio' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
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

  const toggleFavorite = async () => {
    try {
      setFavoriteLoading(true);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        alert('Vous devez être connecté');
        return;
      }

      if (isFavorite) {
        await supabase
          .from('favoris')
          .delete()
          .eq('client_id', user.id)
          .eq('prestataire_id', id);

        setIsFavorite(false);
      } else {
        await supabase
          .from('favoris')
          .insert({
            client_id: user.id,
            prestataire_id: id,
          });

        setIsFavorite(true);
      }
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la mise à jour des favoris');
    } finally {
      setFavoriteLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Bouton retour */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {/* ── Carte profil ── */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-6">
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

              {/* Infos + actions */}
              <div className="flex-1 pt-2 md:pt-16">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold text-gray-900">
                        {profile.nom_entreprise || profile.nom || 'Prestataire'}
                      </h1>
                      {profile.statut_validation === 'valide' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Profil approuvé
                        </span>
                      )}
                      {profile.identite_verifiee && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          <Shield className="w-3.5 h-3.5" />
                          Identité vérifiée
                        </span>
                      )}
                      {profile.entreprise_verifiee && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Entreprise vérifiée
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                      {profile.ville && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {profile.ville}
                        </span>
                      )}
                      {(profile.categories || []).length > 0 && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {(profile.categories || []).join(', ')}
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

                    {/* Note + stats */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      {noteArrondie && (
                        <div className="flex items-center gap-1.5">
                          {renderStars(Math.round(noteArrondie), 'md')}
                          <span className="font-bold text-gray-900">{noteArrondie}</span>
                          <span className="text-sm text-gray-400">({profile.nb_avis || 0} avis)</span>
                        </div>
                      )}
                      {profile.nb_prestations_completees > 0 && (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          {profile.nb_prestations_completees} prestation{profile.nb_prestations_completees > 1 ? 's' : ''} réalisée{profile.nb_prestations_completees > 1 ? 's' : ''}
                        </span>
                      )}
                      {profile.taux_reponse > 0 && (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4 text-indigo-400" />
                          {profile.taux_reponse}% de réponse
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bouton contacter et favori */}
                 <div className="flex gap-2">
                  <button
                    onClick={toggleFavorite}
                    disabled={favoriteLoading}
                    className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-all ${
                      isFavorite
                        ? 'bg-red-50 border-red-200 text-red-500'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`}
                    />
                  </button>

                  <button
                    onClick={() => router.push(`/shared/messages?prestataire=${id}`)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm whitespace-nowrap"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Contacter
                  </button>
                </div>
                </div>
              </div>
            </div>

            {/* Tarif */}
            {(profile.tarif_horaire_min || profile.tarif_horaire_max) && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl">
                <span className="text-sm text-indigo-600 font-semibold">
                  {profile.tarif_horaire_min && profile.tarif_horaire_max
                    ? `${profile.tarif_horaire_min} – ${profile.tarif_horaire_max} DH/h`
                    : `À partir de ${profile.tarif_horaire_min || profile.tarif_horaire_max} DH/h`}
                </span>
              </div>
            )}

            {/* Spécialisations */}
            {(profile.specialisations || []).filter(s => s !== 'Autre').length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {(profile.specialisations || []).filter(s => s !== 'Autre').map(spec => (
                  <span key={spec} className="px-3 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100 rounded-full text-sm font-medium">
                    {spec}
                  </span>
                ))}
              </div>
            )}

            {/* Réseaux sociaux */}
            {(profile.instagram || profile.facebook || profile.linkedin || profile.site_web) && (
              <div className="flex gap-2 mt-4">
                {profile.instagram && (
                  <a
                    href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
                    style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    Instagram
                  </a>
                )}
                {profile.facebook && (
                  <a
                    href={profile.facebook.startsWith('http') ? profile.facebook : `https://facebook.com/${profile.facebook}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                    Facebook
                  </a>
                )}
                {profile.linkedin && (
                  <a
                    href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    LinkedIn
                  </a>
                )}
                {profile.site_web && (
                  <a
                    href={profile.site_web}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Site web
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Badges de confiance ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center shadow-sm">
            <p className="text-2xl font-bold text-indigo-600">{profile.nb_prestations_completees || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Prestations</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-500">{noteArrondie || '–'}</p>
            <p className="text-xs text-gray-500 mt-1">Note moyenne</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{profile.taux_reponse ? `${profile.taux_reponse}%` : '–'}</p>
            <p className="text-xs text-gray-500 mt-1">Taux de réponse</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-600">{anciennete || '–'}</p>
            <p className="text-xs text-gray-500 mt-1">Ancienneté</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
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
              {profile.bio && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-2">À propos</h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.equipe?.length > 0 && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Configuration</p>
                    <p className="font-medium text-gray-800">
                      {profile.equipe[0] === 'solo' ? 'Travaille seul(e)' :
                       profile.equipe[0] === 'equipe' ? 'Avec une équipe' :
                       profile.equipe[0] === 'binome' ? 'Avec un binôme' :
                       profile.equipe[0]}
                    </p>
                  </div>
                )}
                {profile.rayon_deplacement_km && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Rayon de déplacement</p>
                    <p className="font-medium text-gray-800">{profile.rayon_deplacement_km} km</p>
                  </div>
                )}
                {profile.temps_reponse_moyen && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Temps de réponse moyen</p>
                    <p className="font-medium text-gray-800">{profile.temps_reponse_moyen}</p>
                  </div>
                )}
                {profile.materiel && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 md:col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Équipement</p>
                    <p className="font-medium text-gray-800">{profile.materiel}</p>
                  </div>
                )}
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

          {/* Avis */}
          {activeTab === 'avis' && (
            <div>
              {/* Résumé note */}
              {noteArrondie && (
                <div className="flex items-center gap-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100 mb-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-amber-500">{noteArrondie}</p>
                    <div className="flex justify-center mt-1">{renderStars(Math.round(noteArrondie), 'md')}</div>
                    <p className="text-xs text-gray-400 mt-1">{profile.nb_avis || 0} avis</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map(n => {
                      const count = reviews.filter(r => r.rating === n).length;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={n} className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="w-2">{n}</span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-3">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">Aucun avis pour ce prestataire</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => {
                    const clientInitials = r.client?.nom
                      ? r.client.nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'C';
                    return (
                      <div key={r.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0 flex items-center justify-center">
                            {r.client?.avatar_url ? (
                              <img src={r.client.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-indigo-600">{clientInitials}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-sm text-gray-800">{r.client?.nom || 'Client'}</p>
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
          
          {activeTab === 'forfaits' && (
            <div className="space-y-4">
              {packages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">Aucun forfait disponible</p>
                </div>       // structure complète retournée;  
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {packages.map(p => (
                    <div
                      key={p.id}
                      className="border border-gray-100 rounded-xl p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <h2 className="font-semibold text-gray-800">
                          {p.titre}
                        </h2>
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-600 font-bold">{p.prix_fixe} DH</span>
                          <span className="text-gray-400 line-through text-sm">{p.prix_barre} DH</span>
                        </div>
                      </div>

                      {p.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {p.description}
                        </p>
                      )}

                      {p.duree_minutes && (
                        <p className="text-xs text-gray-400 mt-2">
                          Durée : {p.duree_minutes / 60} heures
                        </p>
                      )}

                      <button className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
                        Réserver ce forfait
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Portfolio */}
          {activeTab === 'portfolio' && (
            <div>
              {(profile.portfolio_photos || []).length === 0 ? (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">Aucune photo dans le portfolio</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(profile.portfolio_photos || []).map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity cursor-pointer">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
