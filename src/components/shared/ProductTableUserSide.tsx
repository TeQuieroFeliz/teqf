'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductType } from '@/lib/schemas/ProductSchema';
import Image from 'next/image';
import { Item } from '@/lib/schemas/SubEventSchema';
import { Checkbox } from '@/components/ui/checkbox';
import { isUniqueCategoryFunc } from '@/lib/utils';
import { CatHoverCard } from './CatHoverCard';
import { Info } from 'lucide-react';

type ColorSelection = {
  [colorCode: string]: {
    name: string;
    quantity: number;
    checked: boolean;
  };
};

type ProductColorSelection = {
  [productId: string]: ColorSelection;
};

// Define an interface for the Item that includes an optional top-level quantity
interface ItemWithQuantity extends Item {
  quantity?: number;
}

export function ProductTableUserSide({
  products: resolvedProducts,
  items,
  setItems,
  onItemsChange,
}: {
  products: ProductType[];
  items: ItemWithQuantity[];
  setItems: React.Dispatch<React.SetStateAction<ItemWithQuantity[]>>;
  removeFilters?: boolean;
  onItemsChange?: (items: any) => void;
}) {
  const [data, setData] = useState<ProductType[]>(resolvedProducts);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [, forceRender] = useState({});

  const descriptionsRef = useRef<{ [productId: string]: string }>(
    items.reduce(
      (acc, item) => {
        acc[item.id] = item.description || '';
        return acc;
      },
      {} as { [productId: string]: string }
    )
  );

  const selectedColorsRef = useRef<ProductColorSelection>(
    items.reduce((acc, item) => {
      if (item.colors && item.colors.length > 0) {
        acc[item.id] = item.colors.reduce((colorAcc, color) => {
          colorAcc[color.code] = {
            name: color.name,
            quantity: color.quantity || 1,
            checked: true,
          };
          return colorAcc;
        }, {} as ColorSelection);
      }
      return acc;
    }, {} as ProductColorSelection)
  );

  // CHANGED: Added a ref to store quantities for products without colors
  const quantitiesRef = useRef<{ [productId: string]: number }>(
    items.reduce(
      (acc, item) => {
        if (!item.colors || item.colors.length === 0) {
          acc[item.id] = item.quantity || 1;
        }
        return acc;
      },
      {} as { [productId: string]: number }
    )
  );

  useEffect(() => {
    if (resolvedProducts) {
      const filteredData = resolvedProducts.filter(
        (val) => !items.find((v) => v.id === val.id)
      );
      setData(filteredData);
    }
  }, [resolvedProducts, items]);

  const handleDescriptionChange = (productId: string, value: string) => {
    descriptionsRef.current[productId] = value;
  };

  const handleColorToggle = (
    productId: string,
    colorCode: string,
    colorName: string
  ) => {
    const prevProductColors = selectedColorsRef.current[productId] || {};
    const prevColorData = prevProductColors[colorCode];

    selectedColorsRef.current[productId] = {
      ...prevProductColors,
      [colorCode]: {
        name: colorName,
        quantity: prevColorData?.quantity || 1,
        checked: !prevColorData?.checked,
      },
    };
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

  const uniqueCategories = [
    'all',
    ...Array.from(new Set(resolvedProducts.map((p) => p.categoryName))),
  ];

  const columns: ColumnDef<ProductType>[] = [
    {
      accessorKey: 'image',
      header: 'Image',
      cell: ({ row }) => (
        <div className="size-18 relative m-auto">
          <Image
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            src={row.original.image || ''}
            alt={row.original.name || ''}
            className="object-cover absolute rounded-md"
            fill
          />
        </div>
      ),
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
        const isUniqueCategory = isUniqueCategoryFunc(product.categoryId);

        if (isUniqueCategory) {
          return (
            <CatHoverCard
              categoryName={product.categoryName}
              type={product.type}
              note={product.note}
              size={product.size}
            >
              <span className=" cursor-pointer flex items-center justify-start gap-2">
                {product.categoryName}{' '}
                <Info size={13} className="text-amber-500" />
              </span>
            </CatHoverCard>
          );
        }

        // Return regular text for non-unique categories
        return <span>{product.categoryName}</span>;
      },
    },
    {
      accessorKey: 'colors',
      header: 'Colors & Quantity',
      // CHANGED: Updated cell renderer to handle both cases
      cell: ({ row }) => {
        const product = row.original;
        const hasColors = product.colors && product.colors.length > 0;

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
                  defaultValue={quantitiesRef.current[product.id] || 0}
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
            {product.colors.map((color) => {
              const isSelected =
                productSelectedColors[color.code]?.checked || false;
              return (
                <div key={color.code} className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() =>
                      handleColorToggle(product.id, color.code, color.name)
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
                      defaultValue={
                        productSelectedColors[color.code]?.quantity || 1
                      }
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
      id: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <Textarea
            className="min-h-[80px] w-56 text-sm"
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
        const hasColors = product.colors && product.colors.length > 0;
        const alreadyInArrayCheck = !!items.find(
          (val) => val.id === product.id
        );

        const handleItems = (item: ItemWithQuantity) => {
          setItems((prev) => {
            const alreadyInArray = prev.find((val) => val.id === item.id);
            let newItems;
            if (alreadyInArray) {
              newItems = prev.filter((val) => val.id !== item.id);
            } else {
              newItems = [item, ...prev];
            }
            if (onItemsChange) onItemsChange(newItems);
            return newItems;
          });
        };

        const getSelectedColors = () =>
          Object.entries(selectedColorsRef.current[product.id] || {})
            .filter(
              ([_, colorData]) => colorData.checked && colorData.quantity > 0
            )
            .map(([code, colorData]) => ({
              code,
              name: colorData.name,
              quantity: colorData.quantity,
            }));

        const clearError = (productId: string) => {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[productId];
            return newErrors;
          });
        };

        const handleAddClick = () => {
          let newItem: ItemWithQuantity;

          if (hasColors) {
            const selectedColorsForProduct = getSelectedColors();
            if (selectedColorsForProduct.length === 0) {
              setErrors((prev) => ({
                ...prev,
                [product.id]: 'Please select at least one color.',
              }));
              return;
            }
            clearError(product.id);
            newItem = {
              ...product,
              colors: selectedColorsForProduct,
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
            clearError(product.id);
            newItem = {
              ...product,
              quantity: quantity,
              description: descriptionsRef.current[product.id] || '',
              colors: [],
            };
          }
          handleItems(newItem);
        };

        const handleRemoveClick = () => {
          handleItems({ ...product, colors: [] });
          delete selectedColorsRef.current[product.id];
          delete descriptionsRef.current[product.id];
          delete quantitiesRef.current[product.id]; // CHANGED: Clean up quantity ref
        };

        const handleEditClick = () => {
          let updatedItem: ItemWithQuantity;

          if (hasColors) {
            const selectedColorsForProduct = getSelectedColors();
            if (selectedColorsForProduct.length === 0) {
              setErrors((prev) => ({
                ...prev,
                [product.id]: 'Please select at least one color.',
              }));
              return;
            }
            clearError(product.id);
            updatedItem = {
              ...product,
              colors: selectedColorsForProduct,
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
            clearError(product.id);
            updatedItem = {
              ...product,
              quantity: quantity,
              description: descriptionsRef.current[product.id] || '',
              colors: [],
            };
          }
          setItems((prev) => {
            const newArr = prev.filter((val) => val.id !== product.id);
            return [...newArr, updatedItem];
          });
        };

        return (
          <div className="flex items-center justify-start gap-2">
            {!alreadyInArrayCheck ? (
              <Button
                variant={'outline'}
                type="button"
                onClick={handleAddClick}
              >
                Add
              </Button>
            ) : (
              <div className="flex items-center justify-start gap-2">
                <Button
                  className="bg-blue-100 hover:bg-blue-50"
                  onClick={handleEditClick}
                  variant={'secondary'}
                  type="button"
                >
                  Edit
                </Button>
                <Button
                  onClick={handleRemoveClick}
                  variant={'destructive'}
                  type="button"
                >
                  Remove
                </Button>
              </div>
            )}
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
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: `${nameFilter} ${categoryFilter}`,
    },
    initialState: { pagination: { pageSize: 10 } },
    globalFilterFn: (row, columnId, filterValue) => {
      const [name, category] = filterValue.split(' ');
      const productName = row.getValue<string>('name').toLowerCase();
      const productCategory = row.getValue<string>('categoryName');
      const nameMatch = productName.includes(name.toLowerCase());
      const categoryMatch = category === 'all' || productCategory === category;
      return nameMatch && categoryMatch;
    },
    meta: {
      forceRender,
    },
  });

  return (
    <div className="w-full overflow-x-auto">
      {/* Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:py-4 sm:space-x-4">
        <Input
          placeholder="Filter products..."
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
          className="w-full sm:max-w-sm text-sm sm:text-base"
        />
        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value)}
        >
          <SelectTrigger className="w-full sm:w-[180px] text-sm sm:text-base">
            <SelectValue placeholder="Filter category" />
          </SelectTrigger>
          <SelectContent>
            {uniqueCategories.map((category) => (
              <SelectItem
                key={category}
                value={category}
                className="text-sm sm:text-base"
              >
                {category === 'all' ? 'All Categories' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border mt-3 overflow-x-auto w-[300px] sm:w-[350px] md:w-full">
        <Table className="w-full">
          <TableHeader>
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 "
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`px-3 py-4 text-xs sm:text-sm border ${
                        cell.column.id === 'image'
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
                  className="h-24 text-center text-sm sm:text-base"
                >
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
        <div className="text-xs sm:text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} items
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="text-xs sm:text-sm px-3 py-1 h-8"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="text-xs sm:text-sm px-3 py-1 h-8"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
