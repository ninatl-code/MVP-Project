import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  Bell, ArrowLeft, Check, CheckCheck, Calendar, MessageCircle,
  FileText, Euro, Star, Camera, Clock, X, Trash2, Settings
} from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, activeRole } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread
  const [selectedIds, setSelectedIds] = useState([]);

  const isPhotographe = activeRole === 'photographe' || activeRole === 'prestataire';

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user, filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        query = query.eq('read', false);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (ids) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .in('id', ids);

      setNotifications(prev =>
        prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n)
      );
      setSelectedIds([]);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotifications = async (ids) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .in('id', ids);

      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      setSelectedIds([]);
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'nouvelle_demande':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'nouveau_devis':
        return <Euro className="w-5 h-5 text-green-500" />;
      case 'devis_accepte':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'devis_refuse':
        return <X className="w-5 h-5 text-red-500" />;
      case 'nouvelle_reservation':
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      case 'reservation_confirmee':
        return <CheckCheck className="w-5 h-5 text-green-500" />;
      case 'reservation_annulee':
        return <X className="w-5 h-5 text-red-500" />;
      case 'nouveau_message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'nouvel_avis':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'rappel_prestation':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'paiement_recu':
        return <Euro className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationLink = (notification) => {
    const { type, data } = notification;
    switch (type) {
      case 'nouvelle_demande':
        return isPhotographe 
          ? `/photographe/demandes/${data?.demande_id}` 
          : `/client/demandes/${data?.demande_id}`;
      case 'nouveau_devis':
        return `/client/devis/${data?.devis_id}`;
      case 'devis_accepte':
      case 'devis_refuse':
        return `/photographe/devis/${data?.devis_id}`;
      case 'nouvelle_reservation':
      case 'reservation_confirmee':
      case 'reservation_annulee':
        return isPhotographe
          ? `/photographe/reservations/${data?.reservation_id}`
          : `/client/reservations/${data?.reservation_id}`;
      case 'nouveau_message':
        return `/shared/messages?id=${data?.conversation_id}`;
      case 'nouvel_avis':
        return `/shared/avis`;
      case 'rappel_prestation':
        return isPhotographe
          ? `/photographe/reservations/${data?.reservation_id}`
          : `/client/reservations/${data?.reservation_id}`;
      default:
        return '#';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} minutes`;
    if (hours < 24) return `Il y a ${hours} heures`;
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Link
            href="/shared/profil/settings"
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </Link>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'unread'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Non lues ({unreadCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.length > 0 ? (
                <>
                  <button
                    onClick={() => markAsRead(selectedIds)}
                    className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    Marquer comme lu
                  </button>
                  <button
                    onClick={() => deleteNotifications(selectedIds)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Supprimer
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Tout sélectionner
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune notification
              </h3>
              <p className="text-gray-500">
                {filter === 'unread'
                  ? 'Toutes vos notifications ont été lues.'
                  : 'Vous n\'avez pas encore de notifications.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 hover:bg-gray-50 transition ${
                    !notification.read ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(notification.id)}
                    onChange={() => toggleSelect(notification.id)}
                    className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />

                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <Link
                    href={getNotificationLink(notification)}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead([notification.id]);
                      }
                    }}
                    className="flex-1 min-w-0"
                  >
                    <p className={`text-sm ${!notification.read ? 'font-medium' : ''} text-gray-900`}>
                      {notification.titre}
                    </p>
                    {notification.message && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(notification.created_at)}
                    </p>
                  </Link>

                  {/* Unread indicator */}
                  {!notification.read && (
                    <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-2"></div>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => deleteNotifications([notification.id])}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
