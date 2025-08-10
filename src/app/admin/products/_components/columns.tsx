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
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'imageUrl',
    header: 'Slika',
    cell: ({ row }) => {
      const imageUrl = row.getValue('imageUrl') as string;
      return (
        <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-100">
          <Image
            src={imageUrl || '/placeholder.png'}
            alt={row.original.name}
            fill
            className="object-cover"
          />
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
          >
            Cijena
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'));
      return <div className="text-right font-medium">{formatPrice(amount)}</div>;
    },
  },
  {
    accessorKey: 'stock',
    header: 'Zalihe',
  },
  {
    id: 'category',
    accessorFn: (row) => row.category.name,
    header: 'Kategorija',
    filterFn: 'categoryFilter',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const product = row.original;
      const router = useRouter();

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Otvori meni</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Akcije</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/admin/products/${product.id}`}>Uredi</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/products/${product.id}/attributes`} className="flex items-center">
                <Settings className="h-4 w-4 mr-2" /> Atributi i reference
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
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
