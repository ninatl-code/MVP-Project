import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { onNewPrestataire, onUpdatePrestataire } from '../../lib/matchingService';
import Header from '../../components/HeaderPresta';
import { VILLES_MAROC } from '../../constants/villes';
import { categories } from '../../constants/categories';
import { SPECIALITES_MAP } from '../../constants/specialites';

import { 
  User, Camera, MapPin, Instagram, Globe, Phone, Mail,
  Save, Plus, X, Image, Star, Eye, Upload, Check, 
  Shield, FileText, CreditCard, Building, AlertCircle,
  CheckCircle, Clock, XCircle, Loader2, LogOut,
  Facebook, Linkedin, Briefcase, TrendingUp,
  Layers, Home, Users, Sun, Moon, Car, Euro, Lock, Video
} from 'lucide-react';

const COLORS = {
  primary: '#F8F9FB',
  accent: '#130183',
  secondary: '#5C6BC0',
  background: '#FFFFFF',
  text: '#222222',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444'
};

const DOCUMENT_TYPES = [
  { type: 'identity_recto', profileColumn: 'document_identite_recto_url', label: "Carte d'identité (recto)", icon: CreditCard, description: "Recto de votre CNI ou passeport", required: true },
  { type: 'identity_verso', profileColumn: 'document_identite_verso_url', label: "Carte d'identité (verso)", icon: CreditCard, description: "Verso de votre CNI", required: false },
  { type: 'siret', profileColumn: 'documents_siret', label: "Justificatif SIRET", icon: Building, description: 'Justificatif SIRET ou extrait Kbis', required: true },
  { type: 'kbis', profileColumn: 'documents_kbis', label: "Extrait Kbis", icon: FileText, description: 'Extrait Kbis de moins de 3 mois', required: false },
  { type: 'assurance', profileColumn: 'documents_assurance', label: "Assurance professionnelle", icon: Shield, description: 'Attestation RC Pro en cours de validité', required: false },
];

const EQUIPE = [
  { id: 'solo', label: 'Je travaille seul(e)', icon: User },
  { id: 'equipe', label: "J'ai une équipe", icon: Users },
  { id: 'binome', label: "J'ai un binôme", icon: Users },
];

// Placeholders dynamiques pour "Équipement disponible"
const EQUIPEMENT_PLACEHOLDERS = {
  'Services à domicile': {
    'Plomberie':    'Ex : clé à molette, serre-joint, chalumeau, déboucheur haute pression, testeur d\'étanchéité...',
    'Électricité':  'Ex : multimètre, perceuse, tournevis isolants, testeur de tension, câbles, gaines...',
    'Ménage':       'Ex : aspirateur industriel, monobrosse, nettoyeur vapeur, produits professionnels certifiés...',
    'Bricolage':    'Ex : perceuse-visseuse, ponceuse orbitale, scie circulaire, niveau laser, outillage complet...',
    _default:       'Ex : outillage professionnel, équipements de protection, véhicule utilitaire...',
  },
  'Transport & logistique': {
    'Chauffeur':    'Ex : véhicule climatisé, GPS, chargeur de téléphone, siège bébé, bouteille d\'eau...',
    'Livraison':    'Ex : camionnette, scooter, caisse isotherme, scanner de colis, sangles...',
    'Déménagement': 'Ex : camion 20 m³, diable, sangles, housses de protection, monte-meubles...',
    _default:       'Ex : véhicule adapté, matériel de manutention, GPS, équipements de sécurité...',
  },
  'Services digitaux': {
    'Développement': 'Ex : ordinateur haute performance, double écran, licences IDE, hébergement de test...',
    'Design':        'Ex : tablette graphique Wacom, écran colorimétrique, suite Adobe, stylet professionnel...',
    'Marketing':     'Ex : logiciels SEO (SEMrush…), suite Adobe, outils de gestion réseaux sociaux...',
    _default:        'Ex : ordinateur, logiciels professionnels, connexion fibre, abonnements SaaS...',
  },
  'Éducation & coaching': {
    'Cours particuliers': 'Ex : tableau blanc, manuels, tablette, imprimante, fournitures pédagogiques...',
    'Coaching':           'Ex : outils d\'évaluation, matériel audiovisuel, carnet de suivi, espace calme...',
    _default:             'Ex : supports pédagogiques numériques, tableau interactif, outils de visioconférence...',
  },
  _default: 'Ex : matériel professionnel, outillage spécialisé, véhicule, équipements de travail...',
};

const getEquipementPlaceholder = (categorie, specialisations) => {
  const cat = (categorie || [])[0];
  const spec = (specialisations || [])[0];
  if (!cat) return EQUIPEMENT_PLACEHOLDERS._default;
  const catMap = EQUIPEMENT_PLACEHOLDERS[cat];
  if (!catMap) return EQUIPEMENT_PLACEHOLDERS._default;
  return (spec && catMap[spec]) || catMap._default || EQUIPEMENT_PLACEHOLDERS._default;
};

// Services additionnels dynamiques par catégorie / spécialisation
const SERVICES_ADDITIONNELS_MAP = {
  'Services à domicile': {
    'Plomberie':    [
      { key: 'urgence_24h',        label: 'Intervention 24h/24' },
      { key: 'devis_gratuit',      label: 'Devis gratuit' },
      { key: 'garantie_travaux',   label: 'Garantie travaux' },
      { key: 'fourniture_pieces',  label: 'Fourniture de pièces' },
      { key: 'debouchage',         label: 'Débouchage canalisation' },
      { key: 'detection_fuite',    label: 'Détection de fuite' },
    ],
    'Électricité':  [
      { key: 'urgence_24h',        label: 'Intervention 24h/24' },
      { key: 'devis_gratuit',      label: 'Devis gratuit' },
      { key: 'mise_aux_normes',    label: 'Mise aux normes' },
      { key: 'tableau_electrique', label: 'Tableau électrique' },
      { key: 'domotique',          label: 'Domotique' },
      { key: 'garantie_travaux',   label: 'Garantie travaux' },
    ],
    'Ménage':       [
      { key: 'produits_fournis',   label: 'Produits fournis' },
      { key: 'menage_regulier',    label: 'Ménage régulier' },
      { key: 'repassage',          label: 'Repassage' },
      { key: 'vitres',             label: 'Nettoyage vitres' },
      { key: 'apres_travaux',      label: 'Nettoyage après travaux' },
      { key: 'livraison_express',  label: 'Intervention express' },
    ],
    'Bricolage':    [
      { key: 'devis_gratuit',      label: 'Devis gratuit' },
      { key: 'fourniture_pieces',  label: 'Fourniture de matériel' },
      { key: 'garantie_travaux',   label: 'Garantie travaux' },
      { key: 'montage_meubles',    label: 'Montage de meubles' },
      { key: 'peinture',           label: 'Peinture' },
      { key: 'livraison_express',  label: 'Intervention rapide' },
    ],
    _default: [
      { key: 'devis_gratuit',      label: 'Devis gratuit' },
      { key: 'urgence_24h',        label: 'Intervention 24h/24' },
      { key: 'garantie_travaux',   label: 'Garantie travaux' },
      { key: 'livraison_express',  label: 'Service express' },
    ],
  },
  'Transport & logistique': {
    'Chauffeur':    [
      { key: 'aeroport_gare',      label: 'Aéroport / Gare' },
      { key: 'mise_a_disposition', label: 'Mise à disposition' },
      { key: 'vehicule_climatise', label: 'Véhicule climatisé' },
      { key: 'siege_bebe',         label: 'Siège bébé' },
      { key: 'longue_distance',    label: 'Longue distance' },
      { key: 'livraison_express',  label: 'Réservation express' },
    ],
    'Livraison':    [
      { key: 'livraison_express',  label: 'Livraison express' },
      { key: 'colis_fragiles',     label: 'Colis fragiles' },
      { key: 'temperature_controlee', label: 'Température contrôlée' },
      { key: 'suivi_temps_reel',   label: 'Suivi en temps réel' },
      { key: 'weekend',            label: 'Livraison weekend' },
    ],
    'Déménagement': [
      { key: 'emballage',          label: 'Emballage / Déballage' },
      { key: 'monte_meubles',      label: 'Monte-meubles' },
      { key: 'montage_meubles',    label: 'Montage de meubles' },
      { key: 'stockage',           label: 'Stockage temporaire' },
      { key: 'nettoyage',          label: 'Nettoyage après déménagement' },
      { key: 'devis_gratuit',      label: 'Devis gratuit' },
    ],
    _default: [
      { key: 'livraison_express',  label: 'Service express' },
      { key: 'suivi_temps_reel',   label: 'Suivi en temps réel' },
      { key: 'devis_gratuit',      label: 'Devis gratuit' },
    ],
  },
  'Services digitaux': {
    'Développement': [
      { key: 'maintenance',        label: 'Maintenance mensuelle' },
      { key: 'hebergement',        label: 'Hébergement inclus' },
      { key: 'support_prioritaire',label: 'Support prioritaire' },
      { key: 'documentation',      label: 'Documentation technique' },
      { key: 'formation',          label: 'Formation client' },
      { key: 'livraison_express',  label: 'Livraison rapide' },
    ],
    'Design':        [
      { key: 'retouche_pro',       label: 'Retouche pro' },
      { key: 'fichiers_sources',   label: 'Fichiers sources fournis' },
      { key: 'charte_graphique',   label: 'Charte graphique' },
      { key: 'livraison_express',  label: 'Livraison express' },
      { key: 'revision_illimitee', label: 'Révisions illimitées' },
      { key: 'motion_design',      label: 'Motion design' },
    ],
    'Marketing':     [
      { key: 'rapport_mensuel',    label: 'Rapport mensuel' },
      { key: 'suivi_analytique',   label: 'Suivi analytique' },
      { key: 'gestion_rs',         label: 'Gestion réseaux sociaux' },
      { key: 'creation_contenu',   label: 'Création de contenu' },
      { key: 'publicite_payante',  label: 'Publicité payante' },
      { key: 'seo',                label: 'Référencement SEO' },
    ],
    _default: [
      { key: 'support_prioritaire',label: 'Support prioritaire' },
      { key: 'livraison_express',  label: 'Livraison rapide' },
      { key: 'formation',          label: 'Formation client' },
      { key: 'documentation',      label: 'Documentation' },
    ],
  },
  'Éducation & coaching': {
    'Cours particuliers': [
      { key: 'supports_cours',     label: 'Supports de cours fournis' },
      { key: 'bilan_progression',  label: 'Bilan de progression' },
      { key: 'cours_en_ligne',     label: 'Cours en ligne' },
      { key: 'petits_groupes',     label: 'Petits groupes' },
      { key: 'cours_weekend',      label: 'Cours le weekend' },
      { key: 'livraison_express',  label: 'Disponibilité rapide' },
    ],
    'Coaching':           [
      { key: 'suivi_intersession', label: 'Suivi entre séances' },
      { key: 'outils_evaluation',  label: "Outils d'évaluation" },
      { key: 'bilan_progression',  label: 'Bilan de progression' },
      { key: 'coaching_en_ligne',  label: 'Coaching en ligne' },
      { key: 'urgence_24h',        label: 'Disponibilité urgence' },
      { key: 'plan_action',        label: "Plan d'action personnalisé" },
    ],
    _default: [
      { key: 'supports_cours',     label: 'Supports fournis' },
      { key: 'bilan_progression',  label: 'Bilan de progression' },
      { key: 'cours_en_ligne',     label: 'En ligne disponible' },
      { key: 'livraison_express',  label: 'Disponibilité rapide' },
    ],
  },
  _default: [
    { key: 'devis_gratuit',        label: 'Devis gratuit' },
    { key: 'livraison_express',    label: 'Service express' },
    { key: 'garantie',             label: 'Garantie satisfaction' },
    { key: 'urgence_24h',          label: 'Disponible 24h/24' },
    { key: 'facture_fournie',      label: 'Facture fournie' },
    { key: 'paiement_echelonne',   label: 'Paiement échelonné' },
  ],
};

const getServicesAdditionnels = (categorie, specialisations) => {
  const cat = (categorie || [])[0];
  const spec = (specialisations || [])[0];
  if (!cat) return SERVICES_ADDITIONNELS_MAP._default;
  const catMap = SERVICES_ADDITIONNELS_MAP[cat];
  if (!catMap) return SERVICES_ADDITIONNELS_MAP._default;
  return (spec && catMap[spec]) || catMap._default || SERVICES_ADDITIONNELS_MAP._default;
};

export default function PhotographeProfilPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [profile, setProfile] = useState(null);
  const [villeNom, setVilleNom] = useState('');
  const [portfolioImages, setPortfolioImages] = useState([]);
  const fileInputRef = useRef(null);
  const portfolioInputRef = useRef(null);
  const prevPrestaRef = useRef(null);
  
  // Nouveaux états pour vérification, stats, etc.
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [prestationscategorie, setPrestationscategorie] = useState([]);
  const [autreSpecInput, setAutreSpecInput] = useState('');

  
  // États pour la modification du mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null); // { label, data }
  const [phoneVerifyStep, setPhoneVerifyStep] = useState(null); // null | 'sent' | 'success'
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (authLoading) return; // Attendre que Supabase ait restauré la session
    if (user) {
      Promise.all([
        fetchFullProfile(user.id),
      ]).catch(err => {
        console.error('Init error:', err);
        setLoading(false);
      });
    } else {
      // authLoading === false ET user === null : pas de session, rediriger
      setLoading(false);
      router.push('/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    supabase
      .from('prestations')
      .select('id, nom, slug')
      .eq('actif', true)
      .order('ordre')
      .then(({ data }) => {
        if (data) setPrestationscategorie(data);
      });
  }, []);

  const fetchVerificationStatus = async (userId) => {
    // Statut de vérification inclus dans fetchFullProfile via profils_prestataire
  };



  const handleDocumentUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(docType);
    try {
      const currentUser = user;
      if (!currentUser) return;

      // Compresser les images avant stockage (les PDF sont encodés directement)
      const base64 = await new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
          // PDF : encodage direct sans modification
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
          return;
        }
        // Image : redimensionnement + compression
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new window.Image();
          img.onload = () => {
            const MAX = 1200; // px max (documents lisibles mais pas trop lourds)
            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.75));
          };
          img.onerror = reject;
          img.src = ev.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const columnMap = { identity_recto: 'document_identite_recto_url', identity_verso: 'document_identite_verso_url', siret: 'documents_siret', kbis: 'documents_kbis', assurance: 'documents_assurance' };
      const column = columnMap[docType];
      if (!column) throw new Error('Type de document inconnu');

      const { error } = await supabase
        .from('profils_prestataire')
        .update({ [column]: base64, statut_validation: 'pending' })
        .eq('id', currentUser.id);

      if (error) throw error;

      const labelMap = { identity_recto: "Carte d'identité (recto)", identity_verso: "Carte d'identité (verso)", siret: 'Justificatif SIRET', kbis: 'Extrait Kbis', assurance: 'Assurance professionnelle' };
      handleProfileChange(column, base64);
      handleProfileChange('statut_validation', 'pending');
      alert(`${labelMap[docType] || docType} chargé avec succès !`);
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erreur lors du chargement du document : ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSendPhoneOtp = async () => {
    const phone = profile?.telephone;
    if (!phone) {
      alert("Renseignez d'abord votre numéro de téléphone dans l'onglet Général.");
      return;
    }
    setPhoneVerifying(true);
    try {
      const res = await fetch('/api/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur envoi');
      setPhoneVerifyStep('sent');
    } catch (err) {
      alert('Erreur envoi du code WhatsApp : ' + err.message);
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtpCode) return;
    setPhoneVerifying(true);
    try {
      const res = await fetch('/api/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: phoneOtpCode, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur vérification');
      setPhoneVerifyStep('success');
      setPhoneOtpCode('');
      setVerificationStatus(prev => ({
        ...prev,
        phone_verified: true,
        trust_score: Math.min((prev?.trust_score || 0) + 15, 100),
      }));
    } catch (err) {
      alert(err.message);
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const fetchFullProfile = async (userId) => {
    setLoading(true);
    try {
      if (!userId) {
        userId = user?.id;
      }
      if (!userId) {
        setLoading(false);
        return;
      }

      // Récupérer les deux profils en parallèle
      const [{ data: baseProfile, error: baseError }, { data: photoProfile }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('profils_prestataire').select('*').eq('id', userId).single(),
      ]);

      console.log('🔍 profiles - data:', baseProfile, 'error:', baseError);

      if (!baseError && baseProfile) {
        // Fusionner les deux sources de données
        const mergedProfile = {
          ...baseProfile,
          bio: photoProfile?.bio || '',
          nom_entreprise: photoProfile?.nom_entreprise || '',
          instagram: photoProfile?.instagram || '',
          facebook: photoProfile?.facebook || '',
          linkedin: photoProfile?.linkedin || '',
          website: photoProfile?.site_web || '',
          specialisations: photoProfile?.specialisations || [],
          categorie: photoProfile?.categorie || [],
          equipe: photoProfile?.equipe || [],
          materiel: photoProfile?.materiel || '',
          tarif_horaire_min: photoProfile?.tarif_horaire_min || '',
          photo_couverture: photoProfile?.photo_couverture || '',
          mobile: photoProfile?.mobile ?? true,
          agence: photoProfile?.agence ?? false,
          agence_adresse: photoProfile?.agence_adresse || '',
          rayon_deplacement: photoProfile?.rayon_deplacement_km || 50,
          frais_deplacement: photoProfile?.frais_deplacement_base || '',
          accepte_weekend: photoProfile?.preferences?.accepte_weekend ?? true,
          accepte_soiree: photoProfile?.preferences?.accepte_soiree ?? true,
          preferences: photoProfile?.preferences || {},
          tarif_horaire_max: photoProfile?.tarif_horaire_max || '',
          acompte_percent: photoProfile?.acompte_percent ?? 30,
          conditions_annulation: photoProfile?.conditions_annulation || '',
          delai_annulation_jours: photoProfile?.delai_annulation_jours ?? 7,
          modalites_paiement: photoProfile?.modalites_paiement || [],
          services_additionnels: photoProfile?.services_additionnels || { drone: false, video: false, stylisme: false, maquillage: false, retouche_pro: true, retouche_beaute: false, impression_album: false, livraison_express: false },
          jours_travailles: photoProfile?.jours_travailles || [],
          video_presentation_url: photoProfile?.video_presentation_url || '',
          siret: photoProfile?.siret || '',
          numero_tva: photoProfile?.numero_tva || '',
          statut_pro: photoProfile?.statut_pro ?? false,
          document_identite_recto_url: photoProfile?.document_identite_recto_url || null,
          document_identite_verso_url: photoProfile?.document_identite_verso_url || null,
          documents_siret: photoProfile?.documents_siret || null,
          documents_kbis: photoProfile?.documents_kbis || null,
          documents_assurance: photoProfile?.documents_assurance || null,
          statut_validation: photoProfile?.statut_validation || 'pending',
          portfolio_photos: photoProfile?.portfolio_photos || [],
          details: Array.isArray(photoProfile?.details) ? (photoProfile.details[0] || {}) : (photoProfile?.details || {}),
        };
        
        console.log('✅ Profil fusionné:', mergedProfile);
        setProfile(mergedProfile);

        prevPrestaRef.current = {
          exists: !!photoProfile,
          specialisations: photoProfile?.specialisations || [],
          ville: baseProfile?.ville || null,
        };
        const hasIdentityDoc = !!(photoProfile?.document_identite_recto_url);
        const hasBusinessDoc = !!(photoProfile?.documents_siret || photoProfile?.documents_kbis);
        const emailVerified = true; // Supabase impose la confirmation email à l'inscription
        const phoneVerified = !!(baseProfile?.phone_verified);
        const identityVerified = !!(photoProfile?.identite_verifiee);
        const identityPending = hasIdentityDoc && !identityVerified;
        const businessVerified = !!(photoProfile?.entreprise_verifiee);
        const businessPending = hasBusinessDoc && !businessVerified;
        let score = 20;
        if (emailVerified) score += 20;
        if (phoneVerified) score += 15;
        if (identityPending) score += 10;
        if (identityVerified) score += 20;
        if (businessPending) score += 5;
        if (businessVerified) score += 15;
        score = Math.min(score, 100);
        const level = score < 40 ? 'débutant' : score < 60 ? 'confirmé' : score < 80 ? 'avancé' : 'certifié';
        setVerificationStatus({
          email_verified: emailVerified,
          phone_verified: phoneVerified,
          identity_verified: identityVerified,
          identity_pending: identityPending,
          business_verified: businessVerified,
          business_pending: businessPending,
          trust_score: score,
          trust_level: level,
          badges: [
            emailVerified ? '✉️ Email vérifié' : null,
            phoneVerified ? '📱 Téléphone vérifié' : null,
            identityPending ? '⏳ Identité en cours' : null,
            identityVerified ? '🪪 Identité vérifiée' : null,
            businessPending ? '⏳ Entreprise en cours' : null,
            businessVerified ? '🏢 Entreprise vérifiée' : null,
          ].filter(Boolean),
        });

        // Récupérer le nom de la ville si ville existe
        if (baseProfile.ville) {
          setVilleNom(baseProfile.ville);
        }
      } else {
        console.log('⚠️ Profil non trouvé');
        setProfile({ 
          id: userId, 
          email: user?.email || '', 
          nom: user?.user_metadata?.nom || ''
        });
      }

      // Portfolio depuis profils_prestataire.portfolio_photos
      const portfolioPhotos = (photoProfile?.portfolio_photos || []).map((url, i) => ({ id: i, url, ordre: i }));
      setPortfolioImages(portfolioPhotos);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // En cas d'erreur, on affiche quand même le formulaire
      if (user) {
        setProfile({ 
          id: user.id, 
          email: user.email || '', 
          nom: user.user_metadata?.nom || ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  // Sauvegarde immédiate catégorie + spécialisations pour ne pas perdre la sélection en naviguant
  const autoSaveSpecialisations = async (newcategorie, newSpecialisations) => {
    if (!user?.id) return;
    await supabase.from('profils_prestataire').upsert({
      id: user.id,
      categorie: newcategorie,
      specialisations: newSpecialisations,
    });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const currentUser = user;
      if (!currentUser) return;

      // 1. Sauvegarder dans profiles (données de base)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nom: profile.nom,
          email: profile.email,
          telephone: profile.telephone,
          ville: villeNom || profile.ville || null,
        })
        .eq('id', currentUser.id);

      if (profileError) console.error('Erreur profiles:', profileError);

      // 2. Sauvegarder dans profils_prestataire (données étendues)
      const { error: photoError } = await supabase
        .from('profils_prestataire')
        .upsert({
          id: currentUser.id,
          bio: profile.bio || null,
          nom_entreprise: profile.nom_entreprise || null,
          instagram: profile.instagram || null,
          facebook: profile.facebook || null,
          linkedin: profile.linkedin || null,
          site_web: profile.website || null,
          categorie: profile.categorie || [],
          specialisations: profile.specialisations || [],
          equipe: profile.equipe || [],
          materiel: profile.materiel || null,
          tarif_horaire_min: parseFloat(profile.tarif_horaire_min) || null,
          mobile: profile.mobile ?? true,
          agence: profile.agence ?? false,
          agence_adresse: profile.agence_adresse || null,
          rayon_deplacement_km: parseInt(profile.rayon_deplacement) || 50,
          frais_deplacement_base: parseFloat(profile.frais_deplacement) || null,
          preferences: {
            ...(profile.preferences || {}),
            accepte_weekend: profile.accepte_weekend ?? true,
            accepte_soiree: profile.accepte_soiree ?? true,
          },
          tarif_horaire_max: parseFloat(profile.tarif_horaire_max) || null,
          acompte_percent: parseInt(profile.acompte_percent) || 30,
          conditions_annulation: profile.conditions_annulation || null,
          delai_annulation_jours: parseInt(profile.delai_annulation_jours) || 7,
          modalites_paiement: profile.modalites_paiement || [],
          services_additionnels: profile.services_additionnels || {},
          jours_travailles: profile.jours_travailles || [],
          video_presentation_url: profile.video_presentation_url || null,
          siret: profile.siret || null,
          numero_tva: profile.numero_tva || null,
          statut_pro: profile.statut_pro ?? false,
          portfolio_photos: portfolioImages.map(i => i.url),
          details: (() => {
            const d = {};
            const specs = profile.specialisations || [];
            if (specs.includes('Développement') && profile.details?.langages) d.langages = profile.details.langages;
            if (specs.includes('Cours particuliers')) {
              if (profile.details?.matiere) d.matiere = profile.details.matiere;
              if (profile.details?.niveau) d.niveau = profile.details.niveau;
            }
            return Object.keys(d).length > 0 ? [d] : null;
          })(),
        });

      if (photoError) console.error('Erreur profils_prestataire:', photoError);

      if (profileError || photoError) {
        const realError = photoError || profileError;
        throw new Error(realError?.message || 'Erreur inconnue');
      }

      alert('Profil mis à jour !');

      // Trigger matching
      const newPrestaData = {
        specialisations: profile.specialisations || [],
        ville: villeNom || profile.ville || null,
      };
      if (!prevPrestaRef.current?.exists) {
        onNewPrestataire(currentUser.id, newPrestaData);
      } else {
        onUpdatePrestataire(currentUser.id, prevPrestaRef.current, newPrestaData);
      }

      await fetchFullProfile(currentUser.id);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setUploadingPhoto(true);

    try {
      const currentUser = user;
      if (!currentUser) { alert('Vous devez être connecté'); return; }

      // Redimensionner via canvas et encoder en base64 (pas de Storage)
      const base64 = await new Promise((resolve, reject) => {
        const img = new window.Image();
        const reader = new FileReader();
        reader.onload = (ev) => {
          img.onload = () => {
            const SIZE = type === 'avatar' ? 200 : 800;
            const HEIGHT = type === 'avatar' ? 200 : 300;
            const canvas = document.createElement('canvas');
            canvas.width = SIZE;
            canvas.height = HEIGHT;
            const ctx = canvas.getContext('2d');
            if (type === 'avatar') {
              // Crop carré centré
              const side = Math.min(img.width, img.height);
              const sx = (img.width - side) / 2;
              const sy = (img.height - side) / 2;
              ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
            } else {
              ctx.drawImage(img, 0, 0, SIZE, HEIGHT);
            }
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.onerror = reject;
          img.src = ev.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (type === 'avatar') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: base64 })
          .eq('id', currentUser.id);
        if (updateError) throw updateError;
        setProfile(prev => ({ ...prev, avatar_url: base64 }));
        alert('Photo de profil mise à jour !');
      } else if (type === 'cover') {
        const { error: updateError } = await supabase
          .from('profils_prestataire')
          .update({ photo_couverture: base64 })
          .eq('id', currentUser.id);
        if (updateError) throw updateError;
        setProfile(prev => ({ ...prev, photo_couverture: base64 }));
        alert('Photo de couverture mise à jour !');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erreur lors du téléchargement: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;

    const currentUser = user;
    if (!currentUser) return;

    try {
      // Convertir toutes les images en base64 en parallèle
      const newBase64s = await Promise.all(files.map(file => new Promise((resolve, reject) => {
        const img = new window.Image();
        const reader = new FileReader();
        reader.onload = (ev) => {
          img.onload = () => {
            const MAX = 800;
            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          };
          img.onerror = reject;
          img.src = ev.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })));

      // Fusionner avec les photos existantes en une seule opération
      const newPhotos = [...portfolioImages.map(i => i.url), ...newBase64s];

      const { error } = await supabase
        .from('profils_prestataire')
        .update({ portfolio_photos: newPhotos })
        .eq('id', currentUser.id);

      if (error) throw error;

      handleProfileChange('portfolio_photos', newPhotos);
      setPortfolioImages(newPhotos.map((url, i) => ({ id: i, url, ordre: i })));
    } catch (error) {
      console.error('Error uploading portfolio images:', error);
      alert('Erreur lors du chargement des photos');
    }
  };

  const handleDeletePortfolioImage = async (imageId, imageUrl) => {
    try {
      const currentUser = user;
      if (!currentUser) return;

      const newPhotos = portfolioImages.filter(img => img.id !== imageId).map(img => img.url);
      const { error } = await supabase
        .from('profils_prestataire')
        .update({ portfolio_photos: newPhotos })
        .eq('id', currentUser.id);

      if (error) throw error;

      setPortfolioImages(newPhotos.map((url, i) => ({ id: i, url, ordre: i })));
      handleProfileChange('portfolio_photos', newPhotos);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // Fonction pour changer le mot de passe
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Fermer le modal après 2 secondes
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      setPasswordError(error.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-500">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  // Si pas de profil après chargement
  if (!profile && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Profil non trouvé</h2>
            <p className="text-gray-500 mb-6">Veuillez vous connecter pour accéder à votre profil.</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'general', label: 'Général', icon: User },
    { key: 'specialites', label: 'Spécialités', icon: Layers },
    { key: 'localisation', label: 'Localisation', icon: MapPin },
    { key: 'verification', label: 'Vérification', icon: Shield },
    { key: 'portfolio', label: 'Portfolio', icon: Image },
    { key: 'tarifs', label: 'Tarifs', icon: Euro },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Cover Photo */}
        <div className="relative h-15 rounded-t-2xl overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-blue-900 to-blue-900 border-white"/>
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 px-6 pb-6">
          <div className="flex items-end gap-6 -mt-12">
            <div className="relative">
              <div className="w-28 h-28 rounded-2xl bg-gray-200 border-4 border-white shadow-lg overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.nom || 'Avatar'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                    <span className="text-2xl font-bold text-indigo-600">
                      {profile?.nom?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 rounded-full cursor-pointer hover:bg-indigo-700 transition-all">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'avatar')}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 pt-16">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.nom || profile?.nom_entreprise || 'Mon profil photographe'}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-gray-500">
                {(villeNom || profile?.localisation) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {villeNom || profile.localisation}
                  </span>
                )}

              </div>
            </div>

            <button
              onClick={() => {
                if (user) router.push(`/photographes/${user.id}`);
              }}
              className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Aperçu public
            </button>
          </div>


        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 mb-6 flex-wrap">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                style={activeTab === tab.key ? { background: COLORS.accent } : {}}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Onglet Vérification */}
          {activeTab === 'verification' && (
            <div className="space-y-6">
              {/* Trust Score */}
              {verificationStatus && (
                <div className="p-6 rounded-2xl" style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm">Score de confiance</p>
                        <p className="text-4xl font-bold text-white">{verificationStatus.trust_score || 0}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/80 text-sm">Niveau</p>
                      <p className="text-xl font-semibold text-white capitalize">
                        {verificationStatus.trust_level || 'Non vérifié'}
                      </p>
                    </div>
                  </div>
                  
                  
                  {/* Badges */}
                  {verificationStatus.badges?.length > 0 && (
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {verificationStatus.badges.map((badge, i) => (
                        <span key={i} className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Statuts rapides */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* Email — toujours vérifié (confirmé à l'inscription Supabase) */}
                <div className="p-4 rounded-xl border-2 border-green-500 bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-sm">Email</span>
                  </div>
                  <p className="text-xs text-green-700 font-medium">Vérifié</p>
                </div>

                {/* Identité — vérification par document CNI */}
                <div className={`p-4 rounded-xl border-2 ${
                  verificationStatus?.identity_verified ? 'border-green-500 bg-green-50'
                  : verificationStatus?.identity_pending ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verificationStatus?.identity_verified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : verificationStatus?.identity_pending ? (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Identité</span>
                  </div>
                  {verificationStatus?.identity_verified ? (
                    <p className="text-xs text-green-700 font-medium">Vérifiée</p>
                  ) : verificationStatus?.identity_pending ? (
                    <p className="text-xs text-yellow-700 font-medium">En cours de vérification</p>
                  ) : (
                    <p className="text-xs text-gray-500">Déposez votre CNI ci-dessous</p>
                  )}
                </div>

                {/* Entreprise — vérification par document SIRET/Kbis */}
                <div className={`p-4 rounded-xl border-2 ${
                  verificationStatus?.business_verified ? 'border-green-500 bg-green-50'
                  : verificationStatus?.business_pending ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {verificationStatus?.business_verified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : verificationStatus?.business_pending ? (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Entreprise</span>
                  </div>
                  {verificationStatus?.business_verified ? (
                    <p className="text-xs text-green-700 font-medium">Vérifiée</p>
                  ) : verificationStatus?.business_pending ? (
                    <p className="text-xs text-yellow-700 font-medium">En cours de vérification</p>
                  ) : (
                    <p className="text-xs text-gray-500">Déposez votre SIRET ci-dessous</p>
                  )}
                </div>

              </div>

              {/* Informations légales */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-4">Informations légales</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro SIRET
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={profile?.siret || ''}
                        onChange={(e) => handleProfileChange('siret', e.target.value)}
                        placeholder="123 456 789 00012"
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro de TVA intracommunautaire
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={profile?.numero_tva || ''}
                        onChange={(e) => handleProfileChange('numero_tva', e.target.value)}
                        placeholder="Ex : ICE 001234567000012 ou IF 1234567"
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents à soumettre */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-4">Documents à soumettre</h2>
                <div className="space-y-4">
                  {DOCUMENT_TYPES.map(docType => {
                    const docData = profile?.[docType.profileColumn];
                    const hasDoc = !!docData;
                    const isImage = hasDoc && docData.startsWith('data:image');
                    const IconComponent = docType.icon;

                    return (
                      <div key={docType.type} className={`p-4 rounded-xl border-2 transition-all ${
                        hasDoc ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {isImage ? (
                              <img src={docData} alt={docType.label} className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
                            ) : (
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                hasDoc ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                <IconComponent className={`w-6 h-6 ${hasDoc ? 'text-green-600' : 'text-gray-500'}`} />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{docType.label}</h4>
                                {docType.required && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Requis</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{docType.description}</p>
                              {hasDoc && (
                                <span className="flex items-center gap-1 text-green-700 text-xs mt-1">
                                  <CheckCircle className="w-3.5 h-3.5" /> Document chargé
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {hasDoc && (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ label: docType.label, data: docData })}
                                className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-1 text-sm font-medium text-gray-700"
                              >
                                <Eye className="w-4 h-4" />
                                Voir
                              </button>
                            )}
                          <label className={`px-4 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-2 ${
                            uploading === docType.type ? 'opacity-50 cursor-wait' : ''
                          }`} style={{
                            background: hasDoc ? '#F3F4F6' : COLORS.accent,
                            color: hasDoc ? COLORS.text : 'white'
                          }}>
                            {uploading === docType.type ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">
                              {hasDoc ? 'Remplacer' : 'Ajouter'}
                            </span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleDocumentUpload(e, docType.type)}
                              disabled={uploading === docType.type}
                              className="hidden"
                            />
                          </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section Sécurité - Mot de passe */}
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" style={{ color: COLORS.accent }} />
                  Sécurité
                </h2>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Modifier le mot de passe</p>
                      <p className="text-sm text-gray-500">Changez votre mot de passe de connexion</p>
                    </div>
                  </div>
                  <span className="text-gray-400 group-hover:text-indigo-500 transition-colors">→</span>
                </button>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={profile?.nom || ''}
                  onChange={(e) => handleProfileChange('nom', e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom d'entreprise
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={profile?.nom_entreprise || ''}
                    onChange={(e) => handleProfileChange('nom_entreprise', e.target.value)}
                    placeholder="Mon agence"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={profile?.email || ''}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    placeholder="jean@exemple.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={profile?.telephone || ''}
                    onChange={(e) => handleProfileChange('telephone', e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio / Présentation
                </label>
                <textarea
                  value={profile?.bio || ''}
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  placeholder="Présentez-vous et votre expérience..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <select
                    value={villeNom || ''}
                    onChange={(e) => setVilleNom(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white appearance-none"
                  >
                    <option value="">Sélectionner une ville</option>
                    {VILLES_MAROC.sort().map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 pt-4 border-t">Réseaux sociaux</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram
                  </label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile?.instagram || ''}
                      onChange={(e) => handleProfileChange('instagram', e.target.value)}
                      placeholder="@username"
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook
                  </label>
                  <div className="relative">
                    <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile?.facebook || ''}
                      onChange={(e) => handleProfileChange('facebook', e.target.value)}
                      placeholder="URL ou nom de page"
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LinkedIn
                  </label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile?.linkedin || ''}
                      onChange={(e) => handleProfileChange('linkedin', e.target.value)}
                      placeholder="URL profil LinkedIn"
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site web
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={profile?.website || ''}
                      onChange={(e) => handleProfileChange('website', e.target.value)}
                      placeholder="https://..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vidéo de présentation (URL)
                </label>
                <div className="relative">
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="url"
                    value={profile?.video_presentation_url || ''}
                    onChange={(e) => handleProfileChange('video_presentation_url', e.target.value)}
                    placeholder="https://youtube.com/..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Lien YouTube, Vimeo ou autre plateforme vidéo</p>
              </div>

              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  profile?.statut_pro ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                }`}
                onClick={() => handleProfileChange('statut_pro', !profile?.statut_pro)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className={`w-6 h-6 ${profile?.statut_pro ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div>
                      <h4 className="font-medium text-gray-900">Professionnel</h4>
                      <p className="text-xs text-gray-500">Je suis prestataire professionnel (auto-entrepreneur, société…)</p>
                    </div>
                  </div>
                  {profile?.statut_pro && <Check className="w-5 h-5 text-indigo-600" />}
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </div>
          )}

          {/* Onglet Spécialités */}
          {activeTab === 'specialites' && (
            <div className="space-y-8">
              {/* Catégorie principale */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Catégorie principale</h2>
                <p className="text-sm text-gray-500 mb-4">Sélectionnez votre domaine d'activité (un seul choix)</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => {
                    const isSelected = (profile?.categorie || [])[0] === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          handleProfileChange('categorie', [cat.id]);
                          handleProfileChange('specialisations', []);
                          autoSaveSpecialisations([cat.id], []);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Spécialisations (basées sur la catégorie choisie) */}
              {(profile?.categorie || []).length > 0 && SPECIALITES_MAP[(profile?.categorie || [])[0]] && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-2">Spécialisations</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Vos spécialisations dans <span className="font-medium text-indigo-700">{categories.find(c => c.id === (profile?.categorie || [])[0])?.label || (profile?.categorie || [])[0]}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALITES_MAP[(profile?.categorie || [])[0]].map(spec => {
                      const isSelected = (profile?.specialisations || []).includes(spec);
                      return (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => {
                            const current = profile?.specialisations || [];
                            const newSpecs = isSelected ? current.filter(s => s !== spec) : [...current, spec];
                            handleProfileChange('specialisations', newSpecs);
                            autoSaveSpecialisations(profile?.categorie || [], newSpecs);
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                          }`}
                        >
                          {spec}
                        </button>
                      );
                    })}
                    {/* Autre */}
                    {(() => {
                      const autreSelected = (profile?.specialisations || []).includes('Autre');
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const current = profile?.specialisations || [];
                            const newSpecs = autreSelected ? current.filter(s => s !== 'Autre') : [...current, 'Autre'];
                            handleProfileChange('specialisations', newSpecs);
                            autoSaveSpecialisations(profile?.categorie || [], newSpecs);
                            if (autreSelected) setAutreSpecInput('');
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                            autreSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                          }`}
                        >
                          Autre
                        </button>
                      );
                    })()}
                  </div>

              {/* Champ libre si "Autre" coché */}
                  {(profile?.specialisations || []).includes('Autre') && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-2">Précisez vos autres spécialités</p>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={autreSpecInput}
                          onChange={(e) => setAutreSpecInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = autreSpecInput.trim();
                              if (val && val !== 'Autre' && !(profile?.specialisations || []).includes(val)) {
                                handleProfileChange('specialisations', [...(profile?.specialisations || []), val]);
                              }
                              setAutreSpecInput('');
                            }
                          }}
                          placeholder="Ex: Jardinage, Baby-sitting..."
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = autreSpecInput.trim();
                            if (val && val !== 'Autre' && !(profile?.specialisations || []).includes(val)) {
                              const newSpecs = [...(profile?.specialisations || []), val];
                              handleProfileChange('specialisations', newSpecs);
                              autoSaveSpecialisations(profile?.categorie || [], newSpecs);
                            }
                            setAutreSpecInput('');
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                        >
                          Ajouter
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(profile?.specialisations || []).filter(s => s !== 'Autre').map((spec, i) => (
                          <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                            {spec}
                            <button
                              type="button"
                              onClick={() => handleProfileChange('specialisations', (profile?.specialisations || []).filter(s => s !== spec))}
                              className="ml-1 text-indigo-500 hover:text-indigo-900"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Champs conditionnels selon spécialité */}
              {(profile?.specialisations || []).includes('Développement') && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Langages de développement <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={profile?.details?.langages || ''}
                    onChange={(e) => handleProfileChange('details', { ...(profile?.details || {}), langages: e.target.value })}
                    placeholder="Ex : JavaScript, Python, React, Node.js..."
                    className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                  />
                </div>
              )}

              {(profile?.specialisations || []).includes('Cours particuliers') && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Matière <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      <input
                        type="text"
                        value={profile?.details?.matiere || ''}
                        onChange={(e) => handleProfileChange('details', { ...(profile?.details || {}), matiere: e.target.value })}
                        placeholder="Ex : Mathématiques, Français..."
                        className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Niveau <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      <input
                        type="text"
                        value={profile?.details?.niveau || ''}
                        onChange={(e) => handleProfileChange('details', { ...(profile?.details || {}), niveau: e.target.value })}
                        placeholder="Ex : Collège, Lycée, Université..."
                        className="w-full px-4 py-2.5 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration équipe */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Configuration équipe</h2>
                <p className="text-sm text-gray-500 mb-4">Comment travaillez-vous ?</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {EQUIPE.map(item => {
                    const IconComponent = item.icon;
                    const isSelected = (profile?.equipe || []).includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleProfileChange('equipe', [item.id])}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-green-500' : 'bg-gray-100'
                        }`}>
                          <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Équipement disponible */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Équipement disponible</h2>
                <p className="text-sm text-gray-500 mb-4">Décrivez votre matériel ou équipement professionnel</p>
<textarea
                  value={profile?.materiel || ''}
                  onChange={(e) => handleProfileChange('materiel', e.target.value)}
                  placeholder={getEquipementPlaceholder(profile?.categorie, profile?.specialisations)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

{/* Services additionnels */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Services additionnels</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Sélectionnez les services supplémentaires que vous proposez
                  {(profile?.categorie || [])[0] && (
                    <span className="ml-1 text-indigo-600 font-medium">
                      — adaptés à {(profile?.categorie || [])[0]}{(profile?.specialisations || [])[0] ? ` / ${(profile?.specialisations || [])[0]}` : ''}
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {getServicesAdditionnels(profile?.categorie, profile?.specialisations).map(({ key, label }) => {
                    const isOn = profile?.services_additionnels?.[key] ?? false;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleProfileChange('services_additionnels', {
                          ...(profile?.services_additionnels || {}),
                          [key]: !isOn,
                        })}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                          isOn
                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                            : 'border-gray-200 text-gray-600 hover:border-purple-300'
                        }`}
                      >
                        {isOn && <span className="mr-1">✓ </span>}{label}
                      </button>
                    );
                  })}
                </div>

                {/* Champ libre */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Autres services (champ libre)
                  </label>
                  <textarea
                    value={profile?.services_additionnels?._texte_libre || ''}
                    onChange={(e) => handleProfileChange('services_additionnels', {
                      ...(profile?.services_additionnels || {}),
                      _texte_libre: e.target.value,
                    })}
                    placeholder="Ex : Installation de climatiseur, Cours de cuisine, Séance photo à domicile..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          )}

          {/* Onglet Localisation (aligné sur mobile) */}
          {activeTab === 'localisation' && (
            <div className="space-y-8">
              {/* Mode de travail */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-4">Mode de travail</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mobile */}
                  <div 
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      profile?.mobile ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => handleProfileChange('mobile', !profile?.mobile)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        profile?.mobile ? 'bg-indigo-600' : 'bg-gray-100'
                      }`}>
                        <Car className={`w-6 h-6 ${profile?.mobile ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Je me déplace</h4>
                        <p className="text-sm text-gray-500">Shooting à domicile ou en extérieur</p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-all ${
                      profile?.mobile ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all mt-0.5 ${
                        profile?.mobile ? 'translate-x-6' : 'translate-x-0.5'
                      }`}></div>
                    </div>
                  </div>

                  {/* Studio */}
                  <div 
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      profile?.agence ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => handleProfileChange('agence', !profile?.agence)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        profile?.agence ? 'bg-purple-600' : 'bg-gray-100'
                      }`}>
                        <Home className={`w-6 h-6 ${profile?.agence ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">J'ai un bureau</h4>
                        <p className="text-sm text-gray-500">Recevez vos clients</p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-all ${
                      profile?.agence ? 'bg-purple-600' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all mt-0.5 ${
                        profile?.agence ? 'translate-x-6' : 'translate-x-0.5'
                      }`}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adresse studio (si mode studio activé) */}
              {profile?.agence && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse de votre agence
                  </label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile?.agence_adresse || ''}
                      onChange={(e) => handleProfileChange('agence_adresse', e.target.value)}
                      placeholder="Ex : 45 Boulevard Mohammed V, Casablanca 20000"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Rayon de déplacement */}
              {profile?.mobile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rayon de déplacement (km)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="5"
                      max="200"
                      step="5"
                      value={profile?.rayon_deplacement || 50}
                      onChange={(e) => handleProfileChange('rayon_deplacement', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="w-20 px-3 py-2 bg-indigo-100 rounded-lg text-center">
                      <span className="font-bold text-indigo-700">{profile?.rayon_deplacement || 50} km</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Frais de déplacement */}
              {profile?.mobile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frais de déplacement (MAD/km)
                  </label>
                  <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={profile?.frais_deplacement || ''}
                      onChange={(e) => handleProfileChange('frais_deplacement', parseFloat(e.target.value))}
                      placeholder="0.50"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  <p className="text-xs text-gray-500 mt-1">Laissez vide pour inclure les frais dans vos tarifs</p>
                </div>
              )}

              {/* Préférences horaires */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-4">Préférences horaires</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weekend */}
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      profile?.accepte_weekend ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                    }`}
                    onClick={() => handleProfileChange('accepte_weekend', !profile?.accepte_weekend)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sun className={`w-6 h-6 ${profile?.accepte_weekend ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <h4 className="font-medium text-gray-900">Weekend</h4>
                          <p className="text-xs text-gray-500">Samedi & Dimanche</p>
                        </div>
                      </div>
                      {profile?.accepte_weekend && <Check className="w-5 h-5 text-green-600" />}
                    </div>
                  </div>

                  {/* Soirée */}
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      profile?.accepte_soiree ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleProfileChange('accepte_soiree', !profile?.accepte_soiree)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Moon className={`w-6 h-6 ${profile?.accepte_soiree ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <h4 className="font-medium text-gray-900">Soirée</h4>
                          <p className="text-xs text-gray-500">Après 18h</p>
                        </div>
                      </div>
                      {profile?.accepte_soiree && <Check className="w-5 h-5 text-blue-600" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Jours travaillés */}
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Jours travaillés</h2>
                <p className="text-sm text-gray-500 mb-4">Sélectionnez vos jours de disponibilité habituels</p>
                <div className="flex flex-wrap gap-2">
                  {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((jour) => {
                    const isActive = (profile?.jours_travailles || []).includes(jour);
                    return (
                      <button
                        key={jour}
                        type="button"
                        onClick={() => {
                          const current = profile?.jours_travailles || [];
                          handleProfileChange(
                            'jours_travailles',
                            isActive ? current.filter(d => d !== jour) : [...current, jour]
                          );
                        }}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                          isActive
                            ? 'border-teal-500 bg-teal-50 text-teal-900'
                            : 'border-gray-200 text-gray-600 hover:border-teal-300'
                        }`}
                      >
                        {jour.charAt(0).toUpperCase() + jour.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-gray-900">Portfolio</h2>
                  <p className="text-sm text-gray-500">{portfolioImages.length} photo(s)</p>
                </div>
                <label className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium cursor-pointer hover:bg-indigo-700 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Ajouter des photos
                  <input
                    ref={portfolioInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePortfolioUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {portfolioImages.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Aucune photo dans votre portfolio</p>
                  <p className="text-sm text-gray-400">
                    Ajoutez vos meilleures photos pour attirer des clients
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {portfolioImages.map((image) => (
                    <div key={image.id} className="relative group aspect-square rounded-xl overflow-hidden">
                      <img 
                        src={image.url} 
                        alt="Portfolio" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleDeletePortfolioImage(image.id, image.url)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {portfolioImages.length > 0 && (
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="mt-6 w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Enregistrer le portfolio
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {activeTab === 'tarifs' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarif horaire de base (MAD)
                </label>
                <input
                  type="number"
                  value={profile?.tarif_horaire_min || ''}
                  onChange={(e) => handleProfileChange('tarif_horaire_min', parseFloat(e.target.value))}
                  placeholder="80"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Ce tarif sera affiché sur votre profil public
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarif horaire maximum (MAD)
                </label>
                <input
                  type="number"
                  value={profile?.tarif_horaire_max || ''}
                  onChange={(e) => handleProfileChange('tarif_horaire_max', parseFloat(e.target.value))}
                  placeholder="200"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-sm text-gray-500 mt-1">Fourchette haute de votre tarif horaire</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Acompte à la réservation (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={profile?.acompte_percent ?? 30}
                  onChange={(e) => handleProfileChange('acompte_percent', parseInt(e.target.value))}
                  placeholder="30"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-sm text-gray-500 mt-1">Pourcentage demandé à la réservation (défaut : 30 %)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Délai d'annulation sans frais (jours)
                </label>
                <input
                  type="number"
                  min="0"
                  value={profile?.delai_annulation_jours ?? 7}
                  onChange={(e) => handleProfileChange('delai_annulation_jours', parseInt(e.target.value))}
                  placeholder="7"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-sm text-gray-500 mt-1">Nombre de jours avant la prestation pour annuler sans pénalité</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conditions d'annulation
                </label>
                <textarea
                  value={profile?.conditions_annulation || ''}
                  onChange={(e) => handleProfileChange('conditions_annulation', e.target.value)}
                  placeholder="Ex : Annulation gratuite jusqu'à 7 jours avant. 50 % retenus entre 3 et 7 jours. Aucun remboursement sous 48h."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modalités de paiement acceptées
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Virement bancaire', 'Carte bancaire', 'Espèces', 'Chèque'].map((mode) => {
                    const isOn = (profile?.modalites_paiement || []).includes(mode);
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          const current = profile?.modalites_paiement || [];
                          handleProfileChange(
                            'modalites_paiement',
                            isOn ? current.filter(m => m !== mode) : [...current, mode]
                          );
                        }}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                          isOn
                            ? 'border-green-500 bg-green-50 text-green-900'
                            : 'border-gray-200 text-gray-600 hover:border-green-300'
                        }`}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4">
                <h4 className="font-medium text-indigo-900 mb-2">Forfaits personnalisés</h4>
                <p className="text-sm text-indigo-700 mb-3">
                  Créez des forfaits détaillés pour présenter vos différentes offres
                </p>
                <button
                  onClick={() => router.push('/photographe/packages')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
                >
                  Gérer mes forfaits
                </button>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal de prévisualisation document */}
      {previewDoc && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{previewDoc.label}</h2>
              <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {previewDoc.data.startsWith('data:image') ? (
              <img src={previewDoc.data} alt={previewDoc.label} className="w-full max-h-[70vh] object-contain rounded-xl" />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                <FileText className="w-16 h-16 text-gray-300" />
                <p className="text-sm">Aperçu non disponible pour les PDF</p>
                <a
                  href={previewDoc.data}
                  download={previewDoc.label}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
                >
                  Télécharger le document
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de changement de mot de passe */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPasswordModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Modifier le mot de passe</h2>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {passwordSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Mot de passe modifié !</h2>
                <p className="text-gray-500">Votre mot de passe a été mis à jour avec succès.</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{passwordError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {passwordLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Confirmer
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
