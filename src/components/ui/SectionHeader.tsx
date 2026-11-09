import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SectionHeaderLinkItem {
  label: string;
  href: string;
}

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode | LucideIcon;
  action?:
    | {
        label: string;
        href: string;
      }
    | React.ReactNode;
  className?: string;
  // Banner mode for featured storefront sections
  variant?: "standard" | "banner";
  colorClass?: string;
  links?: Array<string | SectionHeaderLinkItem>;
  slug?: string;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  icon,
  action,
  className = "",
  variant = "standard",
  colorClass,
  links,
  slug = "laptop-gaming",
}: SectionHeaderProps) {
  // If colorClass is passed or variant is explicitly "banner", render the storefront banner presentation
  const isBanner = variant === "banner" || Boolean(colorClass);

  if (isBanner) {
    const IconComponent = typeof icon === "function" ? (icon as LucideIcon) : null;
    const resolvedHref = slug.startsWith("/") ? slug : `/${slug}`;

    return (
      <div
        className={`${colorClass || "bg-brand-primary"} px-3.5 sm:px-6 py-2.5 sm:py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center shadow-xs relative overflow-hidden ${className}`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-2 lg:mb-0 relative z-10">
          <h2 className="text-[15px] sm:text-xl md:text-2xl font-black text-white uppercase flex items-center gap-2 sm:gap-3 drop-shadow-xs leading-snug py-0.5 min-w-0">
            {IconComponent ? (
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-control backdrop-blur-xs shrink-0">
                <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7" />
              </div>
            ) : icon && React.isValidElement(icon) ? (
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-control backdrop-blur-xs shrink-0">{icon}</div>
            ) : null}
            <span className="truncate">{title}</span>
          </h2>

          {slug && (
            <Link
              href={resolvedHref}
              className="lg:hidden flex items-center text-white hover:text-yellow-300 font-bold text-xs shrink-0 whitespace-nowrap transition"
            >
              <span>Tất cả</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          )}
        </div>

        {(links || slug) && (
          <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 overflow-x-auto sm:overflow-visible overscroll-x-contain hide-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0 text-sm font-medium relative z-10">
            {links?.map((link, i) => {
              const label = typeof link === "string" ? link : link.label;
              const href = typeof link === "string" ? resolvedHref : link.href;
              return (
                <Link
                  key={i}
                  href={href}
                  className="hover:bg-white hover:text-slate-900 bg-white/15 backdrop-blur-md border border-white/20 text-white px-2.5 sm:px-3.5 py-1 rounded-pill transition duration-200 text-[11px] sm:text-caption md:text-xs tracking-wide shadow-2xs shrink-0 whitespace-nowrap"
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href={resolvedHref}
              className="hidden lg:flex items-center text-white hover:text-yellow-300 font-bold ml-2 text-xs md:text-sm transition group shrink-0"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Standard clean section header
  const IconComponent = typeof icon === "function" ? (icon as LucideIcon) : null;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 mb-4 border-b border-border-default ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {IconComponent ? (
          <span className="text-brand-primary shrink-0">
            <IconComponent className="w-5 h-5" />
          </span>
        ) : icon && typeof icon !== "function" ? (
          <span className="text-brand-primary shrink-0">{icon}</span>
        ) : null}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
              {title}
            </h2>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-caption sm:text-xs text-text-muted mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="shrink-0 pt-1 sm:pt-0">
          {React.isValidElement(action) ? (
            action
          ) : typeof action === "object" && "href" in action && "label" in action ? (
            <Link
              href={action.href}
              className="inline-flex items-center text-caption sm:text-xs font-semibold text-brand-primary hover:text-brand-primary-hover group transition-colors"
            >
              <span>{action.label}</span>
              <ChevronRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default SectionHeader;
