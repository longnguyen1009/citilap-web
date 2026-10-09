import React from "react";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  clean?: boolean; // remove horizontal padding if inner layout requires full-bleed
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized responsive storefront container.
 * - Mobile (<640px): 16px padding (px-4)
 * - Tablet (640px - 1024px): 24px padding (sm:px-6)
 * - Desktop (>1024px): 32px padding (lg:px-8)
 * - Max Width: 1370px (max-w-shop)
 */
export function Container({
  as: Component = "div",
  clean = false,
  className = "",
  children,
  ...props
}: ContainerProps) {
  return (
    <Component
      className={`w-full mx-auto max-w-shop ${clean ? "" : "px-4 sm:px-6 lg:px-8"} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Container;
