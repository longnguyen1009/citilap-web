import React from "react";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  clean?: boolean; // remove horizontal padding if inner layout requires full-bleed
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized responsive storefront container.
 * - Horizontal padding: 12px on mobile (px-3), 24px from md+ (md:px-6)
 * - Max Width: 1280px (max-w-7xl)
 */
export function Container({
  as: Component = "div",
  clean = false,
  className = "",
  children,
  ...props
}: ContainerProps) {
  const paddingClass = clean ? "" : "px-3 md:px-6";
  const classes = ["w-full min-w-0 mx-auto max-w-7xl", paddingClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

export default Container;
