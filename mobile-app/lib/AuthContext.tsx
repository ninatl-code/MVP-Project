import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserRole = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      return profile?.role || null;
    } catch (error) {
      console.log('Erreur récupération rôle:', error);
      return null;
    }
  };

  const redirectByRole = (role: string | null) => {
    if (role === 'prestataire') {
      router.replace('/photographe/menu');
    } else if (role === 'particulier') {
      router.replace('/client/search/search');
    } else {
      router.replace('/login');
    }
  };

  useEffect(() => {
    // Initialiser et restaurer la session depuis AsyncStorage
    const initializeAuth = async () => {
      try {
        setLoading(true);

        // Essayer de récupérer la session depuis AsyncStorage
        const sessionData = await AsyncStorage.getItem('supabase.auth.token');
        
        // Récupérer la session Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('Erreur récupération session:', error.message);
          setLoading(false);
          return;
        }

        if (session) {
          // Session existe - restaurer l'utilisateur
          setSession(session);
          setUser(session.user);
          
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
          
          console.log('Session restaurée pour:', session.user.email);
          redirectByRole(role);
        } else {
          // Pas de session
          setSession(null);
          setUser(null);
          setUserRole(null);
          router.replace('/login');
        }
      } catch (error) {
        console.log('Erreur initialisation auth:', error);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
          // Utilisateur vient de se connecter
          setSession(session);
          setUser(session.user);
          
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
          
          // Sauvegarder dans AsyncStorage (déjà fait par Supabase)
          await AsyncStorage.setItem('supabase.session.active', 'true');
          
          console.log('Utilisateur connecté:', session.user.email);
          redirectByRole(role);
        } else if (event === 'SIGNED_OUT') {
          // Utilisateur s'est déconnecté explicitement
          setSession(null);
          setUser(null);
          setUserRole(null);
          
          // Nettoyer AsyncStorage
          await AsyncStorage.removeItem('supabase.session.active');
          
          console.log('Utilisateur déconnecté');
          router.replace('/login');
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token a été rafraîchi - mettre à jour la session
          setSession(session);
          setUser(session.user);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      setUserRole(null);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('Erreur déconnexion:', error.message);
      }
    } catch (error) {
      console.log('Erreur signOut:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      userRole,
      loading,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}