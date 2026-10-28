'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Mail,
  ShieldCheck,
  Edit2,
  X,
  User,
} from 'lucide-react';
import {
  PageHeader,
  AdminCard,
  AdminButton,
  StatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  InlineAlert,
} from '@/components/admin/ui';

type Role = 'OWNER' | 'EDITOR' | 'SALES';

interface Account {
  id: string;
  email: string;
  name: string;
  role: Role;
  disabled: number;
  piiExport: number;
  revision: number;
}

const ROLE_INFO: Record<Role, { label: string; desc: string; color: string; badge: 'purple' | 'blue' | 'green' }> = {
  OWNER: {
    label: 'Chủ cửa hàng (Owner)',
    desc: 'Toàn quyền cấu hình hệ thống, quản lý tài khoản & phân quyền, tài chính.',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    badge: 'purple',
  },
  EDITOR: {
    label: 'Biên tập viên (Editor)',
    desc: 'Quản lý toàn bộ nội dung, sản phẩm, bài viết, trang tĩnh, chiến dịch.',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    badge: 'blue',
  },
  SALES: {
    label: 'Nhân viên bán hàng (Sales)',
    desc: 'Xử lý đơn hàng, liên hệ khách hàng. Không can thiệp cấu hình hệ thống.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badge: 'green',
  },
};

const blankForm = {
  email: '',
  name: '',
  role: 'EDITOR' as Role,
  disabled: false,
  piiExport: false,
  password: '',
};

export default function AdminUsersPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role | 'DISABLED'>('ALL');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/users', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Lỗi khi tải danh sách tài khoản');
      setAccounts(Array.isArray(j.data) ? j.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đọc tài khoản. Kiểm tra quyền hoặc thử lại.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function handleStartEdit(account: Account) {
    setEditing(account);
    setForm({
      email: account.email,
      name: account.name,
      role: account.role,
      disabled: Boolean(account.disabled),
      piiExport: Boolean(account.piiExport),
      password: '',
    });
    setError('');
    setSuccess('');
    // Scroll form into view if needed
    const formElement = document.getElementById('user-form-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleCancelEdit() {
    setEditing(null);
    setForm(blankForm);
    setError('');
    setSuccess('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const { password, ...fields } = form;
      const payload: Record<string, unknown> = {
        ...fields,
        ...(password ? { password } : {}),
        ...(editing ? { id: editing.id, expectedRevision: editing.revision } : {}),
      };

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể lưu tài khoản');

      setSuccess(editing ? 'Đã cập nhật thông tin tài khoản thành công.' : 'Đã tạo tài khoản quản trị mới.');
      setEditing(null);
      setForm(blankForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu tài khoản');
    } finally {
      setBusy(false);
    }
  }

  // Filter accounts by tab & search query
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Role filter
      if (roleFilter === 'DISABLED') {
        if (!acc.disabled) return false;
      } else if (roleFilter !== 'ALL') {
        if (acc.role !== roleFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = acc.name.toLowerCase().includes(q);
        const matchEmail = acc.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }

      return true;
    });
  }, [accounts, roleFilter, searchQuery]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: accounts.length,
      owner: accounts.filter((a) => a.role === 'OWNER').length,
      editor: accounts.filter((a) => a.role === 'EDITOR').length,
      sales: accounts.filter((a) => a.role === 'SALES').length,
      disabled: accounts.filter((a) => a.disabled).length,
    };
  }, [accounts]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <PageHeader
        title="Thành viên & Phân quyền"
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {counts.all} tài khoản
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => void load()}
              loading={loading}
            >
              Làm mới
            </AdminButton>
            <AdminButton
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={() => {
                setEditing(null);
                setForm(blankForm);
                const el = document.getElementById('user-form-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Thêm thành viên
            </AdminButton>
          </div>
        }
      />

      {/* Alerts */}
      {error && (
        <InlineAlert
          variant="error"
          title="Không thể thực hiện"
          onClose={() => setError('')}
        >
          {error}
        </InlineAlert>
      )}
      {success && (
        <InlineAlert
          variant="success"
          title="Thao tác thành công"
          onClose={() => setSuccess('')}
        >
          {success}
        </InlineAlert>
      )}

      {/* Main Grid: 8 Cols Table + 4 Cols Form */}
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Left Column: Accounts Table (8 cols) */}
        <div className="col-span-8">
          <AdminCard bodyClassName="p-0">
            {/* Role tabs + search */}
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 flex-wrap">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    roleFilter === 'ALL'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Tất cả <span className="opacity-75">({counts.all})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('OWNER')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    roleFilter === 'OWNER'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Chủ shop <span className="opacity-75">({counts.owner})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('EDITOR')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    roleFilter === 'EDITOR'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Biên tập <span className="opacity-75">({counts.editor})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('SALES')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    roleFilter === 'SALES'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Bán hàng <span className="opacity-75">({counts.sales})</span>
                </button>
                {counts.disabled > 0 && (
                  <button
                    type="button"
                    onClick={() => setRoleFilter('DISABLED')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      roleFilter === 'DISABLED'
                        ? 'bg-rose-600 text-white font-semibold'
                        : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    Đã khóa <span className="opacity-75">({counts.disabled})</span>
                  </button>
                )}
              </div>

              {/* Quick Search Input */}
              <div className="relative w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên hoặc email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-12">
                <AdminLoadingState message="Đang tải danh sách thành viên..." />
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-12">
                <AdminEmptyState
                  title="Không tìm thấy tài khoản"
                  description={
                    searchQuery
                      ? `Không có thành viên nào khớp với từ khóa "${searchQuery}".`
                      : 'Chưa có tài khoản nào trong bộ lọc này.'
                  }
                  action={
                    searchQuery ? (
                      <AdminButton variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                        Xóa tìm kiếm
                      </AdminButton>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Thành viên</th>
                      <th className="py-2.5 px-3.5">Vai trò</th>
                      <th className="py-2.5 px-3.5">Xuất PII</th>
                      <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                      <th className="py-2.5 px-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAccounts.map((acc) => {
                      const roleConfig = ROLE_INFO[acc.role] || {
                        label: acc.role,
                        color: 'bg-slate-100 text-slate-700 border-slate-200',
                      };
                      const isOwner = acc.role === 'OWNER';
                      const initial = acc.name ? acc.name.charAt(0).toUpperCase() : 'U';
                      const isSelected = editing?.id === acc.id;

                      return (
                        <tr
                          key={acc.id}
                          className={`hover:bg-blue-50/40 transition group ${
                            isSelected ? 'bg-blue-50/60 font-medium' : ''
                          }`}
                        >
                          {/* Member info */}
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                                  isOwner
                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                    : acc.role === 'EDITOR'
                                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition flex items-center gap-1">
                                  <span>{acc.name}</span>
                                  {isOwner && (
                                    <span title="Chủ sở hữu hệ thống">
                                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600 inline" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono truncate">
                                  {acc.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-2.5 px-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleConfig.color}`}
                            >
                              {roleConfig.label.split(' (')[0]}
                            </span>
                          </td>

                          {/* PII Export permission */}
                          <td className="py-2.5 px-3.5">
                            {acc.piiExport ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Có
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3.5 text-center">
                            {acc.disabled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                <Lock className="w-3 h-3 text-rose-500" />
                                Khóa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Bật
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-2.5 px-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(acc)}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              Sửa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Tối đa 200 tài khoản nội bộ</span>
              <span>Hiển thị {filteredAccounts.length} / {accounts.length}</span>
            </div>
          </AdminCard>
        </div>

        {/* Right Column: Add/Edit User Card Form (4 cols) */}
        <div className="col-span-4 sticky top-16" id="user-form-card">
          <AdminCard
            title={editing ? `Sửa: ${editing.name}` : 'Thêm tài khoản mới'}
          >
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@citilap.vn"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vai trò <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="OWNER">Chủ cửa hàng (Owner) — Toàn quyền</option>
                  <option value="EDITOR">Biên tập viên (Editor) — Nội dung & SP</option>
                  <option value="SALES">Nhân viên (Sales) — Đơn & Khách</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {editing ? 'Mật khẩu mới (trống = giữ nguyên)' : 'Mật khẩu (tối thiểu 12 ký tự)'} {!editing && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required={!editing}
                  minLength={12}
                  maxLength={200}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editing ? 'Để trống nếu không đổi...' : 'Nhập tối thiểu 12 ký tự...'}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.piiExport}
                    onChange={(e) => setForm({ ...form, piiExport: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-800">Cho phép xuất dữ liệu khách hàng (PII)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.disabled}
                    onChange={(e) => setForm({ ...form, disabled: e.target.checked })}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-rose-700">Khóa tài khoản (chặn đăng nhập)</span>
                </label>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <AdminButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={busy}
                  disabled={busy}
                  className="flex-1 justify-center"
                >
                  {busy ? 'Đang lưu...' : editing ? 'Cập nhật tài khoản' : 'Tạo tài khoản'}
                </AdminButton>

                {editing && (
                  <AdminButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    Hủy
                  </AdminButton>
                )}
              </div>
            </form>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
