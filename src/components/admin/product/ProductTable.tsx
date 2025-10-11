'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import ImageCarouselDialog from '@/components/admin/product/ImageCarouselDialog';
import React, { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import DeleteProductDialog from './DeleteProductDialog';
import EditProductDialog from './EditProductDialog';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';

export function ProductTable({
  products: resolvedProducts,
}: {
  products: ProductType[];
}) {
  const [data, setData] = useState<ProductType[]>(resolvedProducts);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [filteredData, setFilteredData] =
    useState<ProductType[]>(resolvedProducts);
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

  useEffect(() => {
    if (resolvedProducts) {
      setData(resolvedProducts);
    }
  }, [resolvedProducts]);

  useEffect(() => {
    let result = resolvedProducts;

    // Apply name filter
    if (nameFilter) {
      const searchLower = nameFilter.toLowerCase();
      result = result.filter((product) =>
        product.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(
        (product) => product?.categoryName === categoryFilter
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter((product) => product?.type === typeFilter);
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      result = result.filter((product) => product?.location === locationFilter);
    }

    setFilteredData(result);
  }, [
    nameFilter,
    categoryFilter,
    locationFilter,
    resolvedProducts,
    typeFilter,
  ]);

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
              sizes="(max-width: 768px) 48px, 96px"
              className="object-cover rounded-md"
            />

            {hasMultiple && (
              <div
                className="absolute top-1 right-2 transition-opacity cursor-pointer bg-black/70 text-white rounded-full p-2 text-sm flex items-center justify-center"
                onClick={() => openImageModal(images)}
              >
                <Eye size={17} />
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
    },
    {
      accessorKey: 'location',
      header: 'Location',
    },
    {
      accessorKey: 'colors',
      header: 'Colors',
      cell: ({ row }) => {
        const colors = row.original.colors || [];
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {colors.map((color, index) => (
              <div key={index} className="flex items-center gap-1">
                <div
                  className="size-5 rounded-full border"
                  style={{ backgroundColor: color.code }}
                  title={`${color.name} (${color.code})`}
                />
                <span className="sr-only">{color.name}</span>
              </div>
            ))}
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
      accessorKey: 'quantity',
      header: 'QTY',
    },
    {
      accessorKey: 'action',
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center justify-start gap-2">
            <EditProductDialog defaultValues={product} />
            <DeleteProductDialog productId={product.id} />
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter: `${nameFilter} ${categoryFilter} ${typeFilter}`,
    },
    initialState: { pagination: { pageSize: 10 } }, // Set initial page size here
  });

  return (
    <div className="w-full">
      {/* Filters/Search Section */}
      <div className="flex flex-col sm:flex-row items-center gap-3 py-4">
        <Input
          placeholder="Filter by product name..."
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
          className="w-full sm:max-w-sm"
        />
        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {uniqueCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Select
          value={locationFilter}
          onValueChange={(value) => setLocationFilter(value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            {uniqueLocations.map((loc) => (
              <SelectItem key={Math.random()} value={loc}>
                {loc === 'all' ? 'All Locations' : loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table Container */}
      <div className="rounded-md border mt-3 overflow-x-auto w-[300px] sm:w-[350px] md:w-full">
        <Table className="w-full">
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="px-3 py-3 text-xs sm:text-sm font-medium whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-3 py-3 text-xs sm:text-sm whitespace-nowrap"
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

      {/* Pagination Section */}
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
