import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/HeaderPresta';

interface Notification {
  id: string;
  type: string;
  contenu: string;
  created_at: string;
  lu: boolean;
  fullDetail?: string;
}

export default function NotificationsPage() {
  const [selected, setSelected] = useState<Notification | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserAndNotifications();
  }, [search]);

  const fetchUserAndNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    let query = supabase
      .from('notification')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('contenu', `%${search}%`);
    }

    const { data, error } = await query;
    if (!error) setNotifications(data || []);
    setLoading(false);
  };

  const getIcon = (type: string) => {
    if (type === 'reservation') return '📅';
    if (type === 'message') return '💬';
    if (type === 'review') return '⭐';
    if (type === 'alert') return '⚠️';
    return '🔔';
  };

  const getIconColor = (type: string) => {
    if (type === 'reservation') return '#10B981';
    if (type === 'message') return '#3B82F6';
    if (type === 'review') return '#FBBF24';
    if (type === 'alert') return '#EF4444';
    return '#9CA3AF';
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase
      .from('notification')
      .update({ lu: true })
      .eq('user_id', userId)
      .eq('lu', false);
    
    fetchUserAndNotifications();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    if (type === 'reservation') return 'Nouvelle réservation';
    if (type === 'message') return 'Nouveau message';
    if (type === 'review') return 'Nouvel avis';
    if (type === 'alert') return 'Alerte';
    return 'Notification';
  };

  return (
    <View style={styles.container}>
      <Header />
      
      <View style={styles.mainContent}>
        {/* Colonne gauche - Liste */}
        <View style={styles.leftColumn}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Mes notifications</Text>
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllButton}>Tout marquer comme lu</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="Rechercher..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <ScrollView style={styles.notificationsList}>
            {loading ? (
              <ActivityIndicator size="large" color="#EC4899" style={styles.loader} />
            ) : notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Aucune notification.</Text>
              </View>
            ) : (
              notifications.map((notif) => (
                <TouchableOpacity
                  key={notif.id}
                  onPress={() => setSelected(notif)}
                  style={[
                    styles.notificationItem,
                    !notif.lu && styles.notificationItemUnread,
                    selected?.id === notif.id && styles.notificationItemSelected
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.notifIcon, { color: getIconColor(notif.type) }]}>
                    {getIcon(notif.type)}
                  </Text>
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTitle}>{getTypeLabel(notif.type)}</Text>
                    <Text style={styles.notifText} numberOfLines={1}>
                      {notif.contenu}
                    </Text>
                    <Text style={styles.notifDate}>{formatDate(notif.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Colonne droite - Détail */}
        <View style={styles.rightColumn}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>
              {selected ? getTypeLabel(selected.type) : 'Sélectionnez une notification'}
            </Text>
          </View>
          
          <ScrollView style={styles.detailContent}>
            {!selected ? (
              <View style={styles.emptyDetail}>
                <Text style={styles.emptyDetailText}>
                  Cliquez sur une notification pour voir le détail.
                </Text>
              </View>
            ) : (
              <View>
                <View style={styles.detailIconRow}>
                  <Text style={[styles.detailIcon, { color: getIconColor(selected.type) }]}>
                    {getIcon(selected.type)}
                  </Text>
                  <Text style={styles.detailLabel}>{getTypeLabel(selected.type)}</Text>
                </View>
                
                <Text style={styles.detailContentText}>{selected.contenu}</Text>
                <Text style={styles.detailDate}>{formatDate(selected.created_at)}</Text>
                
                {selected.fullDetail && (
                  <View style={styles.fullDetailBox}>
                    <Text style={styles.fullDetailText}>{selected.fullDetail}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row'
  },
  leftColumn: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#fff'
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  markAllButton: {
    fontSize: 14,
    color: '#EC4899',
    fontWeight: '500'
  },
  searchContainer: {
    padding: 12
  },
  searchInput: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    color: '#111827'
  },
  notificationsList: {
    flex: 1
  },
  loader: {
    marginTop: 40
  },
  emptyState: {
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14
  },
  notificationItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff'
  },
  notificationItemUnread: {
    backgroundColor: '#FDF2F8'
  },
  notificationItemSelected: {
    backgroundColor: '#F3F4F6'
  },
  notifIcon: {
    fontSize: 20
  },
  notifContent: {
    flex: 1
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  notifText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  notifDate: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  rightColumn: {
    flex: 1,
    backgroundColor: '#fff'
  },
  detailHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  detailContent: {
    flex: 1,
    padding: 32
  },
  emptyDetail: {
    marginTop: 96,
    alignItems: 'center'
  },
  emptyDetailText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center'
  },
  detailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  detailIcon: {
    fontSize: 24
  },
  detailLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  detailContentText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 24
  },
  detailDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 24
  },
  fullDetailBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16
  },
  fullDetailText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'monospace'
  }
});
