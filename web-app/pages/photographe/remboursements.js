import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import Header from '../../components/HeaderPresta';

export default function RemboursementsPrestataire() {
  const [remboursements, setRemboursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRemboursement, setSelectedRemboursement] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, processed: 0 });
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

  const fetchRemboursements = async (prestataireId) => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('remboursements')
      .select(`
        *,
        reservations!remboursements_reservation_id_fkey(
          date,
          annonces!reservations_annonce_id_fkey(titre),
          profiles!reservations_particulier_id_fkey(nom)
        )
      `)
      .eq('prestataire_id', prestataireId)
      .order('date_remboursement', { ascending: false });
    
    if (error) {
      console.error('Erreur chargement remboursements:', error);
    } else {
      setRemboursements(data || []);
      
      // Calcul des statistiques
      const total = data?.length || 0;
      const pending = data?.filter(r => r.statut_remboursement === 'pending').length || 0;
      const processed = data?.filter(r => r.statut_remboursement === 'processed').length || 0;
      
      setStats({ total, pending, processed });
    }
    
    setLoading(false);
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: { bg: '#fff3cd', color: '#856404', label: '⏳ En attente', icon: '📋' },
      processed: { bg: '#d4edda', color: '#155724', label: '✅ Remboursé', icon: '💰' },
      no_refund: { bg: '#f8d7da', color: '#721c24', label: '❌ Pas de remboursement', icon: '🚫' },
      rejected: { bg: '#f8d7da', color: '#721c24', label: '❌ Rejeté', icon: '⛔' }
    };
    
    const style = styles[status] || styles.pending;
    
    return (
      <div style={{
        background: style.bg,
        color: style.color,
        padding: '6px 12px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <span>{style.icon}</span>
        {style.label}
      </div>
    );
  };

  const StatsCard = ({ title, value, icon, color }) => (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 20,
      textAlign: 'center',
      flex: 1
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#666' }}>{title}</div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Header />
        <div style={{ fontSize: 18, color: '#666' }}>Chargement des remboursements...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div style={{ padding: 40, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 30 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, color: '#333' }}>
            📊 Remboursements - Vue Prestataire
          </h1>
          <p style={{ color: '#666', fontSize: 16 }}>
            Suivez les remboursements de vos réservations selon vos conditions d'annulation.
          </p>
        </div>

        {/* Statistiques */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 30 }}>
          <StatsCard 
            title="Total remboursements" 
            value={stats.total}
            icon="💳"
            color="#333"
          />
          <StatsCard 
            title="En attente" 
            value={stats.pending}
            icon="⏳"
            color="#856404"
          />
          <StatsCard 
            title="Traités" 
            value={stats.processed}
            icon="✅"
            color="#155724"
          />
        </div>

        {remboursements.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 60,
            background: '#f8f9fa',
            borderRadius: 12,
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#333' }}>
              Aucun remboursement
            </h2>
            <p style={{ color: '#666' }}>
              Aucune demande de remboursement n'a été effectuée pour vos prestations.
            </p>
          </div>
        ) : (
          <div>
            {remboursements.map((remb) => (
              <div key={remb.id} style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#333' }}>
                      {remb.reservations?.annonces?.titre || 'Service'}
                    </h2>
                    <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>
                      <strong>Client:</strong> {remb.reservations?.profiles?.nom || 'N/A'}
                    </div>
                    <div style={{ color: '#666', fontSize: 14 }}>
                      <strong>Date prestation:</strong> {remb.reservations?.date ? new Date(remb.reservations.date).toLocaleDateString('fr-FR') : 'N/A'}
                    </div>
                  </div>
                  
                  <StatusBadge status={remb.statut_remboursement} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Montant original</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{remb.montant_original} MAD</div>
                  </div>
                  
                  <div style={{ background: '#ffe6e6', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#721c24', marginBottom: 2 }}>Remboursé</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#721c24' }}>
                      -{remb.montant_rembourse} MAD ({remb.pourcentage_remboursement}%)
                    </div>
                  </div>
                  
                  <div style={{ background: '#fff3cd', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#856404', marginBottom: 2 }}>Condition</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#856404' }}>
                      {remb.condition_annulation || 'N/A'}
                    </div>
                  </div>

                  <div style={{ background: '#e8f5e8', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#155724', marginBottom: 2 }}>Vous gardez</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#155724' }}>
                      {remb.montant_original - remb.montant_rembourse} MAD
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666' }}>
                  <div>
                    <strong>Demandé le:</strong> {new Date(remb.date_remboursement).toLocaleDateString('fr-FR')}
                    {remb.date_traitement_admin && (
                      <span style={{ marginLeft: 16 }}>
                        <strong>Traité le:</strong> {new Date(remb.date_traitement_admin).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setSelectedRemboursement(remb)}
                    style={{
                      background: '#6c757d',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    Voir détails
                  </button>
                </div>
                
                {remb.motif_annulation && (
                  <div style={{ marginTop: 12, padding: 12, background: '#fff3cd', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#856404', fontWeight: 600, marginBottom: 4 }}>
                      Motif d'annulation:
                    </div>
                    <div style={{ fontSize: 12, color: '#856404', fontStyle: 'italic' }}>
                      "{remb.motif_annulation}"
                    </div>
                  </div>
                )}
              </div>
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
                    padding: 0
                  }}
                >
                  ×
                </button>
              </div>

              <StatusBadge status={selectedRemboursement.statut_remboursement} />

              <div style={{ marginTop: 20, marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                  Impact financier
                </h2>
                
                <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span>Montant de la réservation:</span>
                    <strong>{selectedRemboursement.montant_original} MAD</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: '#dc3545' }}>
                    <span>Montant remboursé au client:</span>
                    <strong>- {selectedRemboursement.montant_rembourse} MAD</strong>
                  </div>
                  <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#28a745' }}>
                    <span><strong>Vous conservez:</strong></span>
                    <strong>{selectedRemboursement.montant_original - selectedRemboursement.montant_rembourse} MAD</strong>
                  </div>
                </div>

                <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8, fontSize: 14 }}>
                  <div style={{ fontWeight: 600, color: '#1565c0', marginBottom: 8 }}>
                    📋 Condition appliquée: {selectedRemboursement.condition_annulation}
                  </div>
                  <div style={{ color: '#1565c0' }}>
                    Pourcentage de remboursement: {selectedRemboursement.pourcentage_remboursement}%
                  </div>
                </div>
              </div>

              {selectedRemboursement.motif_annulation && (
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                    Motif d'annulation du client
                  </h2>
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
                  <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                    Notes administratives
                  </h2>
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

              <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
                <div style={{ marginBottom: 4 }}>
                  <strong>Demande créée:</strong> {new Date(selectedRemboursement.date_remboursement).toLocaleString('fr-FR')}
                </div>
                {selectedRemboursement.date_traitement_admin && (
                  <div style={{ marginBottom: 4 }}>
                    <strong>Traitée le:</strong> {new Date(selectedRemboursement.date_traitement_admin).toLocaleString('fr-FR')}
                  </div>
                )}
                {selectedRemboursement.stripe_refund_id && (
                  <div>
                    <strong>ID Remboursement Stripe:</strong> {selectedRemboursement.stripe_refund_id}
                  </div>
                )}
              </div>

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
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}