import { useState } from "react";
import { useRouter } from "next/router";
import Headerhomepage from '../components/Headerhomepage';


export default function Abonnements() {
  const [billing, setBilling] = useState("monthly");
  const [selected, setSelected] = useState(null);
  const router = useRouter();

  const plans = [
    {
      id: "freemium",
      name: "Freemium",
      priceMonthly: 0,
      priceYearly: 0,
      tag: "Essayer",
      features: [
        { label: "1 annonce active", available: true },
        { label: "Profil visible", available: true },
        { label: "Réception de messages (10/mois)", available: true },
        { label: "Pas de mise en avant", available: false },
        { label: "Pas de statistiques", available: false },
        { label: "Support communautaire", available: true },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      priceMonthly: 199,
      priceYearly: 199 * 10,
      tag: "Populaire",
      features: [
        { label: "Annonces illimitées", available: true },
        { label: "Messages illimités", available: true },
        { label: "Mise en avant (occasionnelle)", available: true },
        { label: "Statistiques basiques", available: true },
        { label: "Support prioritaire par chat", available: true },
        { label: "Badge prestataire", available: false },
      ],
    },
    {
      id: "pro",
      name: "Pro",
      priceMonthly: 399,
      priceYearly: 399 * 10,
      tag: "Recommandé",
      features: [
        { label: "Tout Premium", available: true },
        { label: "Mise en avant prioritaire (homepage)", available: true },
        { label: "Badge “Prestataire Vérifié”", available: true },
        { label: "Outils marketing (codes promo)", available: true },
        { label: "Statistiques avancées", available: true },
        { label: "Assistance dédiée", available: true },
      ],
    },
  ];

  const formatPrice = (price) => {
    if (price === 0) return "0 MAD";
    return `${price} MAD`;
  };

  return (
    <>
      <Headerhomepage/>
      {    
    <div className="min-h-screen bg-[#F9F7F4] text-neutral-900 font-sans py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">Choisissez la formule qui vous convient</h1>
          <p className="text-neutral-600 mt-2">Wedoria vous propose des abonnements adaptés à tous les prestataires — commencez gratuitement, puis évoluez à votre rythme.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center bg-white rounded-full p-1 shadow-md">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-2 rounded-full text-sm font-medium ${billing === "monthly" ? "bg-[#F6DCE8] text-[#1C1C1C]" : "text-neutral-600"}`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-4 py-2 rounded-full text-sm font-medium ${billing === "yearly" ? "bg-[#D4AF37] text-white" : "text-neutral-600"}`}
            >
              Annuel (2 mois offerts)
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const price = billing === "monthly" ? plan.priceMonthly : plan.priceYearly;
            const isPro = plan.id === "pro";

            return (
              <div key={plan.id} className={`relative rounded-2xl p-6 shadow-md bg-white border ${isPro ? "border-2 border-[#D4AF37] scale-105" : "border-transparent"}`}>
                {isPro && (
                  <div className="absolute -top-3 right-4 bg-[#D4AF37] text-white text-xs font-semibold px-3 py-1 rounded-full">{plan.tag}</div>
                )}
                {!isPro && (
                  <div className="absolute -top-3 right-4 bg-white text-neutral-500 text-xs font-medium px-3 py-1 rounded-full border">{plan.tag}</div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <p className="text-sm text-neutral-500 mt-1">{plan.id === 'freemium' ? 'Gratuit' : plan.tag === 'Populaire' ? 'Meilleur rapport qualité/prix' : 'Pour les pros'}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold">{formatPrice(price)}</span>
                    <span className="text-sm text-neutral-500">/ mois</span>
                  </div>
                </div>

                <ul className="mb-6 space-y-3 text-sm">
                  {plan.features.map((f, idx) => (
                    <li key={idx} className={`flex items-start gap-3 ${f.available ? '' : 'opacity-50'}`}>
                      <span className={`min-w-[22px] h-5 flex items-center justify-center rounded-full text-xs ${f.available ? 'bg-[#A3B18A] text-white' : 'bg-neutral-200 text-neutral-400'}`}>
                        {f.available ? '✓' : '—'}
                      </span>
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelected(plan.id)}
                    className={`px-4 py-2 rounded-2xl font-semibold ${isPro ? 'bg-[#D4AF37] text-white' : plan.id === 'premium' ? 'bg-[#A3B18A] text-white' : 'bg-white border border-neutral-300 text-neutral-800'}`}
                  >
                    {plan.id === 'freemium' ? 'Commencer (gratuit)' : selected === plan.id ? 'Sélectionné' : 'S’abonner'}
                  </button>
                  <a href="#" className="text-sm text-neutral-500 hover:underline">En savoir +</a>
                </div>
              </div>
            );
          })}
        </div>

        {/* More details / FAQ like area */}
        <div className="mt-10 bg-white rounded-2xl p-6 shadow">
          <h4 className="font-semibold mb-3">Questions fréquentes</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="font-medium">Comment fonctionne l’abonnement annuel ?</div>
              <div className="text-sm text-neutral-600 mt-1">Le paiement annuel correspond à 10x le prix mensuel (2 mois offerts).</div>
            </div>
            <div>
              <div className="font-medium">Puis-je changer de formule ?</div>
              <div className="text-sm text-neutral-600 mt-1">Oui, changez de formule à tout moment depuis votre tableau de bord — le système ajustera les crédits.</div>
            </div>
            <div>
              <div className="font-medium">Modes de paiement</div>
              <div className="text-sm text-neutral-600 mt-1">Cartes bancaires (Visa/Mastercard), transfert bancaire ou paiement mobile (selon intégration locale).</div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-neutral-500">
          Besoin d’aide ? Contactez notre support : support@wedoria.com
        </div>
        <div className="text-center mt-8">
          <button
            className="px-6 py-3 rounded-full bg-[#D4AF37] text-white font-semibold shadow"
            onClick={() => router.push("/homepage")}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
    /* ...le reste de la page... */}
    </>
  ); 
}