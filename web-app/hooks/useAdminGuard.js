import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

/**
 * Vérifie que l'utilisateur connecté est admin.
 * Redirige vers / si non connecté ou non admin.
 * Retourne { isAdmin, loading }
 */
export function useAdminGuard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_admin) {
        router.replace('/');
        return;
      }
      setIsAdmin(true);
      setLoading(false);
    };
    check();
  }, [router]);

  return { isAdmin, loading };
}
