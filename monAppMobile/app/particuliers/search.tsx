import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import Header from '../../components/HeaderParti';

const GOLD = "#D4AF37";
const ROSE = "#F6DCE8";
const SBLUE = "#130183";
const BLUE = "#5C6BC0";

export default function SearchProviders() {
  const [prestations, setPrestations] = useState<any[]>([]);
  const [villes, setVilles] = useState<any[]>([]);
  const [selectedPrestation, setSelectedPrestation] = useState("all");
  const [selectedVille, setSelectedVille] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("rating");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    async function fetchFilters() {
      const { data: prestationsData } = await supabase
        .from("prestations")
        .select("id, nom")
        .order("nom", { ascending: true });
      setPrestations(prestationsData || []);
      const { data: zonesData } = await supabase
        .from("zones_intervention")
        .select("ville_centre")
        .eq("active", true);
      const uniqueVilles = Array.from(new Set((zonesData || []).map(z => z.ville_centre)));
      setVilles(uniqueVilles.map((ville, idx) => ({ id: idx, ville })));
    }
    fetchFilters();
  }, []);

  useEffect(() => {
    async function fetchAnnonces() {
      setLoading(true);
      let zonesQuery = supabase
        .from("zones_intervention")
        .select("annonce_id, ville_centre, active")
        .eq("active", true);
      if (selectedVille && selectedVille !== "all") {
        zonesQuery = zonesQuery.eq("ville_centre", selectedVille);
      }
      const { data: zonesData } = await zonesQuery;
      const annonceIds = (zonesData || []).map(z => z.annonce_id);
      let annoncesQuery = supabase
        .from("annonces")
        .select("*")
        .in("id", annonceIds);
      if (selectedPrestation && selectedPrestation !== "all") {
        annoncesQuery = annoncesQuery.eq("prestation_id", selectedPrestation);
      }
      if (priceRange.min) {
        annoncesQuery = annoncesQuery.gte("prix", priceRange.min);
      }
      if (priceRange.max) {
        annoncesQuery = annoncesQuery.lte("prix", priceRange.max);
      }
      const { data: annoncesData } = await annoncesQuery;
      setResults(annoncesData || []);
      setTotalResults((annoncesData || []).length);
      setLoading(false);
    }
    fetchAnnonces();
  }, [selectedPrestation, selectedVille, priceRange]);

  return (
    <View style={styles.container}>
      <Header />
      <Text style={styles.title}>Recherche de prestataires</Text>
      <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
        <Text>Filtres</Text>
      </TouchableOpacity>
      {showFilters && (
        <View style={styles.filters}>
          <Text>Prestation:</Text>
          <FlatList
            horizontal
            data={[{ id: "all", nom: "Toutes" }, ...prestations]}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setSelectedPrestation(item.id)} style={styles.filterItem}>
                <Text>{item.nom}</Text>
              </TouchableOpacity>
            )}
          />
          <Text>Ville:</Text>
          <FlatList
            horizontal
            data={[{ id: "all", ville: "Toutes" }, ...villes]}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setSelectedVille(item.ville)} style={styles.filterItem}>
                <Text>{item.ville}</Text>
              </TouchableOpacity>
            )}
          />
          <Text>Prix min:</Text>
          <TextInput style={styles.input} value={priceRange.min} onChangeText={min => setPriceRange({ ...priceRange, min })} keyboardType="numeric" />
          <Text>Prix max:</Text>
          <TextInput style={styles.input} value={priceRange.max} onChangeText={max => setPriceRange({ ...priceRange, max })} keyboardType="numeric" />
        </View>
      )}
      {loading ? (
        <ActivityIndicator size="large" color={BLUE} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id?.toString()}
          renderItem={({ item }) => (
            <View style={styles.resultItem}>
              <Text style={styles.resultTitle}>{item.titre}</Text>
              <Text>{item.description}</Text>
              <Text>Prix: {item.prix} €</Text>
            </View>
          )}
        />
      )}
      <Text style={styles.total}>Total résultats: {totalResults}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  filterButton: { backgroundColor: '#eee', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  filters: { marginBottom: 12 },
  filterItem: { backgroundColor: '#ddd', padding: 8, borderRadius: 8, marginRight: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8, width: 80 },
  resultItem: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  resultTitle: { fontWeight: 'bold', fontSize: 16 },
  total: { marginTop: 12, fontWeight: 'bold' },
});
