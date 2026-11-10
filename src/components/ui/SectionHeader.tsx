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
        className={`${colorClass || "bg-brand-primary"} px-3 md:px-5 lg:px-6 py-2.5 md:py-3.5 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 lg:gap-4 shadow-xs relative overflow-hidden ${className}`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="flex items-center justify-between gap-2 relative z-10 min-w-0">
          <h2 className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black text-white uppercase flex items-center gap-2 md:gap-2.5 drop-shadow-xs leading-snug min-w-0">
            {IconComponent ? (
              <div className="bg-white/20 p-1.5 md:p-2 rounded-control backdrop-blur-xs shrink-0">
                <IconComponent className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
              </div>
            ) : icon && React.isValidElement(icon) ? (
              <div className="bg-white/20 p-1.5 md:p-2 rounded-control backdrop-blur-xs shrink-0">{icon}</div>
            ) : null}
            <span className="truncate">{title}</span>
          </h2>

          {slug && (
            <Link
              href={resolvedHref}
              className="lg:hidden min-h-11 inline-flex items-center px-2 -mr-1 rounded-lg text-white hover:text-yellow-300 font-bold text-[12px] shrink-0 whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
            >
              <span>Tất cả</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          )}
        </div>

        {(links || slug) && (
          <div className="flex flex-nowrap lg:flex-wrap items-center gap-1.5 md:gap-2 overflow-x-auto lg:overflow-visible overscroll-x-contain hide-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0 relative z-10">
            {links?.map((link, i) => {
              const label = typeof link === "string" ? link : link.label;
              const href = typeof link === "string" ? resolvedHref : link.href;
              return (
                <Link
                  key={i}
                  href={href}
                  className="min-h-11 inline-flex items-center hover:bg-white hover:text-slate-900 bg-white/15 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-pill transition duration-200 motion-reduce:transition-none text-[11px] md:text-[12px] font-semibold tracking-wide shadow-2xs shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href={resolvedHref}
              className="hidden lg:inline-flex min-h-11 items-center px-2 rounded-lg text-white hover:text-yellow-300 font-bold ml-1 text-[12px] xl:text-[13px] transition group shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0 transition-transform" />
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
      className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 md:pb-3 mb-3 md:mb-4 border-b border-border-default ${className}`}
    >
      <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
        {IconComponent ? (
          <span className="text-brand-primary shrink-0">
            <IconComponent className="w-5 h-5" />
          </span>
        ) : icon && typeof icon !== "function" ? (
          <span className="text-brand-primary shrink-0">{icon}</span>
        ) : null}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-bold text-text-primary tracking-tight leading-snug">
              {title}
            </h2>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-[12px] md:text-[13px] text-text-muted mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="shrink-0">
          {React.isValidElement(action) ? (
            action
          ) : typeof action === "object" && "href" in action && "label" in action ? (
            <Link
              href={action.href}
              className="min-h-11 inline-flex items-center px-1.5 -mr-1.5 rounded-lg text-[12px] md:text-[13px] font-semibold text-brand-primary hover:text-brand-primary-hover group transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-hidden"
            >
              <span>{action.label}</span>
              <ChevronRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default SectionHeader;
