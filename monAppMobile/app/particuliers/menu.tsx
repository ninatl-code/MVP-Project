import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderParti';
import RealTimeNotifications from '../../components/RealTimeNotifications';

export default function ParticularHomeMenu() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<{ nom: string; photos: string[] } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [devis, setDevis] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDevis, setSelectedDevis] = useState<any>(null);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  // Récupérer le profil et les données
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('nom, photos')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      const { data: devisData } = await supabase
        .from('devis')
        .select('*')
        .eq('particulier_id', user.id);
      setDevis(devisData || []);

      const { data: reservationsData } = await supabase
        .from('reservations')
        .select('*')
        .eq('particulier_id', user.id);
      setReservations(reservationsData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Annulation d'une réservation
  const handleCancelReservation = async (reservation: any) => {
    if (!reservation?.id || !userId) return;
    Alert.alert(
      'Confirmer',
      'Voulez-vous annuler cette réservation ?',
      [
        { text: 'Non' },
        {
          text: 'Oui',
          onPress: async () => {
            const { error } = await supabase
              .from('reservations')
              .update({ status: 'cancelled' })
              .eq('id', reservation.id);
            if (error) Alert.alert('Erreur', error.message);
            else {
              Alert.alert('Réservation annulée');
              setReservations(reservations.map(r => r.id === reservation.id ? { ...r, status: 'cancelled' } : r));
            }
          }
        }
      ]
    );
  };

  // Affichage d'un devis
  const DevisCard = ({ devis }: { devis: any }) => (
    <TouchableOpacity
      style={{
        backgroundColor: '#fff', margin: 8, padding: 16, borderRadius: 10, elevation: 2
      }}
      onPress={() => setSelectedDevis(devis)}
    >
      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{devis.annonce_titre || 'Devis'}</Text>
      <Text>Status: {devis.status}</Text>
      <Text>Montant: {devis.montant} MAD</Text>
    </TouchableOpacity>
  );

  // Affichage d'une réservation
  const ReservationCard = ({ reservation }: { reservation: any }) => (
    <TouchableOpacity
      style={{
        backgroundColor: '#f9f9f9', margin: 8, padding: 16, borderRadius: 10, elevation: 1
      }}
      onPress={() => setSelectedReservation(reservation)}
    >
      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{reservation.annonce_titre || 'Réservation'}</Text>
      <Text>Status: {reservation.status}</Text>
      <Text>Date: {reservation.date}</Text>
      {reservation.status !== 'cancelled' && (
        <TouchableOpacity
          style={{ marginTop: 8, backgroundColor: '#ef4444', padding: 8, borderRadius: 6 }}
          onPress={() => handleCancelReservation(reservation)}
        >
          <Text style={{ color: '#fff', textAlign: 'center' }}>Annuler</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // Modale simple pour afficher les détails
  const SimpleModal = ({ item, onClose }: { item: any, onClose: () => void }) => (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center'
    }}>
      <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '80%' }}>
        <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>{item.annonce_titre || item.titre || 'Détail'}</Text>
        <Text>{JSON.stringify(item, null, 2)}</Text>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={onClose}>
          <Text style={{ color: '#635BFF', textAlign: 'center' }}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#635BFF" />;

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
      <Header />
      <ScrollView>
        <View style={{ padding: 16 }}>
          {profile && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Bonjour, {profile.nom}</Text>
            </View>
          )}

          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Mes Devis</Text>
          {devis.length === 0 && <Text>Aucun devis</Text>}
          {devis.map(d => <DevisCard key={d.id} devis={d} />)}

          <Text style={{ fontSize: 18, fontWeight: 'bold', marginVertical: 16 }}>Mes Réservations</Text>
          {reservations.length === 0 && <Text>Aucune réservation</Text>}
          {reservations.map(r => <ReservationCard key={r.id} reservation={r} />)}
        </View>
      </ScrollView>
      <RealTimeNotifications userId={userId} triggerNotification={null} />
      {selectedDevis && <SimpleModal item={selectedDevis} onClose={() => setSelectedDevis(null)} />}
      {selectedReservation && <SimpleModal item={selectedReservation} onClose={() => setSelectedReservation(null)} />}
    </View>
  );
}