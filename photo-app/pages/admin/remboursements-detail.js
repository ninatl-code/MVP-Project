import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function RemboursementsAdmin() {
  const [remboursements, setRemboursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRemboursements();
  }, [filter]);

  const fetchRemboursements = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('remboursements')
        .select(`
          *,
          reservations!remboursements_reservation_id_fkey(id, date),
          profiles!remboursements_particulier_id_fkey(nom, email),
          prestataires:profiles!remboursements_prestataire_id_fkey(nom),
          annonces!remboursements_annonce_id_fkey(titre)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des remboursements');
      } else {
        setRemboursements(data || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des remboursements');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'processing': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'processing': return 'En cours';
      case 'failed': return 'Échoué';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10, color: '#1f2937' }}>
          Gestion des Remboursements
        </h1>
        <p style={{ color: '#6b7280', fontSize: 16 }}>
          Suivi de tous les remboursements d'annulation de réservations
        </p>
      </div>

      {/* Filtres */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {['all', 'processing', 'completed', 'failed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: filter === status ? '#3b82f6' : '#fff',
              color: filter === status ? '#fff' : '#374151',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {status === 'all' ? 'Tous' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Statistiques rapides */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 20, 
        marginBottom: 30 
      }}>
        <div style={{ 
          background: '#f8fafc', 
          padding: 20, 
          borderRadius: 12, 
          border: '1px solid #e2e8f0' 
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
            {remboursements.length}
          </div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Total remboursements</div>
        </div>
        
        <div style={{ 
          background: '#f8fafc', 
          padding: 20, 
          borderRadius: 12, 
          border: '1px solid #e2e8f0' 
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>
            {remboursements.reduce((sum, r) => sum + (r.montant_rembourse || 0), 0).toFixed(2)}€
          </div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Montant total remboursé</div>
        </div>
      </div>

      {/* Liste des remboursements */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          Chargement...
        </div>
      ) : remboursements.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 40, 
          background: '#f9fafb', 
          borderRadius: 12,
          color: '#6b7280'
        }}>
          Aucun remboursement trouvé
        </div>
      ) : (
        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ 
            background: '#f9fafb', 
            padding: 16, 
            borderBottom: '1px solid #e5e7eb',
            fontWeight: 600,
            fontSize: 14,
            color: '#374151'
          }}>
            Remboursements récents
          </div>
          
          {remboursements.map((remboursement, index) => (
            <div 
              key={remboursement.id}
              style={{ 
                padding: 16, 
                borderBottom: index < remboursements.length - 1 ? '1px solid #f3f4f6' : 'none',
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: 16,
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937', marginBottom: 4 }}>
                  {remboursement.annonces?.titre || 'Service non spécifié'}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>
                  Client: {remboursement.profiles?.nom || remboursement.profiles?.email || 'N/A'}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>
                  Prestataire: {remboursement.prestataires?.nom || 'N/A'}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  {new Date(remboursement.created_at).toLocaleDateString('fr-FR')} à {new Date(remboursement.created_at).toLocaleTimeString('fr-FR')}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                  {remboursement.pourcentage_remboursement}%
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {remboursement.montant_rembourse}€ / {remboursement.montant_original}€
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: 12, 
                  padding: '4px 8px',
                  borderRadius: 12,
                  background: remboursement.condition_appliquee === 'Flexible' ? '#dcfce7' :
                              remboursement.condition_appliquee === 'Modéré' ? '#fef3c7' : '#fecaca',
                  color: remboursement.condition_appliquee === 'Flexible' ? '#15803d' :
                         remboursement.condition_appliquee === 'Modéré' ? '#92400e' : '#dc2626'
                }}>
                  {remboursement.condition_appliquee}
                </div>
                {remboursement.force_majeure && (
                  <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>
                    Force majeure
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: 12, 
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 12,
                  background: getStatusColor(remboursement.status) + '20',
                  color: getStatusColor(remboursement.status)
                }}>
                  {getStatusLabel(remboursement.status)}
                </div>
                {remboursement.stripe_refund_id && (
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                    Stripe: {remboursement.stripe_refund_id.substring(0, 10)}...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}