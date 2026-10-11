'use client';
import { useEffect, useState } from 'react';
import { attributeTemplates, availabilityLabels, blankProduct, type ProductDocument } from '@/contracts/cms/product-studio';
import MediaBrowser, { mediaRequest } from '../media/MediaBrowser';
import MediaDialog from '../media/MediaDialog';
import './studio.css';
import StudioAsset from './StudioAsset';
import MediaUpload from '../media/MediaUpload';

type Detail = { id: string; revision: number; document: ProductDocument; published: boolean };
type Listing = { items: { id: string; name: string; draftName: string | null; status: string }[]; categories: { id: string; name: string }[] };
const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
export default function ProductStudio() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [doc, setDoc] = useState<ProductDocument | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [baseline, setBaseline] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [mediaRefresh, setMediaRefresh] = useState(0);
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const dirty = !!doc && JSON.stringify(doc) !== baseline;
  const load = () => mediaRequest<Listing>('/api/admin/product-studio').then(setListing).catch(e => setMessage(e.message));
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    const linkHandler = (e: MouseEvent) => { const a = (e.target as Element).closest('a'); if (dirty && a?.href && a.target !== '_blank') { e.preventDefault(); setLeave(() => () => { window.location.href = a.href; }); } };
    document.addEventListener('click', linkHandler, true);
    return () => { window.removeEventListener('beforeunload',handler); document.removeEventListener('click',linkHandler,true); };
  }, [dirty]);
  const transition = (fn: () => void) => { if (dirty) setLeave(() => fn); else fn(); };
  const open = async (id: string) => { setBusy(true); setMessage(''); try { const d = await mediaRequest<Detail>(`/api/admin/product-studio/${id}`); setDetail(d); setDoc(d.document); setBaseline(JSON.stringify(d.document)); setListOpen(false); } catch(e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  const start = () => { setListOpen(false); setDetail(null); const d = blankProduct(); setDoc(d); setBaseline(JSON.stringify(d)); setMessage(''); };
  const update = <K extends keyof ProductDocument>(k: K, value: ProductDocument[K]) => setDoc(d => d ? { ...d, [k]: value } : d);
  async function save(action: 'save' | 'publish' | 'unpublish') {
    if (!doc) return; setBusy(true); setMessage('');
    try {
      const result = await mediaRequest<Detail>(`/api/admin/product-studio${detail ? '/' + detail.id : ''}`, { method: detail ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: detail?.revision ?? 0, action, document: doc }) });
      setDetail(result); setDoc(result.document); setBaseline(JSON.stringify(result.document));
      setMessage(action === 'publish' ? 'Đã xuất bản sản phẩm.' : action === 'unpublish' ? 'Đã ẩn sản phẩm khỏi web.' : 'Đã lưu nháp.');
      sessionStorage.removeItem('citilap-product-recovery'); void load();
    } catch(e) { sessionStorage.setItem('citilap-product-recovery',JSON.stringify({ doc, id: detail?.id ?? null })); setMessage((e as Error).message + ' Nội dung vẫn được giữ trong trình soạn thảo; đã lưu bản phục hồi trên trình duyệt.'); }
    finally { setBusy(false); }
  }
  function recover() { try { const recovery = JSON.parse(sessionStorage.getItem('citilap-product-recovery') || 'null'); if (recovery) { if (recovery.id !== (detail?.id ?? null)) { setMessage('Mở đúng sản phẩm trước khi phục hồi bản sửa.'); return; } setDoc(recovery.doc); setMessage('Đã phục hồi nội dung. Kiểm tra trước khi lưu.'); } else setMessage('Không có bản phục hồi.'); } catch { setMessage('Không thể đọc bản phục hồi.'); } }
  const field = (label: string, key: 'name'|'slug'|'brand'|'seoTitle'|'seoDescription'|'description'|'contentHtml') => <label>{label}{['description','contentHtml','seoDescription'].includes(key) ? <textarea rows={key === 'contentHtml' ? 8 : 3} value={doc?.[key] || ''} onChange={e => update(key,e.target.value)} /> : <input value={doc?.[key] || ''} onChange={e => update(key,e.target.value)} />}</label>;
  return <div className="studio"><header className="studio-heading"><div><p className="studio-eyebrow">CITILAP / BIÊN TẬP CATALOG</p><h1>Product Studio</h1><p>Nội dung sản phẩm, cấu hình và trải nghiệm trên cửa hàng.</p></div><button onClick={() => transition(start)} disabled={busy}>+ Tạo sản phẩm</button></header>
    <div role="status" aria-live="polite">{message}</div>
    {!listing && <button onClick={load}>Tải lại danh sách</button>}
    {listing && <div className="studio-layout"><aside className="studio-panel studio-list">
      <div className="studio-list-header">
        <div><h2>Sản phẩm</h2><small>{detail ? (doc?.name || 'Đang biên tập') : listing.items.length + ' sản phẩm gần nhất'}</small></div>
        <button type="button" className="studio-list-toggle" aria-controls="studio-product-list" aria-expanded={listOpen} onClick={() => setListOpen(value => !value)}>{listOpen ? 'Đóng danh sách' : 'Chọn sản phẩm'}</button>
      </div>
      <div id="studio-product-list" className={'studio-list-content' + (listOpen ? ' is-open' : '')}>
        <label>Tìm sản phẩm<input value={search} onChange={e => setSearch(e.target.value)} /></label>
        <p>{listing.items.length} sản phẩm gần nhất</p>
        {listing.items.filter(p => (p.draftName || p.name).toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(p =>
          <button type="button" className={'studio-product-button' + (detail?.id === p.id ? ' selected' : '')} key={p.id} disabled={busy} onClick={() => transition(() => void open(p.id))}>
            {p.draftName || p.name}<small>{p.status === 'ACTIVE' ? 'Đã xuất bản' : 'Bản nháp / đã ẩn'}</small>
          </button>
        )}
        {!listing.items.length && <p>Chưa có sản phẩm. Tạo bản nháp đầu tiên.</p>}
      </div>
    </aside>
    {!doc ? <section className="studio-panel"><h2>Sẵn sàng cho sản phẩm tiếp theo</h2><p>Chọn sản phẩm để biên tập hoặc tạo laptop, phụ kiện và đồ chơi công nghệ mới.</p><button onClick={start}>Tạo bản nháp</button><button onClick={recover}>Phục hồi bản sửa</button></section> : <main className="studio-editor"><div className="studio-toolbar">
      <div className="studio-toolbar-state">
        <span>{detail ? 'Phiên bản ' + detail.revision : 'Sản phẩm mới'}</span>
        <strong className={'studio-save-state' + (dirty ? ' is-dirty' : '')}>{dirty ? 'Chưa lưu' : 'Đã đồng bộ'}</strong>
      </div>
      <div className="studio-toolbar-actions">
        <button type="button" disabled={busy} onClick={() => void save('save')}>Lưu nháp</button>
        <button type="button" disabled={busy} onClick={() => setPreview(true)}>Xem trước</button>
        <button type="button" className="primary" disabled={busy} onClick={() => void save('publish')}>Xuất bản</button>
        {detail?.published && <button type="button" disabled={busy} onClick={() => void save('unpublish')}>Ẩn khỏi web</button>}
      </div>
    </div>
    <fieldset disabled={busy}><section className="studio-panel"><h2>01 · Thông tin sản phẩm</h2><div className="studio-grid">{field('Tên sản phẩm','name')}{field('Slug','slug')}<label>Danh mục<select aria-label="Danh mục" value={doc.categoryId} onChange={e => update('categoryId',e.target.value)}><option value="">Chọn danh mục</option>{listing.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{field('Thương hiệu','brand')}<label>Giá bán (VND)<input type="number" min="0" value={doc.price} onChange={e => update('price',Number(e.target.value))} /></label><label>Giá gốc (VND)<input type="number" min="0" value={doc.originalPrice ?? ''} onChange={e => update('originalPrice',e.target.value === '' ? null : Number(e.target.value))} /></label><label>Trạng thái trên web<select aria-label="Trạng thái trên web" value={doc.availability} onChange={e => update('availability',e.target.value as ProductDocument['availability'])}>{Object.entries(availabilityLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label></div>{field('Mô tả ngắn','description')}</section>
    <section className="studio-panel"><h2>02 · Thông số</h2><label>Mẫu thông số<select aria-label="Mẫu thông số" value={doc.template} onChange={e => { const template = e.target.value as ProductDocument['template']; setDoc({ ...doc, template, specs: attributeTemplates[template].map(key => ({ key, value: doc.specs.find(s => s.key === key)?.value || '' })) }); }}><option value="LAPTOP">Laptop</option><option value="MOUSE">Chuột</option><option value="ACCESSORY">Phụ kiện</option><option value="TECH">Đồ chơi công nghệ</option></select></label><div className="studio-grid">{doc.specs.map((s,i) => <label key={s.key}>{s.key}<input value={s.value} onChange={e => update('specs',doc.specs.map((x,j) => j === i ? { ...x,value:e.target.value } : x))} /></label>)}</div></section>
    <section className="studio-panel"><h2>03 · Ảnh & video</h2>
      <p>Ảnh đầu tiên là ảnh đại diện. Chọn ảnh hoặc video đã đăng trong Thư viện.</p>
      <button type="button" onClick={() => setPicker(true)}>Chọn từ thư viện</button>
      {doc.media.map((m,i) => <div className="studio-media-item" key={m.assetId}>
        <div className="studio-media-preview">
          <span className="studio-media-index">{i === 0 ? '01 · Ảnh đại diện' : 'Media ' + (i + 1)}</span>
          <StudioAsset id={m.assetId} />
        </div>
        <div className="studio-media-fields">
          <label>Mô tả media {i+1}<input value={m.alt} onChange={e => update('media',doc.media.map((x,j) => j === i ? { ...x,alt:e.target.value } : x))} /></label>
          <label>Ảnh cho cấu hình
            <select aria-label="Ảnh cho cấu hình" value={m.variantId} onChange={e => update('media',doc.media.map((x,j) => j === i ? { ...x,variantId:e.target.value } : x))}>
              <option value="">Tất cả</option>
              {doc.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
          <div className="studio-media-actions">
            <button type="button" disabled={i === 0} aria-label={'Chuyển media ' + (i+1) + ' lên'} onClick={() => { const media = [...doc.media]; [media[i-1],media[i]] = [media[i],media[i-1]]; update('media',media); }}>Lên</button>
            <button type="button" disabled={i === doc.media.length - 1} aria-label={'Chuyển media ' + (i+1) + ' xuống'} onClick={() => { const media = [...doc.media]; [media[i+1],media[i]] = [media[i],media[i+1]]; update('media',media); }}>Xuống</button>
            <button type="button" aria-label={'Bỏ chọn media ' + (i+1)} onClick={() => update('media',doc.media.filter((_,j) => j !== i))}>Bỏ chọn</button>
          </div>
        </div>
      </div>)}
    </section>
    <section className="studio-panel"><h2>04 · Cấu hình & tình trạng</h2>{doc.variants.map((v,i) => <div className="studio-subpanel" key={v.id}><div className="studio-subpanel-header"><h3>Cấu hình {i+1} · {v.name || "Chưa đặt tên"}</h3></div><div className="studio-grid">{(['name','sku','ram','storage','gpu'] as const).map((k,j) => <label key={k}>{['Tên cấu hình','SKU','RAM','SSD','GPU'][j]}<input value={v[k]} onChange={e => update('variants',doc.variants.map((x,n) => n === i ? { ...x,[k]:e.target.value } : x))} /></label>)}<label>Giá cấu hình<input type="number" value={v.price} onChange={e => update('variants',doc.variants.map((x,n) => n === i ? { ...x,price:Number(e.target.value) } : x))} /></label><label>Tình trạng<select aria-label="Tình trạng" value={v.condition} onChange={e => update('variants',doc.variants.map((x,n) => n === i ? { ...x,condition:e.target.value as typeof v.condition } : x))}><option value="NEW">Mới 100%</option><option value="LIKE_NEW">Like New</option><option value="USED">Đã sử dụng</option><option value="REFURBISHED">Tân trang</option></select></label></div><button onClick={() => setDoc({ ...doc,variants:doc.variants.filter((_,n) => n !== i),media:doc.media.map(m => m.variantId === v.id ? { ...m,variantId:'' } : m) })}>Bỏ cấu hình</button></div>)}<button onClick={() => update('variants',[...doc.variants,{ id:crypto.randomUUID(),name:'',sku:'',condition:'NEW',price:doc.price,ram:'',storage:'',gpu:'' }])}>+ Thêm cấu hình</button></section>
    <section className="studio-panel"><h2>05 · Gói bảo hành</h2>{doc.warranties.map((w,i) => <div className="studio-subpanel" key={i}><div className="studio-subpanel-header"><h3>Gói bảo hành {i+1} · {w.name || "Chưa đặt tên"}</h3></div><div className="studio-grid"><label>Tên gói<input value={w.name} onChange={e => update('warranties',doc.warranties.map((x,j) => j === i ? { ...x,name:e.target.value } : x))} /></label><label>Điều chỉnh giá (VND)<input type="number" value={w.adjustment} onChange={e => update('warranties',doc.warranties.map((x,j) => j === i ? { ...x,adjustment:Number(e.target.value) } : x))} /></label><label>Mô tả bảo hành<input value={w.description} onChange={e => update('warranties',doc.warranties.map((x,j) => j === i ? { ...x,description:e.target.value } : x))} /></label><label><input type="checkbox" checked={w.recommended} onChange={e => update('warranties',doc.warranties.map((x,j) => ({ ...x,recommended:j === i ? e.target.checked : false })))} /> Khuyên dùng</label></div><button onClick={() => update('warranties',doc.warranties.filter((_,j) => j !== i))}>Bỏ gói</button></div>)}<button onClick={() => update('warranties',[...doc.warranties,{ name:'',description:'',adjustment:0,recommended:false }])}>+ Thêm gói bảo hành</button></section>
    <section className="studio-panel"><h2>06 · Bài giới thiệu & SEO</h2>{field('Nội dung bài giới thiệu (HTML cơ bản)','contentHtml')}<div className="studio-grid">{field('Tiêu đề SEO','seoTitle')}{field('Mô tả SEO','seoDescription')}</div><button onClick={recover}>Phục hồi bản sửa</button><button disabled={!detail} onClick={() => transition(() => void open(detail!.id))}>Tải lại từ máy chủ</button></section></fieldset></main>}</div>}
    {picker && doc && <MediaDialog title="Chọn ảnh hoặc video" onClose={() => setPicker(false)}><MediaUpload onUploaded={() => setMediaRefresh(n => n + 1)} /><MediaBrowser refresh={mediaRefresh} picker allowVideo onSelect={a => { if (!doc.media.some(m => m.assetId === a.id)) update('media',[...doc.media,{ assetId:a.id,alt:a.alt || a.name,variantId:'' }]); setPicker(false); }} /></MediaDialog>}
    {preview && doc && <MediaDialog title="Xem trước nội dung chưa xuất bản" onClose={() => setPreview(false)}><h2>{doc.name}</h2><div className="studio-row">{doc.media.map(m => <StudioAsset key={m.assetId} id={m.assetId} />)}</div><p>{doc.description}</p><strong>{money(doc.price)}</strong><p>{availabilityLabels[doc.availability]}</p><dl>{doc.specs.map(s => <div key={s.key}><dt>{s.key}</dt><dd>{s.value}</dd></div>)}</dl>{doc.variants.map(v => <p key={v.id}>{v.name} · {v.condition} · {money(v.price)}</p>)}{doc.warranties.map((w,i) => <p key={i}>{w.name} · {w.adjustment ? money(w.adjustment) : 'Đã bao gồm'} · {w.description}</p>)}<p>Bản xem trước nội dung trong admin; bố cục Frontstore do renderer của cửa hàng quyết định.</p></MediaDialog>}
    {leave && <MediaDialog title="Có thay đổi chưa lưu" onClose={() => setLeave(null)}><p>Tiếp tục sẽ bỏ thay đổi trong trình soạn thảo.</p><button onClick={() => setLeave(null)}>Tiếp tục sửa</button><button onClick={() => { leave(); setLeave(null); }}>Bỏ thay đổi</button></MediaDialog>}
  </div>;
}
