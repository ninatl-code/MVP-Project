import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: string;
  nom: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileId: string | null;
  activeRole: string | null;
  availableProfiles: Profile[];
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    // Récupérer la session existante
    const getInitialSession = async () => {
      try {
        // D'abord, essayer de restaurer depuis AsyncStorage
        const savedSession = await AsyncStorage.getItem('userSession');
        
        // Puis, récupérer la session Supabase (qui devrait être persistée)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (session) {
          // Session existe (soit fraîche, soit restaurée par Supabase)
          setSession(session);
          setUser(session.user);
          
          console.log('Session restaurée pour:', session.user?.email);
          
          // Récupérer les profils disponibles
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, role, nom')
            .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id}`);
          
          if (profiles && profiles.length > 0) {
            setAvailableProfiles(profiles);
            
            // Restaurer le profil actif depuis AsyncStorage
            const savedProfileId = await AsyncStorage.getItem('activeProfileId');
            
            if (savedProfileId && profiles.find(p => p.id === savedProfileId)) {
              const profile = profiles.find(p => p.id === savedProfileId);
              setProfileId(savedProfileId);
              setActiveRole(profile?.role || null);
            } else {
              // Par défaut : photographe si disponible, sinon le premier profil
              const defaultProfile = profiles.find(p => p.role === 'photographe') || profiles[0];
              setProfileId(defaultProfile.id);
              setActiveRole(defaultProfile.role);
              await AsyncStorage.setItem('activeProfileId', defaultProfile.id);
            }
          }
        } else {
          // Pas de session - rester sur login
          setSession(null);
          setUser(null);
          setProfileId(null);
          setActiveRole(null);
          setAvailableProfiles([]);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Récupérer tous les profils de l'utilisateur
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, role, nom')
            .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id}`);
          
          if (profiles && profiles.length > 0) {
            setAvailableProfiles(profiles);
            
            // Vérifier s'il y a un profil actif sauvegardé
            const savedProfileId = await AsyncStorage.getItem('activeProfileId');
            
            if (savedProfileId && profiles.find(p => p.id === savedProfileId)) {
              // Utiliser le profil sauvegardé
              const profile = profiles.find(p => p.id === savedProfileId);
              setProfileId(savedProfileId);
              setActiveRole(profile?.role || null);
            } else {
              // Par défaut : photographe si disponible, sinon le premier profil
              const defaultProfile = profiles.find(p => p.role === 'photographe') || profiles[0];
              setProfileId(defaultProfile.id);
              setActiveRole(defaultProfile.role);
              await AsyncStorage.setItem('activeProfileId', defaultProfile.id);
            }
          }
          
          // Sauvegarder les infos utilisateur pour la persistance
          await AsyncStorage.setItem('userSession', JSON.stringify(session));
        } else if (event === 'SIGNED_OUT') {
          // Nettoyer le cache à la déconnexion explicite
          await AsyncStorage.removeItem('userSession');
          await AsyncStorage.removeItem('activeProfileId');
          setProfileId(null);
          setActiveRole(null);
          setAvailableProfiles([]);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Nettoyer le cache local
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const switchProfile = async (newProfileId: string) => {
    try {
      const profile = availableProfiles.find(p => p.id === newProfileId);
      if (profile) {
        setProfileId(newProfileId);
        setActiveRole(profile.role);
        await AsyncStorage.setItem('activeProfileId', newProfileId);
      }
    } catch (error) {
      console.error('Switch profile error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    profileId,
    activeRole,
    availableProfiles,
    signUp,
    signIn,
    signOut,
    switchProfile,
    isAuthenticated: !!user && !!session,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};