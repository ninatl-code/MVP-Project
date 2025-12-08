import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import HeaderPresta from '../../components/HeaderPresta';
import HeaderParti from '../../components/HeaderParti';
import { 
  User, Calendar, MapPin, Star, Heart, Eye, Phone, Mail,
  Clock, Award, CheckCircle, Package, MessageCircle, Camera
} from 'lucide-react';

export default function ProfilPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [profile, setProfile] = useState(null);
  const [annonces, setAnnonces] = useState([]);
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (id) {
      fetchProfileData();
      getCurrentUser();
    }
  }, [id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Récupérer le profil de l'utilisateur connecté pour connaître son rôle
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      setCurrentUser({ ...user, role: userProfile?.role });
    } else {
      setCurrentUser(user);
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Récupérer les informations du profil avec le nom de la ville
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          villes(ville)
        `)
        .eq('id', id)
        .single();

      if (profileError) {
        setError('Profil non trouvé');
        return;
      }

      setProfile(profileData);

      // Si c'est un prestataire, récupérer ses annonces
      if (profileData.role === 'prestataire') {
        const { data: annoncesData } = await supabase
          .from('annonces')
          .select(`
            id,
            titre,
            description,
            photos,
            tarif_unit,
            unit_tarif,
            rate,
            created_at,
            actif
          `)
          .eq('prestataire', id)
          .eq('actif', true)
          .order('created_at', { ascending: false });
        
        setAnnonces(annoncesData || []);

        // Récupérer les avis pour ce prestataire (si la table existe)
        const { data: avisData } = await supabase
          .from('avis')
          .select(`
            *,
            profiles!avis_user_id_fkey(nom, photos)
          `)
          .eq('prestataire_id', id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        setAvis(avisData || []);
      }

    } catch (err) {
      setError('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getPhotoUrl = (photos) => {
    if (!photos) return null;
    
    // Si c'est déjà une data URL
    if (typeof photos === 'string' && photos.startsWith('data:')) {
      return photos;
    }
    
    // Si c'est un tableau, prendre la première photo
    if (Array.isArray(photos) && photos.length > 0) {
      const photo = photos[0];
      if (typeof photo === 'string' && photo.startsWith('data:')) {
        return photo;
      }
    }
    
    return null;
  };

  // Fonction pour rendre le bon header selon le rôle de l'utilisateur connecté
  const renderHeader = () => {
    if (!currentUser) return <HeaderParti />; // Header par défaut pour les non-connectés
    
    return currentUser.role === 'prestataire' ? <HeaderPresta /> : <HeaderParti />;
  };

  if (loading) {
    return (
      <>
        {renderHeader()}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {renderHeader()}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Profil non trouvé</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={() => router.back()}
              className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900"
            >
              Retour
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!profile) return null;

  const isPrestataire = profile.role === 'prestataire';
  const photoUrl = getPhotoUrl(profile.photos);
  const moyenneAvis = avis.length > 0 ? avis.reduce((sum, avis) => sum + avis.note, 0) / avis.length : 0;

  return (
    <>
      {renderHeader()}
      <div className="min-h-screen bg-gray-50">
        {/* Header du profil */}
        <div className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                {photoUrl ? (
                  <img 
                    src={photoUrl}
                    alt={profile.nom}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-medium ${
                  isPrestataire 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-green-500 text-white'
                }`}>
                  {isPrestataire ? 'Prestataire' : 'Client'}
                </div>
              </div>

              {/* Informations principales */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {profile.nom || 'Utilisateur'}
                </h1>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Membre depuis {formatDate(profile.created_at)}
                    </span>
                  </div>
                  
                  {isPrestataire && avis.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {renderStars(Math.round(moyenneAvis))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {moyenneAvis.toFixed(1)} ({avis.length} avis)
                      </span>
                    </div>
                  )}
                </div>

                {profile.villes?.ville && (
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.villes.ville}</span>
                  </div>
                )}

                
                {profile.bio && (
                  <p className="text-gray-700 mb-4 max-w-2xl">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {isPrestataire ? (
            // Vue Prestataire
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Statistiques */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-700">Annonces</span>
                      </div>
                      <span className="font-semibold">{annonces.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <span className="text-gray-700">Avis</span>
                      </div>
                      <span className="font-semibold">{avis.length}</span>
                    </div>
                    
                    {moyenneAvis > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-blue-500" />
                          <span className="text-gray-700">Note moyenne</span>
                        </div>
                        <span className="font-semibold">{moyenneAvis.toFixed(1)}/5</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Derniers avis */}
                {avis.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Derniers avis</h2>
                    <div className="space-y-4">
                      {avis.slice(0, 3).map((avis) => (
                        <div key={avis.id} className="border-b border-gray-100 pb-4 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              {avis.profiles?.nom || 'Client'}
                            </span>
                            <div className="flex items-center">
                              {renderStars(avis.note)}
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm">{avis.commentaire}</p>
                          <span className="text-xs text-gray-400">
                            {formatDate(avis.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Annonces */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Annonces</h2>
                  {annonces.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {annonces.map((annonce) => (
                        <div 
                          key={annonce.id} 
                          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => router.push(`/annonces/${annonce.id}`)}
                        >
                          <div className="h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
                            {annonce.photos && Array.isArray(annonce.photos) && annonce.photos.length > 0 ? (
                              <img 
                                src={
                                  annonce.photos[0].startsWith('data:') 
                                    ? annonce.photos[0] 
                                    : `data:image/jpeg;base64,${annonce.photos[0]}`
                                }
                                alt={annonce.titre}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>';
                                }}
                              />
                            ) : (
                              <Camera className="w-12 h-12 text-gray-400" />
                            )}
                          </div>
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">{annonce.titre}</h4>
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {annonce.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-gray-900">
                                {annonce.tarif_unit ? `${annonce.tarif_unit}€/${annonce.unit_tarif}` : 'Sur devis'}
                              </span>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm">{annonce.rate || 5}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>Aucune annonce disponible</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Vue Particulier
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                  Informations du client
                </h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-gray-900 mb-1">Membre depuis</h4>
                      <p className="text-gray-600">{formatDate(profile.created_at)}</p>
                    </div>
                    
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-gray-900 mb-1">Statut</h4>
                      <p className="text-green-600 font-medium">Client vérifié</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {profile.plan && (
                      <div className="text-center p-6 bg-purple-50 rounded-lg">
                        <Package className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <h4 className="font-semibold text-gray-900 mb-1">Plan</h4>
                        <p className="text-purple-600">Plan {profile.plan}</p>
                      </div>
                    )}
                    
                    {profile.event_date && (
                      <div className="text-center p-6 bg-pink-50 rounded-lg">
                        <Heart className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                        <h4 className="font-semibold text-gray-900 mb-1">Date de mariage</h4>
                        <p className="text-pink-600">{formatDate(profile.event_date)}</p>
                      </div>
                    )}
                  </div>

                  {(profile.email || profile.telephone) && (
                    <div className="space-y-4">
                      {profile.email && (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                          <Mail className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-700">{profile.email}</span>
                        </div>
                      )}
                      {profile.telephone && profile.telephone !== '0' && (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                          <Phone className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-700">{profile.telephone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {profile.bio && (
                    <div className="p-6 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">À propos</h4>
                      <p className="text-gray-600">{profile.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}