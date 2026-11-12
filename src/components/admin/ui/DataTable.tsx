"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminEmptyState, AdminLoadingState } from "./AdminState";

export type SortDirection = "ascending" | "descending";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  headerText?: string;
  sortable?: boolean;
  sortType?: "text" | "number" | "date";
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "center" | "right";
  sticky?: "left" | "right";
  width?: string;
  className?: string;
  headerClassName?: string;
  isRowHeader?: boolean;
  render: (row: T, index: number) => React.ReactNode;
}

export interface DataTablePaginationProps {
  page: number;
  pageSize?: number;
  totalItems?: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export interface DataTableProps<T> {
  caption: string;
  showCaption?: boolean;
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  // Sorting
  sortKey?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (key: string, direction: SortDirection) => void;
  // Selection & Bulk Actions
  selectable?: boolean;
  selectedKeys?: Iterable<string>;
  onSelectionChange?: (selectedKeys: string[]) => void;
  bulkActions?:
    | React.ReactNode
    | ((selectedKeys: string[], clearSelection: () => void) => React.ReactNode);
  // Pagination
  pagination?: DataTablePaginationProps;
  // Row customization
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  expandedRowRender?: (row: T) => React.ReactNode | null;
  className?: string;
  maxHeight?: string;
}

const viCollator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });

export default function DataTable<T>({
  caption,
  showCaption = false,
  columns,
  data,
  rowKey,
  loading = false,
  loadingMessage = "Đang tải dữ liệu...",
  emptyTitle = "Chưa có dữ liệu",
  emptyDescription = "Hiện tại chưa có bản ghi nào phù hợp với bộ lọc.",
  emptyAction,
  emptyIcon,
  sortKey: controlledSortKey,
  sortDirection: controlledSortDirection,
  onSortChange,
  selectable = false,
  selectedKeys: controlledSelectedKeys,
  onSelectionChange,
  bulkActions,
  pagination,
  rowClassName,
  onRowClick,
  expandedRowRender,
  className = "",
  maxHeight,
}: DataTableProps<T>) {
  const uid = useId();
  const captionId = `datatable-caption-${uid}`;
  const tableId = `datatable-${uid}`;
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortDir, setInternalSortDir] = useState<SortDirection>("ascending");
  const [sortStatusText, setSortStatusText] = useState("");
  const [internalSelected, setInternalSelected] = useState<string[]>([]);

  const activeSortKey = controlledSortKey !== undefined ? controlledSortKey : internalSortKey;
  const activeSortDir = controlledSortDirection !== undefined ? controlledSortDirection : internalSortDir;

  const selectedSet = useMemo(() => {
    if (controlledSelectedKeys !== undefined) {
      return new Set(controlledSelectedKeys);
    }
    return new Set(internalSelected);
  }, [controlledSelectedKeys, internalSelected]);

  const updateSelection = (next: string[]) => {
    if (controlledSelectedKeys === undefined) {
      setInternalSelected(next);
    }
    onSelectionChange?.(next);
  };

  const sortedData = useMemo(() => {
    if (onSortChange || !activeSortKey) return data;
    const col = columns.find((c) => c.key === activeSortKey);
    if (!col || !col.sortable) return data;

    const factor = activeSortDir === "ascending" ? 1 : -1;
    const sortType = col.sortType || "text";

    const extracted = data.map((row, idx) => {
      const raw = col.sortValue ? col.sortValue(row) : (row as Record<string, unknown>)[col.key];
      return { row, idx, raw };
    });

    extracted.sort((a, b) => {
      if (a.raw == null && b.raw == null) return 0;
      if (a.raw == null) return 1;
      if (b.raw == null) return -1;

      if (sortType === "number") {
        return factor * (Number(a.raw) - Number(b.raw));
      }
      if (sortType === "date") {
        const tA = typeof a.raw === "number" ? a.raw : new Date(String(a.raw)).getTime() || 0;
        const tB = typeof b.raw === "number" ? b.raw : new Date(String(b.raw)).getTime() || 0;
        return factor * (tA - tB);
      }
      return factor * viCollator.compare(String(a.raw), String(b.raw));
    });

    return extracted.map((item) => item.row);
  }, [data, onSortChange, activeSortKey, activeSortDir, columns]);

  const currentPageKeys = useMemo(
    () => sortedData.map((row, index) => rowKey(row, index)),
    [sortedData, rowKey]
  );

  const selectedOnPageCount = useMemo(
    () => currentPageKeys.filter((k) => selectedSet.has(k)).length,
    [currentPageKeys, selectedSet]
  );

  const allOnPageSelected =
    currentPageKeys.length > 0 && selectedOnPageCount === currentPageKeys.length;
  const someOnPageSelected =
    selectedOnPageCount > 0 && selectedOnPageCount < currentPageKeys.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someOnPageSelected;
    }
  }, [someOnPageSelected]);

  const handleSortClick = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    const nextDir: SortDirection =
      activeSortKey === col.key && activeSortDir === "ascending" ? "descending" : "ascending";

    if (onSortChange) {
      onSortChange(col.key, nextDir);
    } else {
      setInternalSortKey(col.key);
      setInternalSortDir(nextDir);
    }

    const colName =
      col.headerText || (typeof col.header === "string" ? col.header : col.key);
    const dirLabel = nextDir === "ascending" ? "tăng dần" : "giảm dần";
    setSortStatusText(`Đã sắp xếp theo ${colName}, ${dirLabel}, ${sortedData.length} dòng`);
  };

  const handleToggleAllOnPage = () => {
    if (allOnPageSelected) {
      const pageKeySet = new Set(currentPageKeys);
      updateSelection(Array.from(selectedSet).filter((k) => !pageKeySet.has(k)));
    } else {
      const merged = new Set(selectedSet);
      for (const k of currentPageKeys) merged.add(k);
      updateSelection(Array.from(merged));
    }
  };

  const handleToggleRow = (key: string) => {
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateSelection(Array.from(next));
  };

  const clearSelection = () => updateSelection([]);
  const selectedArray = useMemo(() => Array.from(selectedSet), [selectedSet]);

  const totalColSpan = columns.length + (selectable ? 1 : 0);

  return (
    <div className={`admin-datatable-container ${className}`}>
      {/* Visually hidden live status for sort announcements */}
      <div role="status" className="visually-hidden">
        {sortStatusText}
      </div>

      {/* Bulk action bar when rows are selected */}
      {selectable && selectedArray.length > 0 && (
        <div className="px-4 py-2.5 bg-blue-50/90 border-b border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 font-semibold text-blue-900">
            <span>Đã chọn {selectedArray.length} mục</span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Bỏ chọn
            </button>
          </div>
          {bulkActions && (
            <div className="flex flex-wrap items-center gap-2">
              {typeof bulkActions === "function"
                ? bulkActions(selectedArray, clearSelection)
                : bulkActions}
            </div>
          )}
        </div>
      )}

      {loading && sortedData.length === 0 ? (
        <AdminLoadingState message={loadingMessage} />
      ) : !loading && sortedData.length === 0 ? (
        <AdminEmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          icon={emptyIcon}
          className="border-0 rounded-none"
        />
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-labelledby={captionId}
          className="table-wrapper"
          style={maxHeight ? { maxBlockSize: maxHeight } : undefined}
        >
          <table id={tableId} className="admin-table">
            <caption
              id={captionId}
              className={
                showCaption
                  ? "px-4 py-2.5 text-left text-xs font-semibold text-slate-600 border-b border-slate-200 bg-slate-50/50"
                  : "visually-hidden"
              }
            >
              {caption}
            </caption>
            <thead>
              <tr>
                {selectable && (
                  <th
                    scope="col"
                    className="w-10 text-center"
                    style={
                      columns[0]?.sticky === "left"
                        ? { position: "sticky", insetInlineStart: 0, zIndex: 2 }
                        : undefined
                    }
                  >
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={handleToggleAllOnPage}
                      aria-label={`Chọn tất cả ${currentPageKeys.length} dòng trên trang`}
                      className="size-4 rounded border-slate-300 accent-blue-600 cursor-pointer align-middle"
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const isSorted = activeSortKey === col.key;
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left";
                  const stickyClass =
                    col.sticky === "left"
                      ? "admin-th-sticky-left"
                      : col.sticky === "right"
                      ? "admin-th-sticky-right"
                      : "";

                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={isSorted ? activeSortDir : undefined}
                      data-type={col.sortType || "text"}
                      style={col.width ? { width: col.width } : undefined}
                      className={`${alignClass} ${stickyClass} ${col.headerClassName || ""}`}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          {...({ commandfor: tableId, command: "--sort" } as Record<string, string>)}
                          onClick={() => handleSortClick(col)}
                          className={`admin-sort-btn ${
                            col.align === "right"
                              ? "justify-end"
                              : col.align === "center"
                              ? "justify-center"
                              : "justify-start"
                          }`}
                        >
                          <span>{col.header}</span>
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 16 16"
                            className="admin-sort-icon size-3.5 shrink-0"
                            fill="currentColor"
                          >
                            <path
                              className="sort-up"
                              d="M8 3.5L4.5 7h7L8 3.5z"
                            />
                            <path
                              className="sort-down"
                              d="M8 12.5L11.5 9h-7L8 12.5z"
                            />
                          </svg>
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedData.map((row, rowIndex) => {
                const key = rowKey(row, rowIndex);
                const isSelected = selectedSet.has(key);
                const customRowClass = rowClassName ? rowClassName(row, rowIndex) : "";
                const expandedContent = expandedRowRender ? expandedRowRender(row) : null;

                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={`transition-colors ${
                        isSelected ? "bg-blue-50/60" : ""
                      } ${onRowClick ? "cursor-pointer" : ""} ${customRowClass}`}
                    >
                      {selectable && (
                        <td
                          className="w-10 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRow(key)}
                            aria-label={`Chọn dòng ${rowIndex + 1}`}
                            className="size-4 rounded border-slate-300 accent-blue-600 cursor-pointer align-middle"
                          />
                        </td>
                      )}
                      {columns.map((col) => {
                        const alignClass =
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left";
                        const stickyClass =
                          col.sticky === "left"
                            ? "admin-td-sticky-left"
                            : col.sticky === "right"
                            ? "admin-td-sticky-right"
                            : "";
                        const CellTag = col.isRowHeader ? "th" : "td";

                        return (
                          <CellTag
                            key={col.key}
                            scope={col.isRowHeader ? "row" : undefined}
                            className={`${alignClass} ${stickyClass} ${col.className || ""}`}
                          >
                            {col.render(row, rowIndex)}
                          </CellTag>
                        );
                      })}
                    </tr>
                    {expandedContent && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={totalColSpan} className="!p-0">
                          {expandedContent}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {pagination && (pagination.totalPages > 1 || (pagination.totalItems ?? 0) > 0) && (
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Trang <strong className="text-slate-900">{Math.max(1, pagination.page)}</strong> /{" "}
              <strong className="text-slate-900">{Math.max(1, pagination.totalPages)}</strong>
              {pagination.totalItems !== undefined && (
                <>
                  {" "}
                  · Tổng <strong className="text-slate-900">{pagination.totalItems}</strong> bản ghi
                </>
              )}
            </span>
            {pagination.onPageSizeChange && pagination.pageSize && (
              <label className="inline-flex items-center gap-1.5 text-slate-500">
                <span>Hiển thị:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                  className="px-2 py-1 border border-slate-300 rounded bg-white text-slate-800 text-xs font-medium"
                >
                  {(pagination.pageSizeOptions || [10, 20, 50, 100]).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} / trang
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              <span>Trước</span>
            </button>

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() =>
                pagination.onPageChange(Math.min(Math.max(1, pagination.totalPages), pagination.page + 1))
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <span>Sau</span>
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
