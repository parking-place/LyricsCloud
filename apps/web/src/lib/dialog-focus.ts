export function trapDialogTab(event: KeyboardEvent, selector: string): void {
  if (event.key !== "Tab") return;
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) return;
  const items = [...root.querySelectorAll<HTMLElement>("button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex='-1'])")]
    .filter((item) => item.getClientRects().length > 0);
  const first = items[0]; const last = items.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
