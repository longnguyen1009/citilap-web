'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PageHeader,
  AdminButton,
  AdminCard,
  useConfirm,
  useToast,
} from '@/components/admin/ui';
import {
  Zap,
  Plus,
  RefreshCw,
  Edit2,
  CheckCircle,
  Archive,
  AlertCircle,
  Layers,
  X,
  Clock,
  Search,
  Copy,
  Eye,
} from 'lucide-react';
import CampaignStatsCards from '@/components/admin/campaigns/CampaignStatsCards';
import CampaignFormModal from '@/components/admin/campaigns/CampaignFormModal';
import {
  type CampaignData,
  type CampaignItemForm,
  type BannerSettingsState,
  type DailySlotForm,
  type FilterTab,
  type ScheduleMode,
  formatGmt7,
  calculateBulkDiscountedPrice,
} from '@/components/admin/campaigns/types';
import {
  DEFAULT_FLASH_SALE_PRE_SHOW_HOURS,
  addDaysToVnDate,
  diffVnDaysInclusive,
  isoToVnDateDisplay,
  isoToVnTimeDisplay,
  parseVnDateInput,
  parseVnTimeInput,
  vnDateTimeToIso,
} from '@/lib/flash-sale-schedule';

export default function AdminCampaignsPage() {
  const confirm = useConfirm();
  const toast = useToast();

  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Storefront Flash Sale / Hot Sale Banner fallback settings
  const [bannerSettingsOpen, setBannerSettingsOpen] = useState(false);
  const [bannerSettings, setBannerSettings] = useState<BannerSettingsState | null>(null);
  const [settingsRevision, setSettingsRevision] = useState<number>(0);
  const [fullSettingsDoc, setFullSettingsDoc] = useState<Record<string, unknown> | null>(null);
  const [savingBannerSettings, setSavingBannerSettings] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignData | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('continuous');
  const [startDateStr, setStartDateStr] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('10:00');
  const [endDateStr, setEndDateStr] = useState('');
  const [endTimeStr, setEndTimeStr] = useState('12:00');
  const [durationDaysStr, setDurationDaysStr] = useState('1');
  const [dailySlots, setDailySlots] = useState<DailySlotForm[]>([
    { startTime: '10:00', endTime: '12:00' },
    { startTime: '12:00', endTime: '14:00' },
  ]);
  const [formItems, setFormItems] = useState<CampaignItemForm[]>([]);
  const [formRevision, setFormRevision] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadBannerSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'same-origin' });
      const json = await res.json();
      if (res.ok && json.success && json.data?.document) {
        const doc = json.data.document;
        setFullSettingsDoc(doc);
        setSettingsRevision(json.data.revision ?? 0);
        setBannerSettings({
          hotSaleBannerImage: doc.hotSaleBannerImage || '',
          hotSaleBannerLink: doc.hotSaleBannerLink || '',
          flashSaleEnabled: Boolean(doc.flashSaleEnabled),
          flashSaleTitle: doc.flashSaleTitle || 'Giá Sốc Giờ Vàng',
          flashSaleStartAt: doc.flashSaleStartAt || '',
          flashSaleEndAt: doc.flashSaleEndAt || '',
          flashSalePreShowHours:
            typeof doc.flashSalePreShowHours === 'number'
              ? doc.flashSalePreShowHours
              : DEFAULT_FLASH_SALE_PRE_SHOW_HOURS,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveBannerSettings = async () => {
    if (!bannerSettings || !fullSettingsDoc) return;
    setSavingBannerSettings(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          expectedRevision: settingsRevision,
          document: {
            ...fullSettingsDoc,
            ...bannerSettings,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Không thể lưu cấu hình Banner & Flash Sale dự phòng.');
      }
      setSettingsRevision(json.data.revision);
      setFullSettingsDoc(json.data.document);
      const msg = 'Đã lưu cấu hình Banner HOT SALE & chế độ Flash Sale dự phòng.';
      setSuccessMsg(msg);
      toast.success(msg);
      setBannerSettingsOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi khi lưu cấu hình.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingBannerSettings(false);
    }
  };

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/campaigns');
      const json = (await res.json()) as {
        success: boolean;
        data?: CampaignData[];
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Không thể tải danh sách chiến dịch');
      }
      setCampaigns(json.data || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi khi tải chiến dịch';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNowMs(Date.now());
      void fetchCampaigns();
    }, 0);
    const clock = setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, [fetchCampaigns]);

  const campaignCounts = useMemo(() => {
    let active = 0;
    let upcoming = 0;
    let inactive = 0;
    for (const c of campaigns) {
      const startMs = new Date(c.startAt).getTime();
      const endMs = new Date(c.endAt).getTime();
      if (c.status === 'PUBLISHED' && nowMs >= startMs && nowMs < endMs) active++;
      else if (c.status === 'PUBLISHED' && nowMs < startMs) upcoming++;
      else inactive++;
    }
    return {
      ALL: campaigns.length,
      ACTIVE: active,
      UPCOMING: upcoming,
      INACTIVE: inactive,
    };
  }, [campaigns, nowMs]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !(c.description || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      const startMs = new Date(c.startAt).getTime();
      const endMs = new Date(c.endAt).getTime();
      const isActive = c.status === 'PUBLISHED' && nowMs >= startMs && nowMs < endMs;
      const isUpcoming = c.status === 'PUBLISHED' && nowMs < startMs;
      if (filterTab === 'ACTIVE') return isActive;
      if (filterTab === 'UPCOMING') return isUpcoming;
      if (filterTab === 'INACTIVE') return !isActive && !isUpcoming;
      return true;
    });
  }, [campaigns, searchQuery, filterTab, nowMs]);

  const applyRangeFromIso = (startIso: string, endIso: string) => {
    const sDate = isoToVnDateDisplay(startIso);
    const eDate = isoToVnDateDisplay(endIso);
    setStartDateStr(sDate);
    setStartTimeStr(isoToVnTimeDisplay(startIso) || '10:00');
    setEndDateStr(eDate);
    setEndTimeStr(isoToVnTimeDisplay(endIso) || '12:00');
    const span = diffVnDaysInclusive(sDate, eDate);
    setDurationDaysStr(span ? String(span) : '1');
  };

  const openNewEditor = () => {
    setFormEnabled(true);
    setScheduleMode('daily_slots');
    setEditingCampaign(null);
    setFormName('');
    setFormDescription('');
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    applyRangeFromIso(now.toISOString(), twoHoursLater.toISOString());
    setDailySlots([
      { startTime: '10:00', endTime: '12:00' },
      { startTime: '12:00', endTime: '14:00' },
    ]);
    setFormItems([]);
    setFormRevision(0);
    setFormError(null);
    setIsEditorOpen(true);
  };

  const openEditEditor = async (c: CampaignData) => {
    setFormEnabled(c.status === 'PUBLISHED' && new Date(c.endAt).getTime() > Date.now());
    setScheduleMode('continuous');
    setEditingCampaign(c);
    setFormName(c.name);
    setFormDescription(c.description || '');
    applyRangeFromIso(c.startAt, c.endAt);
    const sTime = isoToVnTimeDisplay(c.startAt);
    const eTime = isoToVnTimeDisplay(c.endAt);
    const sParsed = parseVnTimeInput(sTime);
    const eParsed = parseVnTimeInput(eTime);
    if (sParsed && eParsed && sParsed.hour * 60 + sParsed.minute < eParsed.hour * 60 + eParsed.minute) {
      setDailySlots([{ startTime: sParsed.display, endTime: eParsed.display }]);
    } else {
      setDailySlots([{ startTime: '10:00', endTime: '12:00' }]);
    }
    setFormRevision(c.revision);
    setFormError(null);

    try {
      const res = await fetch(`/api/admin/campaigns/${c.id}`);
      const json = (await res.json()) as { success: boolean; data?: CampaignData };
      if (res.ok && json.data?.items) {
        setEditingCampaign((prev) =>
          prev
            ? {
                ...prev,
                status: json.data!.status,
                revision: json.data!.revision,
              }
            : json.data!
        );
        setFormItems(
          json.data.items.map((it) => ({
            displayName: [it.product?.name, it.variant?.name].filter(Boolean).join(' · '),
            id: it.id,
            productId: it.productId,
            variantId: it.variantId || '',
            salePrice: it.salePrice,
            regularPrice:
              it.regularPrice ??
              it.variant?.price ??
              it.product?.price ??
              '',
            quantityLimit: it.quantityLimit ?? '',
            perCustomerLimit: it.perCustomerLimit ?? '',
            soldCount: it.soldCount ?? 0,
          }))
        );
        setFormRevision(json.data.revision);
      } else {
        throw new Error('Không tải được sản phẩm chiến dịch. Thử lại để tránh mất danh sách.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không tải được chiến dịch';
      setError(msg);
      toast.error(msg);
      return false;
    }

    setIsEditorOpen(true);
    return true;
  };

  const handleCloneCampaign = async (campaign: CampaignData) => {
    if (!(await openEditEditor(campaign))) return;
    setEditingCampaign(null);
    setFormRevision(0);
    setFormEnabled(false);
    setFormName(`${campaign.name} (Bản sao)`);
    setFormItems((items) =>
      items.map((item) => ({
        ...item,
        id: undefined,
        soldCount: 0,
      }))
    );
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 3600000);
    setScheduleMode('continuous');
    applyRangeFromIso(now.toISOString(), twoHoursLater.toISOString());
    toast.info(`Đã tạo bản nháp nhân bản từ "${campaign.name}". Hãy kiểm tra khung giờ và bấm Lưu.`);
  };

  const addTimeSlot = async (campaign: CampaignData) => {
    if (!(await openEditEditor(campaign))) return;
    setEditingCampaign(null);
    setScheduleMode('continuous');
    setFormRevision(0);
    setFormEnabled(true);
    setFormItems((items) =>
      items.map((item) => ({
        ...item,
        id: undefined,
        soldCount: 0,
      }))
    );
    applyRangeFromIso(
      campaign.endAt,
      new Date(Date.parse(campaign.endAt) + 2 * 3600000).toISOString()
    );
  };

  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      {
        productId: '',
        variantId: '',
        salePrice: '',
        regularPrice: '',
        quantityLimit: '',
        perCustomerLimit: '',
        soldCount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof CampaignItemForm, value: string) => {
    setFormItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  const applyBulkDiscountPct = (pct: number) => {
    setFormItems((prev) =>
      prev.map((it) => {
        const reg = Number(it.regularPrice);
        if (!Number.isFinite(reg) || reg <= 0) return it;
        const discounted = calculateBulkDiscountedPrice(reg, pct);
        return { ...it, salePrice: discounted };
      })
    );
  };

  const handleSave = async (enabled = formEnabled) => {
    if (editingCampaign?.status === 'ARCHIVED') {
      const msg = 'Chiến dịch đã lưu trữ không thể chỉnh sửa hoặc xuất bản lại.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    setFormError(null);
    setSaving(true);

    try {
      if (!formName.trim()) {
        throw new Error('Vui lòng nhập tên chiến dịch');
      }

      const effectiveMode: ScheduleMode = scheduleMode;
      const startDate = parseVnDateInput(startDateStr);
      const endDate = parseVnDateInput(endDateStr);
      if (!startDate || !endDate) {
        throw new Error('Vui lòng nhập Từ ngày và Đến ngày hợp lệ theo dạng DD/MM/YYYY (VD: 15/11/2026).');
      }

      let windows: Array<{ startAt: string; endAt: string }> = [];

      if (effectiveMode === 'continuous') {
        const startT = parseVnTimeInput(startTimeStr);
        const endT = parseVnTimeInput(endTimeStr);
        if (!startT || !endT) {
          throw new Error('Vui lòng nhập giờ 24h hợp lệ (VD: 10:00, 14:00).');
        }
        const startUtc = vnDateTimeToIso(startDate.display, startT.display);
        const endUtc = vnDateTimeToIso(endDate.display, endT.display);
        if (!startUtc || !endUtc || new Date(startUtc).getTime() >= new Date(endUtc).getTime()) {
          throw new Error('Thời điểm bắt đầu phải trước thời điểm kết thúc.');
        }
        windows = [{ startAt: startUtc, endAt: endUtc }];
      } else {
        const dayCount = diffVnDaysInclusive(startDate.display, endDate.display);
        if (!dayCount || dayCount > 60) {
          throw new Error('Khoảng ngày chạy khung giờ phải từ 1 đến 60 ngày.');
        }
        if (dailySlots.length === 0) {
          throw new Error('Vui lòng chọn ít nhất 1 khung giờ mỗi ngày.');
        }
        const normalizedSlots = dailySlots.map((slot, idx) => {
          const st = parseVnTimeInput(slot.startTime);
          const et = parseVnTimeInput(slot.endTime);
          if (!st || !et) {
            throw new Error(`Khung giờ ${idx + 1}: Nhập giờ 24h hợp lệ (VD: 10:00 - 12:00).`);
          }
          const stMin = st.hour * 60 + st.minute;
          const etMin = et.hour * 60 + et.minute;
          if (stMin >= etMin) {
            throw new Error(`Khung giờ ${idx + 1} (${st.display} → ${et.display}): Giờ kết thúc phải sau giờ bắt đầu.`);
          }
          return { st, et, stMin, etMin };
        }).sort((a, b) => a.stMin - b.stMin);

        for (let i = 1; i < normalizedSlots.length; i++) {
          if (normalizedSlots[i].stMin < normalizedSlots[i - 1].etMin) {
            throw new Error(
              `Khung giờ bị trùng nhau trong cùng ngày: ${normalizedSlots[i - 1].st.display}–${normalizedSlots[i - 1].et.display} và ${normalizedSlots[i].st.display}–${normalizedSlots[i].et.display}.`
            );
          }
        }

        const expanded: Array<{ startAt: string; endAt: string }> = [];
        for (let offset = 0; offset < dayCount; offset++) {
          const dayVal = addDaysToVnDate(startDate.display, offset);
          if (!dayVal) continue;
          for (const slot of normalizedSlots) {
            const startAt = vnDateTimeToIso(dayVal.display, slot.st.display);
            const endAt = vnDateTimeToIso(dayVal.display, slot.et.display);
            if ((!enabled && dayCount === 1) || new Date(endAt).getTime() > Date.now()) {
              expanded.push({ startAt, endAt });
            }
          }
        }
        if (!expanded.length) {
          throw new Error('Tất cả khung giờ đã chọn đều đã kết thúc so với hiện tại.');
        }
        windows = expanded;
      }

      const willPublishAny = enabled && windows.some((w) => new Date(w.endAt).getTime() > Date.now());
      if (willPublishAny && formItems.length < 1) {
        throw new Error('Chiến dịch xuất bản phải có ít nhất 1 sản phẩm khuyến mại.');
      }

      const parsedItems = formItems.map((it, idx) => {
        if (!it.productId.trim()) {
          throw new Error(`Dòng ${idx + 1}: Vui lòng nhập Product ID.`);
        }
        const salePrice = Number(it.salePrice);
        if (!Number.isFinite(salePrice) || salePrice <= 0) {
          throw new Error(`Dòng ${idx + 1}: Giá khuyến mại phải là số nguyên dương.`);
        }
        const regularPrice =
          it.regularPrice !== undefined && it.regularPrice !== '' && it.regularPrice !== null
            ? Number(it.regularPrice)
            : null;
        if (regularPrice !== null && salePrice >= regularPrice) {
          throw new Error(
            `Dòng ${idx + 1}: Giá sale (${salePrice.toLocaleString('vi-VN')}₫) phải nhỏ hơn giá thường (${regularPrice.toLocaleString('vi-VN')}₫).`
          );
        }

        const quantityLimit =
          it.quantityLimit !== undefined && it.quantityLimit !== '' && it.quantityLimit !== null
            ? Number(it.quantityLimit)
            : null;
        if (quantityLimit !== null && (!Number.isInteger(quantityLimit) || quantityLimit <= 0)) {
          throw new Error(`Dòng ${idx + 1}: Giới hạn suất phải là số nguyên dương.`);
        }

        const perCustomerLimit =
          it.perCustomerLimit !== undefined &&
          it.perCustomerLimit !== '' &&
          it.perCustomerLimit !== null
            ? Number(it.perCustomerLimit)
            : null;
        if (
          perCustomerLimit !== null &&
          (!Number.isInteger(perCustomerLimit) || perCustomerLimit <= 0)
        ) {
          throw new Error(`Dòng ${idx + 1}: Giới hạn mỗi khách phải là số nguyên dương.`);
        }

        if (
          quantityLimit !== null &&
          perCustomerLimit !== null &&
          perCustomerLimit > quantityLimit
        ) {
          throw new Error(
            `Dòng ${idx + 1}: Giới hạn mỗi khách (${perCustomerLimit}) không được lớn hơn tổng giới hạn suất (${quantityLimit}).`
          );
        }

        return {
          id: it.id,
          productId: it.productId.trim(),
          variantId: it.variantId && it.variantId.trim() ? it.variantId.trim() : null,
          salePrice: Math.round(salePrice),
          regularPrice: regularPrice !== null ? Math.round(regularPrice) : null,
          quantityLimit,
          perCustomerLimit,
          soldCount: typeof it.soldCount === 'number' && it.soldCount >= 0 ? it.soldCount : 0,
        };
      });

      let savedCount = 0;
      for (let idx = 0; idx < windows.length; idx++) {
        const win = windows[idx];
        const isUpdatingExisting = Boolean(editingCampaign && idx === 0);
        const targetStatus =
          enabled && new Date(win.endAt).getTime() > Date.now() ? 'PUBLISHED' : 'DRAFT';
        const payload = {
          name: formName.trim(),
          description: formDescription.trim() || null,
          status: targetStatus,
          startAt: win.startAt,
          endAt: win.endAt,
          items: isUpdatingExisting
            ? parsedItems
            : parsedItems.map((it) => ({ ...it, id: undefined, soldCount: 0 })),
          revision: isUpdatingExisting ? formRevision : 0,
          expectedRevision: isUpdatingExisting ? formRevision : 0,
        };

        const url =
          isUpdatingExisting && editingCampaign
            ? `/api/admin/campaigns/${editingCampaign.id}`
            : `/api/admin/campaigns`;
        const method = isUpdatingExisting ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = (await res.json()) as {
          success: boolean;
          error?: string;
          code?: string;
          conflictingCampaignName?: string;
        };

        if (!res.ok || !json.success) {
          const partialNote = savedCount > 0 ? ` (Đã tạo trước ${savedCount}/${windows.length} khung giờ)` : '';
          if (json.code === 'CAMPAIGN_OVERLAP_CONFLICT') {
            throw new Error(`Xung đột khung giờ: ${json.error}${partialNote}`);
          }
          if (json.code === 'CAMPAIGN_REVISION_CONFLICT') {
            throw new Error(`Xung đột phiên bản (CAS): ${json.error}`);
          }
          throw new Error(`${json.error || 'Lỗi khi lưu chiến dịch.'}${partialNote}`);
        }
        savedCount++;
      }

      const msg =
        windows.length > 1
          ? `Đã lưu ${savedCount} khung giờ cho chiến dịch "${formName}" thành công.`
          : editingCampaign
            ? `Đã cập nhật chiến dịch "${formName}" thành công.`
            : `Đã tạo chiến dịch "${formName}" thành công.`;
      setSuccessMsg(msg);
      toast.success(msg);
      setIsEditorOpen(false);
      void fetchCampaigns();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi khi lưu chiến dịch';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c: CampaignData, enabled: boolean) => {
    setTogglingId(c.id);
    setError(null);
    try {
      const detail = await fetch(`/api/admin/campaigns/${c.id}`);
      const current = await detail.json();
      if (!detail.ok || !current.success) {
        throw new Error(current.error || 'Không tải được chiến dịch.');
      }
      // Use freshly fetched revision from current.data.revision instead of stale c.revision
      const freshRevision = current.data.revision;
      const res = await fetch(`/api/admin/campaigns/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...current.data,
          status: enabled ? 'PUBLISHED' : 'DRAFT',
          revision: freshRevision,
          expectedRevision: freshRevision,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Không thể đổi trạng thái chiến dịch.');
      }
      const msg = `Đã ${enabled ? 'bật' : 'tắt'} chiến dịch "${c.name}".`;
      setSuccessMsg(msg);
      toast.success(msg);
      await fetchCampaigns();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không đổi được trạng thái chiến dịch.';
      setError(msg);
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const handleArchive = async (c: CampaignData) => {
    const ok = await confirm({
      title: 'Lưu trữ chiến dịch',
      message: `Bạn có chắc muốn lưu trữ chiến dịch "${c.name}"? Giá khuyến mại sẽ ngừng áp dụng và chiến dịch đã lưu trữ không thể chỉnh sửa lại.`,
      confirmLabel: 'Lưu trữ',
      cancelLabel: 'Hủy',
      variant: 'destructive',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/campaigns/${c.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: c.revision }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Không thể lưu trữ chiến dịch.');
      }
      const msg = `Đã lưu trữ chiến dịch "${c.name}".`;
      setSuccessMsg(msg);
      toast.success(msg);
      void fetchCampaigns();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi khi lưu trữ chiến dịch';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-3 pb-16">
      <PageHeader
        title="Flash Sale & Chiến dịch"
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
            {campaigns.length}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!bannerSettings) void loadBannerSettings();
                setBannerSettingsOpen((prev) => !prev);
              }}
            >
              Cấu hình Banner &amp; Dự phòng
            </AdminButton>
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => void fetchCampaigns()}
              disabled={loading}
              aria-label="Làm mới"
              icon={<RefreshCw className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />}
            />
            <AdminButton size="sm" onClick={openNewEditor} icon={<Plus className="w-4 h-4" />}>
              Tạo chiến dịch
            </AdminButton>
          </div>
        }
      />

      {/* Alerts */}
      {successMsg && (
        <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <CampaignStatsCards
        campaigns={campaigns}
        nowMs={nowMs}
        counts={campaignCounts}
        bannerSettingsOpen={bannerSettingsOpen}
        bannerSettings={bannerSettings}
        savingBannerSettings={savingBannerSettings}
        onChangeBannerSettings={setBannerSettings}
        onCloseBannerSettings={() => setBannerSettingsOpen(false)}
        onSaveBannerSettings={() => void handleSaveBannerSettings()}
      />

      {/* Unified Single-Card Workspace */}
      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Top Bar: Tabs + Search */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1" role="tablist" aria-label="Lọc trạng thái chiến dịch">
            {(
              [
                { key: 'ALL', label: 'Tất cả' },
                { key: 'ACTIVE', label: 'Đang diễn ra' },
                { key: 'UPCOMING', label: 'Sắp chạy' },
                { key: 'INACTIVE', label: 'Đã tắt / Kết thúc' },
              ] as const
            ).map((t) => {
              const active = filterTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilterTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {t.label} <span className="opacity-75">({campaignCounts[t.key]})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs justify-end">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên chiến dịch…"
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
            Đang tải chiến dịch...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Zap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium text-slate-700">Chưa có chiến dịch khuyến mại nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Chiến dịch</th>
                  <th className="py-2.5 px-4">Trạng thái</th>
                  <th className="py-2.5 px-4">Khung giờ (GMT+7)</th>
                  <th className="py-2.5 px-4">Homepage</th>
                  <th className="py-2.5 px-4 text-center">Sản phẩm</th>
                  <th className="py-2.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaigns.map((c) => {
                  const startMs = new Date(c.startAt).getTime();
                  const endMs = new Date(c.endAt).getTime();
                  const isCurrentlyActive =
                    c.status === 'PUBLISHED' && nowMs >= startMs && nowMs < endMs;
                  const isArchived = c.status === 'ARCHIVED';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        {c.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {c.description}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">rev #{c.revision}</div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {c.status === 'PUBLISHED' ? (
                          isCurrentlyActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Đang diễn ra
                            </span>
                          ) : nowMs < startMs ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
                              <Clock className="w-3 h-3" />
                              Sắp diễn ra
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              Đã kết thúc
                            </span>
                          )
                        ) : c.status === 'DRAFT' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                            Đã tắt
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                            Lưu trữ
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono tabular-nums whitespace-nowrap">
                        <div>{formatGmt7(c.startAt)}</div>
                        <div className="text-slate-400 text-[11px]">→ {formatGmt7(c.endAt)}</div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          role="switch"
                          aria-label={`Hiển thị ${c.name} trên homepage`}
                          aria-checked={c.status === 'PUBLISHED' && nowMs < endMs}
                          disabled={togglingId !== null || nowMs >= endMs || isArchived}
                          onClick={() => void handleToggle(c, c.status !== 'PUBLISHED')}
                          title={
                            isArchived
                              ? 'Chiến dịch đã lưu trữ không thể xuất bản lại.'
                              : nowMs >= endMs
                              ? 'Đã kết thúc. Sửa thời gian để bật lại.'
                              : 'Bật/tắt hiển thị'
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 cursor-pointer"
                        >
                          <span
                            aria-hidden="true"
                            className={`flex h-5 w-9 rounded-full p-0.5 transition ${
                              c.status === 'PUBLISHED' && nowMs < endMs
                                ? 'justify-end bg-blue-600'
                                : 'justify-start bg-slate-300'
                            }`}
                          >
                            <span className="h-4 w-4 rounded-full bg-white shadow-2xs" />
                          </span>
                          <span>{c.status === 'PUBLISHED' && nowMs < endMs ? 'Bật' : 'Tắt'}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-xs tabular-nums">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {c.itemCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleCloneCampaign(c)}
                            aria-label={`Nhân bản chiến dịch ${c.name}`}
                            title="Nhân bản chiến dịch"
                            className="rounded-md p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void addTimeSlot(c)}
                            aria-label={`Thêm khung giờ ${c.name}`}
                            title="Nhân bản sang khung giờ tiếp theo"
                            className="rounded-md p-1.5 text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void openEditEditor(c)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                            title={isArchived ? 'Xem chiến dịch đã lưu trữ' : 'Sửa chiến dịch'}
                          >
                            {isArchived ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <Edit2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {!isArchived && (
                            <button
                              type="button"
                              onClick={() => void handleArchive(c)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="Lưu trữ chiến dịch"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <CampaignFormModal
        open={isEditorOpen}
        editingCampaign={editingCampaign}
        nowMs={nowMs}
        formName={formName}
        formDescription={formDescription}
        formEnabled={formEnabled}
        scheduleMode={scheduleMode}
        startDateStr={startDateStr}
        startTimeStr={startTimeStr}
        endDateStr={endDateStr}
        endTimeStr={endTimeStr}
        durationDaysStr={durationDaysStr}
        dailySlots={dailySlots}
        formItems={formItems}
        formRevision={formRevision}
        saving={saving}
        formError={formError}
        onClose={() => setIsEditorOpen(false)}
        onChangeName={setFormName}
        onChangeDescription={setFormDescription}
        onChangeEnabled={setFormEnabled}
        onChangeScheduleMode={setScheduleMode}
        onChangeStartDateStr={setStartDateStr}
        onChangeStartTimeStr={setStartTimeStr}
        onChangeEndDateStr={setEndDateStr}
        onChangeEndTimeStr={setEndTimeStr}
        onChangeDurationDaysStr={setDurationDaysStr}
        onChangeDailySlots={setDailySlots}
        onAddEmptyItem={handleAddItem}
        onPickerAddItems={(items) =>
          setFormItems((prev) => [
            ...prev,
            ...items.filter(
              (item) =>
                !prev.some(
                  (p) =>
                    p.productId === item.productId &&
                    (p.variantId || null) === item.variantId
                )
            ),
          ])
        }
        onRemoveItem={handleRemoveItem}
        onChangeItem={handleItemChange}
        onApplyBulkDiscountPct={applyBulkDiscountPct}
        onSave={(enabled) => void handleSave(enabled)}
        onCloneCampaign={(campaign) => void handleCloneCampaign(campaign)}
      />
    </div>
  );
}
