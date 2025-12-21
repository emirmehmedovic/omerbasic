'use client';

import { useState } from 'react';
import OptimizedImage from './OptimizedImage';
import { resolveProductImage } from '@/lib/utils';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  categoryImageUrl?: string | null;
}

export default function ProductImage({ src, alt, className, categoryImageUrl }: ProductImageProps) {
  const [imageError, setImageError] = useState(false);

  // Use resolveProductImage for proper URL handling (fallbacks, API routes)
  const resolvedSrc = resolveProductImage(src, categoryImageUrl);
  const isPlaceholder = resolvedSrc.includes('placehold.co');

  if (imageError || isPlaceholder) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <OptimizedImage
      src={resolvedSrc}
      alt={alt}
      fill
      className={`object-cover ${className || ''}`}
      onError={() => setImageError(true)}
    />
  );
}
