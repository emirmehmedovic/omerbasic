'use client';

import { useCart } from '@/context/CartContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutFormSchema, type CheckoutFormValues } from '@/lib/validations/order';
import { Session } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('bs-BA', { style: 'currency', currency: 'BAM' }).format(price);
};

interface CheckoutClientProps {
  user: Session['user'] | null;
}

export function CheckoutClient({ user }: CheckoutClientProps) {
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [shippingMethod, setShippingMethod] = useState<'COURIER' | 'PICKUP'>('COURIER');

  const SHIPPING_COSTS = {
    COURIER: 10, // Dostava kurirskom službom
    PICKUP: 0,   // Lično preuzimanje
  };

  const shippingCost = SHIPPING_COSTS[shippingMethod];
  const total = cartTotal + shippingCost;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customerName: user?.name || '',
      customerEmail: user?.email || '',
      shippingAddress: {
        street: (user as any)?.address?.street || '',
        city: (user as any)?.address?.city || '',
        postalCode: (user as any)?.address?.postalCode || '',
        country: (user as any)?.address?.country || 'Bosna i Hercegovina',
      },
      shippingMethod: 'COURIER',
      paymentMethod: 'CASH_ON_DELIVERY',
    },
  });

  const watchedShippingMethod = watch('shippingMethod');

  useEffect(() => {
    if (watchedShippingMethod) {
      setShippingMethod(watchedShippingMethod);
    }
  }, [watchedShippingMethod]);

  // Ako je korpa prazna, preusmjeri na početnu stranicu
  useEffect(() => {
    if (cartCount === 0) {
      router.replace('/');
    }
  }, [cartCount, router]);

  const onSubmit = async (data: CheckoutFormValues) => {
    setIsLoading(true);
    try {
      console.log('Početak kreiranja narudžbe...');
      const response = await axios.post('/api/orders', {
        ...data,
        cartItems,
        subtotal: cartTotal,
        shippingCost: shippingCost, // Koristi dinamičku cijenu
        total: total,
      });

      console.log('Odgovor od API-ja:', response.data);
      
      // Dohvati ID narudžbe iz odgovora
      const { orderId } = response.data;
      console.log('Dohvaćen ID narudžbe:', orderId);
      
      toast.success('Narudžba je uspješno kreirana!');
      clearCart();
      
      // Preusmjeri na stranicu za potvrdu narudžbe
      console.log('Preusmjeravanje na:', `/order-confirmation/${orderId}`);
      
      // Koristimo setTimeout da osiguramo da se preusmjeravanje dogodi nakon što se završe druge operacije
      setTimeout(() => {
        router.push(`/order-confirmation/${orderId}`);
      }, 100);

    } catch (error) {
      console.error('Greška prilikom kreiranja narudžbe:', error);
      toast.error('Došlo je do greške. Molimo pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (cartCount === 0) {
    return null; // Prikazujemo prazno dok se ne izvrši preusmjeravanje
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="glass-card rounded-xl p-8 mb-8">
        <h1 className="text-3xl font-bold text-slate-200 mb-6">Naplata</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-6">
            {/* Podaci o kupcu */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h2 className="text-xl font-bold text-slate-200 mb-4">Podaci o kupcu</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-slate-400 mb-1">Ime i prezime</label>
                  <input 
                    {...register('customerName')} 
                    id="customerName" 
                    className="block w-full rounded-lg bg-slate-900/70 border border-slate-700 px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-sunfire-a30 focus:border-sunfire-a30"
                  />
                  {errors.customerName && <p className="text-sm text-red-400 mt-1">{errors.customerName.message}</p>}
                </div>
                <div>
                  <label htmlFor="customerEmail" className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                  <input 
                    {...register('customerEmail')} 
                    id="customerEmail" 
                    type="email" 
                    className="block w-full rounded-lg bg-slate-900/70 border border-slate-700 px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-sunfire-a30 focus:border-sunfire-a30"
                  />
                  {errors.customerEmail && <p className="text-sm text-red-400 mt-1">{errors.customerEmail.message}</p>}
                </div>
              </div>
            </div>

            {/* Adresa za dostavu */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h2 className="text-xl font-bold text-slate-200 mb-4">Adresa za dostavu</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="street" className="block text-sm font-medium text-slate-400 mb-1">Ulica i broj</label>
                  <input {...register('shippingAddress.street')} id="street" className="block w-full rounded-lg bg-slate-900/70 border border-slate-700 px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-sunfire-a30 focus:border-sunfire-a30" />
                  {errors.shippingAddress?.street && <p className="text-sm text-red-400 mt-1">{errors.shippingAddress.street.message}</p>}
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-slate-400 mb-1">Grad</label>
                  <input {...register('shippingAddress.city')} id="city" className="block w-full rounded-lg bg-slate-900/70 border border-slate-700 px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-sunfire-a30 focus:border-sunfire-a30" />
                  {errors.shippingAddress?.city && <p className="text-sm text-red-400 mt-1">{errors.shippingAddress.city.message}</p>}
                </div>
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-slate-400 mb-1">Poštanski broj</label>
                  <input {...register('shippingAddress.postalCode')} id="postalCode" className="block w-full rounded-lg bg-slate-900/70 border border-slate-700 px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-sunfire-a30 focus:border-sunfire-a30" />
                  {errors.shippingAddress?.postalCode && <p className="text-sm text-red-400 mt-1">{errors.shippingAddress.postalCode.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="country" className="block text-sm font-medium text-slate-400 mb-1">Država</label>
                  <input {...register('shippingAddress.country')} id="country" className="block w-full rounded-lg bg-slate-900/70 border border-slate-700 px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-sunfire-a30 focus:border-sunfire-a30" />
                  {errors.shippingAddress?.country && <p className="text-sm text-red-400 mt-1">{errors.shippingAddress.country.message}</p>}
                </div>
              </div>
            </div>

            {/* Način dostave */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h2 className="text-xl font-bold text-slate-200 mb-4">Način dostave</h2>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 border border-slate-700 rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-900/80 has-[:checked]:bg-sunfire-a10/20 has-[:checked]:border-sunfire-a30 transition-all duration-200">
                  <input {...register('shippingMethod')} type="radio" value="COURIER" className="h-5 w-5 accent-sunfire-a40 focus:ring-sunfire-a30" />
                  <span className="text-sm font-medium text-slate-300">Dostava kurirskom službom ({formatPrice(SHIPPING_COSTS.COURIER)})</span>
                </label>
                <label className="flex items-center space-x-3 p-4 border border-slate-700 rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-900/80 has-[:checked]:bg-sunfire-a10/20 has-[:checked]:border-sunfire-a30 transition-all duration-200">
                  <input {...register('shippingMethod')} type="radio" value="PICKUP" className="h-5 w-5 accent-sunfire-a40 focus:ring-sunfire-a30" />
                  <span className="text-sm font-medium text-slate-300">Lično preuzimanje ({formatPrice(SHIPPING_COSTS.PICKUP)})</span>
                </label>
              </div>
              {errors.shippingMethod && <p className="text-sm text-red-400 mt-2">{errors.shippingMethod.message}</p>}
            </div>

            {/* Način plaćanja */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h2 className="text-xl font-bold text-slate-200 mb-4">Način plaćanja</h2>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 border border-slate-700 rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-900/80 has-[:checked]:bg-sunfire-a10/20 has-[:checked]:border-sunfire-a30 transition-all duration-200">
                  <input {...register('paymentMethod')} type="radio" value="CASH_ON_DELIVERY" className="h-5 w-5 accent-sunfire-a40 focus:ring-sunfire-a30" />
                  <span className="text-sm font-medium text-slate-300">Plaćanje pouzećem</span>
                </label>
                <label className="flex items-center space-x-3 p-4 border border-slate-700 rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-900/80 has-[:checked]:bg-sunfire-a10/20 has-[:checked]:border-sunfire-a30 transition-all duration-200">
                  <input {...register('paymentMethod')} type="radio" value="BANK_TRANSFER" className="h-5 w-5 accent-sunfire-a40 focus:ring-sunfire-a30" />
                  <span className="text-sm font-medium text-slate-300">Bankovna transakcija (Virmanski)</span>
                </label>
              </div>
              {errors.paymentMethod && <p className="text-sm text-red-400 mt-2">{errors.paymentMethod.message}</p>}
            </div>
          </form>

          <div className="lg:col-span-1">
            <div className="glass-card rounded-xl p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-slate-200 mb-4">Sažetak narudžbe</h2>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-slate-300">
                    <span className="font-medium">{item.name} x {item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-slate-700/50 pt-4 space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Dostava</span>
                    <span className="font-medium">{formatPrice(shippingCost)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold mt-2 text-white">
                    <span>Ukupno</span>
                    <span className="text-sunfire-a40">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
              <button 
                type="submit" 
                form="checkout-form" 
                disabled={isLoading} 
                className="mt-6 w-full accent-bg text-white font-bold py-3 text-center rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Slanje...' : 'Potvrdi narudžbu'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
