import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DiagnosticPage() {
  const [diagnostic, setDiagnostic] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    const results = {};

    try {
      // 1. Test de connexion Supabase
      const { data: testConnection, error: connectionError } = await supabase
        .from('paiements')
        .select('count', { count: 'exact', head: true });
      
      results.supabaseConnection = connectionError ? 
        { status: '❌', error: connectionError.message } : 
        { status: '✅', count: testConnection };

      // 2. Vérifier les paiements récents
      const { data: paiements, error: paiementsError } = await supabase
        .from('paiements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      results.paiementsRecents = paiementsError ? 
        { status: '❌', error: paiementsError.message } : 
        { status: '✅', data: paiements };

      // 3. Test de l'API webhook
      const webhookTest = await fetch('/api/test-webhook');
      const webhookData = await webhookTest.json();
      results.webhookTest = { status: webhookTest.ok ? '✅' : '❌', data: webhookData };

      // 4. Vérifier la structure de la table
      const { data: tableInfo, error: tableError } = await supabase
        .from('paiements')
        .select('*')
        .limit(1);

      results.tableStructure = tableError ? 
        { status: '❌', error: tableError.message } : 
        { status: '✅', columns: tableInfo?.[0] ? Object.keys(tableInfo[0]) : [] };

    } catch (error) {
      results.globalError = { status: '❌', error: error.message };
    }

    setDiagnostic(results);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🔍 Diagnostic des Paiements</h1>
        
        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 mb-6"
        >
          {loading ? 'Diagnostic en cours...' : 'Lancer le diagnostic'}
        </button>

        {diagnostic && (
          <div className="space-y-6">
            {/* Connexion Supabase */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {diagnostic.supabaseConnection?.status} Connexion Supabase
              </h2>
              {diagnostic.supabaseConnection?.error ? (
                <pre className="bg-red-100 p-4 rounded text-red-800 text-sm">
                  {diagnostic.supabaseConnection.error}
                </pre>
              ) : (
                <p className="text-green-600">Connexion réussie</p>
              )}
            </div>

            {/* Structure de table */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {diagnostic.tableStructure?.status} Structure de la table paiements
              </h2>
              {diagnostic.tableStructure?.columns && (
                <div className="bg-gray-100 p-4 rounded">
                  <p className="font-medium">Colonnes disponibles :</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {diagnostic.tableStructure.columns.map(col => (
                      <li key={col}>{col}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Paiements récents */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {diagnostic.paiementsRecents?.status} Paiements récents
              </h2>
              {diagnostic.paiementsRecents?.data ? (
                <div>
                  <p className="mb-3">Nombre de paiements : {diagnostic.paiementsRecents.data.length}</p>
                  {diagnostic.paiementsRecents.data.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="p-2 text-left">ID</th>
                            <th className="p-2 text-left">Session ID</th>
                            <th className="p-2 text-left">Montant</th>
                            <th className="p-2 text-left">Statut</th>
                            <th className="p-2 text-left">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diagnostic.paiementsRecents.data.map(paiement => (
                            <tr key={paiement.id} className="border-t">
                              <td className="p-2">{paiement.id}</td>
                              <td className="p-2 font-mono text-xs">
                                {paiement.stripe_session_id?.substring(0, 20)}...
                              </td>
                              <td className="p-2">{paiement.montant} MAD</td>
                              <td className="p-2">{paiement.statut}</td>
                              <td className="p-2">{new Date(paiement.created_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-orange-600">Aucun paiement trouvé dans la base de données</p>
                  )}
                </div>
              ) : (
                <pre className="bg-red-100 p-4 rounded text-red-800 text-sm">
                  {diagnostic.paiementsRecents?.error}
                </pre>
              )}
            </div>

            {/* Test webhook */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {diagnostic.webhookTest?.status} Test de l'API webhook
              </h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(diagnostic.webhookTest?.data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Checklist de vérification :</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• La table 'paiements' existe-t-elle dans Supabase ?</li>
            <li>• Y a-t-il des paiements dans la table ?</li>
            <li>• Le webhook Stripe est-il configuré avec la bonne URL ?</li>
            <li>• Les variables d'environnement sont-elles définies ?</li>
            <li>• Le webhook reçoit-il des appels de Stripe ?</li>
          </ul>
        </div>
      </div>
    </div>
  );
}