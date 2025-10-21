import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import Header from '../../components/HeaderParti';
import RealTimeNotifications from '../../components/RealTimeNotifications';

function getIcon(type: string) {
  if (type === "reservation") return "📅";
  if (type === "message") return "💬";
  if (type === "review" || type === "avis") return "⭐";
  if (type === "alert") return "⚠️";
  return "🔔";
}

export default function NotificationsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [triggerAvisModal, setTriggerAvisModal] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (search) {
        query = query.ilike("contenu", `%${search}%`);
      }
      const { data, error } = await query;
      if (!error) setNotifications(data || []);
    };
    fetchUserAndNotifications();
  }, [search]);

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ lu: true })
      .eq("user_id", userId)
      .eq("lu", false);
    // Refresh notifications
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setNotifications(data || []);
  };

  return (
    <View style={styles.container}>
      <Header />
      <Text style={styles.title}>Notifications</Text>
      <TextInput
        style={styles.input}
        placeholder="Rechercher..."
        value={search}
        onChangeText={setSearch}
      />
      <TouchableOpacity style={styles.button} onPress={markAllAsRead}>
        <Text>Tout marquer comme lu</Text>
      </TouchableOpacity>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id?.toString()}
        renderItem={({ item }) => (
          <View style={styles.notification}>
            <Text style={styles.icon}>{getIcon(item.type)}</Text>
            <Text style={styles.content}>{item.contenu}</Text>
            {!item.lu && <Text style={styles.unread}>Non lu</Text>}
          </View>
        )}
      />
      <RealTimeNotifications userId={userId} triggerNotification={setTriggerAvisModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 12 },
  button: { backgroundColor: '#eee', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  notification: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  icon: { fontSize: 20, marginRight: 8 },
  content: { flex: 1 },
  unread: { color: 'red', marginLeft: 8 },
});
