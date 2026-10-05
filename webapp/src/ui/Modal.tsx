import type { MouseEvent, ReactNode } from "react";
import { CommandButton } from "./CommandButton";

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
        <CommandButton command="admin.modal.close" type="button" className="modal-close"  aria-label="Close" onDone={onClose}>
          ×
        </CommandButton>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
