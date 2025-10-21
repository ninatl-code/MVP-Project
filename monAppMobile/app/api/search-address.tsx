export async function searchAddress(query: string): Promise<any[]> {
  if (!query || query.length < 1) {
    throw new Error("Query requis");
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
    return data;
  } catch (error) {
    console.error('Erreur recherche adresse:', error);
    throw new Error("Erreur lors de la recherche d'adresse");
  }
}