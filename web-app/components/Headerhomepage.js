import { useRouter } from "next/router";
import { ShootyLogoSimple } from "./ShootyLogo";

export default function Headerhomepage() {
  const router = useRouter();
  return (
    <header className="flex items-center justify-between px-8 py-4 shadow-sm bg-white border-b border-gray-100">
      <div className="cursor-pointer" onClick={() => router.push("/")}>
        <ShootyLogoSimple width={140} height={45} />
      </div>
      <nav className="flex items-center space-x-6">
        <a 
          href="#how" 
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--text)' }}
        >
          Comment ça marche
        </a>
        <a 
          href="#categories" 
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--text)' }}
        >
          Prestations
        </a>
        <a 
          href="#faq" 
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--text)' }}
        >
          Aide
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
    </header>
  );
}