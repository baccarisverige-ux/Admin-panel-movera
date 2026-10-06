import { useLayoutEffect, useRef } from "react";

export function useDialogFocus(open: boolean, onClose: () => void) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; }, [onClose]);
  useLayoutEffect(() => {
    if (!open) return;
    const node = root.current;
    if (!node) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(node.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
    )).filter(element => element.getClientRects().length > 0);
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first) {
        event.preventDefault();
        node!.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        event.preventDefault();
        last!.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    node.addEventListener("keydown", key);
    (focusable()[0] ?? node).focus();
    return () => {
      node.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return root;
}
