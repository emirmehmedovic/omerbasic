'use client';

import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';

// Placeholder data - replace with API data later
const discountedProducts = [
  {
    id: 1,
    name: 'Premium kočioni diskovi',
    originalPrice: '150.00 KM',
    discountedPrice: '119.99 KM',
    imageUrl: '/placeholders/part1.jpg',
  },
  {
    id: 2,
    name: 'Set kvačila visoke performanse',
    originalPrice: '450.00 KM',
    discountedPrice: '379.99 KM',
    imageUrl: '/placeholders/part2.jpg',
  },
  {
    id: 3,
    name: 'LED prednja svjetla',
    originalPrice: '320.00 KM',
    discountedPrice: '249.99 KM',
    imageUrl: '/placeholders/part3.jpg',
  },
];

export const DiscountCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center text-white">
      <div className="overflow-hidden w-full rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {discountedProducts.map((product) => (
            <div className="flex-[0_0_100%] relative min-h-[400px]" key={product.id}>
              <Image
                src={product.imageUrl}
                alt={product.name}
                layout="fill"
                objectFit="cover"
                className="brightness-50"
              />
              <div className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-black/60 to-transparent">
                <h3 className="text-2xl font-bold mb-2">{product.name}</h3>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-bold accent-text">{product.discountedPrice}</p>
                  <p className="text-xl line-through text-slate-400">{product.originalPrice}</p>
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
