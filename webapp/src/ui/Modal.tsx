import type { MouseEvent, ReactNode } from "react";
import { useDialogFocus } from "./useDialogFocus";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, onClose, children }: ModalProps) {
  const root=useDialogFocus(open,onClose);
  if(!open)return null;
  function onOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      className={open ? "modal open" : "modal"}
      onClick={onOverlayClick}
      role="presentation"
    >
      <div ref={root} tabIndex={-1} className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <button data-command="admin.modal.close" type="button" className="modal-close"  aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
