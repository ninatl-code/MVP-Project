import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
  Image,
  Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '../../../lib/supabaseClient'
import { COLORS } from '../../../constants/Colors'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import FooterPresta from '../../../components/photographe/FooterPresta'

// ⚠️ Ces trois imports doivent pointer vers des copies EXACTES des fichiers
// web pour garantir que les valeurs de categories/specialisations/villes
// soient strictement identiques des deux côtés.
import { categories } from '../../../constants/categories'
import { SPECIALITES_MAP } from '../../../constants/specialite'
import { VILLES_MAROC } from '../../../constants/villes'

// ──────────────────────────────────────────────────────────────────────────
// Constantes locales (alignées sur le web)
// ──────────────────────────────────────────────────────────────────────────

const EQUIPE = [
  { id: 'solo', label: 'Je travaille seul(e)', icon: 'person-outline' as const },
  { id: 'equipe', label: "J'ai une équipe", icon: 'people-outline' as const },
  { id: 'binome', label: 'J\'ai un binôme', icon: 'people-outline' as const },
]

const MODALITES_PAIEMENT = ['Virement bancaire', 'Carte bancaire', 'Espèces', 'Chèque']

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

type DocType = 'identity_recto' | 'identity_verso' | 'siret' | 'kbis' | 'assurance'

const DOCUMENT_TYPES: {
  type: DocType
  profileColumn: string
  label: string
  required: boolean
}[] = [
  { type: 'identity_recto', profileColumn: 'document_identite_recto_url', label: "Carte d'identité (recto)", required: true },
  { type: 'identity_verso', profileColumn: 'document_identite_verso_url', label: "Carte d'identité (verso)", required: false },
  { type: 'siret', profileColumn: 'documents_siret', label: 'Justificatif SIRET', required: true },
  { type: 'kbis', profileColumn: 'documents_kbis', label: 'Extrait Kbis', required: false },
  { type: 'assurance', profileColumn: 'documents_assurance', label: 'Assurance professionnelle', required: false },
]

// Services additionnels dynamiques par catégorie / spécialisation
// ⚠️ RECONSTRUIT depuis le web — à remplacer par une copie exacte si le web
// fait évoluer cette liste.
const SERVICES_ADDITIONNELS_MAP: Record<string, Record<string, { key: string; label: string }[]> & { _default: { key: string; label: string }[] }> = {
  'Services à domicile': {
    'Plomberie': [
      { key: 'urgence_24h', label: 'Intervention 24h/24' },
      { key: 'devis_gratuit', label: 'Devis gratuit' },
      { key: 'garantie_travaux', label: 'Garantie travaux' },
      { key: 'fourniture_pieces', label: 'Fourniture de pièces' },
    ],
    'Électricité': [
      { key: 'urgence_24h', label: 'Intervention 24h/24' },
      { key: 'devis_gratuit', label: 'Devis gratuit' },
      { key: 'mise_aux_normes', label: 'Mise aux normes' },
    ],
    'Ménage': [
      { key: 'produits_fournis', label: 'Produits fournis' },
      { key: 'menage_regulier', label: 'Ménage régulier' },
    ],
    'Bricolage': [
      { key: 'devis_gratuit', label: 'Devis gratuit' },
      { key: 'garantie_travaux', label: 'Garantie travaux' },
    ],
    _default: [
      { key: 'devis_gratuit', label: 'Devis gratuit' },
      { key: 'urgence_24h', label: 'Intervention 24h/24' },
    ],
  },
  'Transport & logistique': {
    'Chauffeur': [{ key: 'aeroport_gare', label: 'Aéroport / Gare' }],
    'Livraison': [{ key: 'livraison_express', label: 'Livraison express' }],
    'Déménagement': [{ key: 'emballage', label: 'Emballage / Déballage' }],
    _default: [{ key: 'livraison_express', label: 'Service express' }],
  },
  'Services digitaux': {
    'Développement': [{ key: 'maintenance', label: 'Maintenance mensuelle' }],
    'Design': [{ key: 'retouche_pro', label: 'Retouche pro' }],
    'Marketing': [{ key: 'seo', label: 'Référencement SEO' }],
    _default: [{ key: 'support_prioritaire', label: 'Support prioritaire' }],
  },
  'Éducation & coaching': {
    'Cours particuliers': [{ key: 'supports_cours', label: 'Supports de cours fournis' }],
    'Coaching': [{ key: 'suivi_intersession', label: 'Suivi entre séances' }],
    _default: [{ key: 'supports_cours', label: 'Supports fournis' }],
  },
} as any

const getServicesAdditionnels = (cats: string[], specs: string[]) => {
  const cat = cats[0]
  const spec = specs[0]
  const fallback = [
    { key: 'devis_gratuit', label: 'Devis gratuit' },
    { key: 'livraison_express', label: 'Service express' },
    { key: 'garantie', label: 'Garantie satisfaction' },
  ]
  if (!cat || !SERVICES_ADDITIONNELS_MAP[cat]) return fallback
  const catMap = SERVICES_ADDITIONNELS_MAP[cat]
  return (spec && catMap[spec]) || catMap._default || fallback
}

const toArray = (val: any): string[] => {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') return [val]
  return []
}

// ──────────────────────────────────────────────────────────────────────────
// Types — alignés sur les colonnes réellement utilisées côté web
// ──────────────────────────────────────────────────────────────────────────

interface PrestataireProfile {
  // profiles
  nom: string
  email: string
  telephone: string
  ville: string

  // profils_prestataire
  bio: string
  nom_entreprise: string
  site_web: string
  instagram: string
  facebook: string
  linkedin: string
  video_presentation_url: string

  categories: string[]
  specialisations: string[]
  details: { langages?: string; matiere?: string; niveau?: string }

  equipe: string[] // ['solo' | 'equipe' | 'binome'] — même format que le web
  materiel: string // texte libre — même format que le web

  mobile: boolean
  agence: boolean
  agence_adresse: string
  rayon_deplacement: number
  frais_deplacement: string

  preferences: { accepte_weekend: boolean; accepte_soiree: boolean }
  jours_travailles: string[]

  tarif_horaire_min: string
  tarif_horaire_max: string
  acompte_percent: number
  conditions_annulation: string
  delai_annulation_jours: number
  modalites_paiement: string[]
  services_additionnels: Record<string, boolean> & { _texte_libre?: string }

  siret: string
  numero_tva: string
  statut_pro: boolean
  statut_validation: string

  portfolio_photos: string[]
  photo_couverture: string

  document_identite_recto_url: string | null
  document_identite_verso_url: string | null
  documents_siret: string | null
  documents_kbis: string | null
  documents_assurance: string | null
}

const DEFAULT_PROFILE: PrestataireProfile = {
  nom: '',
  email: '',
  telephone: '',
  ville: '',
  bio: '',
  nom_entreprise: '',
  site_web: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  video_presentation_url: '',
  categories: [],
  specialisations: [],
  details: {},
  equipe: [],
  materiel: '',
  mobile: true,
  agence: false,
  agence_adresse: '',
  rayon_deplacement: 50,
  frais_deplacement: '',
  preferences: { accepte_weekend: true, accepte_soiree: true },
  jours_travailles: [],
  tarif_horaire_min: '',
  tarif_horaire_max: '',
  acompte_percent: 30,
  conditions_annulation: '',
  delai_annulation_jours: 7,
  modalites_paiement: [],
  services_additionnels: {},
  siret: '',
  numero_tva: '',
  statut_pro: false,
  statut_validation: 'pending',
  portfolio_photos: [],
  photo_couverture: '',
  document_identite_recto_url: null,
  document_identite_verso_url: null,
  documents_siret: null,
  documents_kbis: null,
  documents_assurance: null,
}

export default function ProfilComplet() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [profile, setProfile] = useState<PrestataireProfile>(DEFAULT_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<DocType | 'avatar' | 'cover' | null>(null)
  const [activeTab, setActiveTab] = useState('infos')
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [autreSpecInput, setAutreSpecInput] = useState('')
  const prevExistsRef = useRef(false)

  useEffect(() => {
    loadProfile()
  }, [])

  // ── Chargement ──────────────────────────────────────────────────────────
  const loadProfile = async () => {
    try {
      // getSession() : lit la session en cache (AsyncStorage), fiable même
      // juste après une navigation — contrairement à getUser() qui fait un
      // appel réseau pouvant échouer/retarder au mauvais moment.
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setLoading(false)
        return
      }
      const user = session.user

      const { data: baseProfile, error: baseError } = await supabase
        .from('profiles')
        .select('id, nom, email, telephone, avatar_url, ville')
        .eq('auth_user_id', user.id)
        .eq('role', 'photographe')
        .maybeSingle()

      if (baseError) {
        console.error('Erreur profiles:', baseError)
      }

      if (baseProfile?.id) {
        setProfileId(baseProfile.id)
      }

      const { data: photoData, error: photoError } = baseProfile?.id
        ? await supabase.from('profils_prestataire').select('*').eq('id', baseProfile.id).maybeSingle()
        : { data: null, error: null }

      if (photoError) {
        console.error('Erreur profils_prestataire:', photoError)
      }

      prevExistsRef.current = !!photoData

      const merged: PrestataireProfile = {
        nom: baseProfile?.nom || user.user_metadata?.nom || '',
        email: baseProfile?.email || user.email || '',
        telephone: baseProfile?.telephone || '',
        ville: baseProfile?.ville || '',

        bio: photoData?.bio || '',
        nom_entreprise: photoData?.nom_entreprise || '',
        site_web: photoData?.site_web || '',
        instagram: photoData?.instagram || '',
        facebook: photoData?.facebook || '',
        linkedin: photoData?.linkedin || '',
        video_presentation_url: photoData?.video_presentation_url || '',

        categories: toArray(photoData?.categories),
        specialisations: toArray(photoData?.specialisations),
        details: Array.isArray(photoData?.details) ? (photoData.details[0] || {}) : (photoData?.details || {}),

        equipe: toArray(photoData?.equipe),
        materiel: typeof photoData?.materiel === 'string' ? photoData.materiel : '',

        mobile: photoData?.mobile ?? true,
        agence: photoData?.agence ?? false,
        agence_adresse: photoData?.agence_adresse || '',
        rayon_deplacement: photoData?.rayon_deplacement_km || 50,
        frais_deplacement: photoData?.frais_deplacement_base ?? '',

        preferences: {
          accepte_weekend: photoData?.preferences?.accepte_weekend ?? true,
          accepte_soiree: photoData?.preferences?.accepte_soiree ?? true,
        },
        jours_travailles: toArray(photoData?.jours_travailles),

        tarif_horaire_min: photoData?.tarif_horaire_min ?? '',
        tarif_horaire_max: photoData?.tarif_horaire_max ?? '',
        acompte_percent: photoData?.acompte_percent ?? 30,
        conditions_annulation: photoData?.conditions_annulation || '',
        delai_annulation_jours: photoData?.delai_annulation_jours ?? 7,
        modalites_paiement: toArray(photoData?.modalites_paiement),
        services_additionnels: photoData?.services_additionnels || {},

        siret: photoData?.siret || '',
        numero_tva: photoData?.numero_tva || '',
        statut_pro: photoData?.statut_pro ?? false,
        statut_validation: photoData?.statut_validation || 'pending',

        portfolio_photos: toArray(photoData?.portfolio_photos),
        photo_couverture: photoData?.photo_couverture || '',

        document_identite_recto_url: photoData?.document_identite_recto_url || null,
        document_identite_verso_url: photoData?.document_identite_verso_url || null,
        documents_siret: photoData?.documents_siret || null,
        documents_kbis: photoData?.documents_kbis || null,
        documents_assurance: photoData?.documents_assurance || null,
      }

      setProfile(merged)
      if (baseProfile?.avatar_url) setProfilePhotoUri(baseProfile.avatar_url)
    } catch (error) {
      console.error('Erreur chargement profil:', error)
    } finally {
      setLoading(false)
    }
  }

  const set = <K extends keyof PrestataireProfile>(field: K, value: PrestataireProfile[K]) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  // ── Sauvegarde ───────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Non authentifié')
      const user = session.user

      if (!profileId) throw new Error('Profile ID manquant. Veuillez recharger la page.')

      const emptyToNull = (v: string | undefined | null) => (v && v.trim() !== '' ? v : null)

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nom: emptyToNull(profile.nom) || 'Utilisateur',
          telephone: emptyToNull(profile.telephone),
          ville: emptyToNull(profile.ville),
        })
        .eq('auth_user_id', user.id)
        .eq('role', 'photographe')

      if (profileError) console.error('Erreur profiles:', profileError)

      const { error: photoError } = await supabase
        .from('profils_prestataire')
        .upsert({
          id: profileId, // profils_prestataire.id === profiles.id (pas auth_user_id)
          bio: emptyToNull(profile.bio),
          nom_entreprise: emptyToNull(profile.nom_entreprise),
          site_web: emptyToNull(profile.site_web),
          instagram: emptyToNull(profile.instagram),
          facebook: emptyToNull(profile.facebook),
          linkedin: emptyToNull(profile.linkedin),
          video_presentation_url: emptyToNull(profile.video_presentation_url),

          categories: profile.categories,
          specialisations: profile.specialisations,
          details: Object.keys(profile.details || {}).length > 0 ? [profile.details] : null,

          equipe: profile.equipe,
          materiel: emptyToNull(profile.materiel),

          mobile: profile.mobile,
          agence: profile.agence,
          agence_adresse: emptyToNull(profile.agence_adresse),
          rayon_deplacement_km: profile.rayon_deplacement || 50,
          frais_deplacement_base: profile.frais_deplacement === '' ? null : profile.frais_deplacement,

          preferences: profile.preferences,
          jours_travailles: profile.jours_travailles,

          tarif_horaire_min: profile.tarif_horaire_min === '' ? null : profile.tarif_horaire_min,
          tarif_horaire_max: profile.tarif_horaire_max === '' ? null : profile.tarif_horaire_max,
          acompte_percent: profile.acompte_percent || 0,
          conditions_annulation: emptyToNull(profile.conditions_annulation),
          delai_annulation_jours: profile.delai_annulation_jours || 7,
          modalites_paiement: profile.modalites_paiement,
          services_additionnels: profile.services_additionnels,

          siret: emptyToNull(profile.siret),
          numero_tva: emptyToNull(profile.numero_tva),
          statut_pro: profile.statut_pro,
          statut_validation: profile.statut_validation || 'pending',

          portfolio_photos: profile.portfolio_photos,
          photo_couverture: emptyToNull(profile.photo_couverture),

          document_identite_recto_url: profile.document_identite_recto_url,
          document_identite_verso_url: profile.document_identite_verso_url,
          documents_siret: profile.documents_siret,
          documents_kbis: profile.documents_kbis,
          documents_assurance: profile.documents_assurance,
        })

      if (profileError || photoError) throw (photoError || profileError)

      Alert.alert('Succès', 'Profil mis à jour')
      router.push('/photographe/profil/profil')
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  // ── Upload photo de profil / couverture ────────────────────────────────
  const pickAndUploadImage = async (
    kind: 'avatar' | 'cover',
    aspect: [number, number],
  ) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.85,
    })
    if (result.canceled) return

    setUploading(kind)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Non authentifié')

      const uri = result.assets[0].uri
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const fileName = `${kind}_${session.user.id}_${Date.now()}.jpg`
      const filePath = `${kind === 'avatar' ? 'photos' : 'documents'}/${fileName}`

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(filePath, byteArray, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })

      if (error || !data) throw new Error(error?.message || "Échec de l'upload")

      const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(filePath)
      const url = publicUrlData.publicUrl

      if (kind === 'avatar') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: url })
          .eq('auth_user_id', session.user.id)
          .eq('role', 'photographe')
        if (updateError) throw updateError
        setProfilePhotoUri(url)
      } else {
        set('photo_couverture', url)
        if (profileId) {
          await supabase.from('profils_prestataire').update({ photo_couverture: url }).eq('id', profileId)
        }
      }
      Alert.alert('Succès', 'Photo mise à jour')
    } catch (error: any) {
      Alert.alert("Erreur d'upload", error.message || 'Erreur inconnue')
    } finally {
      setUploading(null)
    }
  }

  // ── Upload documents (identité, SIRET, Kbis, assurance) ────────────────
  const pickAndUploadDocument = async (docType: DocType, useCamera: boolean = false) => {
    let result
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission refusée', "Nous avons besoin de la permission d'accéder à la caméra")
        return
      }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9 })
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9 })
    }
    if (result.canceled) return

    setUploading(docType)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Non authentifié')

      const uri = result.assets[0].uri
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const fileName = `${docType}_${session.user.id}_${Date.now()}.jpg`
      const filePath = `documents/${fileName}`

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(filePath, byteArray, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })

      let docUrl = uri
      if (!error && data) {
        const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(filePath)
        if (publicUrlData?.publicUrl) docUrl = publicUrlData.publicUrl
      }

      const columnMap: Record<DocType, keyof PrestataireProfile> = {
        identity_recto: 'document_identite_recto_url',
        identity_verso: 'document_identite_verso_url',
        siret: 'documents_siret',
        kbis: 'documents_kbis',
        assurance: 'documents_assurance',
      }
      const column = columnMap[docType]
      set(column, docUrl as any)
      set('statut_validation', 'pending')

      if (profileId) {
        await supabase
          .from('profils_prestataire')
          .update({ [column]: docUrl, statut_validation: 'pending' })
          .eq('id', profileId)
      }
      Alert.alert('Succès', 'Document téléchargé')
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de télécharger le document')
    } finally {
      setUploading(null)
    }
  }

  // ── Upload portfolio ─────────────────────────────────────────────────────
  const pickPortfolioPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 })
    if (result.canceled) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Non authentifié')

      const uri = result.assets[0].uri
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const fileName = `portfolio_${session.user.id}_${Date.now()}.jpg`
      const filePath = `photos/${fileName}`

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(filePath, byteArray, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })
      if (error || !data) throw new Error(error?.message || "Échec de l'upload")

      const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(filePath)
      const newPhotos = [...profile.portfolio_photos, publicUrlData.publicUrl]
      set('portfolio_photos', newPhotos)

      if (profileId) {
        await supabase.from('profils_prestataire').update({ portfolio_photos: newPhotos }).eq('id', profileId)
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || "Impossible d'ajouter la photo")
    }
  }

  const removePortfolioPhoto = async (index: number) => {
    const newPhotos = profile.portfolio_photos.filter((_, i) => i !== index)
    set('portfolio_photos', newPhotos)
    if (profileId) {
      await supabase.from('profils_prestataire').update({ portfolio_photos: newPhotos }).eq('id', profileId)
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const profileSpecialisations = toArray(profile.specialisations)
  const profileCategories = toArray(profile.categories)

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Complet</Text>
        <TouchableOpacity
          style={[styles.saveHeaderButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="checkmark" size={24} color="white" />}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {[
          { id: 'infos', label: 'Infos' },
          { id: 'specialites', label: 'Spécialités' },
          { id: 'localisation', label: 'Localisation' },
          { id: 'verification', label: 'Vérification' },
          { id: 'portfolio', label: 'Portfolio' },
          { id: 'tarifs', label: 'Tarifs' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── INFOS ── */}
        {activeTab === 'infos' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations Professionnelles</Text>

            <View style={styles.profilePhotoSection}>
              <View style={styles.profilePhotoContainer}>
                {profilePhotoUri ? (
                  <Image source={{ uri: profilePhotoUri }} style={styles.profilePhoto} />
                ) : (
                  <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                    <Ionicons name="person" size={48} color={COLORS.primary} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.editPhotoButton}
                  onPress={() => pickAndUploadImage('avatar', [1, 1])}
                  disabled={uploading === 'avatar'}
                >
                  {uploading === 'avatar' ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="camera" size={20} color="white" />}
                </TouchableOpacity>
              </View>
              <Text style={styles.profilePhotoLabel}>Photo de profil</Text>
            </View>

            {/* Photo de couverture — ajout, absente de l'ancienne version mobile */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Photo de couverture</Text>
              {profile.photo_couverture ? (
                <Image source={{ uri: profile.photo_couverture }} style={styles.coverPreview} />
              ) : null}
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickAndUploadImage('cover', [3, 1])}
                disabled={uploading === 'cover'}
              >
                {uploading === 'cover' ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="image" size={20} color={COLORS.primary} />}
                <Text style={styles.uploadButtonText}>{profile.photo_couverture ? 'Remplacer' : 'Ajouter'} une couverture</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom</Text>
              <TextInput style={styles.input} value={profile.nom} onChangeText={t => set('nom', t)} placeholder="Votre nom complet" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={profile.email} editable={false} placeholder="Email" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput style={styles.input} value={profile.telephone} onChangeText={t => set('telephone', t)} placeholder="Téléphone" keyboardType="phone-pad" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom de l'entreprise</Text>
              <TextInput style={styles.input} value={profile.nom_entreprise} onChangeText={t => set('nom_entreprise', t)} placeholder="Ex: Studio Lumineux" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bio professionnelle</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={profile.bio}
                onChangeText={t => set('bio', t)}
                placeholder="Décrivez votre approche professionnelle..."
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Site web</Text>
              <TextInput style={styles.input} value={profile.site_web} onChangeText={t => set('site_web', t)} placeholder="https://exemple.com" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput style={styles.input} value={profile.instagram} onChangeText={t => set('instagram', t)} placeholder="@username" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Facebook</Text>
              <TextInput style={styles.input} value={profile.facebook} onChangeText={t => set('facebook', t)} placeholder="URL Facebook" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>LinkedIn</Text>
              <TextInput style={styles.input} value={profile.linkedin} onChangeText={t => set('linkedin', t)} placeholder="URL LinkedIn" />
            </View>

            {/* Vidéo de présentation — ajout */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Vidéo de présentation (URL)</Text>
              <TextInput
                style={styles.input}
                value={profile.video_presentation_url}
                onChangeText={t => set('video_presentation_url', t)}
                placeholder="https://youtube.com/..."
              />
              <Text style={styles.hint}>Lien YouTube, Vimeo ou autre plateforme vidéo</Text>
            </View>

            <TouchableOpacity
              style={[styles.proCard, profile.statut_pro && styles.proCardActive]}
              onPress={() => set('statut_pro', !profile.statut_pro)}
            >
              <Ionicons name="shield" size={24} color={profile.statut_pro ? COLORS.primary : '#999'} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.label}>Professionnel</Text>
                <Text style={styles.hint}>Je suis prestataire professionnel (auto-entrepreneur, société…)</Text>
              </View>
              {profile.statut_pro && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
            </TouchableOpacity>
          </View>
        )}

        {/* ── SPÉCIALITÉS ── */}
        {activeTab === 'specialites' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catégorie principale</Text>
            <Text style={styles.subLabel}>Sélectionnez votre domaine d'activité (un seul choix)</Text>
            <View style={styles.gridContainer}>
              {categories.map((cat: any) => {
                const isSelected = profileCategories[0] === cat.id
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => {
                      set('categories', [cat.id])
                      set('specialisations', [])
                    }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{cat.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {profileCategories.length > 0 && SPECIALITES_MAP[profileCategories[0]] && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Spécialisations</Text>
                <Text style={styles.subLabel}>
                  Vos spécialisations dans {categories.find((c: any) => c.id === profileCategories[0])?.label || profileCategories[0]}
                </Text>
                <View style={styles.gridContainer}>
                  {SPECIALITES_MAP[profileCategories[0]].map((spec: string) => {
                    const isSelected = profileSpecialisations.includes(spec)
                    return (
                      <TouchableOpacity
                        key={spec}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => {
                          const next = isSelected
                            ? profileSpecialisations.filter(s => s !== spec)
                            : [...profileSpecialisations, spec]
                          set('specialisations', next)
                        }}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{spec}</Text>
                      </TouchableOpacity>
                    )
                  })}
                  {(() => {
                    const autreSelected = profileSpecialisations.includes('Autre')
                    return (
                      <TouchableOpacity
                        style={[styles.chip, autreSelected && styles.chipSelected]}
                        onPress={() => {
                          const next = autreSelected
                            ? profileSpecialisations.filter(s => s !== 'Autre')
                            : [...profileSpecialisations, 'Autre']
                          set('specialisations', next)
                        }}
                      >
                        <Text style={[styles.chipText, autreSelected && styles.chipTextSelected]}>Autre</Text>
                      </TouchableOpacity>
                    )
                  })()}
                </View>

                {profileSpecialisations.includes('Autre') && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.subLabel}>Précisez vos autres spécialités</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={autreSpecInput}
                        onChangeText={setAutreSpecInput}
                        placeholder="Ex: Jardinage, Baby-sitting..."
                      />
                      <TouchableOpacity
                        style={styles.smallAddButton}
                        onPress={() => {
                          const val = autreSpecInput.trim()
                          if (val && val !== 'Autre' && !profileSpecialisations.includes(val)) {
                            set('specialisations', [...profileSpecialisations, val])
                          }
                          setAutreSpecInput('')
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: '600' }}>Ajouter</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.gridContainer}>
                      {profileSpecialisations.filter(s => s !== 'Autre').map((spec, i) => (
                        <View key={i} style={styles.tagChip}>
                          <Text style={styles.tagChipText}>{spec}</Text>
                          <TouchableOpacity onPress={() => set('specialisations', profileSpecialisations.filter(s => s !== spec))}>
                            <Ionicons name="close" size={14} color={COLORS.primary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Champs conditionnels — alignés sur le web */}
            {profileSpecialisations.includes('Développement') && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Langages de développement (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  value={profile.details?.langages || ''}
                  onChangeText={t => set('details', { ...profile.details, langages: t })}
                  placeholder="Ex : JavaScript, Python, React, Node.js..."
                />
              </View>
            )}
            {profileSpecialisations.includes('Cours particuliers') && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Matière (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.details?.matiere || ''}
                    onChangeText={t => set('details', { ...profile.details, matiere: t })}
                    placeholder="Ex : Mathématiques, Français..."
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Niveau (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.details?.niveau || ''}
                    onChangeText={t => set('details', { ...profile.details, niveau: t })}
                    placeholder="Ex : Collège, Lycée, Université..."
                  />
                </View>
              </>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Configuration équipe</Text>
            <Text style={styles.subLabel}>Comment travaillez-vous ?</Text>
            <View style={{ gap: 8 }}>
              {EQUIPE.map(item => {
                const isSelected = profile.equipe.includes(item.id)
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.equipeCard, isSelected && styles.equipeCardActive]}
                    onPress={() => set('equipe', [item.id])} // choix unique, comme sur le web
                  >
                    <Ionicons name={item.icon} size={20} color={isSelected ? 'white' : '#666'} />
                    <Text style={[styles.equipeCardText, isSelected && { color: 'white' }]}>{item.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Équipement — texte libre, comme sur le web (plus une checklist d'objets) */}
            <View style={styles.formGroup}>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Équipement disponible</Text>
              <Text style={styles.subLabel}>Décrivez votre matériel ou équipement professionnel</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={profile.materiel}
                onChangeText={t => set('materiel', t)}
                placeholder="Ex : matériel professionnel, outillage spécialisé, véhicule..."
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Services additionnels — ajout, absent de l'ancienne version mobile */}
            <View style={styles.formGroup}>
              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Services additionnels</Text>
              <Text style={styles.subLabel}>Sélectionnez les services supplémentaires que vous proposez</Text>
              <View style={styles.gridContainer}>
                {getServicesAdditionnels(profileCategories, profileSpecialisations).map(({ key, label }) => {
                  const isOn = profile.services_additionnels?.[key] ?? false
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.chip, isOn && styles.chipSelected]}
                      onPress={() => set('services_additionnels', { ...profile.services_additionnels, [key]: !isOn })}
                    >
                      <Text style={[styles.chipText, isOn && styles.chipTextSelected]}>{isOn ? '✓ ' : ''}{label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Autres services (champ libre)</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={profile.services_additionnels?._texte_libre || ''}
                  onChangeText={t => set('services_additionnels', { ...profile.services_additionnels, _texte_libre: t })}
                  placeholder="Ex : Installation de climatiseur, Cours de cuisine..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>
        )}

        {/* ── LOCALISATION ── */}
        {activeTab === 'localisation' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Localisation & Mobilité</Text>

            {/* Ville — ajout, absente de l'ancienne version mobile */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ville</Text>
              <View style={styles.gridContainer}>
                {VILLES_MAROC.slice().sort().map((v: string) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, profile.ville === v && styles.chipSelected]}
                    onPress={() => set('ville', v)}
                  >
                    <Text style={[styles.chipText, profile.ville === v && styles.chipTextSelected]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.switchGroup}>
              <Text style={styles.label}>Je me déplace sur site</Text>
              <Switch value={profile.mobile} onValueChange={v => set('mobile', v)} />
            </View>

            {profile.mobile && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Rayon de déplacement (km)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(profile.rayon_deplacement)}
                    onChangeText={t => set('rayon_deplacement', parseInt(t) || 50)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Frais de déplacement (MAD/km)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(profile.frais_deplacement)}
                    onChangeText={t => set('frais_deplacement', t)}
                    keyboardType="numeric"
                    placeholder="0.50"
                  />
                  <Text style={styles.hint}>Laissez vide pour inclure les frais dans vos tarifs</Text>
                </View>
              </>
            )}

            {/* agence / agence_adresse — remplace studio / studio_adresse pour matcher le web */}
            <View style={styles.switchGroup}>
              <Text style={styles.label}>J'ai un bureau / une agence</Text>
              <Switch value={profile.agence} onValueChange={v => set('agence', v)} />
            </View>
            {profile.agence && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Adresse de l'agence</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={profile.agence_adresse}
                  onChangeText={t => set('agence_adresse', t)}
                  placeholder="Ex : 45 Boulevard Mohammed V, Casablanca 20000"
                  multiline
                />
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Préférences horaires</Text>
            <View style={styles.switchGroup}>
              <Text style={styles.label}>Disponible les weekends</Text>
              <Switch
                value={profile.preferences.accepte_weekend}
                onValueChange={v => set('preferences', { ...profile.preferences, accepte_weekend: v })}
              />
            </View>
            <View style={styles.switchGroup}>
              <Text style={styles.label}>Disponible en soirée</Text>
              <Switch
                value={profile.preferences.accepte_soiree}
                onValueChange={v => set('preferences', { ...profile.preferences, accepte_soiree: v })}
              />
            </View>

            {/* Jours travaillés — ajout, absent de l'ancienne version mobile */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Jours travaillés</Text>
            <Text style={styles.subLabel}>Sélectionnez vos jours de disponibilité habituels</Text>
            <View style={styles.gridContainer}>
              {JOURS.map(jour => {
                const isActive = profile.jours_travailles.includes(jour)
                return (
                  <TouchableOpacity
                    key={jour}
                    style={[styles.chip, isActive && styles.chipSelected]}
                    onPress={() => {
                      const next = isActive
                        ? profile.jours_travailles.filter(d => d !== jour)
                        : [...profile.jours_travailles, jour]
                      set('jours_travailles', next)
                    }}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextSelected]}>
                      {jour.charAt(0).toUpperCase() + jour.slice(1)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ── VÉRIFICATION ── */}
        {activeTab === 'verification' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations légales</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Numéro SIRET {profile.statut_pro && '(obligatoire)'}</Text>
              <TextInput
                style={styles.input}
                value={profile.siret}
                onChangeText={t => set('siret', t)}
                placeholder="123 456 789 00012"
                keyboardType="numeric"
              />
            </View>

            {/* numero_tva — ajout, absent de l'ancienne version mobile */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Numéro de TVA intracommunautaire</Text>
              <TextInput
                style={styles.input}
                value={profile.numero_tva}
                onChangeText={t => set('numero_tva', t)}
                placeholder="Ex : ICE 001234567000012 ou IF 1234567"
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Documents à soumettre</Text>
            {DOCUMENT_TYPES.map(docType => {
              const docUrl = (profile as any)[docType.profileColumn]
              const hasDoc = !!docUrl
              return (
                <View key={docType.type} style={[styles.docCard, hasDoc && styles.docCardActive]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: hasDoc ? 8 : 0 }}>
                    <Ionicons name={hasDoc ? 'checkmark-circle' : 'document-outline'} size={20} color={hasDoc ? '#10B981' : '#999'} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>{docType.label}{docType.required && ' *'}</Text>
                    </View>
                  </View>
                  {hasDoc && <Image source={{ uri: docUrl }} style={styles.uploadedDocImage} />}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[styles.uploadButton, { flex: 1 }]}
                      onPress={() => pickAndUploadDocument(docType.type, true)}
                      disabled={uploading === docType.type}
                    >
                      {uploading === docType.type ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="camera" size={18} color={COLORS.primary} />}
                      <Text style={styles.uploadButtonText}>Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.uploadButton, { flex: 1 }]}
                      onPress={() => pickAndUploadDocument(docType.type, false)}
                      disabled={uploading === docType.type}
                    >
                      <Ionicons name="images" size={18} color={COLORS.primary} />
                      <Text style={styles.uploadButtonText}>{hasDoc ? 'Remplacer' : 'Galerie'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* ── PORTFOLIO ── */}
        {activeTab === 'portfolio' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <Text style={styles.subLabel}>Ajoutez des photos de vos travaux</Text>

            <TouchableOpacity style={styles.addPhotoButton} onPress={pickPortfolioPhoto}>
              <Text style={styles.addPhotoText}>+ Ajouter une photo</Text>
            </TouchableOpacity>

            <View style={styles.portfolioGrid}>
              {profile.portfolio_photos.map((photo, index) => (
                <View key={index} style={styles.portfolioItem}>
                  <Image source={{ uri: photo }} style={styles.portfolioImage} />
                  <TouchableOpacity style={styles.deletePhotoButton} onPress={() => removePortfolioPhoto(index)}>
                    <Text style={styles.deletePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── TARIFS ── (refonte complète : tarif horaire simple, plus grille par spécialité) */}
        {activeTab === 'tarifs' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tarification</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tarif horaire de base (MAD)</Text>
              <TextInput
                style={styles.input}
                value={String(profile.tarif_horaire_min)}
                onChangeText={t => set('tarif_horaire_min', t)}
                keyboardType="numeric"
                placeholder="80"
              />
              <Text style={styles.hint}>Ce tarif sera affiché sur votre profil public</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tarif horaire maximum (MAD)</Text>
              <TextInput
                style={styles.input}
                value={String(profile.tarif_horaire_max)}
                onChangeText={t => set('tarif_horaire_max', t)}
                keyboardType="numeric"
                placeholder="200"
              />
            </View>

            {/* acompte / annulation / modalités — ajout, absents de l'ancienne version mobile */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Acompte à la réservation (%)</Text>
              <TextInput
                style={styles.input}
                value={String(profile.acompte_percent)}
                onChangeText={t => set('acompte_percent', parseInt(t) || 0)}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Délai d'annulation sans frais (jours)</Text>
              <TextInput
                style={styles.input}
                value={String(profile.delai_annulation_jours)}
                onChangeText={t => set('delai_annulation_jours', parseInt(t) || 0)}
                keyboardType="numeric"
                placeholder="7"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Conditions d'annulation</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={profile.conditions_annulation}
                onChangeText={t => set('conditions_annulation', t)}
                placeholder="Ex : Annulation gratuite jusqu'à 7 jours avant..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Modalités de paiement acceptées</Text>
              <View style={styles.gridContainer}>
                {MODALITES_PAIEMENT.map(mode => {
                  const isOn = profile.modalites_paiement.includes(mode)
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.chip, isOn && styles.chipSelected]}
                      onPress={() => {
                        const next = isOn
                          ? profile.modalites_paiement.filter(m => m !== mode)
                          : [...profile.modalites_paiement, mode]
                        set('modalites_paiement', next)
                      }}
                    >
                      <Text style={[styles.chipText, isOn && styles.chipTextSelected]}>{mode}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <FooterPresta />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, flex: 1, textAlign: 'center' },
  saveHeaderButton: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', backgroundColor: '#F9F9F9', flexGrow: 0 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: '#888' },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  scrollContent: { flex: 1 },
  section: { padding: 16, paddingBottom: 100 },
  profilePhotoSection: { alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  profilePhotoContainer: { position: 'relative', marginBottom: 12 },
  profilePhoto: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.primary },
  profilePhotoPlaceholder: { backgroundColor: '#F5F5F5' },
  editPhotoButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  profilePhotoLabel: { fontSize: 14, fontWeight: '600', color: '#222' },
  coverPreview: { width: '100%', height: 100, borderRadius: 8, marginBottom: 8, backgroundColor: '#F0F0F0' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#222', marginBottom: 12 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
  subLabel: { fontSize: 13, fontWeight: '500', color: '#666', marginBottom: 12 },
  hint: { fontSize: 12, color: '#888', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#222', backgroundColor: '#FAFAFA' },
  bioInput: { height: 100, textAlignVertical: 'top' },
  switchGroup: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#F9F9F9', marginBottom: 8 },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: '#666' },
  chipTextSelected: { color: '#FFF', fontWeight: '500' },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  tagChipText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  smallAddButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  equipeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#FAFAFA' },
  equipeCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  equipeCardText: { fontSize: 14, color: '#333', fontWeight: '500' },
  proCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0', marginTop: 8 },
  proCardActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  addPhotoButton: { borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.primary, borderRadius: 8, paddingVertical: 24, alignItems: 'center', marginBottom: 16 },
  addPhotoText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  portfolioItem: { width: '48%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F0F0F0' },
  portfolioImage: { width: '100%', height: '100%' },
  deletePhotoButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deletePhotoText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
  uploadButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  uploadedDocImage: { width: '100%', height: 160, borderRadius: 8, resizeMode: 'contain', backgroundColor: '#F5F5F5' },
  docCard: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, marginBottom: 12 },
  docCardActive: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
})