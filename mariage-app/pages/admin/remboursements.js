import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function RemboursementsAdmin() {
  const [remboursements, setRemboursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, processed, rejected
  const [selectedRemboursement, setSelectedRemboursement] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Vérifier si c'est un admin (tu peux adapter selon ta logique)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (profile?.role !== 'admin') {
        router.push('/');
        return;
      }
      
      fetchRemboursements();
    };
    
    checkAuth();
  }, []);

  const fetchRemboursements = async () => {
    setLoading(true);
    
    let query = supabase
      .from('remboursements')
      .select(`
        *,
        reservations!remboursements_reservation_id_fkey(
          date,
          annonces!reservations_annonce_id_fkey(titre)
        ),
        profiles!remboursements_particulier_id_fkey(nom, email)
      `)
      .order('date_remboursement', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('statut_remboursement', filter);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Erreur chargement remboursements:', error);
    } else {
      setRemboursements(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchRemboursements();
  }, [filter]);

  const handleManualRefund = async (remboursement) => {
    if (!confirm('Confirmer le remboursement manuel ?')) return;
    
    setIsProcessing(true);
    
    try {
      // Appel API pour traitement manuel
      const response = await fetch('/api/admin/manual-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          remboursementId: remboursement.id,
          forceRefund: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Remboursement traité avec succès !');
        fetchRemboursements();
      } else {
        alert('Erreur: ' + result.error);
      }
    } catch (error) {
      console.error('Erreur remboursement manuel:', error);
      alert('Erreur lors du remboursement');
    }
    
    setIsProcessing(false);
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      processed: { bg: '#d4edda', color: '#155724', label: 'Traité' },
      pending: { bg: '#fff3cd', color: '#856404', label: 'En attente' },
      no_refund: { bg: '#f8d7da', color: '#721c24', label: 'Aucun remboursement' },
      rejected: { bg: '#f8d7da', color: '#721c24', label: 'Rejeté' }
    };
    
    const style = colors[status] || colors.pending;
    
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '4px 12px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600
      }}>
        {style.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div>Chargement des remboursements...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
          🔄 Gestion des Remboursements
        </h1>
        
        {/* Filtres */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { key: 'all', label: 'Tous' },
            { key: 'pending', label: 'En attente' },
            { key: 'processed', label: 'Traités' },
            { key: 'no_refund', label: 'Aucun remboursement' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                background: filter === key ? '#007bff' : '#f8f9fa',
                color: filter === key ? '#fff' : '#333',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des remboursements */}
      <div style={{ display: 'grid', gap: 16 }}>
        {remboursements.map((remb) => (
          <div
            key={remb.id}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#333' }}>
                  {remb.reservations?.annonces?.titre || 'Réservation'}
                </h3>
                <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>
                  <strong>Client:</strong> {remb.profiles?.nom} ({remb.profiles?.email})
                </div>
                <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>
                  <strong>Date réservation:</strong> {remb.reservations?.date ? new Date(remb.reservations.date).toLocaleDateString('fr-FR') : 'N/A'}
                </div>
                <div style={{ color: '#666', fontSize: 14 }}>
                  <strong>Date demande:</strong> {new Date(remb.date_remboursement).toLocaleDateString('fr-FR')}
                </div>
              </div>
              
              <StatusBadge status={remb.statut_remboursement} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Montant original</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{remb.montant_original} MAD</div>
              </div>
              
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Remboursement</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#28a745' }}>
                  {remb.montant_rembourse} MAD ({remb.pourcentage_remboursement}%)
                </div>
              </div>
              
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Condition</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{remb.condition_annulation}</div>
              </div>
            </div>

            {remb.motif_annulation && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16
              }}>
                <div style={{ fontSize: 12, color: '#856404', marginBottom: 4 }}>Motif d'annulation</div>
                <div style={{ fontSize: 14, color: '#856404', fontStyle: 'italic' }}>
                  "{remb.motif_annulation}"
                </div>
              </div>
            )}

            {remb.stripe_refund_id && (
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                <strong>ID Remboursement Stripe:</strong> {remb.stripe_refund_id}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedRemboursement(remb)}
                style={{
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Détails
              </button>
              
              {remb.statut_remboursement === 'no_refund' && remb.condition_annulation === 'Strict' && (
                <button
                  onClick={() => handleManualRefund(remb)}
                  disabled={isProcessing}
                  style={{
                    background: isProcessing ? '#ccc' : '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    fontSize: 14
                  }}
                >
                  {isProcessing ? 'Traitement...' : 'Approuver Force Majeure'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {remboursements.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 60,
          color: '#666'
        }}>
          Aucun remboursement trouvé pour ce filtre.
        </div>
      )}

      {/* Modal détails (optionnel) */}
      {selectedRemboursement && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 30,
            maxWidth: 500,
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: 20 }}>Détails du remboursement</h2>
            <pre style={{ fontSize: 12, background: '#f8f9fa', padding: 15, borderRadius: 8, overflow: 'auto' }}>
              {JSON.stringify(selectedRemboursement, null, 2)}
            </pre>
            <button
              onClick={() => setSelectedRemboursement(null)}
              style={{
                marginTop: 20,
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                cursor: 'pointer'
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}