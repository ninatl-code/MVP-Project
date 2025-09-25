import { useState } from 'react';

export default function TestFluxComplet() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testFlux = async (type) => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-flux-complet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🧪 Test Flux Complet de Paiement</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test de bout en bout</h2>
          <p className="text-gray-600 mb-6">
            Ce test crée une vraie commande/réservation, simule le paiement, 
            et vérifie que tous les statuts sont mis à jour correctement.
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={() => testFlux('commande')}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Test en cours...' : 'Tester avec Commande'}
            </button>
            
            <button
              onClick={() => testFlux('reservation')}
              disabled={loading}
              className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Test en cours...' : 'Tester avec Réservation'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              {result.success ? '✅ Test réussi' : '❌ Test échoué'}
            </h3>
            
            {result.steps && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Étapes du test :</h4>
                <ul className="space-y-1">
                  {result.steps.map((step, index) => (
                    <li key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {result.errors && result.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2 text-red-600">Erreurs :</h4>
                <ul className="space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {result.paiement && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Détails du paiement créé :</h4>
                <div className="bg-gray-100 p-4 rounded text-sm">
                  <div><strong>ID Paiement :</strong> {result.paiement.id}</div>
                  <div><strong>Session Stripe :</strong> {result.paiement.stripe_session_id}</div>
                  <div><strong>Montant :</strong> {result.paiement.montant} MAD</div>
                  <div><strong>Statut :</strong> {result.paiement.statut}</div>
                  <div><strong>Commande ID :</strong> {result.paiement.commande_id || 'N/A'}</div>
                  <div><strong>Réservation ID :</strong> {result.paiement.reservation_id || 'N/A'}</div>
                </div>
              </div>
            )}
            
            <div className="mt-4 p-4 bg-gray-50 rounded text-sm">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Ce que teste ce flux :</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>1. Création d'une commande/réservation avec statut "pending"</li>
            <li>2. Simulation d'un paiement Stripe avec les vrais IDs</li>
            <li>3. Traitement du webhook (insertion paiement + mise à jour statuts)</li>
            <li>4. Vérification que le statut passe à "Paid"</li>
            <li>5. Vérification que le paiement_id est lié</li>
          </ul>
        </div>
      </div>
    </div>
  );
}