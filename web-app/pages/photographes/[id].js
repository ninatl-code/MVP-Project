import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderPresta';
import {
  User, MapPin, Star, Phone, Mail, Instagram, Globe,
  Facebook, Linkedin, Image, Briefcase, Clock, ArrowLeft,
  CheckCircle, Shield
} from 'lucide-react';

export default function PhotographePublicPage() {
  const router = useRouter();
  const { id } = router.query;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('presentation');

  useEffect(() => {
    if (id) fetchProfile(id);
  }, [id]);

  const fetchProfile = async (userId) => {
    setLoading(true);
    try {
      const [{ data: base }, { data: extra }] = await Promise.all([
        supabase.from('profiles').select('id, nom, email, telephone, ville, avatar_url').eq('id', userId).single(),
        supabase.from('profils_prestataire').select('*').eq('id', userId).single(),
      ]);
      if (base) {
        setProfile({ ...base, ...extra });
      }
    } catch (err) {
      console.error('Erreur chargement profil:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'presentation', label: 'Présentation' },
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

        {/* Banner */}
        <div className="h-40 rounded-t-2xl bg-gradient-to-r from-indigo-500 to-purple-600" />

        {/* Header carte */}
        <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-indigo-100 flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.nom} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">{initials}</span>
                </div>
              )}
            </div>

            {/* Infos principales */}
            <div className="flex-1 pt-2 md:pt-14">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.nom_entreprise || profile.nom || 'Prestataire'}
                </h1>
                {profile.statut_validation === 'verified' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Vérifié
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
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
                {profile.tarif_horaire_min && (
                  <span className="flex items-center gap-1 font-medium text-indigo-700">
                    À partir de {profile.tarif_horaire_min} DH/h
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Spécialisations */}
          {(profile.specialisations || []).filter(s => s !== 'Autre').length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(profile.specialisations || []).filter(s => s !== 'Autre').map(spec => (
                <span key={spec} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                  {spec}
                </span>
              ))}
            </div>
          )}

          {/* Réseaux sociaux */}
          {(profile.instagram || profile.facebook || profile.linkedin || profile.site_web) && (
            <div className="flex gap-3 mt-4">
              {profile.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {profile.facebook && (
                <a href={profile.facebook.startsWith('http') ? profile.facebook : `https://facebook.com/${profile.facebook}`} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {profile.linkedin && (
                <a href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              {profile.site_web && (
                <a href={profile.site_web} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 mb-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu onglets */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {activeTab === 'presentation' && (
            <div className="space-y-6">
              {/* Bio */}
              {profile.bio && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-2">À propos</h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                </div>
              )}

              {/* Infos pratiques */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.equipe?.length > 0 && (
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Configuration</p>
                    <p className="font-medium text-gray-800">
                      {profile.equipe[0] === 'solo' ? 'Travaille seul(e)' :
                       profile.equipe[0] === 'equipe' ? 'Avec une équipe' :
                       profile.equipe[0] === 'binome' ? 'Avec un binôme' :
                       profile.equipe[0]}
                    </p>
                  </div>
                )}
                {profile.rayon_deplacement_km && (
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Rayon de déplacement</p>
                    <p className="font-medium text-gray-800">{profile.rayon_deplacement_km} km</p>
                  </div>
                )}
                {profile.materiel && (
                  <div className="p-4 rounded-xl bg-gray-50 md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Équipement</p>
                    <p className="font-medium text-gray-800">{profile.materiel}</p>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">Contact</h2>
                <div className="space-y-2">
                  {profile.email && (
                    <a href={`mailto:${profile.email}`} className="flex items-center gap-3 text-gray-600 hover:text-indigo-600 transition-colors">
                      <Mail className="w-4 h-4" />
                      {profile.email}
                    </a>
                  )}
                  {profile.telephone && (
                    <a href={`tel:${profile.telephone}`} className="flex items-center gap-3 text-gray-600 hover:text-indigo-600 transition-colors">
                      <Phone className="w-4 h-4" />
                      {profile.telephone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              {(profile.portfolio_photos || []).length === 0 ? (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucune photo dans le portfolio</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(profile.portfolio_photos || []).map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
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
