'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SubEventDb } from '@/lib/schemas/SubEventSchema';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from 'sonner';
import { addSubEvent } from '../addSubEvent';

export const useAddSubEvent = (eventId: string) => {
  const { currentUser } = useAuthContext();
  const queryClient = useQueryClient();

  const { mutateAsync: addSubEventMutation, isPending: addSubEventLoading } =
    useMutation({
      mutationFn: async (formData: SubEventDb) =>
        await addSubEvent(formData, currentUser!.id, currentUser!.role),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ['subEvents', eventId, currentUser?.id],
        });
        toast.success('Sub Event created');
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Error creating Sub Event');
      },
    });

  return { addSubEventMutation, addSubEventLoading };
};
