// API Route pour rechercher des adresses via Nominatim
// Contourne les problèmes CORS en faisant la requête côté serveur

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.query;

  if (!query || query.length < 1) {
    return res.status(400).json({ error: 'Query requis' });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}, Maroc&` +
      `format=json&` +
      `addressdetails=1&` +
      `limit=8&` +
      `countrycodes=ma`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'fr',
          'User-Agent': 'Shooty-App/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }

    const data = await response.json();
    
    // Pas de délai artificiel pour une réponse instantanée (style Airbnb)
    // Note: Nominatim limite à 1 req/sec, mais le debounce côté client gère cela
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Erreur recherche adresse:', error);
    return res.status(500).json({ error: 'Erreur lors de la recherche d\'adresse' });
  }
}
