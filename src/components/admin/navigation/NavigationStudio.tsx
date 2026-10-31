'use client';
import { useDraftAutosave } from '../useDraftAutosave';
import SchedulePanel from '../SchedulePanel';
import DraftRecovery from '../DraftRecovery';
import { useCallback, useEffect, useState, useRef } from 'react';
import type {
  NavigationDetail,
  NavigationDocument,
  NavigationItem,
  NavigationTarget,
  ResolvedNavigation,
} from '@/contracts/cms/navigation';
import { navigationDocumentSchema } from '@/contracts/cms/navigation';
import MediaBrowser, { mediaRequest } from '../media/MediaBrowser';
import MediaDialog from '../media/MediaDialog';
import StudioAsset from '../products/StudioAsset';
import './navigation.css';
import PageHeader from '../ui/PageHeader';

type Tab = 'categories' | 'menus' | 'collections';
type Product = { id: string; name: string; status: string };

const freshItem = (): NavigationItem => ({
  id: crypto.randomUUID(),
  label: 'Mục mới',
  target: { kind: 'path', path: '/' },
  children: [],
});

function move<T>(items: T[], i: number, delta: number) {
  const next = [...items];
  [next[i], next[i + delta]] = [next[i + delta], next[i]];
  return next;
}

function Order({
  index,
  length,
  onMove,
  onRemove,
}: {
  index: number;
  length: number;
  onMove: (delta: number) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="nav-order">
      <button type="button" disabled={index === 0} onClick={() => onMove(-1)} title="Lên">
        ↑
      </button>
      <button type="button" disabled={index === length - 1} onClick={() => onMove(1)} title="Xuống">
        ↓
      </button>
      {onRemove && (
        <button type="button" className="nav-remove-btn" onClick={onRemove} title="Xóa">
          Xóa
        </button>
      )}
    </div>
  );
}

function ProductPicker({ onSelect }: { onSelect: (p: Product) => void }) {
  const [q, setQ] = useState(''),
    [page, setPage] = useState(1),
    [data, setData] = useState<{ items: Product[]; hasMore: boolean } | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      mediaRequest<{ items: Product[]; hasMore: boolean }>(
        `/api/admin/navigation/products?q=${encodeURIComponent(q)}&page=${page}`,
        { signal: controller.signal }
      )
        .then(setData)
        .catch(e => {
          if (!controller.signal.aborted) setError(e.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, page]);
  return (
    <div>
      <label>
        Tìm sản phẩm
        <input
          value={q}
          onChange={e => {
            setQ(e.target.value);
            setPage(1);
            setData(null);
            setError('');
          }}
        />
      </label>
      <p role="status">{error}</p>
      {!data ? (
        <p>Đang tải…</p>
      ) : (
        <>
          <div className="nav-picker">
            {data.items.map(p => (
              <button key={p.id} onClick={() => onSelect(p)}>
                {p.name}
                <small>{['ACTIVE', 'active'].includes(p.status) ? 'Đang bán' : 'Nháp'}</small>
              </button>
            ))}
            {!data.items.length && <p>Không tìm thấy sản phẩm.</p>}
          </div>
          <div className="nav-order">
            <button
              disabled={page === 1}
              onClick={() => {
                setData(null);
                setPage(page - 1);
              }}
            >
              Trước
            </button>
            <span>Trang {page}</span>
            <button
              disabled={!data.hasMore}
              onClick={() => {
                setData(null);
                setPage(page + 1);
              }}
            >
              Sau
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TargetEditor({
  value,
  onChange,
  doc,
  onProduct,
}: {
  value: NavigationTarget;
  onChange: (t: NavigationTarget) => void;
  doc: NavigationDocument;
  onProduct: () => void;
}) {
  return (
    <div className="nav-grid">
      <label>
        Loại đích
        <select
          value={value.kind}
          onChange={e => {
            const kind = e.target.value as NavigationTarget['kind'];
            if (kind === 'path') onChange({ kind, path: '/' });
            else if (kind === 'external') onChange({ kind, url: 'https://' });
            else
              onChange({
                kind,
                id: kind === 'category' ? doc.categories[0]?.id || '' : kind === 'collection' ? doc.collections[0]?.id || '' : '',
              });
          }}
        >
          <option value="category">Danh mục</option>
          <option value="collection">Bộ sưu tập</option>
          <option value="product">Sản phẩm</option>
          <option value="brand">Thương hiệu</option>
          <option value="landing">Landing</option>
          <option value="page">Trang</option>
          <option value="path">Đường dẫn nội bộ</option>
          <option value="external">URL ngoài</option>
        </select>
      </label>
      {value.kind === 'path' ? (
        <label>
          Đường dẫn
          <input value={value.path} onChange={e => onChange({ kind: 'path', path: e.target.value })} />
        </label>
      ) : value.kind === 'external' ? (
        <label>
          URL
          <input value={value.url} placeholder="https://..." onChange={e => onChange({ kind: 'external', url: e.target.value })} />
        </label>
      ) : value.kind === 'brand' ? (
        <label>
          Slug hãng
          <input value={value.id} placeholder="dell, asus..." onChange={e => onChange({ kind: 'brand', id: e.target.value })} />
        </label>
      ) : value.kind === 'landing' ? (
        <label>
          Slug Landing
          <input value={value.id} placeholder="slug-landing" onChange={e => onChange({ kind: 'landing', id: e.target.value })} />
        </label>
      ) : value.kind === 'page' ? (
        <label>
          Slug Trang
          <input
            value={value.id}
            placeholder="chinh-sach-bao-hanh"
            onChange={e => onChange({ kind: 'page', id: e.target.value })}
          />
        </label>
      ) : value.kind === 'product' ? (
        <button type="button" onClick={onProduct}>
          Chọn sản phẩm
        </button>
      ) : (
        <label>
          Đích đến
          <select value={value.id} onChange={e => onChange({ kind: value.kind, id: e.target.value })}>
            <option value="">Chọn đích đến</option>
            {(value.kind === 'category' ? doc.categories : doc.collections).map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
                {!c.visible ? ' (ẩn)' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export default function NavigationStudio({ initialTab = 'menus' }: { initialTab?: Tab }) {
  const [detail, setDetail] = useState<NavigationDetail | null>(null),
    [doc, setDoc] = useState<NavigationDocument | null>(null),
    [baseline, setBaseline] = useState('');
  const [tab, setTab] = useState<Tab>(initialTab),
    [location, setLocation] = useState<'main' | 'footer'>('main'),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const [imageFor, setImageFor] = useState<string | null>(null),
    [productSelect, setProductSelect] = useState<((p: Product) => void) | null>(null),
    [names, setNames] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ResolvedNavigation | null>(null),
    [previewMobile, setPreviewMobile] = useState(false),
    [leave, setLeave] = useState<(() => void) | null>(null);
  const latest = useRef(doc),
    lock = useRef(false);
  useEffect(() => {
    latest.current = doc;
  }, [doc]);
  const dirty = !!doc && JSON.stringify(doc) !== baseline;
  const adopt = useCallback((d: NavigationDetail) => {
    setDetail(d);
    setDoc(d.document);
    setNames(d.productNames);
    setBaseline(JSON.stringify(d.document));
  }, []);
  const load = () => {
    setBusy(true);
    return mediaRequest<NavigationDetail>('/api/admin/navigation')
      .then(adopt)
      .catch(e => setMessage(e.message))
      .finally(() => setBusy(false));
  };
  useEffect(() => {
    const controller = new AbortController();
    mediaRequest<NavigationDetail>('/api/admin/navigation', { signal: controller.signal })
      .then(adopt)
      .catch(e => {
        if (!controller.signal.aborted) setMessage(e.message);
      });
    return () => controller.abort();
  }, [adopt]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest('a');
      if (dirty && a?.href && a.target !== '_blank') {
        e.preventDefault();
        setLeave(() => () => {
          window.location.href = a.href;
        });
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
    };
  }, [dirty]);
  const update = <K extends keyof NavigationDocument>(key: K, value: NavigationDocument[K]) =>
    setDoc(d => (d ? { ...d, [key]: value } : d));
  const changeCategory = (id: string, patch: Partial<NavigationDocument['categories'][number]>) => {
    if (doc) update('categories', doc.categories.map(c => (c.id === id ? { ...c, ...patch } : c)));
  };
  const changeCollection = (id: string, patch: Partial<NavigationDocument['collections'][number]>) => {
    if (doc) update('collections', doc.collections.map(c => (c.id === id ? { ...c, ...patch } : c)));
  };
  async function save(action: 'save' | 'publish') {
    if (!doc || !detail || lock.current) return false;
    lock.current = true;
    setBusy(true);
    setMessage('');
    const submitted = JSON.stringify(doc);
    try {
      const result = await mediaRequest<NavigationDetail>('/api/admin/navigation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: detail.revision, action, document: doc }),
      });
      setDetail(result);
      setBaseline(JSON.stringify(result.document));
      if (JSON.stringify(latest.current) === submitted) setDoc(result.document);
      setMessage(action === 'publish' ? 'Đã xuất bản.' : 'Đã lưu nháp.');
      return true;
    } catch (e) {
      setMessage((e as Error).message);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const autosaveStatus = useDraftAutosave(doc, detail?.revision || 0, !!detail, dirty, busy, () => save('save'));

  async function showPreview() {
    setBusy(true);
    try {
      setPreview(
        await mediaRequest<ResolvedNavigation>('/api/admin/navigation/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doc),
        })
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function recover() {
    try {
      const value = sessionStorage.getItem('citilap-navigation-recovery');
      if (value) {
        setDoc(navigationDocumentSchema.parse(JSON.parse(value)));
        setMessage('Đã phục hồi.');
      } else setMessage('Không có bản phục hồi.');
    } catch {
      setMessage('Không thể đọc bản phục hồi.');
    }
  }
  function menuEditor(
    item: NavigationItem | NavigationItem['children'][number],
    onChange: (item: NavigationItem | NavigationItem['children'][number]) => void
  ) {
    return (
      <>
        <label>
          Nhãn
          <input value={item.label} onChange={e => onChange({ ...item, label: e.target.value })} />
        </label>
        <TargetEditor
          value={item.target}
          doc={doc!}
          onChange={target => onChange({ ...item, target })}
          onProduct={() =>
            setProductSelect(() => (p: Product) => {
              onChange({ ...item, target: { kind: 'product', id: p.id } });
              setNames(n => ({ ...n, [p.id]: p.name }));
            })
          }
        />
        {item.target.kind === 'product' && <small>{names[item.target.id] || 'Đã chọn sản phẩm'}</small>}
      </>
    );
  }

  return (
    <div className="navigation-studio">
      <PageHeader
        title={tab === 'categories' ? 'Danh mục' : tab === 'collections' ? 'Bộ sưu tập' : 'Menu'}
        description={tab === 'categories'
          ? 'Tạo nhóm sản phẩm, sau đó gán danh mục trong Sản phẩm. Menu quyết định lối truy cập; lưu nháp chưa cập nhật website.'
          : tab === 'collections'
            ? 'Gom sản phẩm chọn tay hoặc theo điều kiện. Xuất bản rồi gắn bộ sưu tập vào Menu hoặc khối Trang chủ.'
            : 'Chọn vị trí đầu trang hoặc chân trang, thêm mục và chọn đích đến. Xuất bản áp dụng chung cả danh mục, menu và bộ sưu tập.'}
        badge={
          detail && (
            <span className="text-xs px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-full font-mono">
              #{detail.revision} · {dirty ? 'Chưa lưu' : 'Đã lưu'}
            </span>
          )
        }
        actions={
          doc && (
            <div className="flex items-center gap-2">
              <button type="button" disabled={busy} onClick={() => void showPreview()}>
                Xem trước
              </button>
              <button type="button" disabled={busy} onClick={() => void save('save')}>
                Lưu nháp
              </button>
              <button type="button" className="nav-primary" disabled={busy} onClick={() => void save('publish')}>
                Xuất bản
              </button>
            </div>
          )
        }
      />

      {dirty && <DraftRecovery draft={doc} endpoint="/api/admin/navigation" />}
      {(message || autosaveStatus) && (
        <p role="status" aria-live="polite" className="nav-message">
          {message || autosaveStatus}
        </p>
      )}

      {!doc ? (
        <button onClick={load} disabled={busy}>
          {busy ? 'Đang tải…' : 'Tải lại dữ liệu'}
        </button>
      ) : (
        <>
          <div className="nav-top-bar">
            <nav className="nav-tabs" aria-label="Khu vực biên tập">
              {(['categories', 'menus', 'collections'] as Tab[]).map(t => (
                <button aria-pressed={tab === t} key={t} onClick={() => setTab(t)}>
                  {t === 'menus' ? `Menu` : t === 'categories' ? `Danh mục (${doc.categories.length})` : `Bộ sưu tập (${doc.collections.length})`}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {tab === 'categories' && (
                <button
                  type="button"
                  className="nav-primary"
                  onClick={() =>
                    update('categories', [
                      ...doc.categories,
                      {
                        id: crypto.randomUUID(),
                        name: 'Danh mục mới',
                        slug: '',
                        description: '',
                        parentId: null,
                        visible: true,
                        image: '',
                        assetId: '',
                        alt: '',
                      },
                    ])
                  }
                >
                  + Thêm danh mục
                </button>
              )}
              {tab === 'collections' && (
                <button
                  type="button"
                  className="nav-primary"
                  onClick={() =>
                    update('collections', [
                      ...doc.collections,
                      {
                        id: crypto.randomUUID(),
                        name: 'Bộ sưu tập mới',
                        slug: '',
                        description: '',
                        visible: true,
                        mode: 'manual',
                        productIds: [],
                        image: '',
                        rule: {
                          productType: 'all',
                          categoryId: null,
                          brandId: null,
                          tag: 'all',
                          availability: 'all',
                          sort: 'newest',
                          limit: 12,
                        },
                      },
                    ])
                  }
                >
                  + Thêm bộ sưu tập
                </button>
              )}
              {tab === 'menus' && (
                <>
                  <select
                    aria-label="Vị trí menu"
                    value={location}
                    onChange={e => setLocation(e.target.value as typeof location)}
                    style={{ width: 'auto' }}
                  >
                    <option value="main">Menu chính</option>
                    <option value="footer">Menu Footer</option>
                  </select>
                  <button
                    type="button"
                    className="nav-primary"
                    onClick={() =>
                      update('menus', { ...doc.menus, [location]: [...doc.menus[location], freshItem()] })
                    }
                  >
                    + Thêm mục
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Contextual Guidance Banner */}
          <div className="mb-3 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between gap-3">
            <div>
              {tab === 'categories' && (
                <p>
                  <strong className="text-slate-900">Danh mục sản phẩm:</strong> Phân loại cấu trúc ngành hàng (Laptop Gaming, Laptop Doanh nhân, Phụ kiện...). Hỗ trợ phân cấp cha/con và gán ảnh đại diện.
                </p>
              )}
              {tab === 'menus' && (
                <p>
                  <strong className="text-slate-900">Menu điều hướng:</strong> Cấu hình thanh Header (Mega menu danh mục, link chính sách...) và Chân trang (Footer) hiển thị trực tiếp ngoài Storefront.
                </p>
              )}
              {tab === 'collections' && (
                <p>
                  <strong className="text-slate-900">Bộ sưu tập:</strong> Nhóm sản phẩm linh hoạt theo chiến dịch hoặc phân khúc (VD: &quot;ThinkPad tuyển chọn dưới 15 triệu&quot;) để gắn lên Block trang chủ hoặc Menu.
                </p>
              )}
            </div>
            {dirty && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 shrink-0">
                Có thay đổi nháp
              </span>
            )}
          </div>

          <fieldset disabled={busy}>
            {tab === 'categories' && (
              <section>
                {doc.categories.map((c, i) => (
                  <details className="nav-card" key={c.id} open={i === 0 || !c.slug}>
                    <summary>
                      <span>
                        {i + 1}. {c.name}
                      </span>
                      <small>
                        {c.slug ? `/${c.slug}` : 'Chưa có slug'} · {c.visible ? 'Hiển thị' : 'Đang ẩn'}
                      </small>
                    </summary>
                    <div className="nav-card-body">
                      <div className="nav-grid">
                        <label>
                          Tên danh mục
                          <input value={c.name} onChange={e => changeCategory(c.id, { name: e.target.value })} />
                        </label>
                        <label>
                          Slug
                          <input value={c.slug} onChange={e => changeCategory(c.id, { slug: e.target.value })} />
                        </label>
                        <label>
                          Danh mục cha
                          <select
                            value={c.parentId || ''}
                            onChange={e => changeCategory(c.id, { parentId: e.target.value || null })}
                          >
                            <option value="">Không có</option>
                            {doc.categories
                              .filter(x => x.id !== c.id)
                              .map(x => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label className="nav-check">
                          <input
                            type="checkbox"
                            checked={c.visible}
                            onChange={e => changeCategory(c.id, { visible: e.target.checked })}
                          />
                          Hiển thị trên web
                        </label>
                      </div>
                      <label>
                        Mô tả ngắn
                        <input
                          value={c.description}
                          onChange={e => changeCategory(c.id, { description: e.target.value })}
                        />
                      </label>
                      <div className="nav-image">
                        {c.assetId && <StudioAsset id={c.assetId} />}
                        <button type="button" onClick={() => setImageFor(c.id)}>
                          Chọn ảnh
                        </button>
                        {(c.assetId || c.image) && (
                          <>
                            <input
                              placeholder="Mô tả ảnh (ALT)"
                              value={c.alt}
                              onChange={e => changeCategory(c.id, { alt: e.target.value })}
                              style={{ flex: 1 }}
                            />
                            <button type="button" onClick={() => changeCategory(c.id, { assetId: '', image: '' })}>
                              Bỏ ảnh
                            </button>
                          </>
                        )}
                        <div style={{ marginLeft: 'auto' }}>
                          <Order
                            index={i}
                            length={doc.categories.length}
                            onMove={delta => update('categories', move(doc.categories, i, delta))}
                            onRemove={
                              detail?.categoryIds.includes(c.id)
                                ? undefined
                                : () => update('categories', doc.categories.filter(x => x.id !== c.id))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </details>
                ))}
              </section>
            )}

            {tab === 'collections' && (
              <section>
                {!doc.collections.length && <p className="nav-empty">Chưa có bộ sưu tập.</p>}
                {doc.collections.map((c, i) => {
                  const baseRule = c.rule || {
                    productType: 'all',
                    categoryId: null,
                    brandId: null,
                    tag: 'all',
                    availability: 'all',
                    sort: 'newest',
                    limit: 12,
                  };
                  return (
                    <details className="nav-card" key={c.id} open={i === 0 || !c.slug}>
                      <summary>
                        <span>
                          {i + 1}. {c.name}
                        </span>
                        <small>
                          {c.mode === 'rule' ? 'Tự động' : `${c.productIds.length} SP`} · {c.visible ? 'Hiển thị' : 'Đang ẩn'}
                        </small>
                      </summary>
                      <div className="nav-card-body">
                        <div className="nav-grid">
                          <label>
                            Tên bộ sưu tập
                            <input value={c.name} onChange={e => changeCollection(c.id, { name: e.target.value })} />
                          </label>
                          <label>
                            Slug
                            <input value={c.slug} onChange={e => changeCollection(c.id, { slug: e.target.value })} />
                          </label>
                          <label>
                            Chế độ
                            <select
                              value={c.mode || 'manual'}
                              onChange={e => changeCollection(c.id, { mode: e.target.value as 'manual' | 'rule' })}
                            >
                              <option value="manual">Chọn thủ công</option>
                              <option value="rule">Tự động theo điều kiện</option>
                            </select>
                          </label>
                          <label className="nav-check">
                            <input
                              type="checkbox"
                              checked={c.visible}
                              onChange={e => changeCollection(c.id, { visible: e.target.checked })}
                            />
                            Hiển thị
                          </label>
                        </div>
                        <label>
                          Mô tả
                          <input
                            value={c.description}
                            onChange={e => changeCollection(c.id, { description: e.target.value })}
                          />
                        </label>
                        {c.mode === 'rule' ? (
                          <div className="nav-grid">
                            <label>
                              Loại
                              <select
                                value={baseRule.productType}
                                onChange={e =>
                                  changeCollection(c.id, {
                                    rule: { ...baseRule, productType: e.target.value as 'all' | 'laptop' | 'accessory' },
                                  })
                                }
                              >
                                <option value="all">Tất cả</option>
                                <option value="laptop">Laptop</option>
                                <option value="accessory">Phụ kiện</option>
                              </select>
                            </label>
                            <label>
                              Sắp xếp
                              <select
                                value={baseRule.sort}
                                onChange={e =>
                                  changeCollection(c.id, {
                                    rule: {
                                      ...baseRule,
                                      sort: e.target.value as 'newest' | 'price-asc' | 'price-desc' | 'name-asc',
                                    },
                                  })
                                }
                              >
                                <option value="newest">Mới nhất</option>
                                <option value="price-asc">Giá ↑</option>
                                <option value="price-desc">Giá ↓</option>
                                <option value="name-asc">Tên A–Z</option>
                              </select>
                            </label>
                            <label>
                              Giới hạn
                              <input
                                type="number"
                                min={1}
                                max={48}
                                value={baseRule.limit}
                                onChange={e =>
                                  changeCollection(c.id, {
                                    rule: { ...baseRule, limit: parseInt(e.target.value) || 12 },
                                  })
                                }
                              />
                            </label>
                          </div>
                        ) : (
                          <>
                            <ol className="nav-products">
                              {c.productIds.map((id, j) => (
                                <li key={id}>
                                  <span>{names[id] || 'Sản phẩm ' + (j + 1)}</span>
                                  <Order
                                    index={j}
                                    length={c.productIds.length}
                                    onMove={delta =>
                                      changeCollection(c.id, { productIds: move(c.productIds, j, delta) })
                                    }
                                    onRemove={() =>
                                      changeCollection(c.id, { productIds: c.productIds.filter(x => x !== id) })
                                    }
                                  />
                                </li>
                              ))}
                            </ol>
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                disabled={c.productIds.length >= 48}
                                onClick={() =>
                                  setProductSelect(() => (p: Product) => {
                                    changeCollection(c.id, { productIds: [...new Set([...c.productIds, p.id])] });
                                    setNames(n => ({ ...n, [p.id]: p.name }));
                                  })
                                }
                              >
                                + Chọn sản phẩm
                              </button>
                              <Order
                                index={i}
                                length={doc.collections.length}
                                onMove={delta => update('collections', move(doc.collections, i, delta))}
                                onRemove={() =>
                                  update(
                                    'collections',
                                    doc.collections.filter(x => x.id !== c.id)
                                  )
                                }
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </details>
                  );
                })}
              </section>
            )}

            {tab === 'menus' && (
              <section>
                {!doc.menus[location].length && <p className="nav-empty">Chưa có mục menu.</p>}
                {doc.menus[location].map((item, i) => {
                  const items = doc.menus[location];
                  const replace = (next: NavigationItem) =>
                    update('menus', { ...doc.menus, [location]: items.map(x => (x.id === item.id ? next : x)) });
                  return (
                    <details key={item.id} className="nav-card" open={i === 0}>
                      <summary>
                        <span>
                          {i + 1}. {item.label}
                        </span>
                        <small>{item.children.length > 0 ? `${item.children.length} mục con` : item.target.kind}</small>
                      </summary>
                      <div className="nav-card-body">
                        {menuEditor(item, next => replace(next as NavigationItem))}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            disabled={item.children.length >= 16}
                            onClick={() => {
                              const child = freshItem();
                              replace({
                                ...item,
                                children: [...item.children, { id: child.id, label: child.label, target: child.target }],
                              });
                            }}
                          >
                            + Mục con
                          </button>
                          <Order
                            index={i}
                            length={items.length}
                            onMove={delta => update('menus', { ...doc.menus, [location]: move(items, i, delta) })}
                            onRemove={() =>
                              update('menus', { ...doc.menus, [location]: items.filter(x => x.id !== item.id) })
                            }
                          />
                        </div>
                        {item.children.length > 0 && (
                          <div className="nav-children">
                            {item.children.map((child, j) => (
                              <div key={child.id} className="nav-child">
                                <div className="flex items-center justify-between">
                                  <h3>Mục con {j + 1}</h3>
                                  <Order
                                    index={j}
                                    length={item.children.length}
                                    onMove={delta =>
                                      replace({ ...item, children: move(item.children, j, delta) })
                                    }
                                    onRemove={() =>
                                      replace({
                                        ...item,
                                        children: item.children.filter(x => x.id !== child.id),
                                      })
                                    }
                                  />
                                </div>
                                {menuEditor(child, next =>
                                  replace({
                                    ...item,
                                    children: item.children.map(x => (x.id === child.id ? next : x)),
                                  })
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </section>
            )}

            <div className="nav-footer-actions">
              <SchedulePanel entityType="navigation" entityId="site" revision={detail?.revision || 0} dirty={dirty || busy} />
              <button
                type="button"
                onClick={() => {
                  if (dirty) setLeave(() => () => void load());
                  else void load();
                }}
              >
                Tải lại
              </button>
              <button type="button" onClick={recover}>
                Phục hồi
              </button>
            </div>
          </fieldset>
        </>
      )}
      {imageFor && doc && (
        <MediaDialog title="Chọn ảnh danh mục" onClose={() => setImageFor(null)}>
          <MediaBrowser
            picker
            onSelect={a => {
              changeCategory(imageFor, { assetId: a.id, image: '', alt: a.alt || a.name });
              setImageFor(null);
            }}
          />
        </MediaDialog>
      )}
      {productSelect && (
        <MediaDialog title="Chọn sản phẩm" onClose={() => setProductSelect(null)}>
          <ProductPicker
            onSelect={p => {
              productSelect(p);
              setProductSelect(null);
            }}
          />
        </MediaDialog>
      )}
      {preview && (
        <MediaDialog title="Xem trước điều hướng" onClose={() => setPreview(null)}>
          <div className="nav-order">
            <button aria-pressed={!previewMobile} onClick={() => setPreviewMobile(false)}>
              Desktop
            </button>
            <button aria-pressed={previewMobile} onClick={() => setPreviewMobile(true)}>
              Mobile
            </button>
          </div>
          <div className={'nav-preview' + (previewMobile ? ' is-mobile' : '')}>
            <h3>Menu chính</h3>
            <ul>
              {preview.menus.main.map(i => (
                <li key={i.id}>
                  <strong>{i.label}</strong>
                  <small>{i.href}</small>
                  {i.children.map(c => (
                    <div key={c.id}>
                      {c.label}
                      <small>{c.href}</small>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
            <h3>Danh mục</h3>
            <div className="nav-preview-grid">
              {preview.categories.map(c => (
                <div key={c.id}>{c.name}</div>
              ))}
            </div>
            <h3>Bộ sưu tập</h3>
            {preview.collections.map(c => (
              <p key={c.id}>
                {c.name}
                <small>{c.href}</small>
              </p>
            ))}
            <h3>Footer</h3>
            <ul>
              {preview.menus.footer.map(i => (
                <li key={i.id}>
                  {i.label}
                  <small>{i.href}</small>
                  {i.children.map(c => (
                    <div key={c.id}>
                      {c.label}
                      <small>{c.href}</small>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        </MediaDialog>
      )}
      {leave && (
        <MediaDialog title="Có thay đổi chưa lưu" onClose={() => setLeave(null)}>
          <p>Tiếp tục sẽ bỏ các thay đổi chưa lưu.</p>
          <div className="nav-order">
            <button onClick={() => setLeave(null)}>Tiếp tục sửa</button>
            <button
              onClick={() => {
                leave();
                setLeave(null);
              }}
            >
              Bỏ thay đổi
            </button>
          </div>
        </MediaDialog>
      )}
    </div>
  );
}
