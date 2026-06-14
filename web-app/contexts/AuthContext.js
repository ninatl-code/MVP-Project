import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import * as photographerService from  '../lib/photographerService';

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
  const [photographeProfile, setPhotographeProfile] = useState(null);
  const roleReady = !loading && activeRole !== null;
  const router = useRouter();
  
  useEffect(() => {
    // Skip auth initialization on server
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const loadProfile = async (userId) => {
      const t = performance.now();
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, role, nom, email, telephone, avatar_url')
        .eq('id', userId)
        .limit(1);
      console.log(`[Auth] loadProfile — ${(performance.now() - t).toFixed(0)}ms`, error ? `ERREUR: ${error.message}` : `${profiles?.length ?? 0} profil(s)`);
      if (!profiles || profiles.length === 0) return;
      setAvailableProfiles(profiles);
      const savedProfileId = localStorage.getItem('activeProfileId');
      const profile = (savedProfileId && profiles.find(p => p.id === savedProfileId))
        ? profiles.find(p => p.id === savedProfileId)
        : profiles.find(p => p.role === 'photographe' || p.role === 'prestataire') || profiles[0];
      setProfileId(profile.id);
      setActiveRole(profile.role || null);
      localStorage.setItem('activeProfileId', profile.id);
    };

    const getInitialSession = async () => {
      const t0 = performance.now();
      console.log('[Auth] getInitialSession — début');
      try {
        console.log('[Auth] getSession — appel...');
        const t1 = performance.now();
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log(`[Auth] getSession — réponse en ${(performance.now() - t1).toFixed(0)}ms`, error ? `ERREUR: ${error.message}` : session ? `session OK (${session.user?.email})` : 'pas de session');
        
        if (error) {
          console.error('[Auth] Erreur getSession:', error);
          if (error.name !== 'AuthRetryableFetchError') throw error;
        }
        
        if (session) {
          setSession(session);
          setUser(session.user);
          // Définir profileId IMMÉDIATEMENT depuis la session (pas besoin d'attendre la DB)
          setProfileId(session.user.id);
          localStorage.setItem('activeProfileId', session.user.id);
          // Charger le profil complet (rôle, nom...) en arrière-plan
          loadProfile(session.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfileId(null);
          setActiveRole(null);
          setAvailableProfiles([]);
        }
      } catch (error) {
        console.error('[Auth] Erreur dans getInitialSession:', error);
      } finally {
        console.log(`[Auth] getInitialSession terminé en ${(performance.now() - t0).toFixed(0)}ms total — loading = false`);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen to auth state changes — skip INITIAL_SESSION (already handled above)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] onAuthStateChange: ${event}`, session?.user?.email ?? 'no user');

        if (event === 'INITIAL_SESSION') return; // géré par getInitialSession
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Définir profileId IMMÉDIATEMENT sans attendre la DB
          setProfileId(session.user.id);
          localStorage.setItem('activeProfileId', session.user.id);
          loadProfile(session.user.id);
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

  // Charger le profil photographe détaillé

  // Rafraîchir le profil photographe
  const refreshProfile = async () => {
    if (profileId) {
      await photographerService.getPhotographerProfile(profileId);
    }
  };

  // Charger le profil photographe quand le profileId change
  useEffect(() => {
    if (profileId && (activeRole === 'photographe' )) {
      photographerService.getPhotographerProfile(profileId);
    }
  }, [profileId, activeRole]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const currentPath = window.location.pathname;

    const isClientRoute = currentPath.startsWith('/client');
    const isPhotographerRoute = currentPath.startsWith('/photographe');

    if (isClientRoute && activeRole === 'photographe') {
      router.push('/photographe');
    }

    if (isPhotographerRoute && activeRole === 'particulier') {
      router.push('/client');
    }
  }, [loading, user, activeRole]);
  const value = {
    user,
    session,
    loading,
    profileId,
    activeRole,
    roleReady,
    availableProfiles,
    photographeProfile,
    signUp,
    signIn,
    signOut,
    switchProfile,
    getActiveProfile,
    refreshProfile,
    isAuthenticated: !!session,
    isPhotographe: activeRole === 'photographe',
    isParticulier: activeRole === 'particulier',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
