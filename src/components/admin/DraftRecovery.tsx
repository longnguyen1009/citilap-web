'use client';
import {useState} from 'react';
import {mediaRequest} from './media/MediaBrowser';
export default function DraftRecovery({draft,endpoint}:{draft:unknown;endpoint:string}){
  const [server,setServer]=useState('');
  return <details className="border rounded p-3"><summary>Giữ bản sửa và đối chiếu máy chủ</summary><p>Bản sửa hiện tại được giữ nguyên khi xem dữ liệu máy chủ. Đăng nhập lại trong tab khác nếu phiên hết hạn, rồi bấm Lưu nháp.</p><div className="flex gap-3 my-2"><button type="button" onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='cms-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Tải bản sửa JSON</button><button type="button" onClick={async()=>{try{setServer(JSON.stringify(await mediaRequest(endpoint),null,2));}catch(e){setServer((e as Error).message);}}}>Xem bản máy chủ</button><a href="/login" target="_blank" rel="noopener noreferrer">Đăng nhập lại</a></div>{server&&<pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{server}</pre>}</details>;
}
