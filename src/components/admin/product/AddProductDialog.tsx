"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import ProductForm from "./ProductForm";
import { ProductSchemaType } from "@/lib/schemas/ProductSchema";
import { imageUpload } from "@/lib/imageUpload";
import { useAuthContext } from "@/context/AuthContext";
import { toast } from "sonner";
import { addProduct } from "@/actions/product/addProduct";
import { multipleImageUpload } from "@/lib/imageUpload";

function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const { currentUser } = useAuthContext();

  const handleSubmit = async (formData: ProductSchemaType) => {
    try {
      if (!currentUser) {
        toast.error("User not found");
        return;
      }

      let imageUrls: string[] = [];
      try {
        imageUrls = await multipleImageUpload(
          formData.images as File[],
          currentUser
        );
      } catch (error) {
        toast.error("Images not uploaded");
        return;
      }

      const res = await addProduct({ ...formData, images: imageUrls });
      if (res?.error) {
        toast.error(res.message);
        return;
      }

      toast.success("Product added successfully ✅");
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    } finally {
      setOpen(false);
    }
  };

  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Products</h1>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add Product</Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle className="text-lg font-bold">Add Product</DialogTitle>
          <ProductForm onSubmitAction={handleSubmit} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AddProductDialog;
