'use client';
import { useEffect, useState } from 'react';
type Account = {id:string;email:string;name:string;role:'OWNER'|'EDITOR'|'SALES';disabled:number;piiExport:number;revision:number};
const blank = {email:'',name:'',role:'EDITOR' as Account['role'],disabled:false,piiExport:false,password:''};
export default function AdminUsers() {
  const [accounts,setAccounts]=useState<Account[]>([]), [form,setForm]=useState(blank);
  const [editing,setEditing]=useState<Account|null>(null), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  function load() {
    return fetch('/api/admin/users',{cache:'no-store'})
      .then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error);setAccounts(j.data);})
      .catch(()=>setError('Không thể đọc tài khoản. Kiểm tra quyền hoặc thử lại.'));
  }
  useEffect(()=>{void load();},[]);
  function edit(a:Account) {setEditing(a);setForm({email:a.email,name:a.name,role:a.role,disabled:Boolean(a.disabled),piiExport:Boolean(a.piiExport),password:''});setError('');}
  async function save(e:React.FormEvent) {
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try {
      const {password,...fields}=form;
      const r=await fetch('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,...(password?{password}:{}),...(editing?{id:editing.id,expectedRevision:editing.revision}:{})})});
      const j=await r.json();if(!r.ok)throw Error(j.error);
      setEditing(null);setForm(blank);await load();
    } catch(e) {setError(e instanceof Error?e.message:'Không thể lưu');} finally {setBusy(false);}
  }
  return <main className="space-y-5"><h1 className="text-xl font-bold">Tài khoản và quyền</h1>
    <p className="text-sm">Đổi quyền, khóa hoặc đặt lại mật khẩu sẽ thu hồi mọi phiên của tài khoản. Owner cuối cùng được bảo vệ.</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <form onSubmit={save} className="grid gap-3 max-w-xl rounded border bg-white p-4">
      <h2 className="font-semibold">{editing?'Sửa tài khoản':'Tạo tài khoản'}</h2>
      <label>Tên<input required maxLength={160} className="block border rounded p-2 w-full" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label>Email<input required type="email" maxLength={254} className="block border rounded p-2 w-full" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label>Vai trò<select className="block border rounded p-2" value={form.role} onChange={e=>setForm({...form,role:e.target.value as Account['role']})}><option value="OWNER">Chủ cửa hàng</option><option value="EDITOR">Biên tập</option><option value="SALES">Bán hàng</option></select></label>
      <label>{editing?'Mật khẩu mới (để trống để giữ nguyên)':'Mật khẩu'}<input type="password" autoComplete="new-password" required={!editing} minLength={12} maxLength={200} className="block border rounded p-2 w-full" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
      <label><input type="checkbox" checked={form.disabled} onChange={e=>setForm({...form,disabled:e.target.checked})}/> Vô hiệu hóa</label>
      <label><input type="checkbox" checked={form.piiExport} onChange={e=>setForm({...form,piiExport:e.target.checked})}/> Cho phép Bán hàng export dữ liệu khách/đơn</label>
      <div className="flex gap-3"><button disabled={busy} className="rounded bg-blue-700 text-white px-4 py-2">{busy?'Đang lưu…':'Lưu'}</button><button type="button" onClick={()=>{setEditing(null);setForm(blank);}}>Hủy sửa</button></div>
    </form>
    <div className="overflow-x-auto"><table className="w-full text-sm bg-white"><caption className="text-left py-2">Tối đa 200 tài khoản quản trị</caption><thead><tr><th className="text-left p-2">Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id} className="border-t"><td className="p-2">{a.name}<br/>{a.email}</td><td>{a.role}</td><td>{a.disabled?'Đã khóa':'Hoạt động'}</td><td><button className="text-blue-700 underline" onClick={()=>edit(a)}>Sửa quyền / Thu hồi phiên</button></td></tr>)}</tbody></table></div>
  </main>;
}
