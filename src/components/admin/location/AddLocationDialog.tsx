'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import LocationForm from '@/components/admin/location/LocationForm';
import { addLocation } from '@/actions/location/location-crud';
import { toast } from 'sonner';
import { useAuthContext } from '@/context/AuthContext';

function AddLocationDialog() {
  const auth = useAuthContext();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Location</h1>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add Location</Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle className="text-lg font-semibold">
            Add Location
          </DialogTitle>
          <LocationForm
            onSubmitAction={async (formData: any) => {
              const userId = auth.currentUser?.id;
              if (!userId) {
                toast.error('User ID not found');
                return;
              }
              await addLocation(formData, userId);
            }}
            closeDialog={() => {
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AddLocationDialog;
