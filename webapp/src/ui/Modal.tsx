import type { MouseEvent, ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, onClose, children }: ModalProps) {
  function onOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      className={open ? "modal open" : "modal"}
      onClick={onOverlayClick}
      role="presentation"
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
