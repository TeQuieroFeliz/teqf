'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import React, { useEffect, useState } from 'react';

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

export function ProductTable({
  products: resolvedProducts,
}: {
  products: ProductType[];
}) {
  const [data, setData] = useState<ProductType[]>(resolvedProducts);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filteredData, setFilteredData] =
    useState<ProductType[]>(resolvedProducts);

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
        (product) => product.categoryName === categoryFilter
      );
    }

    setFilteredData(result);
  }, [nameFilter, categoryFilter, resolvedProducts]);

  const uniqueCategories = [
    'all',
    ...Array.from(new Set(resolvedProducts.map((p) => p.categoryName))),
  ];

  const columns: ColumnDef<ProductType>[] = [
    {
      accessorKey: 'image',
      header: 'Image',
      cell: ({ row }) => (
        <div className="size-10 relative">
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
    // getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: `${nameFilter} ${categoryFilter}`,
    },
    initialState: { pagination: { pageSize: 10 } },
    // globalFilterFn: (row, columnId, filterValue) => {
    //   const [name, category] = filterValue.split(' ');
    //   const productName = row.getValue<string>('name').toLowerCase();
    //   const productCategory = row.getValue<string>('categoryName');

    //   const nameMatch = productName.includes(name.toLowerCase());
    //   const categoryMatch = category === 'all' || productCategory === category;

    //   return nameMatch && categoryMatch;
    // },
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
                  className="h-24 text-center text-sm sm:text-base"
                >
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 px-1">
        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {table.getFilteredRowModel().rows.length} items
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
    </div>
  );
}
