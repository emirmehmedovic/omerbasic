"use client";

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatPrice } from '@/lib/utils';
import type { Product, Category } from '@/generated/prisma/client';

export interface ProductWithCategory extends Product {
  category: Category;
}

const onDelete = async (id: string, router: ReturnType<typeof useRouter>) => {
  if (window.confirm('Jeste li sigurni da želite obrisati ovaj proizvod?')) {
    try {
      await axios.delete(`/api/products/${id}`);
      router.refresh();
      toast.success('Proizvod obrisan.');
    } catch (error) {
      toast.error('Došlo je do greške prilikom brisanja.');
    }
  }
};

export const columns: ColumnDef<ProductWithCategory>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <div className="text-gray-700 font-medium">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-gray-900">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'imageUrl',
    header: ({ column }) => {
      return (
        <div className="text-gray-700 font-medium">
          Slika
        </div>
      );
    },
    cell: ({ row }) => {
      const imageUrl = row.getValue('imageUrl') as string;
      return (
        <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={row.original.name}
              fill
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="flex items-center justify-center h-full">
                      <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                  `;
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
        >
          Naziv
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            Cijena
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'));
      return <div className="text-right font-medium text-gray-900">{formatPrice(amount)}</div>;
    },
  },
  {
    accessorKey: 'stock',
    header: ({ column }) => {
      return (
        <div className="text-gray-700 font-medium">
          Zalihe
        </div>
      );
    },
    cell: ({ row }) => {
      const stock = row.getValue('stock') as number;
      const isLowStock = stock <= 10;
      const isOutOfStock = stock === 0;
      
      return (
        <div className="flex items-center">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isOutOfStock 
              ? 'bg-red-100 text-red-700' 
              : isLowStock 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-green-100 text-green-700'
          }`}>
            {isOutOfStock ? 'Nema na stanju' : isLowStock ? 'Nizak' : stock}
          </span>
        </div>
      );
    },
  },
  {
    id: 'category',
    accessorFn: (row) => row.category.name,
    header: ({ column }) => {
      return (
        <div className="text-gray-700 font-medium">
          Kategorija
        </div>
      );
    },
    cell: ({ row }) => {
      const categoryName = row.original.category.name;
      return (
        <div className="flex items-center">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {categoryName}
          </span>
        </div>
      );
    },
    filterFn: 'categoryFilter',
  },
  {
    id: 'actions',
    header: ({ column }) => {
      return (
        <div className="text-gray-700 font-medium">
          Akcije
        </div>
      );
    },
    cell: ({ row }) => {
      const product = row.original;
      const router = useRouter();

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
            <span className="sr-only">Otvori meni</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
            <DropdownMenuLabel className="text-gray-700">Akcije</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/admin/products/${product.id}`} className="text-gray-700">Uredi</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/products/${product.id}/attributes`} className="flex items-center text-gray-700">
                <Settings className="h-4 w-4 mr-2" /> Atributi i reference
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 hover:text-red-700"
              onClick={() => onDelete(product.id, router)}
            >
              Obriši
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
