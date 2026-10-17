'use client';
import {useCallback,useEffect,useState} from 'react';
import {mediaRequest} from './media/MediaBrowser';
type Job={id:string;revision:number;action:string;executeAt:number;state:string;errorCode:string|null};
export default function SchedulePanel({entityType,entityId,revision,dirty=false}:{entityType:string;entityId:string|null|undefined;revision:number;dirty?:boolean}){
  const [jobs,setJobs]=useState<Job[]>([]),[time,setTime]=useState(''),[action,setAction]=useState('publish'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const url=`/api/admin/schedules?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId||'')}`;
  const load=useCallback(()=>{if(entityId)void mediaRequest<Job[]>(url).then(setJobs).catch(e=>setMessage(e.message));},[entityId,url]);
  useEffect(()=>{load();const timer=setInterval(load,15000);return()=>clearInterval(timer);},[load]);
  if(!entityId)return null;
  return <section className="border rounded p-3 space-y-2"><h2 className="font-semibold">Lịch xuất bản · GMT+7</h2><p>Khóa phiên bản #{revision} đã lưu. Bản nháp sửa sau không thay nội dung lịch.</p>
    <div className="flex flex-wrap gap-2"><label>Thời gian<input aria-label="Thời gian lịch GMT+7" className="border p-2" type="datetime-local" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Thao tác<select className="border p-2" value={action} onChange={e=>setAction(e.target.value)}><option value="publish">Xuất bản</option>{entityType!=='navigation'&&<option value="unpublish">Ẩn khỏi web</option>}</select></label>
    <button type="button" disabled={busy||dirty||!time||revision<1} onClick={async()=>{setBusy(true);try{await mediaRequest('/api/admin/schedules',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({entityType,entityId,revision,action,executeAt:new Date(time+':00+07:00').toISOString()})});setMessage('Đã lưu lịch.');load();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>Lập lịch phiên bản #{revision}</button></div>
    {dirty&&<p>Lưu nháp trước khi lập lịch.</p>}<p role="status">{message}</p>
    {jobs.map(j=><div key={j.id} className="flex flex-wrap gap-3 border-t pt-2"><span>#{j.revision} · {j.action} · {new Date(j.executeAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} · {j.state}{j.errorCode&&` · ${j.errorCode}`}{['PENDING','RUNNING'].includes(j.state)&&j.revision!==revision?' · Đang trỏ bản cũ':''}</span>{['PENDING','RUNNING'].includes(j.state)&&<button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{await mediaRequest('/api/admin/schedules?id='+encodeURIComponent(j.id),{method:'DELETE'});setMessage('Đã hủy lịch.');load();}catch(e){setMessage((e as Error).message);load();}finally{setBusy(false);}}}>Hủy lịch</button>}</div>)}
  </section>;
}
