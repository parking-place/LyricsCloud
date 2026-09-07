import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { Annotation, ChangeSet, Compartment, EditorSelection, EditorState, Transaction } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, keymap, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { findSongFormSection, SongFormIndex, type SongFormSection } from "./songform.js";
import { findSearchLiteralRange, REVISION_POLICY, type LyricResumePosition } from "@lyricscloud/domain";

export interface SongFormNavigationState {
  readonly sections: readonly SongFormSection[];
  readonly activeSectionId: string | null;
}

export interface EditorTextChange {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
}

export interface EditorDocumentTransaction {
  readonly changes: readonly EditorTextChange[];
  readonly selection?: { readonly anchor: number; readonly head: number };
  readonly origin: "user" | "external";
  readonly composing: boolean;
  readonly requestId?: string;
}

export interface CodeMirrorTextEditorOptions {
  readonly parent: HTMLElement;
  readonly initialValue: string;
  readonly ariaLabel: string;
  readonly onChange: (value: string, context: { readonly composing: boolean }) => void;
  readonly onCompositionEnd: () => void;
  readonly onCompositionStart?: () => void;
  readonly beforeLargePaste?: () => Promise<boolean>;
  readonly readOnly?: boolean;
  readonly onSongFormNavigationChange?: (state: SongFormNavigationState) => void;
  readonly onTransaction?: (transaction: EditorDocumentTransaction) => void;
}

export interface CodeMirrorTextEditor {
  readonly value: string;
  readonly visibleRange: { readonly from: number; readonly to: number };
  readonly selection: { readonly anchor: number; readonly head: number; readonly from: number; readonly to: number };
  readonly scrollTop: number;
  readonly composing: boolean;
  readonly songForm: SongFormNavigationState;
  replace(from: number, to: number, value: string, requestId?: string): void;
  applyTransaction(transaction: Omit<EditorDocumentTransaction, "origin" | "composing">): void;
  goToSongFormSection(sectionId: string): boolean;
  goToTextMatch(query: string): boolean;
  restoreResumePosition(position: LyricResumePosition, preferSongform: boolean): { readonly offset: number; readonly usedSongform: boolean };
  focus(): void;
  setEditable(editable: boolean): void;
  destroy(): void;
}

export function createCodeMirrorTextEditor(options: CodeMirrorTextEditorOptions): CodeMirrorTextEditor {
  const transactionOrigin = Annotation.define<EditorDocumentTransaction["origin"]>();
  const transactionRequestId = Annotation.define<string>();
  const editable = new Compartment();
  let compositionChanges: ChangeSet | null = null;
  let compositionTimer: ReturnType<typeof setTimeout> | undefined;
  let pastePending = false;
  let requestedEditable = !options.readOnly;
  let disposed = false;
  const refreshEditable = () => view.dispatch({ effects: editable.reconfigure([
    EditorState.readOnly.of(!requestedEditable || pastePending), EditorView.editable.of(requestedEditable && !pastePending)
  ]) });
  let navigationFrame: number | null = null;
  let pendingNavigation: SongFormNavigationState | null = null;
  let lastNavigationSignature = "";
  const publishNavigation = (state: SongFormNavigationState) => {
    if (!options.onSongFormNavigationChange) return;
    pendingNavigation = state;
    if (navigationFrame !== null) return;
    navigationFrame = requestAnimationFrame(() => {
      navigationFrame = null;
      const pending = pendingNavigation;
      pendingNavigation = null;
      if (!pending) return;
      const signature = `${pending.activeSectionId ?? ""}:${pending.sections.map((section) => section.id).join(",")}`;
      if (signature === lastNavigationSignature) return;
      lastNavigationSignature = signature;
      options.onSongFormNavigationChange?.(pending);
    });
  };
  const songFormPlugin = ViewPlugin.fromClass(class {
    index: SongFormIndex;
    sections: readonly SongFormSection[];
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.index = SongFormIndex.create(view.state.doc);
      this.sections = this.index.sections(view.state.doc);
      this.decorations = songFormDecorations(this.sections);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.index = this.index.update(update.startState.doc, update.state.doc, update.changes);
        this.sections = this.index.sections(update.state.doc);
        this.decorations = songFormDecorations(this.sections);
      }
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        const position = update.viewportChanged && !update.selectionSet
          ? update.view.viewport.from
          : update.state.selection.main.head;
        publishNavigation(navigationState(this.sections, position));
      }
    }
  }, { decorations: (value) => value.decorations });
  const view = new EditorView({
    doc: normalizeLineEndings(options.initialValue),
    parent: options.parent,
    extensions: [
      editable.of([EditorState.readOnly.of(options.readOnly ?? false), EditorView.editable.of(!options.readOnly)]),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": options.ariaLabel, spellcheck: "true", tabindex: "0" }),
      EditorView.clipboardInputFilter.of(normalizeLineEndings),
      songFormPlugin,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const composing = compositionChanges !== null || update.view.compositionStarted;
        if (compositionChanges) compositionChanges = compositionChanges.compose(update.changes);
        options.onChange(update.state.doc.toString(), { composing });
        if (options.onTransaction) {
          const changes: EditorTextChange[] = [];
          update.changes.iterChanges((from, to, _fromAfter, _toAfter, inserted) => {
            changes.push({ from, to, insert: inserted.toString() });
          });
          const origin = update.transactions.map((transaction) => transaction.annotation(transactionOrigin)).find(Boolean) ?? "user";
          const requestId = update.transactions.map((transaction) => transaction.annotation(transactionRequestId)).find(Boolean);
          options.onTransaction({
            changes,
            selection: { anchor: update.state.selection.main.anchor, head: update.state.selection.main.head },
            origin,
            composing,
            ...(requestId ? { requestId } : {})
          });
        }
      }),
      EditorView.domEventHandlers({
        paste(event) {
          const input = event.clipboardData?.getData("text/plain");
          if (!options.beforeLargePaste || !input || [...input].length < REVISION_POLICY.largePasteCharacters) return false;
          event.preventDefault();
          if (pastePending || !requestedEditable || view.compositionStarted) return true;
          pastePending = true;
          refreshEditable();
          void options.beforeLargePaste().then((saved) => {
            if (saved && !disposed) view.dispatch(view.state.replaceSelection(normalizeLineEndings(input)), { userEvent: "input.paste" });
          }).catch(() => undefined).finally(() => { pastePending = false; if (!disposed) { refreshEditable(); view.focus(); } });
          return true;
        },
        compositionstart: () => {
          compositionChanges ??= ChangeSet.empty(view.state.doc.length);
          options.onCompositionStart?.();
          return false;
        },
        compositionend: () => {
          clearTimeout(compositionTimer);
          compositionTimer = setTimeout(() => {
            const changes: EditorTextChange[] = [];
            compositionChanges?.iterChanges((from, to, _a, _b, inserted) => changes.push({ from, to, insert: inserted.toString() }));
            compositionChanges = null;
            if (changes.length) options.onTransaction?.({ changes, origin: "user", composing: false });
            options.onCompositionEnd();
          }, 0);
          return false;
        }
      }),
      EditorView.theme({
        "&": { height: "100%", backgroundColor: "transparent", color: "var(--ink)" },
        ".cm-scroller": { fontFamily: "var(--lyric-font-family, inherit)", fontSize: "var(--lyric-font-size, 18px)", lineHeight: "var(--lyric-line-height, 1.8)", letterSpacing: "var(--lyric-letter-spacing, 0em)", overflow: "auto" },
        ".cm-content": { minHeight: "100%", padding: "1.25rem 0" },
        ".cm-line": { padding: "0 1.5rem" },
        ".cm-songform-line": { color: "var(--acid)", fontWeight: "800", backgroundColor: "color-mix(in srgb, var(--acid) 5%, transparent)" },
        ".cm-cursor": { borderLeftColor: "var(--acid)" },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "color-mix(in srgb, var(--acid) 22%, transparent)" },
        ".cm-gutters": { display: "none" },
        "&.cm-focused": { outline: "none" }
      }, { dark: true })
    ]
  });
  const initialPlugin = view.plugin(songFormPlugin);
  if (initialPlugin) publishNavigation(navigationState(initialPlugin.sections, view.state.selection.main.head));

  return {
    get value() { return view.state.doc.toString(); },
    get visibleRange() { return { from: view.viewport.from, to: view.viewport.to }; },
    get selection() {
      const selection = view.state.selection.main;
      return { anchor: selection.anchor, head: selection.head, from: selection.from, to: selection.to };
    },
    get composing() { return compositionChanges !== null || view.compositionStarted; },
    get scrollTop() { return view.scrollDOM.scrollTop; },
    get songForm() {
      const sections = view.plugin(songFormPlugin)?.sections ?? [];
      return navigationState(sections, view.state.selection.main.head);
    },
    replace(from, to, value, requestId) {
      const normalized = normalizeLineEndings(value);
      view.dispatch({
        changes: { from, to, insert: normalized },
        selection: EditorSelection.cursor(from + normalized.length),
        ...(requestId ? { annotations: transactionRequestId.of(requestId) } : {})
      });
    },
    applyTransaction(transaction) {
      view.dispatch({
        changes: transaction.changes.map((change) => ({ from: change.from, to: change.to, insert: normalizeLineEndings(change.insert) })),
        ...(transaction.selection ? { selection: EditorSelection.range(transaction.selection.anchor, transaction.selection.head) } : {}),
        annotations: [transactionOrigin.of("external"), Transaction.addToHistory.of(false)]
      });
    },
    goToSongFormSection(sectionId) {
      const sections = view.plugin(songFormPlugin)?.sections ?? [];
      const section = sections.find((candidate) => candidate.id === sectionId);
      if (!section) return false;
      view.dispatch({
        selection: EditorSelection.cursor(section.tagFrom),
        effects: EditorView.scrollIntoView(section.tagFrom, { y: "start", yMargin: 72 })
      });
      view.focus();
      return true;
    },
    goToTextMatch(query) {
      const range = findSearchLiteralRange(view.state.doc.toString(), query);
      if (!range) return false;
      view.dispatch({
        selection: EditorSelection.range(range.from, range.to),
        effects: EditorView.scrollIntoView(range.from, { y: "center", yMargin: 72 })
      });
      view.focus();
      return true;
    },
    restoreResumePosition(position, preferSongform) {
      const sections = view.plugin(songFormPlugin)?.sections ?? [];
      const matchedSection = position.songformLabel && position.songformOccurrence
        ? sections.find((section) => section.label.trim() === position.songformLabel
          && section.occurrence === position.songformOccurrence)
        : undefined;
      const usedSongform = Boolean(preferSongform && matchedSection);
      const offset = usedSongform
        ? matchedSection!.tagFrom
        : Math.max(0, Math.min(position.cursorOffset, view.state.doc.length));
      view.dispatch({
        selection: EditorSelection.cursor(offset),
        effects: EditorView.scrollIntoView(offset, { y: usedSongform ? "start" : "center", yMargin: 72 })
      });
      if (!usedSongform) requestAnimationFrame(() => {
        if (!disposed) view.scrollDOM.scrollTop = Math.max(0, Math.min(position.scrollTop, view.scrollDOM.scrollHeight));
      });
      view.focus();
      return { offset, usedSongform };
    },
    focus() { view.focus(); },
    setEditable(value) {
      if (requestedEditable === value) return;
      requestedEditable = value; refreshEditable();
    },
    destroy() {
      disposed = true;
      clearTimeout(compositionTimer);
      if (navigationFrame !== null) cancelAnimationFrame(navigationFrame);
      navigationFrame = null;
      pendingNavigation = null;
      view.destroy();
    }
  };
}

export function normalizeLineEndings(value: string): string { return value.replace(/\r\n?/g, "\n"); }

function songFormDecorations(sections: readonly SongFormSection[]): DecorationSet {
  return Decoration.set(sections.map((section) => Decoration.line({
    class: "cm-songform-line",
    attributes: { "data-songform-id": section.id, "data-songform-label": section.label }
  }).range(section.tagFrom)), true);
}

function navigationState(sections: readonly SongFormSection[], position: number): SongFormNavigationState {
  return { sections, activeSectionId: findSongFormSection(sections, position)?.id ?? null };
}
