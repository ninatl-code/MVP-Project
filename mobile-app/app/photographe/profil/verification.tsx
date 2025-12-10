import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FooterPresta from '@/components/photographe/FooterPresta';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface VerificationDocument {
  id: string;
  document_type: string;
  document_url: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

interface UserVerificationStatus {
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  business_verified: boolean;
  trust_score: number;
  trust_level: string;
  badges: string[];
}

const DOCUMENT_TYPES = [
  {
    type: 'identity_card',
    label: 'Carte d\'identité',
    icon: 'card',
    description: 'Recto et verso de votre CNI',
    required: true,
  },
  {
    type: 'business_license',
    label: 'Licence professionnelle',
    icon: 'briefcase',
    description: 'Justificatif d\'activité professionnelle',
    required: false,
  },
  {
    type: 'insurance',
    label: 'Assurance professionnelle',
    icon: 'shield-checkmark',
    description: 'Attestation d\'assurance en cours',
    required: false,
  },
  {
    type: 'address_proof',
    label: 'Justificatif de domicile',
    icon: 'home',
    description: 'Facture de moins de 3 mois',
    required: false,
  },
];

export default function VerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<UserVerificationStatus | null>(null);

  useEffect(() => {
    fetchVerificationData();
  }, []);

  const fetchVerificationData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      // Fetch documents
      const { data: docsData, error: docsError } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);

      // Fetch verification status
      const { data: statusData, error: statusError } = await supabase
        .from('user_verification_status')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statusError && statusError.code !== 'PGRST116') throw statusError;
      setVerificationStatus(statusData);
    } catch (error) {
      console.error('Error fetching verification data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de vérification');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async (documentType: string, useCamera: boolean = false) => {
    setUploading(documentType);

    try {
      let result: any;

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission refusée', 'Nous avons besoin d\'accéder à votre caméra');
          setUploading(null);
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const docResult = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });

        if (docResult.canceled) {
          setUploading(null);
          return;
        }

        result = { canceled: false, assets: [docResult.assets[0]] };
      }

      if (result.canceled || !result.assets[0]) {
        setUploading(null);
        return;
      }

      await uploadDocument(documentType, result.assets[0]);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
      setUploading(null);
    }
  };

  const uploadDocument = async (documentType: string, file: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileName = `${documentType}_${user.id}_${Date.now()}.${file.mimeType?.includes('pdf') ? 'pdf' : 'jpg'}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification_documents')
        .upload(fileName, {
          uri: file.uri,
          type: file.mimeType || 'image/jpeg',
          name: fileName,
        } as any);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('verification_documents')
        .getPublicUrl(fileName);

      // Insert document record
      const { error: insertError } = await supabase
        .from('verification_documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          document_url: publicUrl,
          verification_status: 'pending',
        });

      if (insertError) throw insertError;

      Alert.alert('Succès', 'Document envoyé ! Il sera vérifié dans les 24-48h.');
      fetchVerificationData();
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le document. Veuillez réessayer.');
    } finally {
      setUploading(null);
    }
  };

  const showUploadOptions = (documentType: string) => {
    Alert.alert(
      'Envoyer un document',
      'Choisissez une méthode',
      [
        {
          text: 'Prendre une photo',
          onPress: () => pickDocument(documentType, true),
        },
        {
          text: 'Choisir un fichier',
          onPress: () => pickDocument(documentType, false),
        },
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]
    );
  };

  const getDocumentStatus = (docType: string): VerificationDocument | null => {
    return documents.find((d) => d.document_type === docType) || null;
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'approved') {
      return (
        <View style={styles.statusBadgeApproved}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.statusBadgeTextApproved}>Approuvé</Text>
        </View>
      );
    }
    if (status === 'rejected') {
      return (
        <View style={styles.statusBadgeRejected}>
          <Ionicons name="close-circle" size={16} color={COLORS.error} />
          <Text style={styles.statusBadgeTextRejected}>Rejeté</Text>
        </View>
      );
    }
    return (
      <View style={styles.statusBadgePending}>
        <Ionicons name="time" size={16} color={COLORS.warning} />
        <Text style={styles.statusBadgeTextPending}>En attente</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <FooterPresta />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vérification</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Trust Score Card */}
          {verificationStatus && (
            <View style={styles.trustScoreCard}>
              <View style={styles.trustScoreHeader}>
                <Text style={styles.trustScoreTitle}>Score de confiance</Text>
                <View style={styles.trustScoreBadge}>
                  <Text style={styles.trustScoreNumber}>{verificationStatus.trust_score}/100</Text>
                </View>
              </View>
              <View style={styles.trustScoreBar}>
                <View
                  style={[
                    styles.trustScoreBarFill,
                    { width: `${verificationStatus.trust_score}%` },
                  ]}
                />
              </View>
              <Text style={styles.trustLevel}>Niveau : {verificationStatus.trust_level}</Text>

              {/* Badges */}
              {verificationStatus.badges && verificationStatus.badges.length > 0 && (
                <View style={styles.badgesContainer}>
                  {verificationStatus.badges.map((badge, index) => (
                    <View key={index} style={styles.badge}>
                      <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
                      <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Verification Checklist */}
          <View style={styles.checklistCard}>
            <Text style={styles.sectionTitle}>État de vérification</Text>
            <View style={styles.checklistItem}>
              <Ionicons
                name={verificationStatus?.email_verified ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={verificationStatus?.email_verified ? COLORS.success : COLORS.border}
              />
              <Text style={styles.checklistText}>Email vérifié</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons
                name={verificationStatus?.phone_verified ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={verificationStatus?.phone_verified ? COLORS.success : COLORS.border}
              />
              <Text style={styles.checklistText}>Téléphone vérifié</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons
                name={verificationStatus?.identity_verified ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={verificationStatus?.identity_verified ? COLORS.success : COLORS.border}
              />
              <Text style={styles.checklistText}>Identité vérifiée</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons
                name={verificationStatus?.business_verified ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={verificationStatus?.business_verified ? COLORS.success : COLORS.border}
              />
              <Text style={styles.checklistText}>Activité professionnelle vérifiée</Text>
            </View>
          </View>

          {/* Documents Section */}
          <Text style={styles.sectionTitle}>Documents à fournir</Text>
          {DOCUMENT_TYPES.map((docType) => {
            const existingDoc = getDocumentStatus(docType.type);
            const isUploading = uploading === docType.type;

            return (
              <View key={docType.type} style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <View style={styles.documentIcon}>
                    <Ionicons name={docType.icon as any} size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.documentInfo}>
                    <View style={styles.documentTitleRow}>
                      <Text style={styles.documentTitle}>{docType.label}</Text>
                      {docType.required && <Text style={styles.requiredBadge}>Requis</Text>}
                    </View>
                    <Text style={styles.documentDescription}>{docType.description}</Text>
                  </View>
                </View>

                {existingDoc ? (
                  <View style={styles.documentStatus}>
                    {renderStatusBadge(existingDoc.verification_status)}
                    {existingDoc.rejection_reason && (
                      <Text style={styles.rejectionReason}>{existingDoc.rejection_reason}</Text>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => showUploadOptions(docType.type)}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.uploadButtonText}>Envoyer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Benefits Card */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>✨ Avantages de la vérification</Text>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.benefitText}>Profil mis en avant dans les résultats</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.benefitText}>Badge de confiance affiché</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.benefitText}>+30% de conversions en moyenne</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.benefitText}>Accès aux prestations premium</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white', flex: 1, textAlign: 'center' },

  content: { padding: 16 },

  trustScoreCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trustScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trustScoreTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  trustScoreBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trustScoreNumber: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  trustScoreBar: {
    height: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  trustScoreBarFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 6,
  },
  trustLevel: { fontSize: 14, color: COLORS.textLight },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '500', color: COLORS.success },

  checklistCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checklistText: { fontSize: 15, color: COLORS.text },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },

  documentCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: { flex: 1 },
  documentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  documentTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  requiredBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.error,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  documentDescription: { fontSize: 13, color: COLORS.textLight },

  documentStatus: { marginTop: 8 },
  statusBadgeApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  statusBadgeTextApproved: { fontSize: 13, fontWeight: '500', color: COLORS.success },
  statusBadgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  statusBadgeTextRejected: { fontSize: 13, fontWeight: '500', color: COLORS.error },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  statusBadgeTextPending: { fontSize: 13, fontWeight: '500', color: COLORS.warning },
  rejectionReason: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 8,
    fontStyle: 'italic',
  },

  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  benefitsCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
});
