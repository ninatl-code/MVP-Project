import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { Search, MapPin, Star, User, Mail, FileText } from "lucide-react";
import Header from '../../components/HeaderParti';

const GOLD = "#D4AF37";
const ROSE = "#F6DCE8";
const SBLUE = "#130183";
const BLUE = "#5C6BC0";

function SearchProviders() {
  const router = useRouter();
  const [prestations, setPrestations] = useState([]);
  const [villes, setVilles] = useState([]);
  const [selectedPrestation, setSelectedPrestation] = useState("all");
  const [selectedVille, setSelectedVille] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("rating");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // Charger les prestations et villes depuis Supabase
  useEffect(() => {
    async function fetchFilters() {
      const { data: prestationsData } = await supabase
        .from("prestations")
        .select("id, nom")
        .order("nom", { ascending: true });
      setPrestations(prestationsData || []);

      // Charger les villes depuis zones_intervention
      const { data: zonesData } = await supabase
        .from("zones_intervention")
        .select("ville_centre")
        .eq("active", true);
      // Extraire les villes uniques
      const uniqueVilles = Array.from(new Set((zonesData || []).map(z => z.ville_centre)));
      setVilles(uniqueVilles.map((ville, idx) => ({ id: idx, ville })));
    }
    fetchFilters();
  }, []);

  // Recherche des annonces selon les filtres
  useEffect(() => {
    async function fetchAnnonces() {
      setLoading(true);

      // 1. Récupérer les zones d'intervention actives pour la ville sélectionnée
      let zonesQuery = supabase
        .from("zones_intervention")
        .select("annonce_id, ville_centre, active")
        .eq("active", true);
      
      // Filtrer par ville seulement si une ville spécifique est sélectionnée (pas "all")
      if (selectedVille && selectedVille !== "all") {
        zonesQuery = zonesQuery.eq("ville_centre", selectedVille);
      }
      
      const { data: zonesData, error: zonesError } = await zonesQuery;
      if (zonesError) {
        setResults([]);
        setLoading(false);
        return;
      }
      const annonceIds = zonesData.map(z => z.annonce_id);

      // 2. Récupérer les annonces actives
      let annoncesQuery = supabase
        .from("annonces")
        .select(`
          *,
          profiles:prestataire(nom, email, telephone, avatar_url),
          prestations:prestation(nom)
        `)
        .eq("actif", true);
      
      // Filtrer par prestation seulement si une prestation spécifique est sélectionnée (pas "all")
      if (selectedPrestation && selectedPrestation !== "all") {
        annoncesQuery = annoncesQuery.eq("prestation", selectedPrestation);
      }
      
      if (priceRange.min) {
        annoncesQuery = annoncesQuery.gte("tarif_unit", parseFloat(priceRange.min));
      }
      if (priceRange.max) {
        annoncesQuery = annoncesQuery.lte("tarif_unit", parseFloat(priceRange.max));
      }
      
      // Filtrer par annonceIds seulement si une ville spécifique est sélectionnée
      if (selectedVille && selectedVille !== "all") {
        if (annonceIds.length > 0) {
          annoncesQuery = annoncesQuery.in("id", annonceIds);
        } else {
          setResults([]);
          setLoading(false);
          return;
        }
      }
      // Tri selon la sélection
      switch(sortBy) {
        case "price_asc":
          annoncesQuery = annoncesQuery.order("tarif_unit", { ascending: true });
          break;
        case "price_desc":
          annoncesQuery = annoncesQuery.order("tarif_unit", { ascending: false });
          break;
        case "recent":
          annoncesQuery = annoncesQuery.order("created_at", { ascending: false });
          break;
        default:
          annoncesQuery = annoncesQuery.order("rate", { ascending: false });
      }
      const { data: annoncesData, error: annoncesError } = await annoncesQuery;
      if (annoncesError) {
        setResults([]);
        setLoading(false);
        return;
      }

      // 3. Enrichir chaque annonce avec ses zones d'intervention
      const annoncesAvecZones = await Promise.all(
        annoncesData.map(async (annonce) => {
          const { data: zones } = await supabase
            .from("zones_intervention")
            .select("ville_centre, rayon_km")
            .eq("annonce_id", annonce.id)
            .eq("active", true);
          return {
            ...annonce,
            zones_intervention: zones || []
          };
        })
      );

      setResults(annoncesAvecZones);
      setTotalResults(annoncesAvecZones.length);
      setLoading(false);
    }
    fetchAnnonces();
    // eslint-disable-next-line
  }, [selectedPrestation, selectedVille, priceRange, sortBy]);

  return (
    <>
              <Header/>
              
    <div className="min-h-screen bg-gray-50">
      

      {/* Barre de recherche améliorée */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Recherche principale */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Sélection prestation */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5 pointer-events-none" />
              <select
                value={selectedPrestation}
                onChange={e => setSelectedPrestation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-200 focus:outline-none bg-white text-gray-700 font-medium cursor-pointer hover:border-blue-300 hover:shadow-md active:scale-[0.98] transition-all duration-200"
              >
                <option value="">🔍 Choisir une prestation...</option>
                <option value="all">✨ Toutes les prestations</option>
                {prestations.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
            
            {/* Sélection ville */}
            <div className="relative flex-1 md:max-w-xs">
              <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5 pointer-events-none" />
              <select
                value={selectedVille}
                onChange={e => setSelectedVille(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none bg-white text-gray-700 font-medium cursor-pointer hover:border-blue-300 hover:shadow-md active:scale-[0.98] transition-all duration-200"
              >
                <option value="">📍 Choisir une ville...</option>
                <option value="all">🌍 Toutes les villes</option>
                {villes.map((v) => (
                  <option key={v.id} value={v.ville}>{v.ville}</option>
                ))}
              </select>
            </div>

            {/* Bouton filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 rounded-xl border-2 transition-all duration-200 font-medium cursor-pointer active:scale-95 ${
                showFilters 
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:shadow-lg' 
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              Filtres {showFilters ? '▲' : '▼'}
            </button>
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Filtre prix */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">💰 Fourchette de prix (MAD)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={e => setPriceRange(prev => ({...prev, min: e.target.value}))}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-300 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={e => setPriceRange(prev => ({...prev, max: e.target.value}))}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tri */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📊 Trier par</label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-300 focus:outline-none"
                  >
                    <option value="rating">⭐ Mieux notés</option>
                    <option value="price_asc">💰 Prix croissant</option>
                    <option value="price_desc">💎 Prix décroissant</option>
                    <option value="recent">🆕 Plus récents</option>
                  </select>
                </div>

                {/* Reset filtres */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">&nbsp;</label>
                  <button
                    onClick={() => {
                      setSelectedPrestation("all");
                      setSelectedVille("all");
                      setPriceRange({ min: "", max: "" });
                      setSortBy("rating");
                    }}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm"
                  >
                    🔄 Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500"></div>
            <span className="ml-3 text-gray-600 font-medium">Recherche en cours...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600 font-medium">Aucune annonce trouvée</div>
            <p className="text-gray-500 mt-2">Essayez de modifier vos critères de recherche</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {results.length} annonce{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((annonce) => {
                // Gérer les photos (text array en base64)
                let photosArray = [];
                if (annonce.photos && Array.isArray(annonce.photos)) {
                  photosArray = annonce.photos;
                }
                
                // Récupérer la première photo et la formater en data URL si c'est du base64
                let firstPhoto = "https://via.placeholder.com/400x250/635BFF/FFFFFF?text=Shooty";
                if (photosArray.length > 0) {
                  const photoData = photosArray[0];
                  // Si la photo commence déjà par data:image, l'utiliser directement
                  if (photoData && photoData.startsWith('data:image')) {
                    firstPhoto = photoData;
                  } 
                  // Si c'est du base64 pur, ajouter le préfixe data URL
                  else if (photoData && photoData.length > 100) {
                    firstPhoto = `data:image/jpeg;base64,${photoData}`;
                  }
                  // Sinon, si c'est une URL normale
                  else if (photoData && (photoData.startsWith('http') || photoData.startsWith('/'))) {
                    firstPhoto = photoData;
                  }
                }
                
                const prestaName = annonce.profiles?.nom || "Photographe";
                const prestaEmail = annonce.profiles?.email || "";
                const prestaType = annonce.prestations?.nom || "Service photo";
                const villesZones = annonce.zones_intervention?.map(z => `${z.ville_centre} (${z.rayon_km}km)`).join(", ") || "Non spécifié";
                
                return (
                  <div 
                    key={annonce.id} 
                    onClick={() => router.push(`/annonces/${annonce.id}`)}
                    className="bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-2xl hover:border-blue-400 transition-all duration-300 overflow-hidden group cursor-pointer active:scale-95 active:shadow-inner"
                  >
                    {/* Photo de l'annonce */}
                    <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-100 overflow-hidden">
                      <img
                        src={firstPhoto}
                        alt={annonce.titre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/400x250/635BFF/FFFFFF?text=" + encodeURIComponent(annonce.titre || "Photo");
                        }}
                      />
                      {photosArray.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs font-medium">
                          📸 +{photosArray.length - 1}
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2">
                        <div className="flex items-center text-yellow-400 bg-black bg-opacity-70 px-2 py-1 rounded-full">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm font-bold text-white ml-1">
                            {annonce.rate || 5}/5
                          </span>
                          {annonce.nb_avis > 0 && (
                            <span className="text-xs text-gray-300 ml-1">({annonce.nb_avis})</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="mb-3">
                        <h2 className="text-lg font-bold text-gray-800 line-clamp-2 group-hover:text-gray-600 transition-colors">
                          {annonce.titre}
                        </h2>
                      </div>
                      
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {annonce.prix_fixe && (
                          <span className="bg-gray-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                            💰 Prix fixe
                          </span>
                        )}
                        {!annonce.prix_fixe && (
                          <span className="bg-gray-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                            💰 Tarif sur devis
                          </span>
                        )}
                        {annonce.acompte_percent > 0 && (
                          <span className="bg-gray-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                            💳 Acompte {annonce.acompte_percent}%
                          </span>
                        )}
                        {annonce.equipement && (
                          <span className="bg-gray-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                            🎛️ Équipement
                          </span>
                        )}
                        {annonce.fichiers && (
                          <span className="bg-gray-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
                            � Fichiers
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {annonce.description || "Aucune description disponible"}
                      </p>
                      
                      {/* Infos commentaire */}
                      {annonce.comment && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-4 border-l-4 border-gray-300">
                          <p className="text-sm text-gray-700 italic line-clamp-2">
                            💬 "{annonce.comment}"
                          </p>
                        </div>
                      )}
                      
                      {/* Conditions d'annulation */}
                      {annonce.conditions_annulation && (
                        <div className="bg-yellow-50 p-2 rounded-lg mb-3 border border-yellow-200">
                          <p className="text-xs text-yellow-800">
                            ⚠️ Conditions d'annulation :  {annonce.conditions_annulation}
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="font-semibold text-gray-800">{prestaName}</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="truncate">{prestaEmail}</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="font-medium text-xs">{villesZones}</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <FileText className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="bg-gray-100 px-2 py-1 rounded font-medium">{prestaType}</span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                          <div className="text-xl font-bold text-gray-600 group-hover:text-blue-700 transition-colors">
                            {annonce.tarif_unit > 0 ? (
                              <span>{annonce.tarif_unit}€ <span className="text-sm font-normal text-gray-500">/{annonce.unit_tarif || 'unité'}</span></span>
                            ) : (
                              <span className="text-base text-gray-600">💎 Sur devis</span>
                            )}
                          </div>
                          
                          <div className="flex items-center text-blue-700 font-semibold group-hover:text-blue-700 transition-colors">
                            <span className="text-sm">Voir détails</span>
                            <svg className="w-5 h-5 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
export default SearchProviders;