
import { useRouter } from "next/router";

export default function Headerhomepage() {
  const router = useRouter();
  return (
    <header className="flex items-center justify-between px-8 py-4 shadow-sm bg-white">
      <h1 className="text-2xl font-bold text-slate-700">ArtYzana</h1>
      <nav className="space-x-4">
        <a href="#how" className="text-slate-700 hover:text-slate-900 hover:underline transition">Comment ça marche</a>
        <a href="#categories" className="text-slate-700 hover:text-slate-900 hover:underline transition">Prestations</a>
        <a href="#faq" className="text-slate-700 hover:text-slate-900 hover:underline transition">Aide</a>
        <button
          className="px-4 py-2 rounded-full border border-slate-700 text-slate-700 hover:bg-slate-700 hover:text-white transition"
          onClick={() => router.push("/login")}
        >
          Connexion
        </button>
        <button
          className="px-4 py-2 rounded-full bg-slate-700 text-white hover:bg-slate-800 transition"
          onClick={() => router.push("/signup")}
        >
          Inscription
        </button>
      </nav>
    </header>
  );
}