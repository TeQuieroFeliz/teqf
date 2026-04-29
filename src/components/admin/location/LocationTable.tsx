'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import LocationForm from './LocationForm';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function LocationTable({
  locations,
  onEdit,
  onDelete,
}: {
  locations: { id: string; city: string; createdAt: any }[];
  onEdit: (id: string, data: FormData, userId: string) => Promise<void>;
  onDelete: (id: string, userId: string) => Promise<void>;
}) {
  const auth = useAuthContext();
  const [editing, setEditing] = useState<{ id: string; city: string } | null>(
    null
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="p-3">S.No</th>
            <th className="p-3">City</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {locations
            .sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt) : null;
              const dateB = b.createdAt ? new Date(b.createdAt) : null;

              // Handle cases where a date is missing
              if (!dateA && !dateB) return 0; // Both are missing, keep original order
              if (!dateA) return 1; // 'a' is missing, put it at the end
              if (!dateB) return -1; // 'b' is missing, put it at the end

              return dateB.getTime() - dateA.getTime();
            })
            .map((loc, index) => (
              <tr key={loc.id} className="border-t">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{loc.city}</td>
                <td className="p-3 flex items-center justify-start gap-1">
                  {/* Edit */}
                  <Dialog
                    open={editing?.id === loc.id}
                    onOpenChange={(open) => {
                      if (open) setEditing(loc);
                      else setEditing(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent aria-describedby={undefined}>
                      <DialogTitle className="text-lg font-semibold">
                        Edit Location
                      </DialogTitle>
                      <LocationForm
                        defaultValues={{ city: loc.city }}
                        onSubmitAction={async (formData: any) => {
                          const userId = auth.currentUser?.id;
                          if (!userId) {
                            toast.error('User ID not found');
                            return;
                          }
                          await onEdit(loc.id, formData, userId);
                        }}
                        closeDialog={() => setEditing(null)}
                      />
                    </DialogContent>
                  </Dialog>

                  {/* Delete */}
                  <Dialog
                    open={deleting === loc.id}
                    onOpenChange={(open) => setDeleting(open ? loc.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent aria-describedby={undefined}>
                      <DialogTitle className="text-lg font-semibold">
                        Delete Location
                      </DialogTitle>
                      <p>Are you sure you want to delete this location?</p>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="ghost"
                          onClick={() => setDeleting(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            const userId = auth.currentUser?.id;
                            if (!userId) {
                              toast.error('User ID not found');
                              return;
                            }
                            await onDelete(loc.id, userId);
                            setDeleting(null);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
