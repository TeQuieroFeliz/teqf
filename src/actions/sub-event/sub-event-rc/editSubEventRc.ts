'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SubEventDb } from '@/lib/schemas/SubEventSchema';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from 'sonner';
import { editSubEvent } from '../editSubEvent';

type EditParams = {
  formData: SubEventDb;
  id: string;
};

export const useEditSubEvent = (eventId: string) => {
  const { currentUser } = useAuthContext();
  const queryClient = useQueryClient();

  const { mutateAsync: editSubEventMutation, isPending: editSubEventLoading } =
    useMutation({
      mutationFn: async ({ formData, id }: EditParams) =>
        await editSubEvent({ formData, id, role: currentUser!.role }),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ['subEvents', eventId, currentUser?.id],
        });
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Error updating Sub Event');
      },
    });

  return { editSubEventMutation, editSubEventLoading };
};
