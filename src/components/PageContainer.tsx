import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full' | 'adaptive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  '7xl': 'max-w-7xl xl:max-w-7xl 2xl:max-w-[1800px] 3xl:max-w-[2400px]',
  full: 'max-w-full',
  adaptive: 'max-w-full xl:max-w-7xl 2xl:max-w-[2000px] 3xl:max-w-[2400px]',
};

const paddingClasses = {
  none: '',
  sm: 'px-4 py-4 sm:px-6 sm:py-6',
  md: 'px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-12 xl:py-12 2xl:px-16 2xl:py-14 3xl:px-20 3xl:py-16',
  lg: 'px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 xl:px-12 xl:py-20 2xl:px-16 2xl:py-24 3xl:px-20 3xl:py-28',
};

export function PageContainer({
  children,
  className,
  maxWidth = 'adaptive',
  padding = 'md',
  fullHeight = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        fullHeight && 'min-h-screen',
        className
      )}
    >
      {children}
    </div>
  );
}

