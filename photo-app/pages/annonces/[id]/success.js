import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function SuccessPage() {
  const router = useRouter();
  const { id, session_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Paiement en cours de validation...");
  const [details, setDetails] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!session_id) return;

    // Vérifie le paiement dans la table paiements avec retry
    async function fetchPaiement() {
      setLoading(true);
      const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .eq("stripe_session_id", session_id)
        .single();

      if (error || !data) {
        // Si c'est la première tentative et que le paiement n'est pas trouvé, on retry
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setMessage(`Vérification du paiement... (tentative ${retryCount + 2}/4)`);
          }, 2000); // Attendre 2 secondes avant de réessayer
          return;
        }
        
        setMessage("❌ Paiement non retrouvé ou en attente de validation.");
        setDetails(null);
        console.error("Erreur récupération paiement:", error);
      } else {
        setMessage("✅ Paiement validé ! Merci pour votre commande.");
        setDetails(data);
      }
      setLoading(false);
    }

    fetchPaiement();
  }, [session_id, retryCount]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold text-green-600 mb-4">
        {details ? "Paiement réussi !" : "Vérification du paiement"}
      </h1>
      
      <div className="text-center">
        <p className="text-lg text-gray-700 mb-4">{message}</p>
        
        {loading && (
          <div className="mt-4 text-gray-400 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mr-2"></div>
            Vérification en cours...
          </div>
        )}
        
        {!details && !loading && retryCount >= 3 && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-800">
            <p className="font-semibold">Que faire maintenant ?</p>
            <ul className="text-sm mt-2 list-disc list-inside">
              <li>Votre paiement peut être en cours de traitement</li>
              <li>Vérifiez votre email pour la confirmation</li>
              <li>Contactez le support si le problème persiste</li>
            </ul>
          </div>
        )}
      </div>

      {details && (
        <div className="mt-6 bg-white rounded-xl shadow p-6 text-gray-700 max-w-md w-full">
          <h3 className="font-semibold text-green-600 mb-3">Détails du paiement</h3>
          <div className="space-y-2">
            <div><b>Montant payé :</b> {details.montant} MAD</div>
            <div><b>Email :</b> {details.email}</div>
            <div><b>Statut :</b> 
              <span className={`font-semibold ${
                details.statut === 'succeeded' ? 'text-green-600' :
                details.statut === 'pending' ? 'text-yellow-600' :
                details.statut === 'failed' ? 'text-red-600' :
                details.statut === 'rembourse' ? 'text-blue-600' :
                'text-gray-600'
              }`}>
                {details.statut === 'succeeded' ? 'Paiement réussi' :
                 details.statut === 'pending' ? 'En attente' :
                 details.statut === 'failed' ? 'Échec' :
                 details.statut === 'rembourse' ? 'Remboursé' :
                 details.statut}
              </span>
            </div>
            <div><b>Date :</b> {new Date(details.created_at).toLocaleString("fr-FR")}</div>
            {details.stripe_session_id && (
              <div className="text-xs text-gray-500">
                <b>ID Session :</b> {details.stripe_session_id.substring(0, 20)}...
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-6 flex gap-4">
        <a
          href={`/annonces/${id}`}
          className="px-6 py-2 bg-pink-500 text-white rounded-xl shadow hover:bg-pink-600 transition-colors"
        >
          Retour à l'annonce
        </a>
        {details && (
          <a
            href="/particuliers/menu"
            className="px-6 py-2 bg-gray-500 text-white rounded-xl shadow hover:bg-gray-600 transition-colors"
          >
            Mes commandes
          </a>
        )}
      </div>
    </div>
  );
}