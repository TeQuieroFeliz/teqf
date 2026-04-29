'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from 'sonner';
import { deleteSubEvent } from '../deleteSubEvent';

export const useDeleteSubEvent = (eventId: string) => {
  const { currentUser } = useAuthContext();
  const queryClient = useQueryClient();

  const {
    mutateAsync: deleteSubEventMutation,
    isPending: deleteSubEventLoading,
  } = useMutation({
    mutationFn: async (id: string) => {
      await deleteSubEvent(id, currentUser!.role, eventId);
    },
    // onSuccess: async () => {
    //   // Invalidate the exact query key used by useGetSubEvents
    //   await queryClient.invalidateQueries({
    //     queryKey: ['subEvents', eventId, currentUser?.id],
    //   });
    //   toast.success('Sub Event deleted');
    // },
    // onError: (error: any) => {
    //   toast.error(error?.message || 'Error deleting Sub Event');
    // },
  });

  return { deleteSubEventMutation, deleteSubEventLoading };
};
