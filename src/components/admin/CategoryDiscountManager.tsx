"use client";

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2 } from 'lucide-react';

// Schema za validaciju forme
const formSchema = z.object({
  categoryId: z.string().min(1, 'Kategorija je obavezna'),
  discountPercentage: z.coerce.number().min(0).max(100, 'Popust mora biti između 0 i 100%'),
});

type FormValues = z.infer<typeof formSchema>;

interface Category {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
}

interface CategoryDiscount {
  id: string;
  userId: string;
  categoryId: string;
  discountPercentage: number;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    level: number;
    parentId: string | null;
  };
}

interface CategoryDiscountManagerProps {
  userId: string;
}

export function CategoryDiscountManager({ userId }: CategoryDiscountManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [discounts, setDiscounts] = useState<CategoryDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      categoryId: '',
      discountPercentage: 0,
    },
  });

  // Dohvat kategorija
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories');
        setCategories(response.data);
      } catch (error) {
        console.error('Greška pri dohvatu kategorija:', error);
        toast.error('Greška pri dohvatu kategorija');
      }
    };

    fetchCategories();
  }, []);

  // Dohvat popusta za korisnika
  useEffect(() => {
    const fetchDiscounts = async () => {
      setIsLoading(true);
      try {
        // Koristimo novu API rutu s query parametrom umjesto path parametra
        const response = await axios.get(`/api/category-discounts?userId=${userId}`);
        setDiscounts(response.data);
      } catch (error) {
        console.error('Greška pri dohvatu popusta:', error);
        toast.error('Greška pri dohvatu popusta');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscounts();
  }, [userId]);

  // Dodavanje novog popusta
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      // Provjeri postoji li već popust za ovu kategoriju
      const existingDiscount = discounts.find(d => d.categoryId === values.categoryId);
      if (existingDiscount) {
        toast.error('Popust za ovu kategoriju već postoji');
        setIsSubmitting(false);
        return;
      }

      // Koristimo novu API rutu i dodajemo userId u podatke
      const response = await axios.post('/api/category-discounts', {
        ...values,
        userId: userId
      });
      
      setDiscounts([...discounts, response.data]);
      toast.success('Popust uspješno dodan');
      form.reset();
    } catch (error) {
      console.error('Greška pri dodavanju popusta:', error);
      toast.error('Greška pri dodavanju popusta');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Brisanje popusta
  const handleDelete = async (discountId: string) => {
    setIsDeleting(prev => ({ ...prev, [discountId]: true }));
    try {
      // Koristimo novu API rutu s query parametrom za userId
      await axios.delete(`/api/category-discounts/${discountId}?userId=${userId}`);
      setDiscounts(discounts.filter(d => d.id !== discountId));
      toast.success('Popust uspješno obrisan');
    } catch (error) {
      console.error('Greška pri brisanju popusta:', error);
      toast.error('Greška pri brisanju popusta');
    } finally {
      setIsDeleting(prev => ({ ...prev, [discountId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dodaj novi popust za kategoriju</CardTitle>
          <CardDescription>
            Dodajte specifični popust za određenu kategoriju proizvoda za ovog B2B korisnika.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
              <FormField
                control={form.control as any}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategorija</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Odaberite kategoriju" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="discountPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postotak popusta (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Dodaj popust
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Postojeći popusti po kategorijama</CardTitle>
          <CardDescription>
            Pregled svih specifičnih popusta za ovog B2B korisnika.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : discounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nema definiranih specifičnih popusta za kategorije.
            </p>
          ) : (
            <div className="space-y-4">
              {discounts.map((discount) => (
                <div
                  key={discount.id}
                  className="flex items-center justify-between p-4 border rounded-md"
                >
                  <div>
                    <p className="font-medium">
                      {discount.category ? discount.category.name : 'Nepoznata kategorija'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Popust: {discount.discountPercentage}%
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(discount.id)}
                    disabled={isDeleting[discount.id]}
                  >
                    {isDeleting[discount.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
