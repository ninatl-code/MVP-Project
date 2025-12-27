import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [availableProfiles, setAvailableProfiles] = useState([]);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (session) {
          setSession(session);
          setUser(session.user);
          
          console.log('Session restored for:', session.user?.email);
          
          // Get available profiles
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, role, nom, email, telephone, avatar_url, photos')
            .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id}`);
          
          if (profiles && profiles.length > 0) {
            setAvailableProfiles(profiles);
            
            // Restore active profile from localStorage
            const savedProfileId = localStorage.getItem('activeProfileId');
            
            if (savedProfileId && profiles.find(p => p.id === savedProfileId)) {
              const profile = profiles.find(p => p.id === savedProfileId);
              setProfileId(savedProfileId);
              setActiveRole(profile?.role || null);
            } else {
              // Default: photographe if available, otherwise first profile
              const defaultProfile = profiles.find(p => p.role === 'photographe' || p.role === 'prestataire') || profiles[0];
              setProfileId(defaultProfile.id);
              setActiveRole(defaultProfile.role);
              localStorage.setItem('activeProfileId', defaultProfile.id);
            }
          }
        } else {
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

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, role, nom, email, telephone, avatar_url, photos')
            .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id}`);
          
          if (profiles && profiles.length > 0) {
            setAvailableProfiles(profiles);
            
            const savedProfileId = localStorage.getItem('activeProfileId');
            
            if (savedProfileId && profiles.find(p => p.id === savedProfileId)) {
              const profile = profiles.find(p => p.id === savedProfileId);
              setProfileId(savedProfileId);
              setActiveRole(profile?.role || null);
            } else {
              const defaultProfile = profiles.find(p => p.role === 'photographe' || p.role === 'prestataire') || profiles[0];
              setProfileId(defaultProfile.id);
              setActiveRole(defaultProfile.role);
              localStorage.setItem('activeProfileId', defaultProfile.id);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('activeProfileId');
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

  const signUp = async (email, password, userData) => {
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

  const signIn = async (email, password) => {
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
      
      localStorage.removeItem('activeProfileId');
      setUser(null);
      setSession(null);
      setProfileId(null);
      setActiveRole(null);
      setAvailableProfiles([]);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const switchProfile = async (newProfileId) => {
    const profile = availableProfiles.find(p => p.id === newProfileId);
    if (profile) {
      setProfileId(newProfileId);
      setActiveRole(profile.role);
      localStorage.setItem('activeProfileId', newProfileId);
    }
  };

  const getActiveProfile = () => {
    return availableProfiles.find(p => p.id === profileId) || null;
  };

  const value = {
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
    getActiveProfile,
    isAuthenticated: !!session,
    isPhotographe: activeRole === 'photographe' || activeRole === 'prestataire',
    isParticulier: activeRole === 'particulier',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
