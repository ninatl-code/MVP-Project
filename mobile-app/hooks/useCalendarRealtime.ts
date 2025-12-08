import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface CalendarUpdate {
  type: 'availability' | 'blocked_slot' | 'reservation';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
}

export const useCalendarRealtime = (
  providerId: string,
  onUpdate: (update: CalendarUpdate) => void
) => {
  useEffect(() => {
    if (!providerId) return;

    // Subscribe to provider availability changes
    const availabilityChannel = supabase
      .channel(`availability_${providerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_availability',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          console.log('Availability change:', payload);
          onUpdate({
            type: 'availability',
            action: payload.eventType as any,
            data: payload.new || payload.old,
          });
        }
      )
      .subscribe();

    // Subscribe to blocked slots changes
    const blockedSlotsChannel = supabase
      .channel(`blocked_slots_${providerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_slots',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          console.log('Blocked slot change:', payload);
          onUpdate({
            type: 'blocked_slot',
            action: payload.eventType as any,
            data: payload.new || payload.old,
          });
        }
      )
      .subscribe();

    // Subscribe to reservation changes for this provider
    const reservationsChannel = supabase
      .channel(`reservations_${providerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `prestataire_id=eq.${providerId}`,
        },
        (payload) => {
          console.log('Reservation change:', payload);
          onUpdate({
            type: 'reservation',
            action: payload.eventType as any,
            data: payload.new || payload.old,
          });
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(availabilityChannel);
      supabase.removeChannel(blockedSlotsChannel);
      supabase.removeChannel(reservationsChannel);
    };
  }, [providerId, onUpdate]);
};

export const useInstantBookingSettings = (
  providerId: string,
  onUpdate: (settings: any) => void
) => {
  useEffect(() => {
    if (!providerId) return;

    const channel = supabase
      .channel(`instant_booking_${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'instant_booking_settings',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          console.log('Instant booking settings updated:', payload);
          onUpdate(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId, onUpdate]);
};

export const subscribeToReservationStatus = (
  reservationId: string,
  onStatusChange: (status: string, reservation: any) => void
) => {
  const channel = supabase
    .channel(`reservation_${reservationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'reservations',
        filter: `id=eq.${reservationId}`,
      },
      (payload) => {
        console.log('Reservation status changed:', payload);
        onStatusChange(payload.new.statut, payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
