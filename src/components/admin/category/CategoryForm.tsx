'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTransition } from 'react';
import { categorySchema } from '@/lib/schemas/CategorySchema';

type FormData = z.infer<typeof categorySchema>;

export default function CategoryForm({
  onSubmitAction,
  defaultValues = { title: '' },
  closeDialog,
}: {
  onSubmitAction: any;
  defaultValues?: FormData;
  closeDialog: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('title', data.title);
      await onSubmitAction(formData as any);
      closeDialog();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input {...register('title')} placeholder="Category Title" />
      {errors.title && (
        <p className="text-sm text-red-500">{errors.title.message}</p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Submit'}
      </Button>
    </form>
  );
}
