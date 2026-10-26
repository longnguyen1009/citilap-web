"use client";
import { productHref } from '@/lib/product-paths';

import { useState, useRef, useEffect, useCallback, FormEvent, KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, ArrowRight, Laptop, Tag, Grid3X3 } from "lucide-react";
import PriceTag from "@/components/ui/PriceTag";
import type { SearchSuggestionItem, SearchSuggestionsResult } from "@/server/services/search.service";

export interface SearchAutocompleteProps {
  initialQuery?: string;
  placeholder?: string;
  mobilePlaceholder?: string;
  className?: string;
  inputClassName?: string;
  size?: "sm" | "md" | "lg";
  autoFocus?: boolean;
  onSelectSuggestion?: (item: SearchSuggestionItem) => void;
  onSubmitQuery?: (query: string) => void;
  showIcon?: boolean;
}

export default function SearchAutocomplete({
  initialQuery = "",
  placeholder = "Tìm kiếm theo tên máy, CPU, GPU, thương hiệu...",
  mobilePlaceholder = "Tìm kiếm...",
  className = "",
  inputClassName = "",
  size = "md",
  autoFocus = false,
  onSelectSuggestion,
  onSubmitQuery,
  showIcon = true,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>([]);
  const [brandSuggestions, setBrandSuggestions] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<Array<{ id: string; name: string; slug: string; href?: string }>>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);

  // Synchronize when initialQuery changes from external navigation without effect cascade
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery);
  }

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Total selectable items in listbox: products + brands + categories + "View all"
  const totalSelectableItems =
    suggestions.length +
    brandSuggestions.length +
    categorySuggestions.length +
    (totalMatches > 0 ? 1 : 0);

  // Fetch suggestions with AbortController for race-condition safety
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setBrandSuggestions([]);
      setCategorySuggestions([]);
      setTotalMatches(0);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    // Cancel in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      const res = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(searchQuery.trim())}&limit=6`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      const json: { success: boolean; data: SearchSuggestionsResult } = await res.json();

      if (json.success && json.data) {
        setSuggestions(json.data.products || []);
        setBrandSuggestions(json.data.brands || []);
        setCategorySuggestions(json.data.categories || []);
        setTotalMatches(json.data.totalMatches || 0);
        setIsOpen(true);
        setActiveIndex(-1);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // Request was aborted cleanly, ignore
        return;
      }
      console.warn("[SearchAutocomplete] Fetch suggestions error:", err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with 250ms debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim() || val.trim().length < 2) {
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 250);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Escape and outside focus
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Handle Form Submit
  const executeSearch = (targetQuery: string) => {
    setIsOpen(false);
    setActiveIndex(-1);
    const finalQ = targetQuery.trim();
    if (onSubmitQuery) {
      onSubmitQuery(finalQ);
    } else {
      router.push(`/search?q=${encodeURIComponent(finalQ)}`);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeSearch(query);
    }
  };

  // Keyboard navigation through suggestion options
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" && query.trim().length >= 2) {
        e.preventDefault();
        fetchSuggestions(query);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= totalSelectableItems ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? totalSelectableItems - 1 : prev - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        // Determine which item is selected
        let curr = 0;
        // 1. Products
        if (activeIndex < suggestions.length) {
          const product = suggestions[activeIndex];
          if (onSelectSuggestion) onSelectSuggestion(product);
          const href = `${productHref(product)}${product.sku ? `?sku=${product.sku}` : ""}`;
          setIsOpen(false);
          router.push(href);
          return;
        }
        curr += suggestions.length;

        // 2. Brands
        if (activeIndex < curr + brandSuggestions.length) {
          const brand = brandSuggestions[activeIndex - curr];
          setIsOpen(false);
          router.push(`/search?q=${encodeURIComponent(query.trim())}&brand=${brand.slug}`);
          return;
        }
        curr += brandSuggestions.length;

        // 3. Categories
        if (activeIndex < curr + categorySuggestions.length) {
          const category = categorySuggestions[activeIndex - curr];
          setIsOpen(false);
          router.push(category.href || `/${category.slug}`);
          return;
        }
        curr += categorySuggestions.length;

        // 4. View all
        if (activeIndex === curr) {
          executeSearch(query);
          return;
        }
      }
      // If no activeIndex, standard form submit occurs naturally
    }
  };

  const clearInput = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  // Height and font styling by size with mobile optimization
  const sizeStyles = {
    sm: "h-8 sm:h-9 text-[11px] sm:text-xs pl-6 sm:pl-9 pr-5 sm:pr-8",
    md: "h-8.5 sm:h-10 text-[11.5px] sm:text-sm pl-6.5 sm:pl-10 pr-6 sm:pr-9",
    lg: "h-10 sm:h-12 text-xs sm:text-base pl-8 sm:pl-12 pr-7 sm:pr-10",
  }[size];

  const iconSizes = {
    sm: "w-3.5 h-3.5 left-2 sm:left-2.5",
    md: "w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 left-2 sm:left-3",
    lg: "w-4 h-4 sm:w-5 sm:h-5 left-2.5 sm:left-3.5",
  }[size];

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <form onSubmit={handleFormSubmit} className="relative w-full" role="search">
        {showIcon && (
          <Search
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors ${iconSizes}`}
            aria-hidden="true"
          />
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length >= 2 && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={isMobile ? mobilePlaceholder : placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck="false"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="search-suggestions-dropdown"
          aria-activedescendant={activeIndex >= 0 ? `suggestion-item-${activeIndex}` : undefined}
          aria-label="Tìm kiếm sản phẩm"
          className={`w-full bg-white rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-xs ${sizeStyles} ${inputClassName}`}
        />

        {/* Right Action Icons: Spinner / Clear */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" aria-hidden="true" />
          )}

          {query.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={clearInput}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="submit"
            className="hidden sm:flex items-center justify-center p-1.5 rounded-md text-gray-500 hover:text-blue-600 transition cursor-pointer"
            aria-label="Bắt đầu tìm kiếm"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div
          id="search-suggestions-dropdown"
          role="listbox"
          aria-label="Gợi ý tìm kiếm"
          className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-200/90 z-50 overflow-hidden max-h-[75vh] flex flex-col animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Scrollable list content */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
            {/* 1. Product Suggestions */}
            {suggestions.length > 0 ? (
              <div className="p-2">
                <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-blue-500" />
                  <span>Sản phẩm gợi ý</span>
                </div>

                <div className="space-y-1 mt-1">
                  {suggestions.map((p, idx) => {
                    const isSelected = activeIndex === idx;
                    const href = `${productHref(p)}${p.sku ? `?sku=${p.sku}` : ""}`;

                    return (
                      <Link
                        key={p.id}
                        id={`suggestion-item-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        href={href}
                        onClick={() => {
                          setIsOpen(false);
                          if (onSelectSuggestion) onSelectSuggestion(p);
                        }}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors group cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/90 text-blue-700"
                            : "hover:bg-gray-50 text-gray-900"
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-12 h-12 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200/60">
                          <Image
                            src={p.image || "/images/placeholder-laptop.svg"}
                            alt={p.name}
                            fill
                            sizes="48px"
                            className="object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                            unoptimized
                          />
                        </div>

                        {/* Title, Specs & Price */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-semibold truncate group-hover:text-blue-600 transition-colors">
                            {p.name}
                          </div>
                          {p.specsSummary && (
                            <div className="text-[11px] text-gray-500 truncate mt-0.5">
                              {p.specsSummary}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <PriceTag price={p.price} originalPrice={p.originalPrice} size="sm" />
                          </div>
                        </div>

                        {/* Right arrow */}
                        <ArrowRight
                          className={`w-4 h-4 flex-shrink-0 transition-transform ${
                            isSelected
                              ? "text-blue-600 translate-x-0.5"
                              : "text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5"
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : !isLoading ? (
              <div className="p-6 text-center">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">
                  Không tìm thấy sản phẩm nào khớp với &quot;<span className="font-semibold text-gray-700">{query}</span>&quot;
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Nhấn <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px]">Enter</kbd> để tìm kiếm trên toàn bộ cửa hàng.
                </p>
              </div>
            ) : null}

            {/* 2. Brand & Category Quick Filter Suggestions */}
            {(brandSuggestions.length > 0 || categorySuggestions.length > 0) && (
              <div className="p-3 bg-gray-50/50">
                <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-500" />
                  <span>Danh mục & Thương hiệu liên quan</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2 px-2">
                  {brandSuggestions.map((b, bIdx) => {
                    const itemIndex = suggestions.length + bIdx;
                    const isSelected = activeIndex === itemIndex;
                    return (
                      <Link
                        key={b.id}
                        id={`suggestion-item-${itemIndex}`}
                        role="option"
                        aria-selected={isSelected}
                        href={`/search?q=${encodeURIComponent(query.trim())}&brand=${b.slug}`}
                        onClick={() => setIsOpen(false)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200"
                        }`}
                      >
                        <Tag className="w-3 h-3 opacity-70" />
                        <span>Thương hiệu {b.name}</span>
                      </Link>
                    );
                  })}

                  {categorySuggestions.map((c, cIdx) => {
                    const itemIndex = suggestions.length + brandSuggestions.length + cIdx;
                    const isSelected = activeIndex === itemIndex;
                    return (
                      <Link
                        key={c.id}
                        id={`suggestion-item-${itemIndex}`}
                        role="option"
                        aria-selected={isSelected}
                        href={c.href || `/${c.slug}`}
                        onClick={() => setIsOpen(false)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200"
                        }`}
                      >
                        <Grid3X3 className="w-3 h-3 opacity-70" />
                        <span>{c.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Footer: "Xem tất cả X kết quả" */}
          {totalMatches > 0 && (
            <div className="p-2 bg-gray-50 border-t border-gray-100 flex-shrink-0">
              <button
                type="button"
                id={`suggestion-item-${totalSelectableItems - 1}`}
                role="option"
                aria-selected={activeIndex === totalSelectableItems - 1}
                onClick={() => executeSearch(query)}
                className={`w-full py-2.5 px-3 flex items-center justify-between rounded-lg font-bold text-xs transition cursor-pointer ${
                  activeIndex === totalSelectableItems - 1
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600"
                }`}
              >
                <span>
                  Xem tất cả <span className="font-extrabold">{totalMatches}</span> kết quả cho &quot;{query}&quot;
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
