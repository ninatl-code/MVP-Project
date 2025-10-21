import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';

export default function CancelPage() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paiement annulé</Text>
      <Text style={styles.message}>
        Votre paiement a été annulé ou n'a pas abouti.{'\n'}
        Vous pouvez réessayer ou revenir à l'annonce.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => (navigation as any).navigate(`annonces/${id}`)}
      >
        <Text style={styles.buttonText}>Retour à l'annonce</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 16
  },
  message: {
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 28
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#EC4899',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
