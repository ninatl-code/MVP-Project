import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import HeaderPresta from '../../components/HeaderPresta';

const RULE_TYPES = [
  { value: 'seasonal', label: 'Seasonal Pricing', icon: '☀️' },
  { value: 'demand_based', label: 'Demand-Based', icon: '📈' },
  { value: 'duration_based', label: 'Duration Discount', icon: '⏰' },
  { value: 'day_of_week', label: 'Day of Week', icon: '📅' },
  { value: 'early_bird', label: 'Early Bird Discount', icon: '⏰' },
  { value: 'last_minute', label: 'Last Minute Deal', icon: '⚡' },
];

export default function PricingRulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerId, setProviderId] = useState(null);

  useEffect(() => {
    loadUserAndRules();
  }, []);

  const loadUserAndRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setProviderId(user.id);
      await loadRules(user.id);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadRules = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dynamic_pricing_rules')
        .select('*')
        .eq('provider_id', userId)
        .order('priority', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading pricing rules:', error);
      alert('Failed to load pricing rules');
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleStatus = async (ruleId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('dynamic_pricing_rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev =>
        prev.map(rule =>
          rule.id === ruleId ? { ...rule, is_active: !currentStatus } : rule
        )
      );
    } catch (error) {
      console.error('Error toggling rule:', error);
      alert('Failed to update rule status');
    }
  };

  const deleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;

    try {
      const { error } = await supabase
        .from('dynamic_pricing_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      alert('Pricing rule deleted');
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule');
    }
  };

  const getRuleIcon = (ruleType) => {
    const rule = RULE_TYPES.find(r => r.value === ruleType);
    return rule?.icon || '💰';
  };

  const getRuleLabel = (ruleType) => {
    const rule = RULE_TYPES.find(r => r.value === ruleType);
    return rule?.label || ruleType;
  };

  const formatRuleConfig = (rule) => {
    switch (rule.rule_type) {
      case 'seasonal':
        return `${rule.rule_config.season || 'Season'}: ${rule.rule_config.start_date} to ${rule.rule_config.end_date} (${rule.rule_config.price_multiplier}x)`;
      case 'demand_based':
        return `${rule.rule_config.threshold_bookings} bookings in ${rule.rule_config.period_days} days = ${rule.rule_config.price_multiplier}x`;
      case 'duration_based':
        return `${rule.rule_config.min_duration_hours}+ hours = ${rule.rule_config.discount_percentage}% off`;
      case 'day_of_week':
        return `${rule.rule_config.days?.join(', ')} = ${rule.rule_config.price_multiplier}x`;
      case 'early_bird':
        return `Book ${rule.rule_config.days_in_advance}+ days ahead = ${rule.rule_config.discount_percentage}% off`;
      case 'last_minute':
        return `Book within ${rule.rule_config.hours_before} hours = ${rule.rule_config.discount_percentage}% off`;
      default:
        return 'Custom configuration';
    }
  };

  return (
    <>
      <Head>
        <title>Dynamic Pricing | Shooty</title>
      </Head>

      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <HeaderPresta />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Dynamic Pricing</h1>
              <p style={{ color: '#666', fontSize: '16px' }}>
                Automatically adjust your prices based on demand, seasonality, and booking patterns
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => router.push('/prestataires/price-simulator')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#fff',
                  border: '1px solid #007AFF',
                  borderRadius: '8px',
                  color: '#007AFF',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                🧮 Test Simulator
              </button>
              <button
                onClick={() => router.push('/prestataires/seasonal-pricing')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007AFF',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ➕ Add New Rule
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#007AFF', marginBottom: '8px' }}>{rules.length}</div>
              <div style={{ color: '#666', fontSize: '14px' }}>Total Rules</div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#34C759', marginBottom: '8px' }}>
                {rules.filter(r => r.is_active).length}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>Active Rules</div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#8E8E93', marginBottom: '8px' }}>
                {rules.filter(r => !r.is_active).length}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>Inactive Rules</div>
            </div>
          </div>

          {/* Rules List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '12px' }}>
              <div style={{ fontSize: '18px', color: '#666' }}>Loading pricing rules...</div>
            </div>
          ) : rules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '12px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>No Pricing Rules Yet</h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Create your first pricing rule to start optimizing your earnings automatically.
              </p>
              <button
                onClick={() => router.push('/prestataires/seasonal-pricing')}
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#007AFF',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Create First Rule
              </button>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Your Pricing Rules</h2>
              <div style={{ display: 'grid', gap: '16px' }}>
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    style={{
                      backgroundColor: '#fff',
                      padding: '24px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <div style={{ fontSize: '36px' }}>{getRuleIcon(rule.rule_type)}</div>
                        <div>
                          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>{rule.rule_name}</h3>
                          <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>{getRuleLabel(rule.rule_type)}</div>
                          <div style={{ fontSize: '14px', color: '#333' }}>{formatRuleConfig(rule)}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={rule.is_active}
                            onChange={() => toggleRuleStatus(rule.id, rule.is_active)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', fontWeight: '600', color: rule.is_active ? '#34C759' : '#8E8E93' }}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {rule.adjusted_price && (
                      <div style={{ backgroundColor: '#E8F5E9', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '14px', color: '#666', marginRight: '12px' }}>Adjusted Price:</span>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#34C759' }}>
                          ${rule.adjusted_price.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#f5f5f5', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: '#666' }}>
                        Priority: {rule.priority}
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          onClick={() => router.push(`/prestataires/edit-pricing-rule?id=${rule.id}`)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#f5f5f5',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#007AFF',
                            cursor: 'pointer',
                            fontWeight: '600',
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#FFEBEE',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#FF3B30',
                            cursor: 'pointer',
                            fontWeight: '600',
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div style={{ marginTop: '32px', backgroundColor: '#FFF9E6', padding: '24px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>💡 Pricing Tips</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '12px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#007AFF' }}>•</span>
                Set higher priorities for more specific rules
              </li>
              <li style={{ marginBottom: '12px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#007AFF' }}>•</span>
                Use seasonal pricing for peak demand periods
              </li>
              <li style={{ marginBottom: '12px', paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#007AFF' }}>•</span>
                Offer early bird discounts to increase bookings
              </li>
              <li style={{ paddingLeft: '24px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#007AFF' }}>•</span>
                Test different rules and track performance with the simulator
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
