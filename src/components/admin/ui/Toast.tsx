"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastInput {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItem extends Required<Pick<ToastInput, "message" | "variant">> {
  id: string;
  title?: string;
  durationMs: number;
  action?: ToastInput["action"];
  createdAt: number;
}

export interface ToastApi {
  show: (input: ToastInput | string) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let globalToastApi: ToastApi | null = null;

export const adminToast: ToastApi = {
  show: (input) => globalToastApi?.show(input) ?? "",
  success: (message, title) => globalToastApi?.success(message, title) ?? "",
  error: (message, title) => globalToastApi?.error(message, title) ?? "",
  warning: (message, title) => globalToastApi?.warning(message, title) ?? "",
  info: (message, title) => globalToastApi?.info(message, title) ?? "",
  dismiss: (id) => globalToastApi?.dismiss(id),
};

interface SingleToastProps {
  item: ToastItem;
  index: number;
  onDismiss: (id: string, fromKeyboardFocus: boolean) => void;
  registerCloseBtn: (id: string, el: HTMLButtonElement | null) => void;
}

function SingleToast({ item, index, onDismiss, registerCloseBtn }: SingleToastProps) {
  const toastRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = toastRef.current;
    if (!el) return;
    el.setAttribute("popover", "manual");
    try {
      if (typeof el.showPopover === "function" && !el.matches(":popover-open")) {
        el.showPopover();
      }
    } catch {
      // Fallback to standard fixed container positioning if popover promotion fails
    }
    return () => {
      try {
        if (typeof el.hidePopover === "function" && el.matches(":popover-open")) {
          el.hidePopover();
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  useEffect(() => {
    if (paused || item.durationMs <= 0) return;
    const timer = window.setTimeout(() => {
      const el = toastRef.current;
      if (el && el.contains(document.activeElement)) {
        setPaused(true);
        return;
      }
      onDismiss(item.id, false);
    }, item.durationMs);
    return () => window.clearTimeout(timer);
  }, [item.id, item.durationMs, paused, onDismiss]);

  const variantConfig: Record<
    ToastVariant,
    { icon: React.ReactNode; border: string; bg: string; titleColor: string }
  > = {
    success: {
      icon: <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />,
      border: "border-emerald-200",
      bg: "bg-white",
      titleColor: "text-emerald-900",
    },
    error: {
      icon: <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />,
      border: "border-red-200",
      bg: "bg-white",
      titleColor: "text-red-900",
    },
    warning: {
      icon: <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />,
      border: "border-amber-200",
      bg: "bg-white",
      titleColor: "text-amber-900",
    },
    info: {
      icon: <Info className="size-4 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />,
      border: "border-blue-200",
      bg: "bg-white",
      titleColor: "text-slate-900",
    },
  };

  const cfg = variantConfig[item.variant];

  return (
    <div
      ref={toastRef}
      id={`admin-toast-${item.id}`}
      style={{ "--toast-index": index } as React.CSSProperties}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => {
        if (!toastRef.current?.contains(document.activeElement)) {
          setPaused(false);
        }
      }}
      className={`admin-toast-item pointer-events-auto flex items-start gap-3 w-[min(380px,calc(100vw-24px))] p-3.5 rounded-lg border ${cfg.border} ${cfg.bg} shadow-lg text-slate-800`}
    >
      {cfg.icon}
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        {item.title && (
          <div className={`font-bold text-[13px] mb-0.5 ${cfg.titleColor}`}>{item.title}</div>
        )}
        <div className="text-slate-700 break-words">{item.message}</div>
        {item.action && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                item.action?.onClick();
                onDismiss(item.id, false);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              {item.action.label}
            </button>
          </div>
        )}
      </div>
      <button
        ref={(el) => registerCloseBtn(item.id, el)}
        type="button"
        popoverTarget={`admin-toast-${item.id}`}
        popoverTargetAction="hide"
        onClick={() => {
          const hadFocus = Boolean(toastRef.current?.contains(document.activeElement));
          onDismiss(item.id, hadFocus);
        }}
        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
        aria-label="Đóng thông báo"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const queueRef = useRef<ToastItem[]>([]);
  const closeBtnsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const priorFocusRef = useRef<HTMLElement | null>(null);

  const announceToast = useCallback((item: ToastItem) => {
    const visibleText = [item.title, item.message].filter(Boolean).join(". ");
    const fullAnnouncement = item.action
      ? `${visibleText}. Có thao tác đi kèm.`
      : visibleText;

    const docWithAriaNotify = document as Document & {
      ariaNotify?: (announcement: string, options?: { priority?: string }) => void;
    };
    if (typeof docWithAriaNotify.ariaNotify === "function") {
      docWithAriaNotify.ariaNotify(fullAnnouncement);
    } else {
      setLiveAnnouncement(fullAnnouncement);
    }
  }, []);

  const flushQueueIfNoModal = useCallback(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector("dialog:modal")) return;
    if (queueRef.current.length === 0) return;

    const pending = [...queueRef.current];
    queueRef.current = [];
    setToasts((prev) => [...prev, ...pending].slice(-5));
    const latest = pending[pending.length - 1];
    if (latest) announceToast(latest);
  }, [announceToast]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleDialogClose = () => {
      window.setTimeout(flushQueueIfNoModal, 60);
    };
    document.addEventListener("close", handleDialogClose, true);
    return () => document.removeEventListener("close", handleDialogClose, true);
  }, [flushQueueIfNoModal]);

  const registerCloseBtn = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) closeBtnsRef.current.set(id, el);
    else closeBtnsRef.current.delete(id);
  }, []);

  const dismiss = useCallback((id: string, fromKeyboardFocus = false) => {
    setToasts((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const next = prev.filter((t) => t.id !== id);

      if (fromKeyboardFocus) {
        const nextToast = next[idx] || next[idx - 1];
        window.requestAnimationFrame(() => {
          if (nextToast) {
            closeBtnsRef.current.get(nextToast.id)?.focus();
          } else if (priorFocusRef.current && document.contains(priorFocusRef.current)) {
            priorFocusRef.current.focus();
          }
        });
      }
      return next;
    });
  }, []);

  const show = useCallback(
    (input: ToastInput | string): string => {
      const normalized: ToastInput =
        typeof input === "string" ? { message: input, variant: "info" } : input;
      const variant = normalized.variant ?? "info";
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = {
        id,
        title: normalized.title,
        message: normalized.message,
        variant,
        durationMs: normalized.durationMs ?? (variant === "error" ? 7000 : 4500),
        action: normalized.action,
        createdAt: Date.now(),
      };

      if (typeof document !== "undefined") {
        if (document.activeElement instanceof HTMLElement) {
          priorFocusRef.current = document.activeElement;
        }
        // Suppress toast notifications while a modal dialog is open
        if (document.querySelector("dialog:modal")) {
          queueRef.current.push(item);
          return id;
        }
      }

      setToasts((prev) => [...prev, item].slice(-5));
      announceToast(item);
      return id;
    },
    [announceToast]
  );

  const api = React.useMemo<ToastApi>(
    () => ({
      show,
      success: (message, title) => show({ message, title, variant: "success" }),
      error: (message, title) => show({ message, title, variant: "error", durationMs: 7000 }),
      warning: (message, title) => show({ message, title, variant: "warning", durationMs: 5500 }),
      info: (message, title) => show({ message, title, variant: "info" }),
      dismiss: (id) => dismiss(id, false),
    }),
    [show, dismiss]
  );

  useEffect(() => {
    globalToastApi = api;
    return () => {
      if (globalToastApi === api) globalToastApi = null;
    };
  }, [api]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {liveAnnouncement && (
        <p className="visually-hidden">Thông báo hệ thống trên màn hình</p>
      )}
      <div
        id="admin-toast-live-region"
        aria-live="assertive"
        aria-atomic="true"
        className="visually-hidden"
      >
        {liveAnnouncement}
      </div>
      <div
        role="region"
        aria-label="Thông báo hệ thống"
        className="admin-toast-region fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map((item, index) => (
          <SingleToast
            key={item.id}
            item={item}
            index={index}
            onDismiss={dismiss}
            registerCloseBtn={registerCloseBtn}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  return ctx ?? adminToast;
}
