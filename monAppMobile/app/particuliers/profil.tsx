import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import Header from '../../components/HeaderParti';

const DEFAULT_ANNONCE_IMG = require("../../assets/images/shutterstock_2502519999.jpg");

const COLORS = {
  primary: '#635BFF',
  secondary: '#FFD369',
  accent: '#FF7F50',
  background: '#F8F9FB',
  text: '#1C1C1E'
};

export default function UserProfile() {
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [villeNom, setVilleNom] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [bioEdit, setBioEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [villeEdit, setVilleEdit] = useState("");
  const [photoEdit, setPhotoEdit] = useState("");
  const [villesList, setVillesList] = useState<any[]>([]);
  const [nbReservations, setNbReservations] = useState(0);
  const [nbCommandes, setNbCommandes] = useState(0);
  const [nbDevis, setNbDevis] = useState(0);
  const [favoriteAnnonces, setFavoriteAnnonces] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) return;
      setUser(authUser);
      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("nom, photos, ville_id, email, telephone, bio")
        .eq("id", authUser.id)
        .single();
      if (profile) {
        setBioEdit(profile.bio || "");
        setEmailEdit(profile.email || "");
        setPhoneEdit(profile.telephone || "");
        setVilleEdit(profile.ville_id || "");
        setPhotoEdit(profile.photos?.[0] || "");
      }
      // Fetch villes
      const { data: villes } = await supabase
        .from("villes")
        .select("id, nom")
        .order("nom", { ascending: true });
      setVillesList(villes || []);
    };
    fetchUserData();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Header />
      <Text style={styles.title}>Mon Profil</Text>
      <Image source={photoEdit ? { uri: photoEdit } : DEFAULT_ANNONCE_IMG} style={styles.photo} />
      <Text style={styles.label}>Nom: {user?.user_metadata?.full_name || ""}</Text>
      <Text style={styles.label}>Email: {emailEdit}</Text>
      <Text style={styles.label}>Téléphone: {phoneEdit}</Text>
      <Text style={styles.label}>Ville: {villeEdit}</Text>
      <Text style={styles.label}>Bio: {bioEdit}</Text>
      {/* Ajout d'autres infos et boutons d'édition si besoin */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  photo: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: 16 },
  label: { fontSize: 16, marginBottom: 8, color: COLORS.text },
});
