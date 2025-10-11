'use client';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import React, { useEffect, useState, useRef, useMemo } from 'react'; // Added useMemo
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
import { ChevronLeft, ChevronRight, Eye, Info } from 'lucide-react';
import ImageCarouselDialog from '../admin/product/ImageCarouselDialog';

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
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  // START: ADDED TYPE FILTER STATE
  const [typeFilter, setTypeFilter] = useState<string>('all');
  // END: ADDED TYPE FILTER STATE

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [, forceRender] = useState({});
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

  const handleSimpleQuantityChange = (productId: string, value: string) => {
    const newQuantity = Number(value);
    if (newQuantity >= 1) {
      quantitiesRef.current[productId] = newQuantity;
    }
  };

  // START: GENERATE UNIQUE OPTIONS FOR FILTERS (using useMemo for performance)
  const { uniqueCategories, uniqueLocations, uniqueTypes } = useMemo(() => {
    const categories = [
      'all',
      ...Array.from(
        new Set(resolvedProducts.map((p) => p?.categoryName))
      ).filter(Boolean),
    ];
    const locations = [
      'all',
      ...Array.from(new Set(resolvedProducts.map((p) => p?.location))).filter(
        Boolean
      ),
    ];
    const types = [
      'all',
      ...Array.from(new Set(resolvedProducts.map((p) => p?.type))).filter(
        Boolean
      ),
    ];
    return {
      uniqueCategories: categories,
      uniqueLocations: locations,
      uniqueTypes: types,
    };
  }, [resolvedProducts]);
  // END: GENERATE UNIQUE OPTIONS FOR FILTERS
  const columns: ColumnDef<ProductType>[] = [
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
              className="object-cover rounded-md"
            />

            {hasMultiple && (
              <div
                className="absolute top-1 right-2  opacity-100 transition-opacity cursor-pointer bg-black/70 text-white rounded-full p-2 text-sm flex items-center justify-center"
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
                {product?.categoryName}
                <Info size={13} className="text-amber-500" />
              </span>
            </CatHoverCard>
          );
        }
        return <span>{product?.categoryName}</span>;
      },
    },
    {
      accessorKey: 'colors',
      header: 'Colors & Quantity',
      cell: ({ row }) => {
        const product = row.original;
        const hasColors = product.colors && product.colors.length > 0;
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
      accessorKey: 'estPrice',
      header: 'EST Price',
      cell: ({ row }) => {
        const product = row.original;
        return <p>{product?.estPrice && `${product?.estPrice} USD`}</p>;
      },
    },
    {
      accessorKey: 'location',
      header: 'Location',
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
          delete quantitiesRef.current[product.id];
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
      // START: UPDATED GLOBAL FILTER STATE
      globalFilter: JSON.stringify({
        name: nameFilter,
        category: categoryFilter,
        location: locationFilter,
        minPrice: minPrice,
        maxPrice: maxPrice,
        type: typeFilter, // Added type filter to state
      }),
      // END: UPDATED GLOBAL FILTER STATE
    },

    initialState: { pagination: { pageSize: 10 } },
    // START: UPDATED GLOBAL FILTER FUNCTION
    globalFilterFn: (row, columnId, filterValue) => {
      const filters = JSON.parse(filterValue);
      const productName = row.getValue<string>('name').toLowerCase();
      const productCategory = row.getValue<string>('categoryName');
      const productLocation = row.getValue<string>('location');
      const productPrice = parseFloat(row.getValue<string>('estPrice'));
      const productType = (row.original as any)?.type; // Get product type

      // Existing filters
      const nameMatch = productName.includes(filters.name.toLowerCase());
      const categoryMatch =
        filters?.category === 'all' || productCategory === filters?.category;
      const locationMatch =
        filters?.location === 'all' || productLocation === filters?.location;

      // Price filter
      const minPriceFilter = filters.minPrice
        ? parseFloat(filters.minPrice)
        : null;
      const maxPriceFilter = filters.maxPrice
        ? parseFloat(filters.maxPrice)
        : null;
      const minMatch =
        minPriceFilter === null ||
        isNaN(minPriceFilter) ||
        (!isNaN(productPrice) && productPrice >= minPriceFilter);
      const maxMatch =
        maxPriceFilter === null ||
        isNaN(maxPriceFilter) ||
        (!isNaN(productPrice) && productPrice <= maxPriceFilter);
      const priceMatch = minMatch && maxMatch;

      // New type filter
      const typeMatch = filters.type === 'all' || productType === filters.type;

      return (
        nameMatch && categoryMatch && locationMatch && priceMatch && typeMatch
      );
    },
    // END: UPDATED GLOBAL FILTER FUNCTION
    meta: {
      forceRender,
    },
  });
  return (
    <div className="w-full overflow-x-auto">
      {/* Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:py-4">
        {/* Search by name */}
        <Input
          placeholder="Search products..."
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
          className="w-full sm:max-w-xs text-sm"
        />

        {/* Category filter */}
        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value)}
        >
          <SelectTrigger className="w-full sm:w-44 text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {uniqueCategories.map((category) => (
              <SelectItem
                key={category}
                value={category}
                className="capitalize"
              >
                {category === 'all' ? 'All Categories' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type filter (only if more than 1) */}
        {uniqueTypes.length > 1 && (
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value)}
          >
            <SelectTrigger className="w-full sm:w-44 text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {uniqueTypes.map((type: any) => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type === 'all' ? 'All Types' : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Location filter */}
        <Select
          value={locationFilter}
          onValueChange={(value) => setLocationFilter(value)}
        >
          <SelectTrigger className="w-full sm:w-44 text-sm">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            {uniqueLocations.map((loc) => (
              <SelectItem key={loc} value={loc} className="capitalize">
                {loc === 'all' ? 'All Locations' : loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Price range */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            type="number"
            placeholder="Min (USD)"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full !sm:w-28 text-sm"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            placeholder="Max (USD)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full !sm:w-28 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border mt-3 overflow-x-auto w-[300px] sm:w-[350px] md:w-[955px]">
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
                        cell.column.id === 'images'
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
                  className="h-24 text-center text-sm "
                >
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} row(s) found.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 25, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      <ImageCarouselDialog
        open={modalOpen}
        images={modalImages}
        onClose={closeImageModal}
      />
    </div>
  );
}
