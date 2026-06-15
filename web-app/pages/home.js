import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useCameraSplashNavigation } from '../components/CameraSplash';

import Headerhomepage from '../components/Headerhomepage';

// Couleurs Bricool
const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E'
};

export default function Homepage() {
  const router = useRouter();
  const { navigateWithSplash, CameraSplashComponent } = useCameraSplashNavigation(router, 2000);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [stepMsg, setStepMsg] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Charger les catégories depuis la table prestations
  useEffect(() => {
    supabase.from("prestations").select("id, nom").then(({ data, error }) => {
      setCategories(error ? [] : (data || []));
      setCategoriesLoading(false);
    });
  }, []);

  // Recherche par catégorie
  const handleCategorieClick = async (categorieId) => {
    setSelectedCategory(categorieId);
    setLoading(true);
    setStepMsg("");
    setSearchResults([]);

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("La requête a pris trop de temps. Vérifiez votre connexion.")), 8000)
    );

    try {
      const query = supabase
        .from("profils_prestataire")
        .select("id, nom_entreprise, portfolio_photos, tarif_horaire_min, categories, plan_actif, created_at")
        .eq("plan_actif", true)
        .contains("categories", [categorieId]);

      const { data, error } = await Promise.race([query, timeout]);

      if (error) {
        setStepMsg("Erreur : " + error.message);
      } else {
        setSearchResults(data || []);
      }
    } catch (err) {
      setStepMsg(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
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
          background: prestation.plan_actif === false ? '#f3f3f3' : '#fff',
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
          opacity: prestation.plan_actif === false ? 0.6 : 1
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
          {prestation.portfolio_photos && prestation.portfolio_photos.length > 0 ? (
            <img
              src={prestation.portfolio_photos[0]}
              alt={prestation.nom_entreprise}
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
            <b style={{color: COLORS.primary}}>Prestataire :</b> {prestation.nom_entreprise || '-'}
          </div>
          <div style={{fontSize:15, color:'#888', marginBottom:6}}>
            <b style={{color: COLORS.primary}}>Date :</b> {prestation.created_at ? new Date(prestation.created_at).toLocaleDateString('fr-FR') : ''}
          </div>
          <div style={{fontWeight:700, fontSize:22, marginBottom:6, lineHeight:1.2, color: COLORS.text}}>
            {prestation.nom_entreprise}
          </div>
          <div style={{fontSize:16, color:'#444', marginBottom:6}}>
            <b style={{color: COLORS.primary}}>Spécialité :</b> {(prestation.categories || []).map(id => getCategorieNom(id)).join(', ')}
          </div>
          <div style={{fontSize:16, color:'#444', marginBottom:6}}>
            <b style={{color: COLORS.primary}}>Tarif :</b> {prestation.tarif_horaire_min ? prestation.tarif_horaire_min + ' MAD/h' : '-'}
          </div>
        </div>
      </div>
    )
  }

  return (
    
    <>
    <Headerhomepage />
    {
    <div className="min-h-screen flex flex-col" style={{background: 'linear-gradient(to bottom, var(--background), white)'}}>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center flex-grow px-6 py-20">
        <div className="w-full flex flex-col items-center justify-center">
          <h1 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-extrabold max-w-2xl mx-auto"
            style={{color: COLORS.text}}
          >
            Créez une demande et obtenez un devis de prestataires qualifiés en quelques minutes
          </h1>
          <p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 text-lg text-gray-600 max-w-xl mx-auto"
          >
            Publiez votre besoin en quelques secondes et recevez des devis de prestataires disponibles près de chez vous. Comparez, échangez et choisissez le bon profil sans perdre de temps.
          </p>
          <div className="mt-10 flex space-x-4 justify-center">
            <button
              variant="outline"
              className="px-6 py-3 text-lg rounded-2xl border-2 transition font-semibold"
              style={{borderColor: COLORS.accent, color: COLORS.accent, backgroundColor: 'transparent'}}
              onMouseEnter={e => {e.target.style.backgroundColor = COLORS.primary; e.target.style.color = COLORS.accent}}
              onMouseLeave={e => {e.target.style.backgroundColor = 'transparent'; e.target.style.color = COLORS.accent}}
              onClick={() => navigateWithSplash("/signup", "Redirection vers l'inscription...")}
            >
              Rejoindre en tant que prestataire
            </button>
            <button
              className="text-white px-6 py-3 text-lg rounded-2xl shadow-lg transition font-semibold"
              style={{backgroundColor: COLORS.accent}}
              onMouseEnter={e => e.target.style.backgroundColor = '#5048E5'}
              onMouseLeave={e => e.target.style.backgroundColor = COLORS.accent}
              onClick={() => {
                const section = document.getElementById('categories');
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Découvrir les prestataires
            </button>
          </div>
        </div>
      </section>

      {/* Conteneur principal pour alignement vertical */}
      <div className="max-w-7xl mx-auto px-8 py-16 flex flex-col gap-16">
        {/* Catégories stylées */}
        <section id="categories">
          <h2 className="text-2xl font-bold mb-6" style={{color: COLORS.text}}>Prestataires disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((cat, i) => (
              <div
                key={cat.id}
                onClick={() => handleCategorieClick(cat.id)}
                className={`categorie-btn cursor-pointer transition-all duration-200 ${selectedCategory === cat.id ? "scale-105" : ""}`}
              >
                <div 
                  className="rounded-2xl shadow-md hover:shadow-lg border transition-all duration-200 p-6"
                  style={{
                    backgroundColor: selectedCategory === cat.id ? COLORS.primary : 'white',
                    borderColor: selectedCategory === cat.id ? COLORS.primary : '#E5E7EB',
                    color: selectedCategory === cat.id ? 'white' : COLORS.text
                  }}
                  onMouseEnter={e => {
                    if (selectedCategory !== cat.id) {
                      e.currentTarget.style.backgroundColor = COLORS.background;
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedCategory !== cat.id) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <h2 className="text-xl font-semibold">{cat.nom}</h2>
                  <p className="mt-2" style={{color: selectedCategory === cat.id ? '#6B7280' : '#6B7280'}}>
                    Découvrez des prestataires spécialisés en {cat.nom.toLowerCase()}.
                  </p>
                </div>
              </div>
            ))}
          </div>
          {categoriesLoading && (
            <div className="col-span-full text-center font-semibold py-4" style={{color: COLORS.secondary}}>Chargement des catégories...</div>
          )}
          {loading && (
            <div className="col-span-full text-center font-semibold py-8" style={{color: COLORS.primary}}>Chargement des prestataires...</div>
          )}
          {stepMsg && (
            <div className="col-span-full text-center font-semibold py-4" style={{color: COLORS.accent}}>{stepMsg}</div>
          )}
          <div className="col-span-full flex flex-wrap">
            {selectedCategory && !loading && searchResults.length === 0 && (
              <div className="w-full text-center py-12 font-semibold text-lg" style={{color: COLORS.accent}}>
                OUPS, aucun prestataire n'est disponible dans cette catégorie pour le moment.
              </div>
            )}
            {searchResults.map(prestation => (
              <PrestationCard key={prestation.id} prestation={prestation} />
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="how">
          <h2 className="text-2xl font-bold mb-6" style={{color: COLORS.text}}>Comment ça marche</h2>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-1/3">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: COLORS.accent}}>
                    <span className="text-white text-3xl font-bold">1</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2" style={{color: COLORS.text}}>Créez votre compte</h2>
                  <p className="text-neutral-600">
                    Inscrivez-vous gratuitement en quelques minutes
                  </p>
                </div>
              </div>
              <div className="w-1/3">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: COLORS.accent}}>
                    <span className="text-white text-3xl font-bold">2</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2" style={{color: COLORS.text}}>Trouvez un prestataire</h2>
                  <p className="text-neutral-600">
                    Publiez votre demande ou choisissez directement un prestataire
                  </p>
                </div>
              </div>
              <div className="w-1/3">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: COLORS.accent}}>
                    <span className="text-white text-3xl font-bold">3</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2" style={{color: COLORS.text}}>Réservez en toute sécurité</h2>
                  <p className="text-neutral-600">
                    Validez le devis et votre prestataire est réservé pour votre événement
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq">
          <h2 className="text-2xl font-bold mb-6" style={{color: COLORS.text}}>Questions fréquentes</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg shadow" style={{backgroundColor: COLORS.background}}>
              <h2 className="font-semibold" style={{color: COLORS.text}}>Q : Comment puis-je contacter un prestataire ?</h2>
              <p className="text-neutral-600">
                R : Vous pouvez contacter un prestataire directement via notre plateforme en cliquant sur le bouton "Contacter" sur son profil.
              </p>
            </div>
            <div className="p-4 rounded-lg shadow" style={{backgroundColor: COLORS.background}}>
              <h2 className="font-semibold" style={{color: COLORS.text}}>Q : En tant que prestataire, puis-je changer de plan ?</h2>
              <p className="text-neutral-600">
                R : Oui, vous pouvez upgrader ou downgrade à tout moment.
              </p>
            </div>
            <div className="p-4 rounded-lg shadow" style={{backgroundColor: COLORS.background}}>
              <h2 className="font-semibold" style={{color: COLORS.text}}>Q : Puis-je annuler ma prestation ?</h2>
              <p className="text-neutral-600">
                R : Oui, vous pouvez annuler votre prestation sous certaines conditions. Veuillez consulter la politique d'annulation de votre prestataire pour plus de détails.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="py-8" style={{backgroundColor: COLORS.text, color: '#E5E7EB'}}>
        <div className="max-w-7xl mx-auto px-12">
          <div className="flex flex-wrap gap-8">
            <div className="w-full md:w-1/3">
              <h3 className="text-lg font-semibold mb-4" style={{color: COLORS.secondary}}>Liens utiles</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#how" className="hover:underline" style={{color: '#E5E7EB'}}>Comment ça marche</a>
                </li>
                <li>
                  <a href="#categories" className="hover:underline" style={{color: '#E5E7EB'}}>Prestataires</a>
                </li>
                <li>
                  <a href="#faq" className="hover:underline" style={{color: '#E5E7EB'}}>Aide</a>
                </li>
                <li>
                  <a href="/login" className="hover:underline" style={{color: '#E5E7EB'}}>Connexion</a>
                </li>
                <li>
                  <a href="/signup" className="hover:underline" style={{color: '#E5E7EB'}}>S'inscrire</a>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/3">
              <h3 className="text-lg font-semibold mb-4" style={{color: COLORS.secondary}}>Contact</h3>
              <p className="text-neutral-200 mb-2">
                Vous avez des questions ? N'hésitez pas à nous contacter.
              </p>
              <a
                href="mailto:contact@bricool.fr"
                className="font-semibold hover:underline"
                style={{color: COLORS.secondary}}
              >
                contact@bricool.fr
              </a>
            </div>
            <div className="w-full md:w-1/3">
              <h3 className="text-lg font-semibold mb-4" style={{color: COLORS.secondary}}>Suivez-nous</h3>
              <div className="flex gap-4">
                <a href="#" className="text-white transition" style={{color: '#E5E7EB'}} onMouseEnter={e => e.target.style.color = COLORS.secondary} onMouseLeave={e => e.target.style.color = '#E5E7EB'}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h4v4H8zm0 0h4v4H8zm8-8h4v4h-4zm0 0h4v4h-4z" />
                  </svg>
                </a>
                <a href="#" className="text-white transition" style={{color: '#E5E7EB'}} onMouseEnter={e => e.target.style.color = COLORS.secondary} onMouseLeave={e => e.target.style.color = '#E5E7EB'}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h4v4H8zm0 0h4v4H8zm8-8h4v4h-4zm0 0h4v4h-4z" />
                  </svg>
                </a>
                <a href="#" className="text-white transition" style={{color: '#E5E7EB'}} onMouseEnter={e => e.target.style.color = COLORS.secondary} onMouseLeave={e => e.target.style.color = '#E5E7EB'}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h4v4H8zm0 0h4v4H8zm8-8h4v4h-4zm0 0h4v4h-4z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-neutral-700 pt-4 text-center">
            <p className="text-sm text-neutral-300">
              &copy; 2026 Bricool. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  }

  {/* Animation caméra lors de la navigation */}
  {CameraSplashComponent}
  </>
  ); 
}