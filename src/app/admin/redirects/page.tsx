'use client';
import {useEffect,useState} from 'react';
import {mediaRequest} from '@/components/admin/media/MediaBrowser';
type Rule={id?:string;source:string;target:string;enabled:boolean;note:string;revision:number};
const blank:Rule={source:'',target:'',enabled:true,note:'',revision:0};
export default function RedirectsPage(){
  const [rows,setRows]=useState<Rule[]>([]),[form,setForm]=useState(blank),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const load=()=>mediaRequest<Rule[]>('/api/admin/redirects').then(r=>setRows(r.map(x=>({...x,enabled:Boolean(x.enabled)})))).catch(e=>setMessage(e.message));
  useEffect(()=>{void load();},[]);
  return <main className="space-y-4"><h1 className="text-xl font-bold">Chuyển hướng 301</h1><p>Chuyển vĩnh viễn. Bỏ toàn bộ query khi chuyển; không chuyển token sang đích. Tối đa 500 quy tắc trong danh sách.</p><form className="flex flex-wrap gap-3" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await mediaRequest('/api/admin/redirects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...form,expectedRevision:form.revision})});setMessage('Đã lưu redirect.');setForm(blank);void load();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>
  {(['source','target','note'] as const).map(k=><label key={k}>{k==='source'?'Đường dẫn nguồn':k==='target'?'Đường dẫn đích':'Ghi chú'}<input required={k!=='note'} className="block border p-2" maxLength={500} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<label><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/>Bật</label><button disabled={busy}>Lưu 301</button><button type="button" onClick={()=>setForm(blank)}>Tạo mới</button></form><p role="alert">{message}</p><table className="w-full text-sm"><thead><tr><th>Nguồn</th><th>Đích</th><th>Trạng thái</th><th>Ghi chú</th><th>Sửa</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td>{r.source}</td><td>{r.target}</td><td>{r.enabled?'Bật':'Tắt'}</td><td>{r.note}</td><td><button onClick={()=>setForm(r)}>Sửa #{r.revision}</button></td></tr>)}</tbody></table></main>;
}
