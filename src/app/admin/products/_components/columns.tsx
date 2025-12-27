"use client";

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Settings, PencilLine, Check, X, Loader2, RefreshCcw, ImagePlus, Trash, Copy, Pencil, Trash2 } from 'lucide-react';
import OptimizedImage from '@/components/OptimizedImage';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils';
import type { Product, Category, ArticleOENumber } from '@/generated/prisma/client';

export interface ProductWithCategory extends Product {
  category: Category;
  articleOENumbers?: ArticleOENumber[];
}

// Helper component for copyable text cell
const CopyableCell = ({ value, label }: { value: string | null | undefined; label: string }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} kopiran`);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      toast.error('Greška pri kopiranju');
    }
  };

  if (!value) {
    return <span className="text-gray-400 text-sm">—</span>;
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <span className="text-gray-900 text-sm font-mono truncate max-w-[120px]" title={value}>
        {value}
      </span>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCopy}
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-700"
        title={`Kopiraj ${label.toLowerCase()}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
};

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

const onRegenerateSlug = async (id: string, router: ReturnType<typeof useRouter>) => {
  const confirmed = window.confirm('Regenerisati slug za ovaj proizvod? Trenutni URL proizvoda će se promijeniti.');
  if (!confirmed) return;

  try {
    await axios.post('/api/admin/products/regenerate-slugs', { productId: id });
    router.refresh();
    toast.success('Slug regenerisan.');
  } catch (error) {
    console.error('Error regenerating product slug', error);
    toast.error('Došlo je do greške pri regenerisanju sluga.');
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
      const product = row.original;
      const initialImageUrl = (row.getValue('imageUrl') as string) || '';
      const [imageUrl, setImageUrl] = React.useState<string>(initialImageUrl);
      const [saving, setSaving] = React.useState(false);
      const fileInputRef = React.useRef<HTMLInputElement | null>(null);

      const persistImageUrl = async (nextUrl: string) => {
        setSaving(true);
        try {
          await axios.patch(`/api/products/${product.id}`, { imageUrl: nextUrl });
          product.imageUrl = nextUrl || null;
          setImageUrl(nextUrl);
          toast.success(nextUrl ? 'Slika ažurirana.' : 'Slika uklonjena.');
        } catch (error) {
          console.error('Error updating product image', error);
          toast.error('Greška pri ažuriranju slike.');
        } finally {
          setSaving(false);
        }
      };

      const onPickFile = () => {
        if (saving) return;
        fileInputRef.current?.click();
      };

      const onRemove = async () => {
        if (!imageUrl) return;
        const confirmed = window.confirm('Ukloniti sliku za ovaj proizvod?');
        if (!confirmed) return;
        await persistImageUrl('');
      };

      const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setSaving(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await axios.post('/api/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          const url = String(res.data?.url || '');
          if (!url) throw new Error('Upload nije vratio URL');
          await axios.patch(`/api/products/${product.id}`, { imageUrl: url });
          product.imageUrl = url;
          setImageUrl(url);
          toast.success('Slika ažurirana.');
        } catch (error) {
          console.error('Error uploading/updating product image', error);
          toast.error('Greška pri uploadu slike.');
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
          setSaving(false);
        }
      };

      return (
        <div className="group relative h-20 w-20 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
            disabled={saving}
          />

          {imageUrl ? (
            <>
              <OptimizedImage
                key={imageUrl}
                src={imageUrl}
                alt={row.original.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/45 flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={onPickFile}
                  disabled={saving}
                  className="h-9 w-9 bg-white/95 hover:bg-white text-gray-900"
                >
                  {saving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <ImagePlus className="h-4.5 w-4.5" />}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={onRemove}
                  disabled={saving}
                  className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash className="h-4.5 w-4.5" />
                </Button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onPickFile}
              disabled={saving}
              className="flex items-center justify-center h-full w-full bg-transparent border-2 border-transparent transition-colors group-hover:bg-white/60 group-hover:border-dashed group-hover:border-gray-300"
              aria-label="Dodaj sliku"
            >
              {saving ? (
                <Loader2 className="h-7 w-7 animate-spin text-gray-600" />
              ) : (
                <ImagePlus className="h-7 w-7 text-gray-700 invisible group-hover:visible" />
              )}
            </button>
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
    cell: ({ row }) => {
      const product = row.original;
      const [isEditing, setIsEditing] = React.useState(false);
      const [value, setValue] = React.useState(product.name);
      const [saving, setSaving] = React.useState(false);

      const startEditing = () => {
        setValue(product.name);
        setIsEditing(true);
      };

      const cancelEditing = () => {
        setValue(product.name);
        setIsEditing(false);
      };

      const handleSave = async () => {
        const nextValue = value.trim();
        if (nextValue.length < 3) {
          toast.error('Naziv mora imati najmanje 3 znaka.');
          return;
        }
        if (nextValue === product.name) {
          setIsEditing(false);
          return;
        }
        setSaving(true);
        try {
          await axios.patch(`/api/products/${product.id}`, { name: nextValue });
          product.name = nextValue;
          setValue(nextValue);
          setIsEditing(false);
          toast.success('Naziv ažuriran.');
        } catch (error) {
          console.error('Error updating product name', error);
          toast.error('Greška pri ažuriranju naziva.');
        } finally {
          setSaving(false);
        }
      };

      if (isEditing) {
        return (
          <div className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={saving}
              className="h-9 w-48"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSave}
              disabled={saving}
              className="h-8 w-8 text-emerald-600"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={cancelEditing}
              disabled={saving}
              className="h-8 w-8 text-gray-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 line-clamp-2 max-w-sm">{value}</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={startEditing}
            className="h-8 w-8 text-gray-500 hover:text-gray-900"
          >
            <PencilLine className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: 'catalogNumber',
    header: () => (
      <div className="text-gray-700 font-medium">
        Kat. broj
      </div>
    ),
    cell: ({ row }) => {
      const catalogNumber = row.original.catalogNumber;
      return <CopyableCell value={catalogNumber} label="Kataloški broj" />;
    },
  },
  {
    id: 'oemNumber',
    header: () => (
      <div className="text-gray-700 font-medium">
        OEM broj
      </div>
    ),
    cell: ({ row }) => {
      const product = row.original;
      // First try articleOENumbers array, then fall back to oemNumber field
      const firstOem = product.articleOENumbers?.[0]?.oemNumber || product.oemNumber;
      return <CopyableCell value={firstOem} label="OEM broj" />;
    },
  },
  {
    accessorKey: 'sku',
    header: () => (
      <div className="text-gray-700 font-medium">
        SKU
      </div>
    ),
    cell: ({ row }) => {
      const sku = row.original.sku;
      return <CopyableCell value={sku} label="SKU" />;
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
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            Zalihe
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
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
    header: () => (
      <div className="text-gray-700 font-medium">
        Akcije
      </div>
    ),
    cell: ({ row }) => {
      const product = row.original;
      const router = useRouter();

      return (
        <div className="flex items-center gap-1">
          <Link href={`/admin/products/${product.id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
              title="Uredi proizvod"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/admin/products/${product.id}/attributes`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-purple-600 hover:bg-purple-50"
              title="Atributi i reference"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
            title="Regeneriši slug"
            onClick={() => onRegenerateSlug(product.id, router)}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
            title="Obriši proizvod"
            onClick={() => onDelete(product.id, router)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
