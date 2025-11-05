import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabaseClient";
import BottomNavBar from '../../components/BottomNavBar';

const COLORS = {
  primary: '#fff',
  accent: '#635BFF',
  background: '#F8F9FB',
  text: '#222',
  card: '#fff',
  cardInactive: '#f3f3f3',
  border: '#E5E7EB',
  shadow: '#000',
};

export default function Homepage() {
  const navigation = useNavigation();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stepMsg, setStepMsg] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any>({});
  const [villes, setVilles] = useState<any>({});
  const [regions, setRegions] = useState<any>({});
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // Charger les catégories depuis la table prestations
  useEffect(() => {
    const fetchCategories = async () => {
      setStepMsg("Chargement des catégories...");
      const { data, error } = await supabase.from("prestations").select("id, nom");
      if (error) {
        setStepMsg("Erreur chargement catégories : " + error.message);
        setCategories([]);
      } else {
        setStepMsg("");
        setCategories(data || []);
      }
    };
    fetchCategories();
  }, []);

  // Charger tous les profils, villes et régions pour mapping id -> nom
  useEffect(() => {
    const fetchRefs = async () => {
      const { data: profilsData } = await supabase.from("profiles").select("id, nom");
      const { data: villesData } = await supabase.from("villes").select("id, ville");
      const { data: regionsData } = await supabase.from("regions").select("id, region");
      
      const profilsMap: any = {};
      (profilsData || []).forEach((p: any) => { profilsMap[p.id] = p.nom; });
      setProfiles(profilsMap);
      
      const villesMap: any = {};
      (villesData || []).forEach((v: any) => { villesMap[v.id] = v.ville; });
      setVilles(villesMap);
      
      const regionsMap: any = {};
      (regionsData || []).forEach((r: any) => { regionsMap[r.id] = r.region; });
      setRegions(regionsMap);
    };
    fetchRefs();
  }, []);

  // Recherche par catégorie avec messages de debug
  const handleCategorieClick = async (categorieId: any) => {
    setSelectedCategory(categorieId);
    setLoading(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase
        .from("annonces")
        .select("*")
        .eq("actif", true)
        .eq("prestation", categorieId);

      if (error) {
        setStepMsg("Erreur Supabase : " + error.message);
        setLoading(false);
        return;
      }
      setSearchResults(data || []);
    } catch (err: any) {
      setStepMsg("Erreur JS : " + err.message);
    }
    setLoading(false);
  };

  const getCategorieNom = (id: any) => {
    const cat = categories.find((c: any) => c.id === id);
    return cat ? cat.nom : id;
  };

  function PrestationCard({ prestation }: any) {
    return (
      <View style={[styles.card, !prestation.actif && styles.cardInactive]}>
        <View style={styles.cardImageContainer}>
          {prestation.photos && prestation.photos.length > 0 ? (
            <Image
              source={{ uri: prestation.photos[0] }}
              style={styles.cardImage}
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>Pas de photo</Text>
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{prestation.titre}</Text>
          <Text style={styles.cardMeta}>{getCategorieNom(prestation.prestation)} • {villes[prestation.ville] || "-"} • {regions[prestation.region] || "-"}</Text>
          <Text style={styles.cardInfo}>Tarif : {prestation.tarification}</Text>
          <Text style={styles.cardInfo}>Photographe : {profiles[prestation.prestataire] || prestation.prestataire}</Text>
          <Text style={styles.cardInfo}>Date : {prestation.created_at ? new Date(prestation.created_at).toLocaleDateString('fr-FR') : ''}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Réservez votre photographe idéal</Text>
          <Text style={styles.heroSubtitle}>Trouvez des photographes talentueux, découvrez leurs portfolios, comparez les tarifs et réservez facilement.</Text>
          
        </View>
        {/* Catégories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categories.map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, selectedCategory === cat.id && styles.categoryCardSelected]}
                onPress={() => handleCategorieClick(cat.id)}
              >
                <Text style={[styles.categoryTitle, selectedCategory === cat.id && styles.categoryTitleSelected]}>{cat.nom}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* Résultats */}
        <View style={styles.section}>
          {stepMsg ? <Text style={styles.stepMsg}>{stepMsg}</Text> : null}
          {loading && <ActivityIndicator size="large" color={COLORS.accent} style={{ marginVertical: 24 }} />}
          {!loading && searchResults.length === 0 && !stepMsg ? (
            <Text style={styles.noResults}>Aucune annonce trouvée</Text>
          ) : null}
          <View style={styles.resultsGrid}>
            {searchResults.map((prestation: any) => (
              <PrestationCard key={prestation.id} prestation={prestation} />
            ))}
          </View>
        </View>
      </ScrollView>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    position: 'relative',
    paddingTop: 64, // Ajout d'une marge en haut
  },
  container: {
    paddingBottom: 80,
    paddingHorizontal: 0,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 32,
    paddingBottom: 32,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 12,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  outlineButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  outlineButtonText: {
    color: COLORS.accent,
    fontWeight: '600',
    fontSize: 16,
  },
  primaryButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text,
  },
  categoriesScroll: {
    marginBottom: 8,
  },
  categoryCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 12,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  categoryCardSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    transform: [{ scale: 1.04 }],
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryTitleSelected: {
    color: '#fff',
  },
  stepMsg: {
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 12,
    color: COLORS.accent,
    fontSize: 14,
  },
  noResults: {
    textAlign: 'center',
    paddingVertical: 32,
    fontWeight: '600',
    fontSize: 16,
    color: COLORS.accent,
  },
  resultsGrid: {
    gap: 12,
    flexDirection: 'column',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  cardInactive: {
    backgroundColor: COLORS.cardInactive,
    opacity: 0.6,
  },
  cardImageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.cardInactive,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  noImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ededed',
  },
  noImageText: {
    color: '#bbb',
    fontSize: 24,
  },
  cardContent: {
    padding: 16,
    backgroundColor: COLORS.card,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 4,
    lineHeight: 22,
    color: COLORS.text,
  },
  cardMeta: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  cardInfo: {
    fontSize: 15,
    color: '#444',
    marginBottom: 4,
  },
});
