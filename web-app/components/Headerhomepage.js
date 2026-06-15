import { useRouter } from "next/router";

export default function Headerhomepage() {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push("/")}>
          <img src="/Bricool-logo.png" alt="BriCool" width={120} height={40} style={{ objectFit: 'contain' }} />
        </div>
        <nav className="flex items-center space-x-6">
          <a 
            href="/home#how" 
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text)' }}
          >
            Comment ça marche
          </a>
          <a 
            href="home#categories" 
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text)' }}
          >
            Prestations
          </a>
          <a 
            href="/homepage" 
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text)' }}
          >
            Abonnement prestataire
          </a>
          <button
            className="cursor-pointer px-6 py-2.5 rounded-xl font-semibold border-2 transition-all hover:opacity-90"
            style={{ 
              borderColor: 'var(--accent)', 
              color: 'var(--accent)',
            }}
            onClick={() => router.push("/login")}
          >
            Connexion
          </button>
          <button
            className="cursor-pointer px-6 py-2.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 shadow-sm"
            style={{ 
              backgroundColor: 'var(--accent)',
            }}
            onClick={() => router.push("/signup")}
          >
            Inscription
          </button>
        </nav>
      </div>
    </header>
  );
}