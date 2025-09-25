import { useState } from 'react';

export default function TestWebhookPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const simulateWebhook = async () => {
    setLoading(true);
    try {
      // Simuler un paiement webhook
      const mockWebhookData = {
        id: 'evt_test_webhook',
        object: 'event',
        api_version: '2023-10-16',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_' + Math.random().toString(36).substr(2, 9),
            object: 'checkout.session',
            amount_total: 5000, // 50.00 MAD
            customer_email: 'test@example.com',
            payment_intent: 'pi_test_' + Math.random().toString(36).substr(2, 9),
            payment_status: 'paid',
            status: 'complete',
            metadata: {
              annonce_id: '1',
              user_id: '5a16da4e-2ac8-40c8-973b-b442d40895a7', // UUID valide pour test
              prestataire_id: 'eae85480-8383-451b-a2b8-7a72b3f3bb9e' // UUID valide pour test
            }
          }
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test',
          idempotency_key: null
        },
        type: 'checkout.session.completed'
      };

      const response = await fetch('/api/stripe/test-webhook-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookData)
      });

      const data = await response.json();
      setResult({
        success: response.ok,
        status: response.status,
        data: data
      });
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
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🧪 Test Simulation Webhook</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Simuler un paiement Stripe</h2>
          <p className="text-gray-600 mb-4">
            Ce test simule l'appel du webhook sans passer par Stripe.
            Il permettra de vérifier si votre logique de traitement des paiements fonctionne.
          </p>
          
          <button
            onClick={simulateWebhook}
            disabled={loading}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Test en cours...' : 'Simuler un paiement webhook'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              {result.success ? '✅ Test réussi' : '❌ Test échoué'}
            </h3>
            <div className="bg-gray-100 p-4 rounded">
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Configuration requise</h3>
          <div className="text-yellow-700 text-sm space-y-2">
            <p><strong>Pour les tests locaux :</strong></p>
            <ol className="list-decimal list-inside ml-4 space-y-1">
              <li>Installer Stripe CLI : <code className="bg-white px-1 rounded">npm install -g stripe-cli</code></li>
              <li>Se connecter : <code className="bg-white px-1 rounded">stripe login</code></li>
              <li>Écouter les webhooks : <code className="bg-white px-1 rounded">stripe listen --forward-to localhost:3000/api/stripe/webhook</code></li>
              <li>Déclencher un test : <code className="bg-white px-1 rounded">stripe trigger checkout.session.completed</code></li>
            </ol>
            <p className="mt-4"><strong>Pour la production :</strong></p>
            <p className="ml-4">Configurer le webhook dans Stripe Dashboard avec l'URL publique de votre application.</p>
          </div>
        </div>
      </div>
    </div>
  );
}