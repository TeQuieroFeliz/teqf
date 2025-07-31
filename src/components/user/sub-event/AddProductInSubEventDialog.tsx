import { ProductTableUserSide } from '@/components/shared/ProductTableUserSide';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProductType } from '@/lib/schemas/ProductSchema';
import { Item } from '@/lib/schemas/SubEventSchema';
import { Plus } from 'lucide-react';
import { useState } from 'react';

type Props = {
  products: ProductType[];
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  onItemsChange: (items: any) => void;
};

function AddProductInSubEventDialog({
  products,
  items,
  setItems,
  onItemsChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus size={20} /> Add
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="md:!max-w-5xl">
        <DialogTitle className="text-lg font-semibold">Add Product</DialogTitle>
        <div>
          <ProductTableUserSide
            products={products}
            items={items}
            setItems={setItems}
            onItemsChange={(items) => onItemsChange(items)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" className="mx-auto w-52">
              Continue
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddProductInSubEventDialog;
