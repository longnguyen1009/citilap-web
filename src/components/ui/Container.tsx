import React from "react";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  clean?: boolean; // remove horizontal padding if inner layout requires full-bleed
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized responsive storefront container.
 * - Horizontal padding: 16px (px-4) across all breakpoints to align flush with Header & Footer
 * - Max Width: 1370px (max-w-[1370px])
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
      className={`container w-full mx-auto max-w-[1370px] ${clean ? "" : "px-4"} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Container;
