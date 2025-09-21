import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { Search, MapPin, Star } from "lucide-react";
import Header from '../../components/HeaderParti';

const GOLD = "#D4AF37";
const ROSE = "#F6DCE8";

export default function SearchProviders() {
  const router = useRouter();
  const [prestations, setPrestations] = useState([]);
  const [villes, setVilles] = useState([]);
  const [selectedPrestation, setSelectedPrestation] = useState("");
  const [selectedVille, setSelectedVille] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

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
        .select("id, titre, description, tarif_unit, unit_tarif, photos, ville, rate, actif, prestation, prestataire");

      // Filtrage selon les sélections
      if (selectedPrestation) {
        query = query.eq("prestation", selectedPrestation);
      }
      if (selectedVille) {
        query = query.eq("actif", true).eq("ville", selectedVille);
      }
      

      const { data, error } = await query;
      if (error) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Récupérer le nom de la ville et de la région pour chaque annonce
      const villesMap = Object.fromEntries(villes.map(v => [v.id, v.ville]));
      const prestationsMap = Object.fromEntries(prestations.map(p => [p.id, p.nom]));

      setResults(
        (data || []).map(a => ({
          id: a.id,
          title: a.titre,
          type: prestationsMap[a.prestation] || "",
          city: villesMap[a.ville] || "",
          rating: a.rate || 4.5,
          cover: a.photos && a.photos.length > 0 ? a.photos[0] : "https://source.unsplash.com/400x250/?wedding,provider",
          price: a.tarification ? `À partir de ${a.tarification} MAD` : "",
          description: a.description,
        }))
      );
      setLoading(false);
    }
    fetchAnnonces();
    // eslint-disable-next-line
  }, [selectedPrestation, selectedVille]);

  return (
    <>
              <Header/>
              
    <div className="min-h-screen bg-gray-50">
      

      {/* Barre de recherche */}
      <div className="bg-white shadow-sm py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row gap-4">
          {/* Sélection prestation */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <select
              value={selectedPrestation}
              onChange={e => setSelectedPrestation(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-300 focus:outline-none bg-white"
            >
              <option value="">Choisir une prestation...</option>
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
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-300 focus:outline-none bg-white"
            >
              <option value="">Ville</option>
              {villes.map((v) => (
                <option key={v.id} value={v.id}>{v.ville}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Résultats de recherche
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {results.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden"
            >
              <img
                src={p.cover}
                alt={p.title}
                className="h-40 w-full object-cover"
              />
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  {p.title}
                </h2>
                <p className="text-sm text-gray-500">{p.type}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4 text-gray-500" /> {p.city}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm text-gray-700">{p.rating}</span>
                </div>
                <p className="mt-2 text-gray-600 font-medium">{p.price}</p>
                <button 
                className="mt-3 w-full py-2 rounded-xl bg-gray-500 text-white hover:bg-gray-600 transition"
                onClick={() => router.push("/annonces/" + p.id)}
                >
                  Voir la prestation
                </button>
              </div>
            </div>
          ))}
          {(!loading && results.length === 0 && (selectedPrestation || selectedVille )) && (
            <div className="col-span-3 text-center text-gray-400 py-12 text-lg font-semibold">
              Oups, il n'y a pas d'annonce pour l'instant avec cette sélection.
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}