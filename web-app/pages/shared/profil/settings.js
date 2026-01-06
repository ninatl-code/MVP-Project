import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  ArrowLeft, Camera, Save, User, Mail, Phone, MapPin,
  Lock, Bell, CreditCard, Shield, Trash2, CheckCircle,
  AlertCircle, Eye, EyeOff, Upload
} from 'lucide-react';

export default function ProfilSettingsPage() {
  const router = useRouter();
  const { user, activeRole, updateProfile } = useAuth();
  const fileInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('profil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Profile data
  const [profile, setProfile] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: '',
    code_postal: '',
    avatar_url: '',
    bio: '',
  });
  
  // Password change
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // Notifications preferences
  const [notifications, setNotifications] = useState({
    email_nouvelles_demandes: true,
    email_nouveaux_messages: true,
    email_reservations: true,
    email_rappels: true,
    email_marketing: false,
    push_messages: true,
    push_reservations: true,
  });
  
  const isPhotographe = activeRole === 'photographe' || activeRole === 'prestataire';

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
      fetchNotificationPrefs();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile({
        nom: data.nom || '',
        email: data.email || user.email || '',
        telephone: data.telephone || '',
        adresse: data.adresse || '',
        ville: data.ville || '',
        code_postal: data.code_postal || '',
        avatar_url: data.avatar_url || '',
        bio: data.bio || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationPrefs = async () => {
    try {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setNotifications(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      // Preferences may not exist yet
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError("Veuillez sélectionner une image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    try {
      setSaving(true);
      setError('');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      setSuccess("Photo de profil mise à jour !");
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError("Erreur lors du téléchargement de l'image.");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nom: profile.nom,
          telephone: profile.telephone,
          adresse: profile.adresse,
          ville: profile.ville,
          code_postal: profile.code_postal,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      if (updateProfile) {
        await updateProfile({ nom: profile.nom, avatar_url: profile.avatar_url });
      }

      setSuccess("Profil mis à jour avec succès !");
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError("Erreur lors de la sauvegarde du profil.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (passwords.new.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      setPasswords({ current: '', new: '', confirm: '' });
      setSuccess("Mot de passe modifié avec succès !");
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error.message || "Erreur lors du changement de mot de passe.");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...notifications,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSuccess("Préférences de notification mises à jour !");
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving notifications:', error);
      setError("Erreur lors de la sauvegarde des préférences.");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'securite', label: 'Sécurité', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

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
        <Link
          href={isPhotographe ? '/photographe/dashboard' : '/client/dashboard'}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour au tableau de bord
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres du compte</h1>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b">
            <nav className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profil' && (
              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-indigo-600" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Photo de profil</h3>
                    <p className="text-sm text-gray-500">JPG, PNG ou GIF. Max 5 Mo.</p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    name="nom"
                    value={profile.nom}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Email (readonly) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pour modifier votre email, contactez le support.
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="telephone"
                    value={profile.telephone}
                    onChange={handleProfileChange}
                    placeholder="06 12 34 56 78"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    name="adresse"
                    value={profile.adresse}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* City & Postal Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ville
                    </label>
                    <input
                      type="text"
                      name="ville"
                      value={profile.ville}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code postal
                    </label>
                    <input
                      type="text"
                      name="code_postal"
                      value={profile.code_postal}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={profile.bio}
                    onChange={handleProfileChange}
                    rows={4}
                    placeholder="Parlez un peu de vous..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
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

            {/* Security Tab */}
            {activeTab === 'securite' && (
              <div className="space-y-6">
                <h3 className="font-medium text-gray-900">Changer le mot de passe</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwords.new}
                      onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                      className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                      className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={changePassword}
                  disabled={saving || !passwords.new || !passwords.confirm}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Changer le mot de passe
                    </>
                  )}
                </button>

                <div className="border-t pt-6 mt-6">
                  <h3 className="font-medium text-red-600 mb-4">Zone dangereuse</h3>
                  <button
                    onClick={() => {
                      if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
                        // Handle account deletion
                      }
                    }}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Supprimer mon compte
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="font-medium text-gray-900">Notifications par email</h3>
                
                <div className="space-y-4">
                  {[
                    { key: 'email_nouvelles_demandes', label: 'Nouvelles demandes de clients', description: 'Recevez un email quand un client correspond à vos services' },
                    { key: 'email_nouveaux_messages', label: 'Nouveaux messages', description: 'Recevez un email quand vous avez un nouveau message' },
                    { key: 'email_reservations', label: 'Mises à jour des réservations', description: 'Recevez des notifications sur vos réservations' },
                    { key: 'email_rappels', label: 'Rappels de prestations', description: 'Recevez des rappels avant vos prestations' },
                    { key: 'email_marketing', label: 'Actualités et offres', description: 'Recevez des emails sur les nouvelles fonctionnalités' },
                  ].map((pref) => (
                    <div key={pref.key} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{pref.label}</h4>
                        <p className="text-sm text-gray-500">{pref.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[pref.key]}
                          onChange={(e) => setNotifications(n => ({ ...n, [pref.key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <button
                  onClick={saveNotifications}
                  disabled={saving}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Enregistrer les préférences
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
