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
 * Wrapper komponenta za Next.js Image koja automatski koristi unoptimized
 * za lokalne slike iz /uploads/ foldera kako bi se izbjegao problem s
 * optimizacijom u produkciji.
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

  // Detektiraj ako je slika lokalna (iz /uploads/ foldera) ili API route
  const isLocalUpload = src.startsWith('/uploads/') || src.startsWith('/api/uploads/');
  const isTecdocImage = src.startsWith('/images/tecdoc/');
  
  // Konvertuj samo lokalne uploadove u API route-ove za produkciju
  // Ovo osigurava da user-uploaded slike rade u produkciji
  let imageSrc = src;
  if (src.startsWith('/uploads/products/')) {
    imageSrc = src.replace('/uploads/products/', '/api/uploads/products/');
  }
  
  // TecDoc slike ostavi kako jesu - Next.js će ih servirati direktno iz public/
  // Ako ne postoje, prikazaće se fallback placeholder

  // Za lokalne uploadove koristi unoptimized, TecDoc slike neka Next.js optimizuje
  const imageProps: any = {
    src: imageSrc,
    alt,
    className,
    onError: () => {
      setImageError(true);
      onError?.();
    },
    ...(priority !== undefined ? { priority } : {}),
    ...(isLocalUpload ? { unoptimized: true } : {}),
  };

  // Dodaj fill ili width/height ovisno o props
  if (fill) {
    imageProps.fill = true;
  } else if (width && height) {
    imageProps.width = width;
    imageProps.height = height;
  }

  // Dodaj sizes samo ako nije lokalni upload i ako je naveden
  if (sizes && !isLocalUpload) {
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

