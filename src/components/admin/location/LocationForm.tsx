"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransition } from "react";
import { locationSchema } from "@/lib/schemas/LocationSchema";

type FormData = z.infer<typeof locationSchema>;

export default function LocationForm({
  onSubmitAction,
  defaultValues = { city: "" },
  closeDialog,
}: {
  onSubmitAction: (data: FormData) => Promise<void>;
  defaultValues?: FormData;
  closeDialog: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(locationSchema),
    defaultValues,
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      await onSubmitAction(data);
      closeDialog();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input {...register("city")} placeholder="Enter city name" />
      {errors.city && (
        <p className="text-sm text-red-500">{errors.city.message}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Submit"}
      </Button>
    </form>
  );
}
