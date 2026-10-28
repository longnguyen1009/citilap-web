"use client";

import { useState } from "react";
import { QrCode, Copy, Check, Building2 } from "lucide-react";
import { buildVietQrUrl, findVietQrBank, type VietQrSnapshot } from "@/lib/vietqr";

interface VietQrPaymentCardProps {
  bankAccountInfo: string | null | undefined;
  vietQr?: VietQrSnapshot | null;
  amount?: number;
  transferNote?: string;
  paymentStatus?: string;
  compact?: boolean;
}

export default function VietQrPaymentCard({
  bankAccountInfo,
  vietQr,
  amount,
  transferNote,
  paymentStatus,
  compact = false,
}: VietQrPaymentCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const qrUrl =
    vietQr?.bankBin && vietQr?.accountNumber
      ? buildVietQrUrl({
          bankBin: vietQr.bankBin,
          accountNumber: vietQr.accountNumber,
          accountName: vietQr.accountName,
          amount,
          addInfo: transferNote,
        })
      : null;

  const bankMeta = vietQr?.bankBin ? findVietQrBank(vietQr.bankBin) : undefined;

  const copyText = (key: string, value: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopiedField(key);
        setTimeout(() => setCopiedField((prev) => (prev === key ? null : prev)), 2000);
      },
      () => {
        // Ignore clipboard permission errors
      }
    );
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 sm:p-4 text-xs sm:text-sm text-slate-800 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-blue-950 flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Hướng dẫn chuyển khoản ngân hàng (Napas 247)</span>
        </div>
        {paymentStatus && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            {paymentStatus === "PENDING" ? "Chờ xác nhận" : paymentStatus}
          </span>
        )}
      </div>

      {qrUrl && (
        <div className={`grid grid-cols-1 ${compact ? "" : "sm:grid-cols-[170px_1fr]"} gap-4 items-center bg-white rounded-xl p-3.5 border border-blue-100 shadow-2xs`}>
          <div className="flex flex-col items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic external VietQR image */}
            <img
              src={qrUrl}
              alt="Mã VietQR chuyển khoản"
              width={160}
              height={160}
              className="w-40 h-40 object-contain rounded-lg border border-slate-100 bg-white p-1"
            />
            <span className="text-[11px] text-slate-500 mt-1 text-center">
              Mở App Ngân hàng quét mã QR
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> Ngân hàng:
              </span>
              <span className="font-bold text-slate-900 text-right">
                {bankMeta ? `${bankMeta.shortName} (${bankMeta.code})` : vietQr?.bankBin}
              </span>
            </div>

            {vietQr?.accountNumber && (
              <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-500">Số tài khoản:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-blue-700 text-sm">
                    {vietQr.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("acc", vietQr.accountNumber)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 font-semibold text-[11px] transition cursor-pointer"
                    title="Sao chép số tài khoản"
                  >
                    {copiedField === "acc" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedField === "acc" ? "Đã chép" : "Chép"}
                  </button>
                </div>
              </div>
            )}

            {vietQr?.accountName && (
              <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <span className="font-bold text-slate-900 uppercase text-right">
                  {vietQr.accountName}
                </span>
              </div>
            )}

            {typeof amount === "number" && amount > 0 && (
              <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-slate-500">Số tiền:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-red-600 text-sm">
                    {amount.toLocaleString("vi-VN")}đ
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("amount", String(amount))}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 font-semibold text-[11px] transition cursor-pointer"
                    title="Sao chép số tiền"
                  >
                    {copiedField === "amount" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedField === "amount" ? "Đã chép" : "Chép"}
                  </button>
                </div>
              </div>
            )}

            {transferNote && (
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-slate-500">Nội dung CK:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    {transferNote}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("note", transferNote)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 font-semibold text-[11px] transition cursor-pointer"
                    title="Sao chép nội dung chuyển khoản"
                  >
                    {copiedField === "note" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedField === "note" ? "Đã chép" : "Chép"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="whitespace-pre-wrap text-xs sm:text-sm text-slate-700 leading-relaxed">
        {bankAccountInfo || "Đang tải hướng dẫn chuyển khoản…"}
      </p>
    </div>
  );
}

