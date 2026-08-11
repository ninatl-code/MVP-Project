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
    let initialized = false;

    const getInitialSession = async () => {
      // Safety net: never block the UI for more than 5 seconds
      const timeoutId = setTimeout(() => {
        if (!initialized) {
          initialized = true;
          setLoading(false);
        }
      }, 5000);

      try {
        // Read cache and Supabase session in parallel
        const [cachedProfileId, cachedRole, { data: { session }, error }] = await Promise.all([
          AsyncStorage.getItem('activeProfileId'),
          AsyncStorage.getItem('activeRole'),
          supabase.auth.getSession(),
        ]);

        if (error) console.error('Error getting session:', error);

        if (session) {
          setSession(session);
          setUser(session.user);

          if (cachedProfileId && cachedRole) {
            // Fast path: restore from cache immediately, validate profiles in background
            setProfileId(cachedProfileId);
            setActiveRole(cachedRole);
            clearTimeout(timeoutId);
            initialized = true;
            setLoading(false);

            supabase
              .from('profiles')
              .select('id, role, nom')
              .or(`id.eq.${session.user.id},id.eq.${session.user.id}`)
              .then(({ data: profiles }) => {
                if (profiles?.length) {
                  setAvailableProfiles(profiles);
                  if (!profiles.find(p => p.id === cachedProfileId)) {
                    const def = profiles.find(p => p.role === 'photographe' || p.role === 'prestataire') || profiles[0];
                    setProfileId(def.id);
                    setActiveRole(def.role);
                    AsyncStorage.setItem('activeProfileId', def.id);
                    AsyncStorage.setItem('activeRole', def.role);
                  }
                }
              });
          } else {
            // Slow path (first launch): fetch profiles and wait
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, role, nom')
              .or(`id.eq.${session.user.id},id.eq.${session.user.id}`);

            if (profiles?.length) {
              setAvailableProfiles(profiles);
              const defaultProfile = profiles.find(p => p.role === 'photographe' || p.role === 'prestataire') || profiles[0];
              setProfileId(defaultProfile.id);
              setActiveRole(defaultProfile.role);
              await Promise.all([
                AsyncStorage.setItem('activeProfileId', defaultProfile.id),
                AsyncStorage.setItem('activeRole', defaultProfile.role),
              ]);
            }
            clearTimeout(timeoutId);
            initialized = true;
            setLoading(false);
          }
        } else {
          clearTimeout(timeoutId);
          initialized = true;
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        clearTimeout(timeoutId);
        initialized = true;
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION is already handled by getInitialSession above
        if (event === 'INITIAL_SESSION') return;

        console.log('Auth state change:', event, session?.user?.email);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, role, nom')
            .or(`id.eq.${session.user.id},id.eq.${session.user.id}`);

          if (profiles?.length) {
            setAvailableProfiles(profiles);
            const savedProfileId = await AsyncStorage.getItem('activeProfileId');

            if (savedProfileId && profiles.find(p => p.id === savedProfileId)) {
              const profile = profiles.find(p => p.id === savedProfileId);
              setProfileId(savedProfileId);
              setActiveRole(profile?.role || null);
            } else {
              const defaultProfile = profiles.find(p => p.role === 'photographe' || p.role === 'prestataire') || profiles[0];
              setProfileId(defaultProfile.id);
              setActiveRole(defaultProfile.role);
              await Promise.all([
                AsyncStorage.setItem('activeProfileId', defaultProfile.id),
                AsyncStorage.setItem('activeRole', defaultProfile.role),
              ]);
            }
          }

          await AsyncStorage.setItem('userSession', JSON.stringify(session));
        } else if (event === 'SIGNED_OUT') {
          await Promise.all([
            AsyncStorage.removeItem('userSession'),
            AsyncStorage.removeItem('activeProfileId'),
            AsyncStorage.removeItem('activeRole'),
          ]);
          setProfileId(null);
          setActiveRole(null);
          setAvailableProfiles([]);
        }

        if (!initialized) {
          initialized = true;
          setLoading(false);
        }
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
        await Promise.all([
          AsyncStorage.setItem('activeProfileId', newProfileId),
          AsyncStorage.setItem('activeRole', profile.role),
        ]);
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