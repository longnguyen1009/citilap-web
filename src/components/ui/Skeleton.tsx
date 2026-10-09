import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  circle?: boolean;
}

export function Skeleton({
  className = "",
  circle = false,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`skeleton rounded-control ${
        circle ? "rounded-pill" : ""
      } ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Standard ProductCard skeleton loader matching ProductCard visual hierarchy.
 */
export function ProductCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col h-full bg-white rounded-card border border-border-default overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Image container skeleton */}
      <div className="aspect-[4/3] w-full bg-surface-subtle p-4 flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-control" />
      </div>

      {/* Body skeleton */}
      <div className="p-3 flex flex-col flex-1 space-y-2.5">
        {/* Brand line */}
        <Skeleton className="h-3 w-1/3" />
        {/* Title lines */}
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        {/* Price row */}
        <div className="pt-1 flex items-baseline gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        {/* Specs grid */}
        <div className="pt-2 border-t border-border-default grid grid-cols-2 gap-1.5">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
        {/* Footer */}
        <div className="mt-auto pt-2 border-t border-border-default flex justify-between items-center">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Standard ProductGrid skeleton loader for category listing, homepage, and search.
 */
export function ProductGridSkeleton({
  count = 5,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 ${className}`}
      aria-busy="true"
      aria-label="Đang tải sản phẩm..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
