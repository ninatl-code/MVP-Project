import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { Search, MapPin, Star, User, Mail, FileText } from "lucide-react";
import Header from '../../components/HeaderParti';

const GOLD = "#D4AF37";
const ROSE = "#F6DCE8";

export default function SearchProviders() {
  const router = useRouter();
  const [prestations, setPrestations] = useState([]);
  const [villes, setVilles] = useState([]);
  const [selectedPrestation, setSelectedPrestation] = useState("");
  const [selectedVille, setSelectedVille] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("rating");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // Charger les prestations, villes et régions depuis Supabase
  useEffect(() => {
    async function fetchFilters() {
      const { data: prestationsData } = await supabase
        .from("prestations")
        .select("id, nom")
        .order("nom", { ascending: true });
      setPrestations(prestationsData || []);

      const { data: villesData } = await supabase
        .from("villes")
        .select("id, ville")
        .order("ville", { ascending: true });
      setVilles(villesData || []);

      
    }
    fetchFilters();
  }, []);

  // Recherche des annonces selon les filtres
  useEffect(() => {
    async function fetchAnnonces() {
      if (!selectedPrestation && !selectedVille ) {
        setResults([]);
        return;
      }
      setLoading(true);

      let query = supabase
        .from("annonces")
        .select(`
          id, titre, description, tarif_unit, unit_tarif, photos, ville, rate, actif, prestation, prestataire,
          comment, equipement, acompte_percent, prix_fixe, created_at,
          profiles!annonces_prestataire_fkey(nom, email),
          prestations!annonces_prestation_fkey(nom),
          villes!annonces_ville_fkey(ville)
        `);

      // Filtrage selon les sélections
      query = query.eq("actif", true);
      
      if (selectedPrestation) {
        query = query.eq("prestation", selectedPrestation);
      }
      if (selectedVille) {
        query = query.eq("ville", selectedVille);
      }
      if (priceRange.min) {
        query = query.gte("tarif_unit", parseFloat(priceRange.min));
      }
      if (priceRange.max) {
        query = query.lte("tarif_unit", parseFloat(priceRange.max));
      }
      
      // Tri selon la sélection
      switch(sortBy) {
        case "price_asc":
          query = query.order("tarif_unit", { ascending: true });
          break;
        case "price_desc":
          query = query.order("tarif_unit", { ascending: false });
          break;
        case "recent":
          query = query.order("created_at", { ascending: false });
          break;
        default:
          query = query.order("rate", { ascending: false });
      }
      

      const { data, error } = await query;
      if (error) {
        setResults([]);
        setLoading(false);
        return;
      }

      setTotalResults(data?.length || 0);
      
      setResults(
        (data || []).map(a => ({
          id: a.id,
          title: a.titre,
          type: a.prestations?.nom || "",
          city: a.villes?.ville || "",
          rating: a.rate || 4.5,
          cover: a.photos && a.photos.length > 0 ? `data:image/jpeg;base64,${a.photos[0]}` : "/api/placeholder/400/250",
          price: a.tarif_unit ? `${a.tarif_unit} MAD/${a.unit_tarif || 'unité'}` : "Prix sur demande",
          description: a.description,
          comment: a.comment,
          equipement: a.equipement,
          acompte: a.acompte_percent,
          fixedPrice: a.prix_fixe,
          providerName: a.profiles?.nom || "Prestataire",
          providerEmail: a.profiles?.email,
          createdAt: a.created_at,
          photosCount: a.photos?.length || 0
        }))
      );
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
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <select
                value={selectedPrestation}
                onChange={e => setSelectedPrestation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none bg-white text-gray-700 font-medium"
              >
                <option value="">🎯 Choisir une prestation...</option>
                {prestations.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
            
            {/* Sélection ville */}
            <div className="relative flex-1 md:max-w-xs">
              <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <select
                value={selectedVille}
                onChange={e => setSelectedVille(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-300 focus:outline-none bg-white text-gray-700 font-medium"
              >
                <option value="">📍 Ville</option>
                {villes.map((v) => (
                  <option key={v.id} value={v.id}>{v.ville}</option>
                ))}
              </select>
            </div>

            {/* Bouton filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 rounded-xl border-2 transition-all font-medium ${
                showFilters 
                  ? 'bg-pink-500 text-white border-pink-500' 
                  : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
              }`}
            >
              🔧 Filtres {showFilters ? '▲' : '▼'}
            </button>
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtre prix */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">💰 Fourchette de prix (MAD)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={e => setPriceRange(prev => ({...prev, min: e.target.value}))}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-300 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={e => setPriceRange(prev => ({...prev, max: e.target.value}))}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tri */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📊 Trier par</label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-300 focus:outline-none"
                  >
                    <option value="rating">⭐ Mieux notés</option>
                    <option value="price_asc">💰 Prix croissant</option>
                    <option value="price_desc">💎 Prix décroissant</option>
                    <option value="recent">🆕 Plus récents</option>
                  </select>
                </div>

                {/* Reset filtres */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSelectedPrestation("");
                      setSelectedVille("");
                      setPriceRange({ min: "", max: "" });
                      setSortBy("rating");
                    }}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            <span className="ml-3 text-gray-600 font-medium">Recherche en cours...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
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
              {results.map((annonce) => (
                <div key={annonce.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-xl transition-all overflow-hidden group">
                  {/* Photo de l'annonce */}
                  <div className="relative h-48 bg-gray-200 overflow-hidden">
                    <img
                      src={annonce.cover}
                      alt={annonce.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = "/api/placeholder/400/250";
                      }}
                    />
                    {annonce.photosCount > 1 && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs font-medium">
                        📸 +{annonce.photosCount - 1}
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2">
                      <div className="flex items-center text-yellow-400 bg-black bg-opacity-70 px-2 py-1 rounded-full">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-bold text-white ml-1">
                          {annonce.rating || '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-3">
                      <h2 className="text-lg font-bold text-gray-800 line-clamp-2 group-hover:text-pink-600 transition-colors">
                        {annonce.title}
                      </h2>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {annonce.fixedPrice && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                          💰 Prix fixe
                        </span>
                      )}
                      {annonce.acompte && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                          💳 Acompte {annonce.acompte}%
                        </span>
                      )}
                      {annonce.equipement && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">
                          🎛️ Équipement inclus
                        </span>
                      )}
                      {annonce.deplacable && (
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
                          🚚 Déplaçable
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {annonce.description}
                    </p>
                    
                    {/* Infos commentaire */}
                    {annonce.comment && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4 border-l-4 border-pink-300">
                        <p className="text-sm text-gray-700 italic">
                          💬 "{annonce.comment}"
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2 text-pink-500" />
                        <span className="font-semibold text-gray-800">{annonce.providerName}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2 text-pink-500" />
                        <span>{annonce.providerEmail}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-pink-500" />
                        <span className="font-medium">{annonce.city}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <FileText className="w-4 h-4 mr-2 text-pink-500" />
                        <span className="bg-gray-100 px-2 py-1 rounded font-medium">{annonce.type}</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="text-2xl font-bold text-pink-600">
                          {annonce.price && annonce.price !== "Prix sur demande" ? annonce.price : (
                            <span className="text-lg text-gray-600">💎 Sur devis</span>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => router.push(`/annonces/${annonce.id}`)}
                          className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all font-semibold shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                        >
                          Voir détails →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}