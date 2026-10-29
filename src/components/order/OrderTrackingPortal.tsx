'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import VietQrPaymentCard from '@/components/checkout/VietQrPaymentCard';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Package,
  Search,
  CheckCircle2,
  BatteryCharging,
  Calendar,
  AlertTriangle,
  Laptop,
  Wrench,
  MapPin,
  Phone,
  User,
  KeyRound,
  ArrowRight,
  Loader2,
  XCircle,
} from 'lucide-react';
import type { PublicInspectionLookupResult } from '@/contracts/catalog/inspection';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string | null;
  note: string | null;
  paymentMethod: string;
  paymentStatus: string;
  subtotalAmount: number;
  shippingFee: number;
  totalAmount: number;
  checkoutSnapshot: {
    bankAccountInfo: string | null;
    vietQr?: { bankBin: string; accountNumber: string; accountName: string };
    showroom: { name: string; address: string } | null;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string | null;
    price: number;
    quantity: number;
    lineTotal: number;
  }>;
}

const ORDER_STEPS = [
  { key: 'NEW', label: 'Mới tiếp nhận', desc: 'Hệ thống đã ghi nhận yêu cầu' },
  { key: 'CONTACTED', label: 'Đã liên hệ', desc: 'Tư vấn viên trao đổi thông tin' },
  { key: 'CONFIRMED', label: 'Đã xác nhận', desc: 'Đã xác nhận đơn đặt hàng' },
  { key: 'COMPLETED', label: 'Hoàn tất', desc: 'Hoàn tất quy trình xử lý đơn' },
];

function getStepIndex(status: string): number {
  const s = (status || '').toUpperCase();
  if (s === 'COMPLETED' || s === 'ĐÃ HOÀN THÀNH') return 3;
  if (s === 'CONFIRMED' || s === 'ĐÃ XÁC NHẬN') return 2;
  if (s === 'CONTACTED' || s === 'ĐÃ LIÊN HỆ') return 1;
  return 0;
}

export default function OrderTrackingPortal() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';
  const initialToken = searchParams.get('token') || '';
  const initialCode = searchParams.get('code') || '';

  const [activeTab, setActiveTab] = useState<'inspection' | 'order'>(
    initialOrderId && initialToken ? 'order' : 'inspection'
  );

  // Inspection Lookup State
  const [codeInput, setCodeInput] = useState(initialCode);
  const [inspectionReport, setInspectionReport] = useState<PublicInspectionLookupResult | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(Boolean(initialCode));
  const [inspectionError, setInspectionError] = useState('');

  // Order Lookup State
  const [linkOrIdInput, setLinkOrIdInput] = useState(initialOrderId);
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [orderData, setOrderData] = useState<OrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = useState(Boolean(initialOrderId && initialToken));
  const [orderError, setOrderError] = useState('');

  // Ensure no confirmation tokens remain in localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('citilap-recent-orders');
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Auto-lookup initial ?code=...
  useEffect(() => {
    if (!initialCode) return;
    setCodeInput(initialCode);
    void handleLookupInspection(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  // Auto-lookup initial ?orderId=...&token=... and scrub secret token from URL bar
  useEffect(() => {
    if (initialOrderId && initialToken) {
      setActiveTab('order');
      setLinkOrIdInput(initialOrderId);
      setTokenInput(initialToken);
      if (typeof window !== 'undefined' && window.location.search.includes('token=')) {
        window.history.replaceState(null, '', '/order-tracking');
      }
      void fetchOrderWithToken(initialOrderId, initialToken);
    }
  }, [initialOrderId, initialToken]);

  async function handleLookupInspection(targetCode?: string) {
    const query = (targetCode ?? codeInput).trim();
    if (!query) {
      setInspectionError('Vui lòng nhập Mã kiểm định công khai (Public Code).');
      return;
    }

    setInspectionLoading(true);
    setInspectionError('');
    try {
      const res = await fetch(`/api/inspections/lookup?code=${encodeURIComponent(query)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setInspectionReport(null);
        setInspectionError(
          json.error || 'Không tìm thấy hồ sơ kiểm định công khai khớp với mã này.'
        );
        return;
      }
      setInspectionReport(json.data);
    } catch {
      setInspectionError('Không thể kết nối máy chủ tra cứu. Vui lòng thử lại.');
    } finally {
      setInspectionLoading(false);
    }
  }

  async function fetchOrderWithToken(rawOrderId: string, rawToken: string) {
    let resolvedOrderId = rawOrderId.trim();
    let resolvedToken = rawToken.trim();

    // Support pasting full confirmation URL (e.g. https://citilap.vn/checkout/success?orderId=...&token=...)
    if (resolvedOrderId.includes('orderId=') || resolvedOrderId.includes('token=')) {
      try {
        const url = new URL(
          resolvedOrderId.startsWith('http')
            ? resolvedOrderId
            : `https://citilap.vn${resolvedOrderId.startsWith('/') ? '' : '/'}${resolvedOrderId}`
        );
        resolvedOrderId = url.searchParams.get('orderId') || resolvedOrderId;
        resolvedToken = url.searchParams.get('token') || resolvedToken;
        setLinkOrIdInput(resolvedOrderId);
        setTokenInput(resolvedToken);
      } catch {
        // Keep raw strings if URL parse fails
      }
    }

    if (!resolvedOrderId || !resolvedToken) {
      setOrderError(
        'Vui lòng dán Liên kết xác nhận đơn hàng hoặc nhập đầy đủ Mã ID đơn hàng + Mã xác thực (Token).'
      );
      return;
    }

    setOrderLoading(true);
    setOrderError('');
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(resolvedOrderId)}?token=${encodeURIComponent(resolvedToken)}`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setOrderData(null);
        setOrderError(
          'Liên kết hoặc mã xác thực đơn hàng không hợp lệ. Vui lòng kiểm tra lại liên kết xác nhận đã nhận sau khi đặt hàng.'
        );
        return;
      }
      setOrderData(json.data);
    } catch {
      setOrderError('Không thể kết nối hệ thống tra cứu đơn hàng lúc này.');
    } finally {
      setOrderLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('inspection')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'inspection'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>1. Tra cứu Hồ sơ Kiểm định & Bảo hành (Public Code)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('order')}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'order'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span>2. Tra cứu Trạng thái Đơn hàng</span>
        </button>
      </div>

      {/* TAB 1: INSPECTION & WARRANTY LOOKUP */}
      {activeTab === 'inspection' && (
        <div className="space-y-5">
          {/* Search Box Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>Tra cứu Hồ sơ Kiểm định & Bảo hành Máy</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhập Mã kiểm định công khai (Public Code) đã xuất bản của chiếc máy đang mở bán.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleLookupInspection();
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Nhập mã kiểm định công khai (VD: DEMO-THINKPAD-T14)..."
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>
              <button
                type="submit"
                disabled={inspectionLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs"
              >
                {inspectionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tra cứu...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Kiểm tra hồ sơ</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick-try Public Code Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-slate-500 font-semibold mr-1">
                Mã kiểm định thực tế đang sẵn hàng:
              </span>
              {[
                { code: 'CTL-X1G11-01', label: 'CTL-X1G11-01 (ThinkPad)' },
                { code: 'CTL-LEGION-01', label: 'CTL-LEGION-01 (Legion)' },
                { code: 'CTL-MACM3-01', label: 'CTL-MACM3-01 (MacBook)' },
                { code: 'CTL-ZEN14-01', label: 'CTL-ZEN14-01 (Zenbook)' },
                { code: 'CTL-XPS13-01', label: 'CTL-XPS13-01 (Dell XPS)' },
              ].map((sample) => (
                <button
                  key={sample.code}
                  type="button"
                  onClick={() => {
                    setCodeInput(sample.code);
                    void handleLookupInspection(sample.code);
                  }}
                  className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border transition cursor-pointer ${
                    codeInput.toUpperCase() === sample.code
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 hover:bg-blue-50 text-blue-700 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {inspectionError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{inspectionError}</span>
              </div>
            )}
          </div>

          {/* Inspection Certificate Card */}
          {inspectionReport && (
            <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Top Certificate Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      <ShieldCheck className="w-3.5 h-3.5" /> Chứng thư Kiểm định Citilap
                    </span>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-yellow-300">
                      #{inspectionReport.publicCode}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Sẵn hàng tại kho
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {inspectionReport.productName}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      Ngày test:{' '}
                      <strong className="text-white">
                        {new Intl.DateTimeFormat('vi-VN', {
                          dateStyle: 'medium',
                          timeZone: 'Asia/Ho_Chi_Minh',
                        }).format(new Date(inspectionReport.checkedAt))}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <Link
                    href={inspectionReport.productHref || `/laptop/${encodeURIComponent(inspectionReport.productSlug)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition"
                  >
                    <Laptop className="w-4 h-4" />
                    <span>Xem chi tiết SP</span>
                  </Link>
                  <Link
                    href={`/lien-he?intent=appointment&product=${encodeURIComponent(
                      inspectionReport.productId
                    )}&unit=${encodeURIComponent(inspectionReport.publicCode)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Hẹn xem đúng máy này</span>
                  </Link>
                </div>
              </div>

              {/* Demo Warning if applicable */}
              {inspectionReport.isDemo === 1 && (
                <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 text-xs text-amber-900 flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Dữ liệu kiểm định mẫu — chưa đo trên máy thật. Vui lòng yêu cầu kỹ thuật viên gửi biên bản máy thực tế trước khi chốt đơn.
                  </span>
                </div>
              )}

              {/* Certificate Body */}
              <div className="p-5 sm:p-6 space-y-5">
                {/* Battery Health Strip */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <BatteryCharging className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Dung lượng Pin thực tế (Battery Health)
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {inspectionReport.batteryHealth === null
                          ? 'Chưa có kết quả đo dung lượng sạc đầy / thiết kế'
                          : `${inspectionReport.batteryHealth}% dung lượng sạc đầy / thiết kế; không phải thời gian sử dụng`}
                      </div>
                    </div>
                  </div>

                  {inspectionReport.batteryHealth !== null && (
                    <div className="sm:w-56 flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            inspectionReport.batteryHealth >= 85
                              ? 'bg-emerald-500'
                              : inspectionReport.batteryHealth >= 75
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(10, inspectionReport.batteryHealth))}%` }}
                        />
                      </div>
                      <span className="font-mono text-base font-black text-emerald-700">
                        {inspectionReport.batteryHealth}%
                      </span>
                    </div>
                  )}
                </div>

                {/* 4 Inspection Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-blue-600" />
                      <span>1. Ngoại hình & Vỏ máy</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                      {inspectionReport.appearance}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-emerald-600" />
                      <span>2. Kết quả kiểm tra phần cứng</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                      {inspectionReport.checks}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>3. Điểm cần lưu ý</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                      {inspectionReport.limitations || 'Chưa ghi nhận; khuyến khích kiểm tra trực tiếp tại showroom.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>4. Chế độ Bảo hành áp dụng</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                      {inspectionReport.warranty}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          )}
        </div>
      )}

      {/* TAB 2: ORDER STATUS TRACKING */}
      {activeTab === 'order' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>Tra cứu Tiến độ Đơn hàng</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dán đường dẫn xác nhận đơn hàng nhận được sau khi đặt mua hoặc nhập Mã đơn (Order ID) kèm Mã xác thực (Token).
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void fetchOrderWithToken(linkOrIdInput, tokenInput);
              }}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
            >
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Liên kết xác nhận hoặc Order ID
                </label>
                <input
                  type="text"
                  value={linkOrIdInput}
                  onChange={(e) => setLinkOrIdInput(e.target.value)}
                  placeholder="Dán link /checkout/success?orderId=... hoặc nhập ID"
                  autoComplete="off"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mã xác thực đơn (Confirmation Token)
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Tự điền nếu dán nguyên link..."
                    autoComplete="off"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={orderLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2 px-4 rounded-xl text-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer h-[34px]"
                >
                  {orderLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Xem đơn</span>
                </button>
              </div>
            </form>

            {orderError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}
          </div>

          {/* Order Detail Result */}
          {orderData && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
              {/* Top summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs text-slate-500">Mã đơn hàng</div>
                  <div className="text-lg font-black font-mono text-blue-600">
                    {orderData.orderNumber || orderData.id}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Ngày đặt:{' '}
                  <strong className="text-slate-800">
                    {new Intl.DateTimeFormat('vi-VN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Asia/Ho_Chi_Minh',
                    }).format(new Date(orderData.createdAt))}
                  </strong>
                </div>
              </div>

              {/* Progress Steps */}
              {orderData.status === 'CANCELLED' ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-xs sm:text-sm font-semibold">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Đơn hàng này đã bị hủy. Vui lòng liên hệ hotline nếu bạn cần đặt lại hoặc hỗ trợ thêm.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ORDER_STEPS.map((step, index) => {
                    const currentIdx = getStepIndex(orderData.status);
                    const done = index <= currentIdx;
                    const active = index === currentIdx;
                    return (
                      <div
                        key={step.key}
                        className={`p-3.5 rounded-xl border transition ${
                          active
                            ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/15'
                            : done
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Bước {index + 1}
                          </span>
                          {done && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900">{step.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{step.desc}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Customer & Items */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-5 bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
                  <div className="font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Thông tin nhận hàng
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500">Người nhận:</span>
                    <span className="font-bold text-slate-900 ml-auto">{orderData.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500">Liên hệ:</span>
                    <span className="font-mono font-bold text-slate-900 ml-auto">{orderData.customerPhone}</span>
                  </div>
                  {orderData.shippingAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-500 shrink-0">Địa chỉ:</span>
                      <span className="font-medium text-slate-800 text-right ml-auto">
                        {orderData.shippingAddress}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">Thanh toán:</span>
                    <span className="font-bold text-slate-900">
                      {orderData.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'COD khi nhận máy'}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-7 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Danh sách sản phẩm ({orderData.items.length})
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {orderData.items.map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{item.productName}</div>
                          <div className="text-[11px] text-slate-500">
                            {item.sku ? `SKU: ${item.sku} · ` : ''}SL: x{item.quantity}
                          </div>
                        </div>
                        <div className="font-bold text-rose-600 shrink-0">
                          {item.lineTotal.toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700">Tổng cộng:</span>
                    <span className="font-black text-rose-600 text-base">
                      {orderData.totalAmount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </div>

              {orderData.paymentMethod === 'BANK_TRANSFER' && orderData.checkoutSnapshot?.bankAccountInfo && (
                <VietQrPaymentCard
                  bankAccountInfo={orderData.checkoutSnapshot.bankAccountInfo}
                  vietQr={orderData.checkoutSnapshot.vietQr}
                  amount={orderData.totalAmount}
                  transferNote={orderData.orderNumber || orderData.id}
                  paymentStatus={orderData.paymentStatus}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Privacy & Support Notice (Preserves exact security guarantees & E2E verification text) */}
      <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs text-slate-600 space-y-1.5">
        <div className="font-bold text-slate-800">Lưu ý bảo mật & hỗ trợ tra cứu đơn hàng:</div>
        <p className="leading-relaxed">
          Tra cứu tự động bằng mã đơn và số điện thoại chưa được hỗ trợ nhằm bảo vệ thông tin cá nhân của khách hàng. Để xem chi tiết đơn hàng, vui lòng mở liên kết xác nhận đã nhận sau khi đặt hàng hoặc dán mã xác thực vào ô tra cứu phía trên.
        </p>
        <p className="pt-1">
          Nếu không còn giữ liên kết xác nhận, quý khách vui lòng{' '}
          <Link href="/lien-he" className="font-bold text-blue-600 underline hover:text-blue-800">
            Xem hotline và showroom hiện tại <ArrowRight className="w-3 h-3 inline" />
          </Link>{' '}
          để nhân viên hỗ trợ kiểm tra trực tiếp.
        </p>
      </div>
    </div>
  );
}
