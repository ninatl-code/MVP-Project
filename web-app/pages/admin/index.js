import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import AdminLayout from '../../components/layout/AdminLayout';
import { Users, Briefcase, FileText, Calendar, Star, AlertCircle, Clock, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, loading } = useAdminGuard();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState({ prestataires: [], demandes: [] });

  useEffect(() => {
    if (!isAdmin) return;

    const fetchStats = async () => {
      const [
        { count: totalClients },
        { count: totalPrestataires },
        { count: prestatairesEnAttente },
        { count: totalDemandes },
        { count: totalReservations },
        { count: avisSignales },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'particulier'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'photographe'),
        supabase.from('profils_prestataire').select('id', { count: 'exact', head: true }).eq('statut_validation', 'en_attente'),
        supabase.from('demandes_client').select('id', { count: 'exact', head: true }),
        supabase.from('reservations').select('id', { count: 'exact', head: true }),
        supabase.from('reviews_photographe').select('id', { count: 'exact', head: true }).eq('reported', true),
      ]);
      setStats({ totalClients, totalPrestataires, prestatairesEnAttente, totalDemandes, totalReservations, avisSignales });
    };

    const fetchRecent = async () => {
      const [{ data: presta }, { data: demandes }] = await Promise.all([
        supabase.from('profils_prestataire')
          .select('id, created_at, profiles!inner(nom, email)')
          .eq('statut_validation', 'en_attente')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('demandes_client')
          .select('id, titre, created_at, profiles!client_id(nom)')
          .eq('statut', 'ouverte')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      setRecent({ prestataires: presta || [], demandes: demandes || [] });
    };

    fetchStats();
    fetchRecent();
  }, [isAdmin]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#130183]" />
    </div>
  );

  const cards = [
    { label: 'Clients inscrits',        value: stats?.totalClients ?? '—',           icon: Users,        color: 'text-blue-600',   bg: 'bg-blue-50',    href: '/admin/clients' },
    { label: 'Prestataires',            value: stats?.totalPrestataires ?? '—',       icon: Briefcase,    color: 'text-indigo-600', bg: 'bg-indigo-50',  href: '/admin/prestataires' },
    { label: 'En attente validation',   value: stats?.prestatairesEnAttente ?? '—',   icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-50',  href: '/admin/prestataires', alert: stats?.prestatairesEnAttente > 0 },
    { label: 'Demandes clients',        value: stats?.totalDemandes ?? '—',           icon: FileText,     color: 'text-green-600',  bg: 'bg-green-50',   href: '/admin/demandes' },
    { label: 'Réservations',            value: stats?.totalReservations ?? '—',       icon: Calendar,     color: 'text-purple-600', bg: 'bg-purple-50',  href: '/admin/reservations' },
    { label: 'Avis signalés',           value: stats?.avisSignales ?? '—',            icon: AlertCircle,  color: 'text-red-600',    bg: 'bg-red-50',     href: '/admin/avis', alert: stats?.avisSignales > 0 },
  ];

  return (
    <AdminLayout title="Tableau de bord">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, bg, href, alert }) => (
          <button
            key={label}
            onClick={() => router.push(href)}
            className="relative bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            {alert && <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </button>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prestataires en attente */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Prestataires en attente</h2>
            </div>
            <button onClick={() => router.push('/admin/prestataires')} className="text-xs text-indigo-600 hover:underline">Voir tout</button>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.prestataires.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucun profil en attente ✓</p>
            ) : recent.prestataires.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.profiles?.nom}</p>
                  <p className="text-xs text-gray-400">{p.profiles?.email}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dernières demandes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Dernières demandes ouvertes</h2>
            </div>
            <button onClick={() => router.push('/admin/demandes')} className="text-xs text-indigo-600 hover:underline">Voir tout</button>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.demandes.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucune demande ouverte</p>
            ) : recent.demandes.map(d => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{d.titre || 'Sans titre'}</p>
                  <p className="text-xs text-gray-400">{d.profiles?.nom}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
