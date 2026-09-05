import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorSelection } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

export interface CodeMirrorTextEditorOptions {
  readonly parent: HTMLElement;
  readonly initialValue: string;
  readonly ariaLabel: string;
  readonly onChange: (value: string, context: { readonly composing: boolean }) => void;
  readonly onCompositionEnd: () => void;
}

export interface CodeMirrorTextEditor {
  readonly value: string;
  readonly visibleRange: { readonly from: number; readonly to: number };
  readonly selection: { readonly from: number; readonly to: number };
  replace(from: number, to: number, value: string): void;
  focus(): void;
  destroy(): void;
}

export function createCodeMirrorTextEditor(options: CodeMirrorTextEditorOptions): CodeMirrorTextEditor {
  const view = new EditorView({
    doc: normalizeLineEndings(options.initialValue),
    parent: options.parent,
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": options.ariaLabel, spellcheck: "true" }),
      EditorView.clipboardInputFilter.of(normalizeLineEndings),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) options.onChange(update.state.doc.toString(), { composing: update.view.compositionStarted });
      }),
      EditorView.domEventHandlers({
        compositionend: () => {
          queueMicrotask(options.onCompositionEnd);
          return false;
        }
      }),
      EditorView.theme({
        "&": { height: "100%", backgroundColor: "transparent" },
        ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.8", overflow: "auto" },
        ".cm-content": { minHeight: "100%", padding: "1.25rem 0" },
        ".cm-line": { padding: "0 1.5rem" },
        ".cm-cursor": { borderLeftColor: "#c8ff3d" },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "#334123" },
        ".cm-gutters": { display: "none" },
        "&.cm-focused": { outline: "none" }
      }, { dark: true })
    ]
  });

  return {
    get value() { return view.state.doc.toString(); },
    get visibleRange() { return { from: view.viewport.from, to: view.viewport.to }; },
    get selection() { return { from: view.state.selection.main.from, to: view.state.selection.main.to }; },
    replace(from, to, value) {
      const normalized = normalizeLineEndings(value);
      view.dispatch({ changes: { from, to, insert: normalized }, selection: EditorSelection.cursor(from + normalized.length) });
    },
    focus() { view.focus(); },
    destroy() { view.destroy(); }
  };
}

export function normalizeLineEndings(value: string): string { return value.replace(/\r\n?/g, "\n"); }
