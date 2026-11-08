'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Manual-save status & unsaved-changes guard across Admin Studios.
 * Does NOT auto-save when typing; drafts are only saved when the admin explicitly clicks "Lưu nháp" (or Ctrl+S / "Xuất bản").
 */
export function useDraftAutosave(
  _draft: unknown,
  revision: number,
  _enabled: boolean,
  dirty: boolean,
  saving: boolean,
  _save?: () => Promise<boolean>
) {
  const [savedAt, setSavedAt] = useState('');
  const prevRevision = useRef<number>(revision);

  useEffect(() => {
    if (revision > prevRevision.current && prevRevision.current > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- record timestamp when manual save increments revision
      setSavedAt(new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));
    }
    prevRevision.current = revision;
  }, [revision]);

  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty || saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const link = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target.closest('a') : null;
      if (
        (dirty || saving) &&
        target?.href &&
        target.target !== '_blank' &&
        !target.hasAttribute('download') &&
        !window.confirm('Nội dung chưa lưu. Rời trang và bỏ các thay đổi chưa lưu?')
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', leave);
    document.addEventListener('click', link, true);
    return () => {
      window.removeEventListener('beforeunload', leave);
      document.removeEventListener('click', link, true);
    };
  }, [dirty, saving]);

  return saving
    ? 'Đang lưu…'
    : dirty
    ? 'Chưa lưu (bấm Lưu nháp để lưu)'
    : savedAt
    ? `Đã lưu lúc ${savedAt} (GMT+7)`
    : 'Đã đồng bộ';
}
