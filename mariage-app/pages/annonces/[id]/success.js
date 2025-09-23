import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function SuccessPage() {
  const router = useRouter();
  const { id, session_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Paiement en cours de validation...");
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (!session_id) return;

    // Vérifie le paiement dans la table paiements (ou adapte selon ta structure)
    async function fetchPaiement() {
      setLoading(true);
      const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .eq("session_id", session_id)
        .single();

      if (error || !data) {
        setMessage("❌ Paiement non retrouvé ou en attente de validation.");
        setDetails(null);
      } else {
        setMessage("✅ Paiement validé ! Merci pour votre commande.");
        setDetails(data);
      }
      setLoading(false);
    }

    fetchPaiement();
  }, [session_id]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold text-green-600 mb-4">Succès du paiement</h1>
      <p className="text-lg text-gray-700">{message}</p>
      {loading && <div className="mt-4 text-gray-400">Chargement...</div>}
      {details && (
        <div className="mt-6 bg-white rounded-xl shadow p-6 text-gray-700">
          <div><b>Montant payé :</b> {details.montant} MAD</div>
          <div><b>Email :</b> {details.email}</div>
          <div><b>Date :</b> {new Date(details.created_at).toLocaleString("fr-FR")}</div>
          {/* Ajoute d'autres infos utiles ici */}
        </div>
      )}
      <a
        href={`/annonces/${id}`}
        className="mt-6 px-6 py-2 bg-pink-500 text-white rounded-xl shadow hover:bg-pink-600"
      >
        Retour à l'annonce
      </a>
    </div>
  );
}