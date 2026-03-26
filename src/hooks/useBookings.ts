/**
 * useBookings.ts — hook domain bookings côté client.
 */
import { useEffect, useCallback } from 'react';
import { bookingsApi } from '@api/endpoints/bookings';
import { useApi }      from '@hooks/useApi';
import { isActiveBooking } from '@utils/typeGuards';
import { BookingStatus } from '@constants/enums';

export function useMissionBookings(missionId: string) {
  const { data, loading, error, execute } = useApi(bookingsApi.getByMission);

  const refresh = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { refresh(); }, [refresh]);

  const bookings   = data ?? [];
  const active     = bookings.filter(isActiveBooking);
  const completed  = bookings.filter((b) => b.status === BookingStatus.COMPLETED);
  const open       = bookings.filter((b) => b.status === BookingStatus.OPEN);

  return { bookings, active, completed, open, loading, error, refresh };
}

export function useBookingDetail(bookingId: string) {
  const { data: booking, loading, error, execute } = useApi(bookingsApi.getById);

  const refresh = useCallback(() => execute(bookingId), [execute, bookingId]);
  useEffect(() => { refresh(); }, [refresh]);

  return { booking, loading, error, refresh };
}
