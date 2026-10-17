'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type Event={id:string;actorId:string;action:string;entityId:string;summary:string;occurredAt:string;requestId:string|null;beforeRevision:number|null;afterRevision:number|null;entityType:string|null};
function entityLink(r: Event) {
  const routes: Record<string,string> = {product:'products',post:'posts',page:'pages',landing:'builder',order:'orders'};
  const route=routes[r.entityType || r.action.split('.')[0]];
  if(['brand','campaign','contact','account'].includes(r.entityType || r.action.split('.')[0]))return '/admin/'+({brand:'brands',campaign:'campaigns',contact:'contacts',account:'users'}[r.entityType || r.action.split('.')[0]]);
  return route ? `/admin/${route}/${encodeURIComponent(r.entityId)}` : null;
}
export default function AuditPage(){
  const [rows,setRows]=useState<Event[]>([]),[page,setPage]=useState(1),[total,setTotal]=useState(0),[action,setAction]=useState(''),[filter,setFilter]=useState(''),[error,setError]=useState('');
  const [fields,setFields]=useState({actor:'',entity:'',from:'',to:''});
  useEffect(()=>{const controller=new AbortController();
    fetch(`/api/admin/audit?page=${page}&${filter}`,{cache:'no-store',signal:controller.signal})
      .then(async r=>{const j=await r.json();if(!r.ok)throw Error();setError('');setRows(j.data);setTotal(j.total);})
      .catch(e=>{if(e.name!=='AbortError')setError('Không thể đọc nhật ký. Vui lòng thử lại.');});
    return()=>controller.abort();
  },[page,filter]);
  return <main className="space-y-4"><h1 className="text-xl font-bold">Nhật ký quản trị</h1>
    <form onSubmit={e=>{e.preventDefault();setPage(1);setFilter(new URLSearchParams({...fields,action}).toString());}} className="flex flex-wrap gap-2">
      <label>Thao tác<input className="border rounded p-2 ml-2" maxLength={160} value={action} onChange={e=>setAction(e.target.value)} placeholder="account.update"/></label>
      {([['actor','Actor ID'],['entity','Đối tượng ID'],['from','Từ ngày (GMT+7)'],['to','Đến ngày (GMT+7)']] as const).map(([key,label])=><label key={key}>{label}<input className="block border rounded p-2" maxLength={160} type={key==='from'||key==='to'?'date':'text'} value={fields[key]} onChange={e=>setFields({...fields,[key]:e.target.value})}/></label>)}
      <button className="bg-blue-700 text-white px-3 rounded">Lọc</button>
    </form>
    {error?<p role="alert" className="text-red-700">{error}</p>:<><p>{total} sự kiện · Giờ Việt Nam (GMT+7)</p><div className="overflow-x-auto"><table className="w-full text-sm bg-white"><thead><tr><th>Thời gian</th><th>Actor ID</th><th>Thao tác</th><th>Đối tượng</th><th>Revision</th><th>Nội dung</th><th>Request ID</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="p-2">{new Date(r.occurredAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</td><td>{r.actorId}</td><td>{r.action}</td><td>{entityLink(r)?<Link className="underline" href={entityLink(r)!}>{r.entityId}</Link>:r.entityId}</td><td>{r.beforeRevision ?? '—'} / {r.afterRevision ?? '—'}</td><td className="p-2 break-words">{r.summary}</td><td>{r.requestId ?? '—'}</td></tr>)}</tbody></table></div></>}
    <div className="flex gap-4"><button disabled={page<=1} onClick={()=>setPage(page-1)}>Trang trước</button><span>Trang {page}</span><button disabled={page*50>=total} onClick={()=>setPage(page+1)}>Trang sau</button></div>
  </main>;
}
