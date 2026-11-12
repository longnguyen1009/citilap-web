"use client";

import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, HelpCircle, Trash2 } from "lucide-react";
import AdminButton, { type AdminButtonVariant } from "./AdminButton";

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary" | "warning";
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "destructive",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const messageId = useId();
  const callbacksRef = useRef({ onConfirm, onCancel });

  useEffect(() => {
    callbacksRef.current = { onConfirm, onCancel };
  }, [onConfirm, onCancel]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.returnValue = "";
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close("");
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      const result = dialog.returnValue;
      dialog.returnValue = "";
      if (result === "confirm") {
        callbacksRef.current.onConfirm();
      } else {
        callbacksRef.current.onCancel();
      }
    };

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  const buttonVariant: AdminButtonVariant =
    variant === "destructive" ? "destructive" : "primary";

  const icon =
    variant === "destructive" ? (
      <div className="size-10 rounded-full bg-red-50 border border-red-100 text-red-600 grid place-items-center shrink-0">
        <Trash2 className="size-5" aria-hidden="true" />
      </div>
    ) : variant === "warning" ? (
      <div className="size-10 rounded-full bg-amber-50 border border-amber-100 text-amber-600 grid place-items-center shrink-0">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
    ) : (
      <div className="size-10 rounded-full bg-blue-50 border border-blue-100 text-blue-600 grid place-items-center shrink-0">
        <HelpCircle className="size-5" aria-hidden="true" />
      </div>
    );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      className="admin-modal-dialog"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-bold text-slate-900 leading-snug">
              {title}
            </h2>
            <div id={messageId} className="mt-2 text-xs sm:text-[13px] text-slate-600 leading-relaxed space-y-1.5">
              <div>{message}</div>
              {description && <div className="text-slate-500">{description}</div>}
            </div>
          </div>
        </div>

        <form method="dialog" className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <AdminButton
            type="submit"
            value="cancel"
            variant="secondary"
            size="md"
            autoFocus
          >
            {cancelLabel}
          </AdminButton>
          <AdminButton
            type="submit"
            value="confirm"
            variant={buttonVariant}
            size="md"
            className={variant === "warning" ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white" : ""}
          >
            {confirmLabel}
          </AdminButton>
        </form>
      </div>
    </dialog>
  );
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

let globalConfirmHandler: ConfirmFn | null = null;

export function confirmAdminAction(options: ConfirmOptions | string): Promise<boolean> {
  if (globalConfirmHandler) {
    return globalConfirmHandler(options);
  }
  const msg = typeof options === "string" ? options : `${options.title}\n\n${typeof options.message === "string" ? options.message : ""}`;
  return Promise.resolve(typeof window !== "undefined" ? window.confirm(msg) : false);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
  }>({
    open: false,
    options: { title: "Xác nhận thao tác", message: "" },
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((input) => {
    const options: ConfirmOptions =
      typeof input === "string"
        ? {
            title: "Xác nhận thao tác",
            message: input,
            variant: /xóa|xoá|hủy|huỷ|lưu trữ|bỏ/i.test(input) ? "destructive" : "primary",
            confirmLabel: /xóa|xoá/i.test(input) ? "Xóa" : "Xác nhận",
          }
        : input;

    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, options });
    });
  }, []);

  useEffect(() => {
    globalConfirmHandler = confirm;
    return () => {
      if (globalConfirmHandler === confirm) {
        globalConfirmHandler = null;
      }
    };
  }, [confirm]);

  const handleConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(false);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={state.open}
        {...state.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return confirmAdminAction;
  }
  return ctx;
}
