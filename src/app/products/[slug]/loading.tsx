'use client';

import { PageContainer } from '@/components/PageContainer';

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-app relative">
      <PageContainer maxWidth="adaptive" padding="md" className="relative z-10">
        {/* Breadcrumb skeleton */}
        <nav className="mb-4 flex gap-2">
          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
          <span className="text-slate-300">/</span>
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          <span className="text-slate-300">/</span>
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        </nav>

        {/* Header skeleton */}
        <div className="mb-6">
          <div className="relative overflow-hidden rounded-3xl p-4 lg:p-6 bg-gradient-to-r from-primary/80 via-primary-dark/80 to-primary/80 border border-primary/20 shadow-2xl">
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3">
                  <div className="w-7 h-7 bg-white/30 rounded animate-pulse" />
                </div>
                <div>
                  <div className="h-5 w-32 bg-white/30 rounded mb-2 animate-pulse" />
                  <div className="h-3 w-48 bg-white/20 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-64 bg-white/30 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Product content skeleton */}
        <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image skeleton */}
            <div className="relative h-96 lg:h-[500px] w-full overflow-hidden rounded-2xl bg-white/80 border border-white/60 shadow-2xl animate-pulse">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Details skeleton */}
            <div className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <div className="h-8 w-3/4 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-6 w-1/2 bg-slate-200 rounded-lg animate-pulse" />
              </div>

              {/* Price */}
              <div className="p-4 rounded-2xl bg-white/80 border border-white/60">
                <div className="h-10 w-32 bg-gradient-to-r from-orange-200 to-orange-300 rounded-lg animate-pulse" />
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <div className="h-8 w-24 bg-slate-200 rounded-full animate-pulse" />
                <div className="h-8 w-32 bg-slate-200 rounded-full animate-pulse" />
                <div className="h-8 w-28 bg-slate-200 rounded-full animate-pulse" />
              </div>

              {/* Description */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/80 border border-white/60">
                <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-4/6 bg-slate-200 rounded animate-pulse" />
              </div>

              {/* Add to cart button */}
              <div className="h-14 w-full bg-gradient-to-r from-primary/50 to-primary-dark/50 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

