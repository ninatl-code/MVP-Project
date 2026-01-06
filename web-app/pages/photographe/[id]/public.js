import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, Star, MapPin, Calendar, Euro, Camera, Clock,
  MessageCircle, Heart, Share2, CheckCircle, Award, Shield,
  ChevronLeft, ChevronRight, X, ExternalLink
} from 'lucide-react';

export default function PhotographeProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  
  const [photographe, setPhotographe] = useState(null);
  const [packages, setPackages] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('presentation');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (id) {
      fetchPhotographe();
    }
  }, [id]);

  const fetchPhotographe = async () => {
    try {
      // Fetch photographer profile
      const { data: profileData, error: profileError } = await supabase
        .from('profils_photographe')
        .select(`
          *,
          profile:profiles!profils_photographe_user_id_fkey(id, nom, avatar_url, ville, email, created_at)
        `)
        .eq('user_id', id)
        .single();

      if (profileError) throw profileError;
      setPhotographe(profileData);

      // Fetch packages
      const { data: packagesData } = await supabase
        .from('packages_types')
        .select('*')
        .eq('photographe_id', id)
        .eq('actif', true)
        .order('prix', { ascending: true });
      
      setPackages(packagesData || []);

      // Fetch portfolio
      const { data: portfolioData } = await supabase
        .from('portfolio')
        .select('*')
        .eq('photographe_id', id)
        .order('created_at', { ascending: false })
        .limit(12);
      
      setPortfolio(portfolioData || []);

      // Fetch reviews
      const { data: avisData } = await supabase
        .from('avis')
        .select(`
          *,
          auteur:profiles!avis_auteur_id_fkey(id, nom, avatar_url)
        `)
        .eq('destinataire_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setAvis(avisData || []);

      // Track view
      if (user?.id && user.id !== id) {
        await supabase.from('vues_profil').insert({
          photographe_id: id,
          visiteur_id: user.id,
          created_at: new Date().toISOString(),
        }).single();
      }
    } catch (error) {
      console.error('Error fetching photographe:', error);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }

    try {
      // Check existing conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('particulier_id', user.id)
        .eq('photographe_id', id)
        .single();

      if (existingConv) {
        router.push(`/shared/messages?id=${existingConv.id}`);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          particulier_id: user.id,
          photographe_id: id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/shared/messages?id=${newConv.id}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < Math.floor(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
        />
      );
    }
    return stars;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!photographe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Photographe introuvable
          </h2>
          <Link href="/recherche" className="text-indigo-600 hover:text-indigo-800">
            Retour à la recherche
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="h-64 md:h-80 bg-gradient-to-br from-indigo-600 to-purple-700 relative">
        {photographe.photo_couverture && (
          <img
            src={photographe.photo_couverture}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute top-4 left-4">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white/90 rounded-full hover:bg-white transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="p-2 bg-white/90 rounded-full hover:bg-white transition">
            <Heart className="w-5 h-5 text-gray-700" />
          </button>
          <button className="p-2 bg-white/90 rounded-full hover:bg-white transition">
            <Share2 className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="w-32 h-32 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {photographe.profile?.avatar_url ? (
                    <img
                      src={photographe.profile.avatar_url}
                      alt={photographe.profile?.nom}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-12 h-12 text-indigo-600" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        {photographe.profile?.nom || 'Photographe'}
                      </h1>
                      {photographe.profile?.ville && (
                        <p className="text-gray-500 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {photographe.profile.ville}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {photographe.verifie && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Vérifié
                        </span>
                      )}
                      {photographe.reservation_instantanee && (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Réservation instantanée
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex">{renderStars(photographe.note_moyenne || 0)}</div>
                      <span className="font-semibold text-gray-900">
                        {(photographe.note_moyenne || 0).toFixed(1)}
                      </span>
                      <span className="text-gray-500">
                        ({photographe.nombre_avis || 0} avis)
                      </span>
                    </div>
                  </div>

                  {/* Specialités */}
                  {photographe.specialites && photographe.specialites.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {photographe.specialites.map((spec, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="border-b">
                <nav className="flex">
                  {[
                    { id: 'presentation', label: 'Présentation' },
                    { id: 'portfolio', label: 'Portfolio' },
                    { id: 'packages', label: 'Packages' },
                    { id: 'avis', label: 'Avis' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 px-4 py-4 text-sm font-medium border-b-2 transition ${
                        activeTab === tab.id
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Présentation */}
                {activeTab === 'presentation' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">À propos</h3>
                    <p className="text-gray-700 whitespace-pre-line mb-6">
                      {photographe.bio || "Ce photographe n'a pas encore ajouté de description."}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {photographe.annees_experience || '—'}
                        </div>
                        <div className="text-sm text-gray-500">Années d'exp.</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {photographe.nombre_prestations || '0'}
                        </div>
                        <div className="text-sm text-gray-500">Prestations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {photographe.temps_reponse || '—'}h
                        </div>
                        <div className="text-sm text-gray-500">Temps de réponse</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {photographe.taux_acceptation || '—'}%
                        </div>
                        <div className="text-sm text-gray-500">Taux d'acceptation</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Portfolio */}
                {activeTab === 'portfolio' && (
                  <div>
                    {portfolio.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Camera className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Pas encore de photos dans le portfolio</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {portfolio.map((item, idx) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedImage(item)}
                            className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition"
                          >
                            <img
                              src={item.url}
                              alt={item.titre || ''}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Packages */}
                {activeTab === 'packages' && (
                  <div className="space-y-4">
                    {packages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Euro className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Pas de packages disponibles</p>
                      </div>
                    ) : (
                      packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="border rounded-lg p-4 hover:border-indigo-300 transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{pkg.nom}</h4>
                              {pkg.populaire && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                  Populaire
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-indigo-600">
                                {pkg.prix}€
                              </div>
                              {pkg.duree && (
                                <div className="text-sm text-gray-500">
                                  {pkg.duree}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {pkg.description}
                          </p>
                          {pkg.inclus && pkg.inclus.length > 0 && (
                            <ul className="text-sm text-gray-600 space-y-1">
                              {pkg.inclus.map((item, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Avis */}
                {activeTab === 'avis' && (
                  <div className="space-y-6">
                    {avis.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Pas encore d'avis</p>
                      </div>
                    ) : (
                      avis.map((review) => (
                        <div key={review.id} className="border-b pb-6 last:border-0">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                              {review.auteur?.avatar_url ? (
                                <img
                                  src={review.auteur.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-600 font-medium">
                                  {review.auteur?.nom?.charAt(0) || '?'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">
                                  {review.auteur?.nom || 'Client'}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatDate(review.created_at)}
                                </span>
                              </div>
                              <div className="flex mb-2">
                                {renderStars(review.note)}
                              </div>
                              {review.commentaire && (
                                <p className="text-gray-700">{review.commentaire}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  {photographe.tarif_horaire || '—'}€
                </span>
                <span className="text-gray-500">/heure</span>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => router.push(`/client/demandes/create?photographe=${id}`)}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
                >
                  Demander un devis
                </button>
                
                {photographe.reservation_instantanee && (
                  <button
                    onClick={() => router.push(`/client/reservation/instant?photographe=${id}`)}
                    className="w-full py-3 border-2 border-indigo-600 text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition"
                  >
                    Réserver maintenant
                  </button>
                )}
                
                <button
                  onClick={startConversation}
                  className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contacter
                </button>
              </div>

              <div className="pt-4 border-t space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    Répond généralement en {photographe.temps_reponse || '—'} heures
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Membre depuis {formatDate(photographe.profile?.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Garanties Shooty</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm text-gray-600">Paiement sécurisé</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm text-gray-600">Photographe vérifié</span>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm text-gray-600">Satisfaction garantie</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImage.url}
            alt={selectedImage.titre || ''}
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  );
}
