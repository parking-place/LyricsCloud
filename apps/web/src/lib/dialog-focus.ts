"use client";

import { useEffect, useRef } from "react";

const focusableSelector = "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex='-1'])";

export function trapDialogTab(event: KeyboardEvent, selector: string | HTMLElement): void {
  if (event.key !== "Tab") return;
  const root = typeof selector === "string" ? document.querySelector<HTMLElement>(selector) : selector;
  if (!root) return;
  const items = [...root.querySelectorAll<HTMLElement>(focusableSelector)]
    .filter((item) => item.getClientRects().length > 0);
  const first = items[0]; const last = items.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export function DialogFocusBoundary({ selector, onClose, blocked = false, initialFocus }: {
  selector: string;
  onClose: () => void;
  blocked?: boolean;
  initialFocus?: string;
}) {
  const closeRef = useRef(onClose);
  const blockedRef = useRef(blocked);
  closeRef.current = onClose;
  blockedRef.current = blocked;

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(selector);
    if (!root) return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const expandedTrigger = [...document.querySelectorAll<HTMLElement>('[aria-haspopup="dialog"][aria-expanded="true"]')]
      .find((item) => !root.contains(item) && item.getClientRects().length > 0) ?? null;
    const prior = active && !root.contains(active) ? active : expandedTrigger;
    const frame = requestAnimationFrame(() => {
      const requested = initialFocus ? root.querySelector<HTMLElement>(initialFocus) : null;
      const first = root.querySelector<HTMLElement>(focusableSelector);
      (requested ?? first ?? root).focus();
    });
    function keyboard(event: KeyboardEvent) {
      const modals = [...document.querySelectorAll<HTMLElement>('[aria-modal="true"]')].filter((item) => item.getClientRects().length > 0);
      if (modals.at(-1) !== root || event.defaultPrevented) return;
      if (event.key === "Escape" && !blockedRef.current) {
        event.preventDefault();
        closeRef.current();
      } else trapDialogTab(event, root);
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keyboard);
      requestAnimationFrame(() => {
        const current = document.activeElement;
        const focusLeftWithDialog = !current || current === document.body || (current instanceof Node && root.contains(current));
        if (focusLeftWithDialog && prior?.isConnected) prior.focus();
      });
    };
  }, [initialFocus, selector]);

  return null;
}
