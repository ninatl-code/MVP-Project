import { supabase } from './supabaseClient';

/**
 * Get KPIs for a photographer
 */
export const getPhotographerKPIs = async (photographeId, period = 'month') => {
  try {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(0);
    }

    const startDateStr = startDate.toISOString();

    // Get reservations
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('id, montant, status, created_at, particulier_id')
      .eq('prestataire_id', photographeId)
      .gte('created_at', startDateStr);

    if (resError) throw resError;

    // Get devis
    const { data: devis, error: devisError } = await supabase
      .from('devis')
      .select('id, montant_total, status, created_at')
      .eq('photographe_id', photographeId)
      .gte('created_at', startDateStr);

    if (devisError) throw devisError;

    // Calculate KPIs
    const completedReservations = reservations?.filter(r => r.status === 'completed') || [];
    const acceptedDevis = devis?.filter(d => d.status === 'accepted') || [];
    const uniqueClients = new Set(reservations?.map(r => r.particulier_id)).size;

    const kpis = {
      // Revenue
      chiffreAffaires: completedReservations.reduce((sum, r) => sum + (r.montant || 0), 0),
      reservationsEnCours: reservations?.filter(r => ['confirmed', 'acompte_paye'].includes(r.status)).length || 0,
      
      // Devis
      devisEnvoyes: devis?.length || 0,
      devisAcceptes: acceptedDevis.length,
      tauxConversion: devis?.length > 0 
        ? ((acceptedDevis.length / devis.length) * 100).toFixed(1) 
        : 0,

      // Reservations
      totalReservations: reservations?.length || 0,
      reservationsCompleted: completedReservations.length,
      reservationsCancelled: reservations?.filter(r => r.status === 'cancelled').length || 0,

      // Clients
      nombreClients: uniqueClients,
      panierMoyen: completedReservations.length > 0
        ? Math.round(completedReservations.reduce((sum, r) => sum + (r.montant || 0), 0) / completedReservations.length)
        : 0,
    };

    return { kpis, error: null };
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return { kpis: null, error };
  }
};

/**
 * Get revenue chart data
 */
export const getRevenueChartData = async (photographeId, period = 'month', groupBy = 'day') => {
  try {
    const now = new Date();
    let startDate;
    let dateFormat;

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        dateFormat = 'day';
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        dateFormat = 'day';
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        dateFormat = 'month';
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        dateFormat = 'day';
    }

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('montant, created_at, status')
      .eq('prestataire_id', photographeId)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const groupedData = {};
    reservations?.forEach(r => {
      const date = new Date(r.created_at);
      let key;
      
      if (dateFormat === 'day') {
        key = date.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData[key]) {
        groupedData[key] = { date: key, revenue: 0, count: 0 };
      }
      groupedData[key].revenue += r.montant || 0;
      groupedData[key].count += 1;
    });

    const chartData = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));

    return { data: chartData, error: null };
  } catch (error) {
    console.error('Error fetching revenue chart data:', error);
    return { data: [], error };
  }
};

/**
 * Get popular services/categories
 */
export const getPopularServices = async (photographeId) => {
  try {
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        id,
        annonces(categorie)
      `)
      .eq('prestataire_id', photographeId)
      .eq('status', 'completed');

    if (error) throw error;

    // Count by category
    const categoryCounts = {};
    reservations?.forEach(r => {
      const cat = r.annonces?.categorie || 'Autre';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const popularServices = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return { data: popularServices, error: null };
  } catch (error) {
    console.error('Error fetching popular services:', error);
    return { data: [], error };
  }
};

/**
 * Get reservation status distribution
 */
export const getReservationStatusDistribution = async (photographeId) => {
  try {
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('status')
      .eq('prestataire_id', photographeId);

    if (error) throw error;

    const statusCounts = {};
    reservations?.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    const distribution = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }));

    return { data: distribution, error: null };
  } catch (error) {
    console.error('Error fetching status distribution:', error);
    return { data: [], error };
  }
};

/**
 * Get client statistics
 */
export const getClientStats = async (photographeId) => {
  try {
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('particulier_id, created_at')
      .eq('prestataire_id', photographeId)
      .eq('status', 'completed');

    if (error) throw error;

    // Track first reservation date per client
    const clientFirstReservation = {};
    reservations?.forEach(r => {
      if (!clientFirstReservation[r.particulier_id] || 
          new Date(r.created_at) < new Date(clientFirstReservation[r.particulier_id])) {
        clientFirstReservation[r.particulier_id] = r.created_at;
      }
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    const totalClients = Object.keys(clientFirstReservation).length;
    const newClients = Object.values(clientFirstReservation)
      .filter(date => new Date(date) > thirtyDaysAgo).length;
    const returningClients = totalClients - newClients;

    // Calculate client retention
    const clientReservationCount = {};
    reservations?.forEach(r => {
      clientReservationCount[r.particulier_id] = (clientReservationCount[r.particulier_id] || 0) + 1;
    });
    const repeatClients = Object.values(clientReservationCount).filter(count => count > 1).length;

    return {
      data: {
        totalClients,
        newClients,
        returningClients,
        repeatClients,
        retentionRate: totalClients > 0 ? ((repeatClients / totalClients) * 100).toFixed(1) : 0,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching client stats:', error);
    return { data: null, error };
  }
};

/**
 * Get comparison with previous period
 */
export const getPeriodComparison = async (photographeId, period = 'month') => {
  try {
    const now = new Date();
    let currentStart, previousStart, previousEnd;

    switch (period) {
      case 'week':
        currentStart = new Date(now.setDate(now.getDate() - 7));
        previousEnd = new Date(currentStart);
        previousStart = new Date(previousEnd.setDate(previousEnd.getDate() - 7));
        break;
      case 'month':
        currentStart = new Date(now.setMonth(now.getMonth() - 1));
        previousEnd = new Date(currentStart);
        previousStart = new Date(previousEnd.setMonth(previousEnd.getMonth() - 1));
        break;
      default:
        currentStart = new Date(now.setMonth(now.getMonth() - 1));
        previousEnd = new Date(currentStart);
        previousStart = new Date(previousEnd.setMonth(previousEnd.getMonth() - 1));
    }

    // Current period
    const { data: currentReservations } = await supabase
      .from('reservations')
      .select('montant')
      .eq('prestataire_id', photographeId)
      .eq('status', 'completed')
      .gte('created_at', currentStart.toISOString());

    // Previous period
    const { data: previousReservations } = await supabase
      .from('reservations')
      .select('montant')
      .eq('prestataire_id', photographeId)
      .eq('status', 'completed')
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', previousEnd.toISOString());

    const currentRevenue = currentReservations?.reduce((sum, r) => sum + (r.montant || 0), 0) || 0;
    const previousRevenue = previousReservations?.reduce((sum, r) => sum + (r.montant || 0), 0) || 0;

    const change = previousRevenue > 0 
      ? (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)
      : currentRevenue > 0 ? 100 : 0;

    return {
      data: {
        currentRevenue,
        previousRevenue,
        change: parseFloat(change),
        isPositive: parseFloat(change) >= 0,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching period comparison:', error);
    return { data: null, error };
  }
};

export default {
  getPhotographerKPIs,
  getRevenueChartData,
  getPopularServices,
  getReservationStatusDistribution,
  getClientStats,
  getPeriodComparison,
};
