import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/lib/AuthContext';

export default function AuthLoadingScreen() {
  const { loading } = useAuth();

  if (!loading) return null;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#5C6BC0" />
      <Text style={styles.text}>Vérification de votre session...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FB'
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  }
});