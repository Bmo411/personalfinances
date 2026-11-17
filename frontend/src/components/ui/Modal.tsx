import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    useEffect(() => {
        const dialog = ref.current;
        if (isOpen && !dialog?.open) dialog?.showModal();
        if (!isOpen && dialog?.open) dialog.close();
    }, [isOpen]);
    return <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="guide-dialog"><div className="dialog-content"><div className="section-heading"><h2 id={titleId}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>{isOpen && children}</div></dialog>;
}
