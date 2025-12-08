import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function MesRemboursements() {
  const [remboursements, setRemboursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRemboursement, setSelectedRemboursement] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      fetchRemboursements(user.id);
    };
    
    checkAuthAndFetch();
  }, []);

  const fetchRemboursements = async (userId) => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('remboursements')
      .select(`
        *,
        reservations!remboursements_reservation_id_fkey(
          date,
          annonces!reservations_annonce_id_fkey(titre, prestataire),
          profiles!reservations_prestataire_id_fkey(nom)
        )
      `)
      .eq('particulier_id', userId)
      .order('date_remboursement', { ascending: false });
    
    if (error) {
      console.error('Erreur chargement remboursements:', error);
    } else {
      setRemboursements(data || []);
    }
    
    setLoading(false);
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: { bg: '#fff3cd', color: '#856404', label: '⏳ En cours d\'examen', icon: '📋' },
      processed: { bg: '#d4edda', color: '#155724', label: '✅ Remboursé', icon: '💰' },
      no_refund: { bg: '#f8d7da', color: '#721c24', label: '❌ Aucun remboursement', icon: '🚫' },
      rejected: { bg: '#f8d7da', color: '#721c24', label: '❌ Rejeté', icon: '⛔' }
    };
    
    const style = styles[status] || styles.pending;
    
    return (
      <div style={{
        background: style.bg,
        color: style.color,
        padding: '8px 16px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <span>{style.icon}</span>
        {style.label}
      </div>
    );
  };

  const RefundCard = ({ remb }) => (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s',
      cursor: 'pointer'
    }}
    onClick={() => setSelectedRemboursement(remb)}
    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#333' }}>
            {remb.reservations?.annonces?.titre || 'Service'}
          </h3>
          <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>
            <strong>Prestataire:</strong> {remb.reservations?.profiles?.nom || 'N/A'}
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>
            <strong>Date de la prestation:</strong> {remb.reservations?.date ? new Date(remb.reservations.date).toLocaleDateString('fr-FR') : 'N/A'}
          </div>
        </div>
        
        <StatusBadge status={remb.statut_remboursement} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Montant payé</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{remb.montant_original} MAD</div>
        </div>
        
        <div style={{ background: '#e8f5e8', padding: 12, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#155724', marginBottom: 4 }}>Remboursé</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#155724' }}>
            {remb.montant_rembourse} MAD ({remb.pourcentage_remboursement}%)
          </div>
        </div>
        
        <div style={{ background: '#fff3cd', padding: 12, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#856404', marginBottom: 4 }}>Conditions</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#856404' }}>
            {remb.condition_annulation || 'N/A'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#666' }}>
        <strong>Demandé le:</strong> {new Date(remb.date_remboursement).toLocaleDateString('fr-FR')} à {new Date(remb.date_remboursement).toLocaleTimeString('fr-FR')}
      </div>
      
      {remb.date_traitement_admin && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          <strong>Traité le:</strong> {new Date(remb.date_traitement_admin).toLocaleDateString('fr-FR')}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#666' }}>Chargement de vos remboursements...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, color: '#333' }}>
          💰 Mes Remboursements
        </h1>
        <p style={{ color: '#666', fontSize: 16 }}>
          Suivez l'état de vos demandes de remboursement selon les conditions d'annulation.
        </p>
      </div>

      {remboursements.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: '#f8f9fa',
          borderRadius: 12,
          border: '2px dashed #dee2e6'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#333' }}>
            Aucun remboursement
          </h3>
          <p style={{ color: '#666' }}>
            Vous n'avez encore aucune demande de remboursement.
          </p>
        </div>
      ) : (
        <div>
          {remboursements.map((remb) => (
            <RefundCard key={remb.id} remb={remb} />
          ))}
        </div>
      )}

      {/* Modal détails */}
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
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            maxWidth: 600,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#333', margin: 0 }}>
                Détails du remboursement
              </h2>
              <button
                onClick={() => setSelectedRemboursement(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#666',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <StatusBadge status={selectedRemboursement.statut_remboursement} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                Informations de la réservation
              </h3>
              <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Service:</strong> {selectedRemboursement.reservations?.annonces?.titre}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Prestataire:</strong> {selectedRemboursement.reservations?.profiles?.nom}
                </div>
                <div>
                  <strong>Date de prestation:</strong> {selectedRemboursement.reservations?.date ? new Date(selectedRemboursement.reservations.date).toLocaleDateString('fr-FR') : 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                Détails financiers
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Montant original</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>{selectedRemboursement.montant_original} MAD</div>
                </div>
                <div style={{ background: '#e8f5e8', padding: 16, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#155724', marginBottom: 4 }}>Montant remboursé</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#155724' }}>
                    {selectedRemboursement.montant_rembourse} MAD ({selectedRemboursement.pourcentage_remboursement}%)
                  </div>
                </div>
              </div>
            </div>

            {selectedRemboursement.motif_annulation && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                  Motif d'annulation
                </h3>
                <div style={{
                  background: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: 8,
                  padding: 16,
                  fontStyle: 'italic',
                  color: '#856404'
                }}>
                  "{selectedRemboursement.motif_annulation}"
                </div>
              </div>
            )}

            {selectedRemboursement.notes_admin && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                  Notes administratives
                </h3>
                <div style={{
                  background: '#e3f2fd',
                  border: '1px solid #bbdefb',
                  borderRadius: 8,
                  padding: 16,
                  color: '#1565c0'
                }}>
                  {selectedRemboursement.notes_admin}
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: '#666' }}>
              {selectedRemboursement.stripe_refund_id && (
                <div style={{ marginBottom: 4 }}>
                  <strong>ID Remboursement Stripe:</strong> {selectedRemboursement.stripe_refund_id}
                </div>
              )}
              <div style={{ marginBottom: 4 }}>
                <strong>Demande créée:</strong> {new Date(selectedRemboursement.date_remboursement).toLocaleString('fr-FR')}
              </div>
              {selectedRemboursement.date_traitement_admin && (
                <div>
                  <strong>Traitée le:</strong> {new Date(selectedRemboursement.date_traitement_admin).toLocaleString('fr-FR')}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                onClick={() => setSelectedRemboursement(null)}
                style={{
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}