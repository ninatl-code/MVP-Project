import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabaseClient";
import Headerhomepage from '../../components/Headerhomepage';

const COLORS = {
  primary: '#E8EAF6',
  secondary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E'
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
          <Text style={styles.cardMeta}>
            <Text style={styles.cardLabel}>Photographe : </Text>
            {profiles[prestation.prestataire] || prestation.prestataire}
          </Text>
          <Text style={styles.cardMeta}>
            <Text style={styles.cardLabel}>Date : </Text>
            {prestation.created_at ? new Date(prestation.created_at).toLocaleDateString('fr-FR') : ''}
          </Text>
          <Text style={styles.cardTitle}>{prestation.titre}</Text>
          <Text style={styles.cardInfo}>
            <Text style={styles.cardLabel}>Spécialité : </Text>
            {getCategorieNom(prestation.prestation)}
          </Text>
          <Text style={styles.cardInfo}>
            <Text style={styles.cardLabel}>Tarif : </Text>
            {prestation.tarification}
          </Text>
          <Text style={styles.cardInfo}>
            <Text style={styles.cardLabel}>Ville : </Text>
            {villes[prestation.ville] || "-"}
          </Text>
          <Text style={styles.cardInfo}>
            <Text style={styles.cardLabel}>Région : </Text>
            {regions[prestation.region] || "-"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Headerhomepage />
      
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Réservez votre photographe idéal en quelques clics
        </Text>
        <Text style={styles.heroSubtitle}>
          Trouvez des photographes talentueux, découvrez leurs portfolios, comparez les tarifs et réservez votre shooting facilement.
        </Text>
        <View style={styles.heroButtons}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => (navigation as any).navigate("signup")}
          >
            <Text style={styles.outlineButtonText}>Rejoindre en tant que photographe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Découvrir les photographes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Section Catégories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photographes disponibles</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleCategorieClick(cat.id)}
                style={[
                  styles.categoryCard,
                  selectedCategory === cat.id && styles.categoryCardSelected
                ]}
              >
                <Text style={[styles.categoryTitle, selectedCategory === cat.id && styles.categoryTitleSelected]}>
                  {cat.nom}
                </Text>
                <Text style={[styles.categoryDesc, selectedCategory === cat.id && styles.categoryDescSelected]}>
                  Découvrez des photographes spécialisés en {cat.nom.toLowerCase()}.
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {loading && <Text style={styles.loadingText}>Chargement...</Text>}
          {stepMsg !== "" && <Text style={styles.stepMsg}>{stepMsg}</Text>}
          
          {selectedCategory && !loading && searchResults.length === 0 && (
            <Text style={styles.noResults}>
              OUPS, aucun photographe n'est disponible dans cette catégorie pour le moment.
            </Text>
          )}
          
          <View style={styles.resultsGrid}>
            {searchResults.map((prestation: any) => (
              <PrestationCard key={prestation.id} prestation={prestation} />
            ))}
          </View>
        </View>

        {/* Section Comment ça marche */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comment ça marche</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Inscription</Text>
              <Text style={styles.stepDesc}>
                Créez un compte gratuitement en quelques étapes simples.
              </Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepTitle}>Recherche</Text>
              <Text style={styles.stepDesc}>
                Trouvez le photographe idéal selon votre style et votre budget.
              </Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepTitle}>Réservation</Text>
              <Text style={styles.stepDesc}>
                Réservez votre shooting en ligne et sécurisez votre date facilement.
              </Text>
            </View>
          </View>
        </View>

        {/* Section FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions fréquentes</Text>
          <View style={styles.faqContainer}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Q : Comment puis-je contacter un photographe ?</Text>
              <Text style={styles.faqAnswer}>
                R : Vous pouvez contacter un photographe directement via notre plateforme en cliquant sur le bouton "Contacter" sur son profil.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Q : Les paiements sont-ils sécurisés ?</Text>
              <Text style={styles.faqAnswer}>
                R : Oui, tous les paiements sont traités de manière sécurisée via notre partenaire de paiement.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Q : Puis-je annuler mon shooting ?</Text>
              <Text style={styles.faqAnswer}>
                R : Oui, vous pouvez annuler votre shooting sous certaines conditions. Veuillez consulter notre politique d'annulation pour plus de détails.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.footerSection}>
            <Text style={styles.footerTitle}>Liens utiles</Text>
            <Text style={styles.footerLink}>Comment ça marche</Text>
            <Text style={styles.footerLink}>Photographes</Text>
            <Text style={styles.footerLink}>Aide</Text>
            <Text style={styles.footerLink}>Connexion</Text>
            <Text style={styles.footerLink}>S'inscrire</Text>
          </View>
          <View style={styles.footerSection}>
            <Text style={styles.footerTitle}>Contact</Text>
            <Text style={styles.footerText}>
              Vous avez des questions ? N'hésitez pas à nous contacter.
            </Text>
            <Text style={styles.footerEmail}>contact@shooty.fr</Text>
          </View>
        </View>
        <Text style={styles.footerCopyright}>
          © 2023 Wedoria. Tous droits réservés.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 80,
    backgroundColor: '#fff'
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    color: COLORS.text,
    maxWidth: 600,
    marginBottom: 24
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    maxWidth: 500,
    marginBottom: 40,
    lineHeight: 26
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  outlineButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.accent
  },
  outlineButtonText: {
    color: COLORS.accent,
    fontWeight: '600',
    fontSize: 16
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.accent
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64
  },
  section: {
    marginBottom: 64
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: COLORS.text
  },
  categoriesGrid: {
    gap: 32,
    marginBottom: 24
  },
  categoryCard: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  categoryCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    transform: [{ scale: 1.02 }]
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.text
  },
  categoryTitleSelected: {
    color: '#fff'
  },
  categoryDesc: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24
  },
  categoryDescSelected: {
    color: '#E5E7EB'
  },
  loadingText: {
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 32,
    color: COLORS.primary,
    fontSize: 16
  },
  stepMsg: {
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 16,
    color: COLORS.accent,
    fontSize: 14
  },
  noResults: {
    textAlign: 'center',
    paddingVertical: 48,
    fontWeight: '600',
    fontSize: 18,
    color: COLORS.accent
  },
  resultsGrid: {
    gap: 18,
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    width: 340,
    marginBottom: 18,
    marginRight: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden'
  },
  cardInactive: {
    backgroundColor: '#f3f3f3',
    opacity: 0.6
  },
  cardImageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#f3f3f3'
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  noImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ededed'
  },
  noImageText: {
    color: '#bbb',
    fontSize: 32
  },
  cardContent: {
    padding: 20,
    backgroundColor: '#fff'
  },
  cardMeta: {
    fontSize: 15,
    color: '#888',
    marginBottom: 6
  },
  cardLabel: {
    color: COLORS.primary,
    fontWeight: 'bold'
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 22,
    marginBottom: 6,
    lineHeight: 26,
    color: COLORS.text
  },
  cardInfo: {
    fontSize: 16,
    color: '#444',
    marginBottom: 6
  },
  stepsContainer: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap'
  },
  stepCard: {
    flex: 1,
    minWidth: 200,
    alignItems: 'center'
  },
  stepNumber: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold'
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.text,
    textAlign: 'center'
  },
  stepDesc: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24
  },
  faqContainer: {
    gap: 16
  },
  faqItem: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  faqQuestion: {
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    fontSize: 16
  },
  faqAnswer: {
    color: '#666',
    fontSize: 16,
    lineHeight: 24
  },
  footer: {
    backgroundColor: COLORS.text,
    paddingVertical: 32
  },
  footerContent: {
    maxWidth: 1200,
    marginHorizontal: 48,
    flexDirection: 'row',
    gap: 32,
    flexWrap: 'wrap',
    marginBottom: 32
  },
  footerSection: {
    flex: 1,
    minWidth: 200
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: COLORS.secondary
  },
  footerLink: {
    color: '#E5E7EB',
    marginBottom: 8,
    fontSize: 16
  },
  footerText: {
    color: '#D1D5DB',
    marginBottom: 8,
    fontSize: 16,
    lineHeight: 24
  },
  footerEmail: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 16
  },
  footerCopyright: {
    textAlign: 'center',
    color: '#D1D5DB',
    fontSize: 14,
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
    paddingTop: 16,
    marginHorizontal: 48
  }
});
