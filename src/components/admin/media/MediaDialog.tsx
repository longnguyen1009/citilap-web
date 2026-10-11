'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import './media.css';

export default function MediaDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const callback = useRef(onClose);
  useEffect(() => { callback.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const cancel = (event: Event) => { event.preventDefault(); callback.current(); };
    dialog.addEventListener('cancel', cancel);
    return () => { dialog.removeEventListener('cancel', cancel); dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="media-dialog" aria-label={title}>
    <div className="flex items-center justify-between gap-4 mb-5"><h2 className="text-lg font-semibold">{title}</h2><button type="button" className="media-button" onClick={onClose} aria-label="Đóng"><X size={18} /></button></div>
    {children}
  </dialog>;
}
