'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  onError?: () => void;
  priority?: boolean;
}

/**
 * Wrapper komponenta za Next.js Image koja automatski optimizuje slike
 * korištenjem Next.js Image Optimization API-ja za bolje performanse.
 *
 * Sve slike se sada serviraju direktno iz /public foldera što omogućava:
 * - Automatsku Next.js optimizaciju (WebP/AVIF, resizing)
 * - CDN caching na edge serverima
 * - 10-100x brže učitavanje u odnosu na API route pristup
 */
export default function OptimizedImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  onError,
  priority,
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);

  // Sve lokalne slike se sada serviraju direktno iz /public
  // Next.js automatski optimizuje i kešira slike
  const imageSrc = src;

  const imageProps: any = {
    src: imageSrc,
    alt,
    className,
    onError: () => {
      setImageError(true);
      onError?.();
    },
    ...(priority !== undefined ? { priority } : {}),
  };

  // Dodaj fill ili width/height ovisno o props
  if (fill) {
    imageProps.fill = true;
  } else if (width && height) {
    imageProps.width = width;
    imageProps.height = height;
  }

  // Dodaj sizes za responsive images optimizaciju
  if (sizes) {
    imageProps.sizes = sizes;
  }

  if (imageError) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${className || ''}`}
        style={fill ? { position: 'absolute', inset: 0 } : { width, height }}
      >
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return <Image {...imageProps} />;
}

