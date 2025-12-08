import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { useRouter } from 'expo-router';

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

  useEffect(() => {
    // Récupérer la session actuelle
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.log('Erreur récupération session:', error.message);
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
          
          // Rediriger vers la bonne page selon le rôle
          if (role === 'prestataire') {
            router.replace('/prestataires/menu');
          } else if (role === 'particulier') {
            router.replace('/particuliers/menu');
          }
        }
      } catch (error) {
        console.log('Erreur session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
          
          // Rediriger selon le rôle après connexion
          if (role === 'prestataire') {
            router.replace('/prestataires/menu');
          } else if (role === 'particulier') {
            router.replace('/particuliers/menu');
          }
        } else if (event === 'SIGNED_OUT') {
          setUserRole(null);
          router.replace('/login');
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