'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { isUniqueCategoryFunc } from '@/lib/utils';

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
  const [_, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getCategories();
      setCategories(data);
    });
  }, []);

  const imageRef = useRef<HTMLInputElement | null>(null);

  const isEdit = !!defaultValues?.image;
  const form = useForm<ProductSchemaType>({
    resolver: zodResolver(productSchema(isEdit)),
    defaultValues: {
      ...{
        name: '',
        category: '',
        image: undefined,
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
  const categoryValue = form.watch('category');

  const isUniqueCategory = isUniqueCategoryFunc(categoryValue);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitAction)}>
        <fieldset disabled={isPending} className="space-y-4">
          {/* Image */}
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image</FormLabel>
                <FormControl>
                  <div>
                    <div
                      onClick={() => imageRef.current?.click()}
                      className="w-52 h-52 relative rounded-md bg-slate-100 overflow-hidden flex items-center justify-center"
                    >
                      {typeof field.value === 'object' ? (
                        <Image
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          fill
                          className="w-fit absolute object-cover"
                          src={URL.createObjectURL(field.value) || ''}
                          alt=""
                        />
                      ) : (
                        <div
                          className={`${
                            field.value ? 'size-52' : 'size-20'
                          } relative`}
                        >
                          <Image
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            fill
                            className="w-fit absolute object-cover"
                            src={field.value || '/add-image.png'}
                            alt=""
                          />
                        </div>
                      )}
                    </div>
                    <Input
                      ref={imageRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => field.onChange(e.target.files?.[0])}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Name */}
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

          {isUniqueCategory && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{categoryValue} Type</FormLabel>
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
                    <FormLabel>{categoryValue} Size</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter size" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{categoryValue} Note</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter note" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Colors */}
          <div className="space-y-4">
            <FormLabel>Colors Pallete</FormLabel>
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

          <Button type="submit" disabled={isPending}>
            {isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </fieldset>
      </form>
    </Form>
  );
}
