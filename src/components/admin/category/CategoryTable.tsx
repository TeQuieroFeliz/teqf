'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/context/AuthContext';
import { useState } from 'react';
import { toast } from 'sonner';
import CategoryForm from './CategoryForm';

export default function CategoryTable({
  categories,
  onEdit,
  onDelete,
}: {
  categories: { id: string; title: string; createdAt: any }[];
  onEdit: (id: string, data: FormData, userId: string) => Promise<void>;
  onDelete: (id: string, userId: string) => Promise<void>;
}) {
  const auth = useAuthContext();
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(
    null
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="p-3">S.No</th>
            <th className="p-3">Name</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories
            .sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt) : null;
              const dateB = b.createdAt ? new Date(b.createdAt) : null;

              // Handle cases where a date is missing
              if (!dateA && !dateB) return 0; // Both are missing, keep original order
              if (!dateA) return 1; // 'a' is missing, put it at the end
              if (!dateB) return -1; // 'b' is missing, put it at the end

              return dateB.getTime() - dateA.getTime();
            })
            .map((cat, index) => (
              <tr key={cat.id} className="border-t">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{cat.title}</td>
                <td className="p-3 flex items-center justify-start gap-1">
                  {/* Edit */}
                  <Dialog
                    open={editing?.id === cat.id}
                    onOpenChange={(open) => {
                      if (open) setEditing(cat);
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
                        Edit Category
                      </DialogTitle>
                      <CategoryForm
                        defaultValues={{ title: cat.title }}
                        onSubmitAction={async (formData: any) => {
                          const userId = auth.currentUser?.id;
                          if (!userId) {
                            toast.error('User ID not found');
                            return;
                          }
                          await onEdit(cat.id, formData, userId);
                        }}
                        closeDialog={() => setEditing(null)}
                      />
                    </DialogContent>
                  </Dialog>

                  {/* Delete */}
                  <Dialog
                    open={deleting === cat.id}
                    onOpenChange={(open) => setDeleting(open ? cat.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent aria-describedby={undefined}>
                      <DialogTitle className="text-lg font-semibold">
                        Delete Category
                      </DialogTitle>
                      <p>Are you sure you want to delete this category?</p>
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
                              toast.error('UserId not found');
                              return;
                            }
                            await onDelete(cat.id, userId);
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
