'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductType } from '@/lib/schemas/ProductSchema';
import { Item } from '@/lib/schemas/SubEventSchema';
import Image from 'next/image';
import { toast } from 'sonner';
import { CatHoverCard } from './CatHoverCard';
import { isUniqueCategoryFunc } from '@/lib/utils';
import { Eye, Info } from 'lucide-react';
import ImageCarouselDialog from '../admin/product/ImageCarouselDialog';

// CHANGED: Define an interface for the Item that includes an optional top-level quantity
interface ItemWithQuantity extends Item {
  quantity?: number;
  type?: string;
  size?: string;
  note?: string;
}

type SelectedColorsState = {
  [productId: string]: {
    [colorCode: string]: {
      name: string;
      quantity: number;
      checked: boolean;
    };
  };
};

export function ItemsTableUserSide({
  products: resolvedProducts,
  items,
  setItems,
  onItemsChange,
}: {
  products: ProductType[];
  items: ItemWithQuantity[];
  setItems: React.Dispatch<React.SetStateAction<ItemWithQuantity[]>>;
  onItemsChange: (items: ItemWithQuantity[]) => void;
}) {
  const [data, setData] = useState<ItemWithQuantity[]>(items);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [, forceRender] = useState({});

  const selectedColorsRef = useRef<SelectedColorsState>({});
  const descriptionsRef = useRef<{ [productId: string]: string }>({});
  // CHANGED: Added a ref to store quantities for products without colors
  const quantitiesRef = useRef<{ [productId: string]: number }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const openImageModal = (images: string[]) => {
    setModalImages(images);
    setModalOpen(true);
  };

  const closeImageModal = () => {
    setModalOpen(false);
    setModalImages([]);
  };
  // CHANGED: This effect now syncs all three refs based on the parent `items` prop
  useEffect(() => {
    setData(items);

    const newSelected: SelectedColorsState = {};
    const newDescriptions: { [productId: string]: string } = {};
    const newQuantities: { [productId: string]: number } = {};

    items.forEach((item) => {
      newDescriptions[item.id] = item.description || '';
      // Check if the item has colors
      if (item.colors && item.colors.length > 0) {
        newSelected[item.id] = {};
        item.colors.forEach((color) => {
          newSelected[item.id][color.code] = {
            name: color.name,
            quantity: color.quantity,
            checked: true,
          };
        });
      } else {
        // If no colors, it's a simple quantity item
        newQuantities[item.id] = item.quantity || 1;
      }
    });

    selectedColorsRef.current = newSelected;
    descriptionsRef.current = newDescriptions;
    quantitiesRef.current = newQuantities;
  }, [items]);

  const handleDescriptionChange = (productId: string, value: string) => {
    descriptionsRef.current[productId] = value;
  };

  const handleColorToggle = (
    productId: string,
    colorCode: string,
    colorName: string,
    productColors: any[]
  ) => {
    const currentProductColors = selectedColorsRef.current[productId] || {};
    productColors?.forEach((pc) => {
      if (!currentProductColors[pc.code]) {
        currentProductColors[pc.code] = {
          name: pc.name,
          quantity: 1,
          checked: false,
        };
      }
    });
    const colorData = currentProductColors[colorCode];
    currentProductColors[colorCode] = {
      ...colorData,
      checked: !colorData.checked,
    };
    selectedColorsRef.current[productId] = currentProductColors;
    forceRender({});
  };

  const handleQuantityChange = (
    productId: string,
    colorCode: string,
    value: string
  ) => {
    const newQuantity = Number(value);
    if (newQuantity >= 1 && selectedColorsRef.current[productId]?.[colorCode]) {
      selectedColorsRef.current[productId][colorCode].quantity = newQuantity;
    }
  };

  // CHANGED: Added a handler for quantity changes on items without colors
  const handleSimpleQuantityChange = (productId: string, value: string) => {
    const newQuantity = Number(value);
    if (newQuantity >= 1) {
      quantitiesRef.current[productId] = newQuantity;
    }
  };

  const columns: ColumnDef<ItemWithQuantity>[] = [
    {
      accessorKey: 'image',
      header: 'Image',
      cell: ({ row }) => {
        const images = [].concat(
          (row as any)?.original?.images ?? (row as any)?.original?.image ?? []
        );

        const hasMultiple = images?.length > 1;
        const firstImage = images?.[0] || '/placeholder.png';
        return (
          <div className="relative w-24 h-24 size-10 group">
            <Image
              src={firstImage}
              alt={row.original.name || ''}
              fill
              className="object-cover rounded-md absolute"
            />

            {hasMultiple && (
              <div
                className="absolute top-1 right-2  opacity-100 transition-opacity cursor-pointer bg-black/70 text-white rounded-full p-2 text-sm flex items-center justify-center"
                onClick={() => openImageModal(images)}
              >
                <Eye size={15} />
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Product Name',
    },
    {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: ({ row }) => {
        const product = row.original;
        const isUniqueCategory =
          product.type || product.description || product.size;

        if (isUniqueCategory) {
          return (
            <CatHoverCard
              categoryName={product?.categoryName}
              type={product.type}
              note={product.description}
              size={product.size}
            >
              <span className=" cursor-pointer flex items-center justify-start gap-2">
                {product?.categoryName}{' '}
                <Info size={13} className="text-amber-500" />
              </span>
            </CatHoverCard>
          );
        }

        // Return regular text for non-unique categories
        return <span>{product?.categoryName}</span>;
      },
    },
    {
      accessorKey: 'colors',
      header: 'Colors & Quantities',
      // CHANGED: Updated cell renderer to handle both cases
      cell: ({ row }) => {
        const product = row.original;
        const allAvailableColors =
          resolvedProducts.find((p) => p.id === product.id)?.colors || [];
        const hasColors = allAvailableColors.length > 0;

        // Case 1: Product has NO colors, show only quantity input
        if (!hasColors) {
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm min-w-max">Quantity:</span>
                <Input
                  type="number"
                  min="1"
                  className="w-24 h-8"
                  defaultValue={quantitiesRef.current[product.id] || 1}
                  onBlur={(e) =>
                    handleSimpleQuantityChange(product.id, e.target.value)
                  }
                />
              </div>
              {errors[product.id] && (
                <p className="text-sm text-red-500">{errors[product.id]}</p>
              )}
            </div>
          );
        }

        // Case 2: Product HAS colors, show color selection UI
        const productSelectedColors =
          selectedColorsRef.current[product.id] || {};
        return (
          <div className="space-y-2">
            {allAvailableColors.map((color) => {
              const selection = productSelectedColors[color.code];
              const isSelected = selection?.checked || false;
              return (
                <div key={color.code} className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() =>
                      handleColorToggle(
                        product.id,
                        color.code,
                        color.name,
                        allAvailableColors
                      )
                    }
                  />
                  <div
                    className="size-4 rounded-full border"
                    style={{ backgroundColor: color.code }}
                    title={`${color.name} (${color.code})`}
                  />
                  <span className="text-sm">{color.name}</span>
                  {isSelected && (
                    <Input
                      type="number"
                      min="1"
                      className="w-20 h-8"
                      defaultValue={selection?.quantity || 1}
                      onBlur={(e) =>
                        handleQuantityChange(
                          product.id,
                          color.code,
                          e.target.value
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
            {errors[product.id] && (
              <p className="text-sm text-red-500">{errors[product.id]}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'estPrice',
      header: 'EST Price',
      cell: ({ row }) => {
        const product = row.original;
        return <p>{product?.estPrice && `${product?.estPrice} USD`}</p>;
      },
    },
    {
      id: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <Textarea
            className="min-h-[80px] w-64 text-sm"
            placeholder="Add description..."
            defaultValue={descriptionsRef.current[product.id] || ''}
            onBlur={(e) => handleDescriptionChange(product.id, e.target.value)}
          />
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const product = row.original;

        // CHANGED: Updated handler to manage both item types
        const handleUpdateClick = () => {
          const allAvailableColors =
            resolvedProducts.find((p) => p.id === product.id)?.colors || [];
          const hasColors = allAvailableColors.length > 0;
          let updatedItem: ItemWithQuantity;

          // Clear previous errors for this item
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[product.id];
            return newErrors;
          });

          if (hasColors) {
            const productSelections =
              selectedColorsRef.current[product.id] || {};
            const updatedColors = Object.entries(productSelections)
              .filter(
                ([, colorData]) => colorData.checked && colorData.quantity > 0
              )
              .map(([code, colorData]) => ({
                code,
                name: colorData.name,
                quantity: colorData.quantity,
              }));

            if (updatedColors.length === 0) {
              setErrors((prev) => ({
                ...prev,
                [product.id]: 'Select at least one color with quantity > 0.',
              }));
              return;
            }

            updatedItem = {
              ...product,
              colors: updatedColors,
              description: descriptionsRef.current[product.id] || '',
            };
          } else {
            const quantity = quantitiesRef.current[product.id] || 0;
            if (quantity <= 0) {
              setErrors((prev) => ({
                ...prev,
                [product.id]: 'Quantity must be greater than 0.',
              }));
              return;
            }
            updatedItem = {
              ...product,
              quantity: quantity,
              description: descriptionsRef.current[product.id] || '',
              colors: [], // Ensure colors is an empty array
            };
          }

          const newItems = items.map((item) =>
            item.id === product.id ? updatedItem : item
          );
          setItems(newItems);
          if (onItemsChange) onItemsChange(newItems);
          toast.success(`"${product.name}" has been updated.`);
        };

        const handleRemoveClick = () => {
          const newItems = items.filter((item) => item.id !== product.id);
          setItems(newItems);
          if (onItemsChange) onItemsChange(newItems);
          toast.error(`"${product.name}" has been removed.`);

          // CHANGED: Clean up all refs
          delete selectedColorsRef.current[product.id];
          delete descriptionsRef.current[product.id];
          delete quantitiesRef.current[product.id];
        };

        return (
          <div className="flex flex-col sm:flex-row items-start gap-2">
            <Button
              onClick={handleUpdateClick}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              Update
            </Button>
            <Button
              onClick={handleRemoveClick}
              variant={'destructive'}
              size="sm"
              className="w-full sm:w-auto"
            >
              Remove
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      forceRender,
    },
    initialState: { pagination: { pageSize: 5 } },
  });

  // NEW: Function to calculate the total estimated price
  const calculateTotalEstimate = () => {
    return items.reduce((total, item: any) => {
      // Safely parse estPrice. Assume 0 if not a valid number.
      const pricePerUnit = parseFloat(item.estPrice?.toString() || '0');
      let totalQuantity = 0;

      // Calculate total quantity
      if (item.colors && item.colors.length > 0) {
        // Sum quantities from all colors
        totalQuantity = item.colors.reduce(
          (sum: any, color: any) => sum + (color.quantity || 0),
          0
        );
      } else if (item.quantity !== undefined) {
        // Use the simple top-level quantity
        totalQuantity = item.quantity;
      }

      // Calculate item total and add to grand total
      return total + pricePerUnit * totalQuantity;
    }, 0);
  };

  const totalEstimate = calculateTotalEstimate();

  return (
    <div className="w-full">
      <div className="rounded-md border mt-3 overflow-x-auto w-[290px] md:w-[calc(100vw-335px)]">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-2 py-3 text-xs sm:text-sm whitespace-nowrap border"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-b">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`px-3 py-4 text-xs sm:text-sm border ${
                        cell.column.id === 'images' // Changed from 'image'
                          ? 'align-middle'
                          : 'align-top'
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No items have been added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {/* NEW: Total Estimate Row */}
          {items.length > 0 && (
            // Using TableBody for the total row for consistent styling
            <TableBody>
              <TableRow className="bg-gray-100 dark:bg-gray-700 font-bold border-t-2 border-gray-300">
                <TableCell
                  colSpan={columns.length}
                  className="px-3 py-4 text-sm whitespace-nowrap border border-b-0 text-center"
                >
                  Total Estimated Price:{' '}
                  <span className="text-green-600">
                    ${totalEstimate.toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </div>

      {/* Pagination Controls */}
      {table.getPageCount() > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 px-1">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-3 text-xs sm:text-sm"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-3 text-xs sm:text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
      <ImageCarouselDialog
        open={modalOpen}
        images={modalImages}
        onClose={closeImageModal}
      />
    </div>
  );
}
