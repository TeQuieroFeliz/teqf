'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '@/context/AuthContext';
import { SubEventDBWithId } from '@/lib/schemas/SubEventSchema';
import { getSubEvents } from '../getSubEvents';

export const useGetSubEvents = (eventId: string) => {
  const { currentUser } = useAuthContext();

  const getSubEventsRequest = async (): Promise<SubEventDBWithId[]> => {
    if (!currentUser?.id) {
      console.log('User not found');
      return [];
    }
    return await getSubEvents(eventId, currentUser.id);
  };

  const {
    data: subEvents = [],
    isLoading: subEventsLoading,
    isError: subEventsError,
    refetch: refetchSubevents,
  } = useQuery({
    queryKey: ['subEvents', eventId, currentUser?.id],
    queryFn: getSubEventsRequest,
    enabled: !!currentUser?.id,
    staleTime: 0, // 👈 Ensures data is always considered stale
    refetchOnMount: 'always', // 👈 Forces a fetch on every mount
    refetchOnWindowFocus: 'always', // 👈 Forces a fetch on window focus
  });

  return { subEvents, subEventsLoading, subEventsError, refetchSubevents };
};
