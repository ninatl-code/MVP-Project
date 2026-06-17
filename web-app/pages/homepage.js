import { useState } from "react";
import { useRouter } from "next/router";
import Headerhomepage from "../components/Headerhomepage";

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E'
};

export default function Abonnements() {
  const [billing, setBilling] = useState("monthly");
  const [selected, setSelected] = useState(null);
  const router = useRouter();

  const plans = [
    {
      id: "freemium",
      name: "Freemium",
      tag: "Phase lancement (6 mois gratuits)",
      priceMonthly: 0,
      priceYearly: 0,
      highlight: false,
      description: "Tester la plateforme et recevoir ses premières demandes",
      features: [
        "Profil visible",
        "Accès aux demandes (limité)",
        "Notifications de nouvelles demandes (standard)",
        "Réponses aux demandes (limité)",
        "Pas de mise en avant",
        "Support basique",
      ],
    },
    {
      id: "boost",
      name: "Boost",
      tag: "Croissance",
      priceMonthly: 129,
      priceYearly: 129 * 10,
      highlight: false,
      description: "Commencer à gagner des clients plus régulièrement",
      features: [
        "Accès illimité aux demandes clients",
        "Réponses illimitées aux demandes",
        "Notification rapide des nouvelles demandes",
        "Accès élargi aux demandes",
        "Priorité modérée dans les résultats",
        "Support standard",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      tag: "Recommandé",
      priceMonthly: 299,
      priceYearly: 299 * 10,
      highlight: true,
      description: "Maximiser les demandes et les conversions",
      features: [
        "Tout Boost inclus",
        "Priorité sur les nouvelles demandes",
        "Mise en avant dans les résultats",
        "Badge prestataire vérifié",
        "Statistiques avancées",
        "Outils de devis rapides",
        "Support prioritaire",
      ],
    },
    {
      id: "elite",
      name: "Elite",
      tag: "Top visibilité",
      priceMonthly: 599,
      priceYearly: 599 * 10,
      highlight: false,
      description: "Dominer sa zone et recevoir les meilleurs clients",
      features: [
        "Tout Pro inclus",
        "Mise en avant homepage",
        "Accès anticipé aux demandes",
        "Boost automatique des profils",
        "Assistant de conversion (devis optimisés)",
        "Analyse complète performance",
        "Support dédié",
      ],
    },
  ];

  const formatPrice = (price) => {
    if (price === 0) return "0 MAD";
    return `${price} MAD`;
  };

  const getPrice = (plan) =>
    billing === "monthly" ? plan.priceMonthly : plan.priceYearly;

  return (
    <>
      <Headerhomepage />

      <div className="min-h-screen bg-[#F9F7F4] text-neutral-900 font-sans py-12">
        <div className="max-w-6xl mx-auto px-6">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold">
              Choisissez votre formule
            </h1>
            <p className="text-neutral-600 mt-2">
              Développez votre activité en recevant plus de clients et de demandes qualifiées.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-white rounded-full p-1 shadow-md">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-6 py-2 rounded-full text-sm font-medium ${
                  billing === "monthly"
                    ? "bg-[#F6DCE8] text-[#1C1C1C]"
                    : "text-neutral-600"
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-6 py-2 rounded-full text-sm font-medium ${
                  billing === "yearly"
                    ? "bg-[#D4AF37] text-white"
                    : "text-neutral-600"
                }`}
              >
                Annuel (2 mois offerts)
              </button>
            </div>
          </div>

          {/* Plans */}
          <div className="grid gap-6 md:grid-cols-4">
            {plans.map((plan) => {
              const isSelected = selected === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 shadow-md bg-white border transition ${
                    plan.highlight
                      ? "border-[#D4AF37] scale-105"
                      : "border-transparent"
                  }`}
                >
                  {/* Tag */}
                  <div
                    className={`absolute -top-3 right-4 text-xs px-3 py-1 rounded-full font-medium ${
                      plan.highlight
                        ? "bg-[#D4AF37] text-white"
                        : "bg-white border text-neutral-500"
                    }`}
                  >
                    {plan.tag}
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mt-5 mb-6">
                    <div className="text-3xl font-extrabold">
                      {formatPrice(getPrice(plan))}
                    </div>
                    <div className="text-sm text-neutral-500">/ mois</div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 text-sm mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-[#A3B18A]">✓</span>
                        <span className="text-neutral-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action */}
                  <button
                    onClick={() => setSelected(plan.id)}
                    className={`w-full py-2 rounded-xl font-semibold transition ${
                      plan.id === "freemium"
                        ? "bg-white border text-neutral-800"
                        : plan.highlight
                        ? "bg-[#D4AF37] text-white"
                        : "bg-[#A3B18A] text-white"
                    }`}
                  >
                    {plan.id === "freemium"
                      ? "Commencer gratuitement"
                      : isSelected
                      ? "Sélectionné"
                      : "Choisir"}
                  </button>
                </div>
              );
            })}
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
      </div>
    </>
  );
}