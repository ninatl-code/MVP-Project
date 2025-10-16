import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

import Headerhomepage from '../components/Headerhomepage';


export default function Homepage() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stepMsg, setStepMsg] = useState("");
  const [categories, setCategories] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [villes, setVilles] = useState({});
  const [regions, setRegions] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Charger les catégories depuis la table prestations
  useEffect(() => {
    const fetchCategories = async () => {
      setStepMsg("Chargement des catégories...");
      const { data, error } = await supabase.from("prestations").select("id, nom");
      if (error) {
        setStepMsg("Erreur chargement catégories : " + error.message);
        setCategories([]);
      } else {
        setStepMsg("");
        setCategories(data || []);
      }
    };
    fetchCategories();
  }, []);

  // Charger tous les profils, villes et régions pour mapping id -> nom
  useEffect(() => {
    const fetchRefs = async () => {
      const { data: profilsData } = await supabase.from("profiles").select("id, nom");
      const { data: villesData } = await supabase.from("villes").select("id, ville");
      const { data: regionsData } = await supabase.from("regions").select("id, region");
      // Mapping id -> nom
      const profilsMap = {};
      (profilsData || []).forEach(p => { profilsMap[p.id] = p.nom; });
      setProfiles(profilsMap);
      const villesMap = {};
      (villesData || []).forEach(v => { villesMap[v.id] = v.ville; });
      setVilles(villesMap);
      const regionsMap = {};
      (regionsData || []).forEach(r => { regionsMap[r.id] = r.region; });
      setRegions(regionsMap);
    };
    fetchRefs();
  }, []);

  // Recherche par catégorie avec messages de debug
  const handleCategorieClick = async (categorieId) => {
    setSelectedCategory(categorieId);
    setLoading(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase
        .from("annonces")
        .select("*")
        .eq("actif", true)
        .eq("prestation", categorieId);

      if (error) {
        setStepMsg("Erreur Supabase : " + error.message);
        setLoading(false);
        return;
      }
      setSearchResults(data || []);
    } catch (err) {
      setStepMsg("Erreur JS : " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.categorie-btn')) {
        setSelectedCategory(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const getCategorieNom = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.nom : id;
  };

  function PrestationCard({ prestation }) {
    return (
      <div
        style={{
          background: prestation.actif === false ? '#f3f3f3' : '#fff',
          borderRadius: 22,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          width: 340,
          marginBottom: 18,
          marginRight: 18,
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          position: 'relative',
          opacity: prestation.actif === false ? 0.6 : 1
        }}
      >
        <div style={{
          width: '100%',
          height: 180,
          background: '#f3f3f3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {prestation.photos && prestation.photos.length > 0 ? (
            <img
              src={prestation.photos[0]}
              alt={prestation.titre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bbb',
              fontSize: 32,
              background: "#ededed"
            }}>
              Pas de photo
            </div>
          )}
        </div>
        <div style={{
          padding: '22px 20px 18px 20px',
          background: '#fff',
          borderBottomLeftRadius: 22,
          borderBottomRightRadius: 22
        }}>
          <div style={{fontSize:15, color:'#888', marginBottom:6}}>
            <b>Prestataire :</b> {profiles[prestation.prestataire] || prestation.prestataire}
          </div>
          <div style={{fontSize:15, color:'#888', marginBottom:6}}>
            <b>Date :</b> {prestation.created_at ? new Date(prestation.created_at).toLocaleDateString('fr-FR') : ''}
          </div>
          <div style={{fontWeight:700, fontSize:22, marginBottom:6, lineHeight:1.2}}>
            {prestation.titre}
          </div>
          <div style={{fontSize:16, color:'#444', marginBottom:6}}>
            <b>Catégorie :</b> {getCategorieNom(prestation.prestation)}
          </div>
          <div style={{fontSize:16, color:'#444', marginBottom:6}}>
            <b>Tarification :</b> {prestation.tarification}
          </div>
          <div style={{fontSize:16, color:'#444', marginBottom:6}}>
            <b>Ville :</b> {villes[prestation.ville] || "-"}
          </div>
          <div style={{fontSize:16, color:'#444', marginBottom:6}}>
            <b>Région :</b> {regions[prestation.region] || "-"}
          </div>
        </div>
      </div>
    )
  }

  return (
    
    <>
    <Headerhomepage />
    {
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center flex-grow px-6 py-20">
        <div className="w-full flex flex-col items-center justify-center">
          <h1 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-extrabold text-slate-700 max-w-2xl mx-auto"
          >
            Commandez vos créations uniques, facilement et avec authenticité
          </h1>
          <p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 text-lg text-gray-600 max-w-xl mx-auto"
          >
            Trouvez des artistes de confiance, discutez en direct, comparez les offres et réservez ou achetez facilement.
          </p>
          <div className="mt-10 flex space-x-4 justify-center">
            <button
              variant="outline"
              className="px-6 py-3 text-lg rounded-2xl border border-slate-700 text-slate-700 hover:bg-slate-700 hover:text-white transition"
              onClick={() => router.push("/signup")}
            >
              Rejoindre en tant qu'artiste
            </button>
            <button
              className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 text-lg rounded-2xl shadow"
              onClick={() => {
                const section = document.getElementById('categories');
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Découvrir les artistes
            </button>
          </div>
        </div>
      </section>

      {/* Conteneur principal pour alignement vertical */}
      <div className="max-w-7xl mx-auto px-8 py-16 flex flex-col gap-16">
        {/* Catégories stylées */}
        <section id="categories">
          <h2 className="text-2xl font-bold mb-6">Artistes disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((cat, i) => (
              <div
                key={cat.id}
                onClick={() => handleCategorieClick(cat.id)}
                className={`cursor-pointer transition-all duration-200 ${selectedCategory === cat.id ? "scale-105" : ""}`}
              >
                <div className={`rounded-2xl shadow-md hover:shadow-lg border transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? "bg-[#181A2A] text-white border-[#181A2A]"
                    : "bg-white text-[#181A2A] border-[#E5E7EB] hover:bg-[#F3F4F6]"
                } p-6`}
                >
                  <h2 className="text-xl font-semibold text-[#181A2A]">{cat.nom}</h2>
                  <p className="text-gray-500 mt-2">
                    Découvrez des œuvres uniques et personnalisées dans {cat.nom.toLowerCase()}.
                  </p>
                </div>
              </div>
            ))}
          </div>
          {loading && (
            <div className="col-span-full text-center text-[#181A2A] font-semibold py-8">Chargement...</div>
          )}
          {stepMsg && (
            <div className="col-span-full text-center text-red-500 font-semibold py-4">{stepMsg}</div>
          )}
          <div className="col-span-full flex flex-wrap">
            {selectedCategory && !loading && searchResults.length === 0 && (
              <div className="w-full text-center py-12 text-[#e67c73] font-semibold text-lg">
                OUPS, il n'y a aucune annonce pour cette prestation pour le moment.
              </div>
            )}
            {searchResults.map(prestation => (
              <PrestationCard key={prestation.id} prestation={prestation} />
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="how">
          <h2 className="text-2xl font-bold mb-6">Comment ça marche</h2>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-1/3">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#334155] flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-3xl font-bold">1</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Inscription</h2>
                  <p className="text-neutral-600">
                    Créez un compte gratuitement en quelques étapes simples.
                  </p>
                </div>
              </div>
              <div className="w-1/3">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#334155] flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-3xl font-bold">2</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Recherche</h2>
                  <p className="text-neutral-600">
                    Trouvez des prestataires selon vos critères et votre budget.
                  </p>
                </div>
              </div>
              <div className="w-1/3">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#334155] flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-3xl font-bold">3</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Réservation</h2>
                  <p className="text-neutral-600">
                    Réservez en ligne et sécurisez votre date facilement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq">
          <h2 className="text-2xl font-bold mb-6">Questions fréquentes</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#F9F9F9] shadow">
              <h2 className="font-semibold">Q : Comment puis-je contacter un prestataire ?</h2>
              <p className="text-neutral-600">
                R : Vous pouvez contacter un prestataire directement via notre plateforme en cliquant sur le bouton "Contacter" sur leur profil.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#F9F9F9] shadow">
              <h2 className="font-semibold">Q : Les paiements sont-ils sécurisés ?</h2>
              <p className="text-neutral-600">
                R : Oui, tous les paiements sont traités de manière sécurisée via notre partenaire de paiement.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#F9F9F9] shadow">
              <h2 className="font-semibold">Q : Puis-je annuler ma réservation ?</h2>
              <p className="text-neutral-600">
                R : Oui, vous pouvez annuler votre réservation sous certaines conditions. Veuillez consulter notre politique d'annulation pour plus de détails.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-[#1F2937] text-[#E5E7EB] py-8">
        <div className="max-w-7xl mx-auto px-12">
          <div className="flex flex-wrap gap-8">
            <div className="w-full md:w-1/3">
              <h3 className="text-lg font-semibold mb-4">Liens utiles</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#how" className="hover:underline">Comment ça marche</a>
                </li>
                <li>
                  <a href="#categories" className="hover:underline">Prestations</a>
                </li>
                <li>
                  <a href="#faq" className="hover:underline">Aide</a>
                </li>
                <li>
                  <a href="/login" className="hover:underline">Connexion</a>
                </li>
                <li>
                  <a href="/signup" className="hover:underline">S'inscrire</a>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/3">
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-neutral-200 mb-2">
                Vous avez des questions ? N'hésitez pas à nous contacter.
              </p>
              <a
                href="mailto:contact@wedoria.com"
                className="text-white font-semibold hover:underline"
              >
                contact@wedoria.com
              </a>
            </div>
            <div className="w-full md:w-1/3">
              <h3 className="text-lg font-semibold mb-4">Suivez-nous</h3>
              <div className="flex gap-4">
                <a href="#" className="text-white hover:text-[#D4AF37] transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h4v4H8zm0 0h4v4H8zm8-8h4v4h-4zm0 0h4v4h-4z" />
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-[#D4AF37] transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h4v4H8zm0 0h4v4H8zm8-8h4v4h-4zm0 0h4v4h-4z" />
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-[#D4AF37] transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h4v4H8zm0 0h4v4H8zm8-8h4v4h-4zm0 0h4v4h-4z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-neutral-700 pt-4 text-center">
            <p className="text-sm text-neutral-300">
              &copy; 2023 Wedoria. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  }
  </>
  ); 
}