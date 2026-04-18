import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Redirige vers la page centralisée /notifications qui gère les deux rôles
export default function NotificationRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/notifications'); }, []);
  return null;
}
