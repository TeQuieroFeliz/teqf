'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { useEffect, useRef, useState, useTransition } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { productSchema, ProductSchemaType } from '@/lib/schemas/ProductSchema';
import Image from 'next/image';
import { getCategories } from '@/actions/category/category-crud';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getLocation } from '@/actions/location/location-crud';
import { zodResolver } from '@hookform/resolvers/zod';
import ImageCropper from './ImageCroper';
import { Loader2, PenBox, Trash2 } from 'lucide-react';

export default function ProductForm({
  onSubmitAction,
  defaultValues,
}: {
  onSubmitAction: (formData: ProductSchemaType) => Promise<void>;
  defaultValues?: ProductSchemaType;
}) {
  const [categories, setCategories] = useState<{ id: string; title: string }[]>(
    []
  );
  const [locations, setLocations] = useState<{ id: string; city: string }[]>(
    []
  );
  const [_, startTransition] = useTransition();

  const [filesToProcess, setFilesToProcess] = useState<File[]>([]);
  const [imageToCropSrc, setImageToCropSrc] = useState<string | null>(null);
  const [isLoadingEditImage, setIsLoadingEditImage] = useState(false);
  // ✨ NEW: State to store the index of the image being edited (if it's an existing one)
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    startTransition(async () => {
      const [catData, locData] = await Promise.all([
        getCategories(),
        getLocation(),
      ]);
      setCategories(catData);
      setLocations(locData);
    });
  }, []);

  useEffect(() => {
    // This effect now only depends on the queue of files to process.
    if (filesToProcess.length > 0) {
      const file = filesToProcess[0];
      const imageUrl = URL.createObjectURL(file);
      setImageToCropSrc(imageUrl);

      // Return a cleanup function to revoke the object URL.
      // This is important to prevent memory leaks.
      return () => {
        URL.revokeObjectURL(imageUrl);
      };
    } else {
      // If the queue becomes empty, ensure the cropper is closed.
      setImageToCropSrc(null);
    }
  }, [filesToProcess]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isEdit = !!defaultValues?.images?.length;
  const form = useForm<ProductSchemaType>({
    resolver: zodResolver(productSchema(isEdit)),
    defaultValues: {
      ...{
        name: '',
        category: '',
        location: '',
        images: [],
        colors: undefined,
      },
      ...defaultValues,
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'colors',
  });

  const isPending = form.formState.isSubmitting;

  const handleCropComplete = (croppedFile: File) => {
    const currentImages = form.getValues('images') || [];
    const newImgs = [...currentImages];

    if (editingImageIndex !== null) {
      newImgs[editingImageIndex] = croppedFile;
      setEditingImageIndex(null);
    } else {
      newImgs.push(croppedFile);
    }
    form.setValue('images', newImgs, { shouldValidate: true });

    if (filesToProcess.length > 0) {
      setFilesToProcess((prev) => prev.slice(1));
    }
    setImageToCropSrc(null);
  };

  // ✨ THIS IS THE UPDATED FUNCTION ✨
  const handleCropCancel = () => {
    // If we were processing a new file from the queue...
    if (filesToProcess.length > 0) {
      const currentImages = form.getValues('images') || [];
      // Get the original, un-cropped file from the queue.
      const originalFile = filesToProcess[0];

      // Add the original file to the form's images array.
      form.setValue('images', [...currentImages, originalFile], {
        shouldValidate: true,
      });

      // Then, remove the file from the processing queue.
      setFilesToProcess((prev) => prev.slice(1));
    }

    // If we were editing, just clear the editing state.
    setEditingImageIndex(null);

    // In all cases, close the cropper.
    setImageToCropSrc(null);
  };

  // ✨ NEW: Function to handle editing an existing image
  const handleEditExistingImage = async (img: File | string, index: number) => {
    setIsLoadingEditImage(true);
    setEditingImageIndex(index);
    try {
      let imageFile: File;
      if (typeof img === 'string') {
        const proxyUrl = `/api/image-proxy?imageUrl=${encodeURIComponent(img)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch image via proxy');
        }
        const blob = await response.blob();
        imageFile = new File([blob], `edit-${Date.now()}.jpeg`, {
          type: blob.type,
        });
      } else {
        imageFile = img;
      }
      setImageToCropSrc(URL.createObjectURL(imageFile));
    } catch (error) {
      console.error('Error preparing image for editing:', error);
      alert('Could not load image for editing. Please try again.');
      setEditingImageIndex(null);
      setImageToCropSrc(null);
    } finally {
      setIsLoadingEditImage(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitAction)}>
        <fieldset disabled={isPending} className="space-y-4">
          <FormField
            control={form.control}
            name="images"
            render={({ field }) => {
              const images: (File | string)[] = field.value || [];
              return (
                <FormItem>
                  {imageToCropSrc && (
                    <ImageCropper
                      imageSrc={imageToCropSrc}
                      onCropComplete={handleCropComplete}
                      onClose={handleCropCancel}
                    />
                  )}

                  <FormLabel>Images</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        {images?.map((img, idx) => {
                          const src =
                            typeof img === 'string'
                              ? img
                              : URL.createObjectURL(img);
                          return (
                            <div
                              key={idx}
                              className="relative w-24 h-24 rounded overflow-hidden border group"
                            >
                              <Image
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                fill
                                className="w-fit absolute object-cover"
                                src={src}
                                alt={`Product image ${idx + 1}`}
                                onLoad={() => {
                                  if (typeof img !== 'string') {
                                    URL.revokeObjectURL(src);
                                  }
                                }}
                              />
                              {isLoadingEditImage &&
                              editingImageIndex === idx ? (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                  <Loader2 className="animate-spin text-white" />
                                </div>
                              ) : (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="mr-1"
                                    onClick={() =>
                                      handleEditExistingImage(img, idx)
                                    }
                                    disabled={imageToCropSrc !== null}
                                  >
                                    <PenBox />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      const newImgs = [...images];
                                      newImgs.splice(idx, 1);
                                      field.onChange(newImgs);
                                    }}
                                    disabled={imageToCropSrc !== null}
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            const currentImages =
                              form.getValues('images') || [];

                            if (currentImages.length + files.length > 3) {
                              alert('You can only upload up to 3 images.');
                              e.currentTarget.value = '';
                              return;
                            }

                            setFilesToProcess((prev) => [...prev, ...files]);
                            e.currentTarget.value = '';
                          }}
                        />

                        <Button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={
                            (images.length || 0) + filesToProcess.length >= 3 ||
                            imageToCropSrc !== null
                          }
                        >
                          {imageToCropSrc !== null
                            ? 'Cropping in progress...'
                            : 'Add Images'}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Up to 3 images, max 2MB each.
                        </p>
                        {(images.length || 0) > 3 && (
                          <p className="text-sm text-red-500">
                            Maximum 3 images allowed.
                          </p>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          {/* --- The rest of your form fields remain unchanged --- */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Price (USD)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter Estimated Price"
                    type="number"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity (Stock)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter Quantity Availabe (Stock) "
                    type="number"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>description </FormLabel>
                <FormControl>
                  <Input placeholder="Enter description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material Type</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter type" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter size" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.city}>
                        {loc.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Colors */}
          <div className="space-y-4">
            <FormLabel>Colors Available</FormLabel>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`colors.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">Color Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Color name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`colors.${index}.code`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Color Code</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <div
                                className="size-10 rounded-md border cursor-pointer"
                                style={{ backgroundColor: field.value }}
                              />
                              <Input
                                className="w-24"
                                placeholder="#FFFFFF"
                                {...field}
                              />
                            </div>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto">
                          <HexColorPicker
                            color={field.value}
                            onChange={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {fields.length > 0 && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ name: '', code: '#ffffff' })}
            >
              Add Color
            </Button>
          </div>
          <Button
            type="submit" // Changed to type="submit" for consistency with form.handleSubmit
            disabled={isPending}
            // onClick handler is not needed if type="submit" and onSubmit is on the form
          >
            {isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </fieldset>
      </form>
    </Form>
  );
}
