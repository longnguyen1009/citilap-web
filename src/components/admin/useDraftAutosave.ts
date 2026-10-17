'use client';
import {useEffect,useRef,useState} from 'react';

/** No local storage: server drafts persist; failed edits stay in the current editor. */
export function useDraftAutosave(draft:unknown, revision:number, enabled:boolean, dirty:boolean, saving:boolean, save:()=>Promise<boolean>) {
  const [savedAt,setSavedAt]=useState('');
  const blocked=useRef<number|null>(null);
  useEffect(()=>{
    if(!enabled || !dirty || saving || blocked.current===revision)return;
    const timer=setTimeout(()=>{void save().then(ok=>{if(ok)setSavedAt(new Date().toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}));else blocked.current=revision;});},1500);
    return()=>clearTimeout(timer);
  },[draft,revision,enabled,dirty,saving,save]);
  useEffect(()=>{
    const leave=(e:BeforeUnloadEvent)=>{if(dirty || saving){e.preventDefault();e.returnValue='';}};
    const link=(e:MouseEvent)=>{
      const target=e.target instanceof Element?e.target.closest('a'):null;
      if((dirty||saving) && target?.href && target.target!=='_blank' && !target.hasAttribute('download') && !window.confirm('Nội dung chưa lưu. Rời trang và bỏ bản sửa này?')){e.preventDefault();e.stopPropagation();}
    };
    window.addEventListener('beforeunload',leave);document.addEventListener('click',link,true);
    return()=>{window.removeEventListener('beforeunload',leave);document.removeEventListener('click',link,true);};
  },[dirty,saving]);
  return saving?'Đang lưu…':dirty?'Chưa lưu':savedAt?`Đã lưu ${savedAt} (GMT+7)`:'Đã đồng bộ';
}
