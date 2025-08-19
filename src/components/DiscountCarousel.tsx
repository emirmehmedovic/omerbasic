'use client';

import React, { useState, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';

interface FeaturedProduct {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
  displayOrder: number;
  isActive: boolean;
  customTitle?: string;
  customImageUrl?: string;
}

export const DiscountCarousel = () => {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch('/api/featured-products');
        if (response.ok) {
          const data = await response.json();
          // Filtriraj samo aktivne proizvode
          const activeProducts = data.filter((product: FeaturedProduct) => product.isActive);
          setFeaturedProducts(activeProducts);
        }
      } catch (error) {
        console.error('Greška pri dohvaćanju featured proizvoda:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (loading) {
    return (
      <div className="relative w-full h-full flex flex-col justify-center items-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sunfire-500"></div>
      </div>
    );
  }

  if (featuredProducts.length === 0) {
    return (
      <div className="relative w-full h-full flex flex-col justify-center items-center text-white">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">Nema featured proizvoda</h3>
          <p className="text-slate-300">Dodajte proizvode u admin panelu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center text-white">
      <div className="overflow-hidden w-full rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {featuredProducts.map((featuredProduct) => (
            <div className="flex-[0_0_100%] relative min-h-[400px]" key={featuredProduct.id}>
              <Image
                src={featuredProduct.customImageUrl || featuredProduct.product.imageUrl || '/placeholders/part1.jpg'}
                alt={featuredProduct.customTitle || featuredProduct.product.name}
                layout="fill"
                objectFit="cover"
                className="brightness-50"
              />
              <div className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-black/60 to-transparent">
                <h3 className="text-2xl font-bold mb-2">
                  {featuredProduct.customTitle || featuredProduct.product.name}
                </h3>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-bold accent-text">
                    {featuredProduct.product.price.toFixed(2)} KM
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={scrollPrev} className="absolute left-4 top-1/2 -translate-y-1/2 accent-bg p-2 rounded-full shadow-lg z-10">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button onClick={scrollNext} className="absolute right-4 top-1/2 -translate-y-1/2 accent-bg p-2 rounded-full shadow-lg z-10">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};
