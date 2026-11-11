import React from "react";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  clean?: boolean; // remove horizontal padding if inner layout requires full-bleed
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized responsive storefront container.
 * - Horizontal padding: 12px on mobile (px-3), 16px from md+ (md:px-4)
 * - Max Width: 1370px (max-w-[1370px])
 */
export function Container({
  as: Component = "div",
  clean = false,
  className = "",
  children,
  ...props
}: ContainerProps) {
  const paddingClass = clean ? "" : "px-3 md:px-4";
  const classes = ["w-full min-w-0 mx-auto max-w-[1370px]", paddingClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

export default Container;
