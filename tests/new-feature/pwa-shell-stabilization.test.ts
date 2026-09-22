import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it, vi } from "vitest";

// Exercise the real handlers/JSX with isolated hooks and browser boundaries.
// Layout and actual browser lifecycle acceptance remain in the E2E harness.
function componentFixture(file: string, exportName: string) {
  const slots: unknown[] = [];
  const effects: Array<() => unknown> = [];
  let cursor = 0;
  const jsx = (type: unknown, props: Record<string, any>) => ({ type, props });
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: unknown) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect: (effect: () => unknown) => { effects.push(effect); },
    useCallback: (callback: unknown) => callback
  };
  const guard = vi.fn(async () => true);
  const drafts = vi.fn(async () => false);
  const registration = { waiting: null as null | { postMessage: ReturnType<typeof vi.fn> }, active: null, installing: null, addEventListener() {} };
  const serviceWorker = Object.assign(new EventTarget(), { register: vi.fn(async () => registration) });
  const location = Object.assign(new URL("https://lyrics.example/songs"), { assign: vi.fn(), reload: vi.fn(), replace: vi.fn() });
  const window = Object.assign(new EventTarget(), { location, isSecureContext: true, matchMedia: () => ({ matches: false }) });
  const document = Object.assign(new EventTarget(), {
    querySelector: vi.fn(() => null as unknown), querySelectorAll: () => [], documentElement: { dataset: {} }
  });
  const navigator = { onLine: true, serviceWorker };
  const storage = new Map<string, string>();
  const dependencies: Record<string, unknown> = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "@lyricscloud/editor": { hasOwnerPendingDrafts: drafts, migrateOwnerLocalDrafts: async () => undefined },
    "../lib/account-cache.js": { guardWorkspaceNavigation: guard, coordinateAccountLogout: () => ({ dispose() {} }) },
    "../lib/profile-state.js": { profileChannelName: () => "profile", PROFILE_UPDATED_EVENT: "profile-updated" },
    "../lib/update-safety.js": { serviceWorkerScriptUrl: () => "/sw.js?build=test" }
  };
  const module = { exports: {} as Record<string, (props: any) => any> };
  const source = readFileSync(new URL(`../../apps/web/src/components/${file}`, import.meta.url), "utf8");
  vm.runInNewContext(transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module, exports: module.exports, require: (name: string) => dependencies[name] ?? {},
    window, document, navigator, location, URL,
    sessionStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
    fetch: async () => ({ ok: false, status: 503 }),
    setInterval: () => 1, clearInterval() {}, setTimeout, clearTimeout, AbortSignal,
    performance: { getEntriesByType: () => [] }, BroadcastChannel: undefined
  });
  return {
    guard, drafts, registration, serviceWorker, location, window, document, navigator,
    render(props: unknown = { ownerId: "test-owner", profile: { userId: "test-owner", displayName: "Test", avatarUrl: null }, children: null }) {
      cursor = 0; effects.length = 0;
      return module.exports[exportName]!(props);
    },
    runEffects() { for (const effect of effects) effect(); }
  };
}

function elements(tree: any): any[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children)];
}
function text(tree: any): string {
  if (tree == null || typeof tree === "boolean") return "";
  if (Array.isArray(tree)) return tree.map(text).join("");
  return typeof tree === "object" ? text(tree.props?.children) : String(tree);
}
function clickLink(tree: any, href: string, modifiers: Record<string, unknown> = {}) {
  const nav = elements(tree).find((node) => node.type === "nav" && node.props["aria-label"] === "데스크톱 주 메뉴");
  const link = elements(nav).find((node) => node.type === "a" && node.props.href === href);
  const anchor = { href: new URL(href, "https://lyrics.example").href, target: "", hasAttribute: () => false };
  const event = {
    defaultPrevented: false, button: 0, ...modifiers,
    target: { closest: () => anchor }, currentTarget: { ...anchor, contains: () => true },
    preventDefault() { this.defaultPrevented = true; }
  };
  (link.props.onClick ?? nav.props.onClick)?.(event);
  return event;
}

describe("workspace menu navigation", () => {
  it("suppresses exact current URLs but preserves modified clicks and filtered-list navigation", async () => {
    const fixture = componentFixture("app-shell.tsx", "WorkspaceShell");
    const tree = fixture.render();
    expect(clickLink(tree, "/songs").defaultPrevented).toBe(true);
    expect(fixture.guard).not.toHaveBeenCalled();
    expect(fixture.location.assign).not.toHaveBeenCalled();
    expect(clickLink(tree, "/songs", { ctrlKey: true }).defaultPrevented).toBe(false);
    fixture.location.search = "?q=filtered";
    clickLink(tree, "/songs");
    await vi.waitFor(() => expect(fixture.location.assign).toHaveBeenCalledWith("/songs"));
    expect(fixture.guard).toHaveBeenCalledWith("test-owner", false);
  });

  it("retains failed-save navigation protection and coalesces clicks while saving", async () => {
    const fixture = componentFixture("app-shell.tsx", "WorkspaceShell");
    const pending = Promise.withResolvers<boolean>();
    fixture.guard.mockReturnValue(pending.promise);
    const tree = fixture.render();
    clickLink(tree, "/rhymes");
    clickLink(tree, "/settings");
    expect(fixture.guard).toHaveBeenCalledTimes(1);
    pending.resolve(false);
    await vi.waitFor(() => expect(text(fixture.render())).toContain("아직 저장되지 않은 입력"));
    expect(fixture.location.assign).not.toHaveBeenCalled();
  });

  it("rechecks composition that begins while saving before leaving the editor", async () => {
    const fixture = componentFixture("app-shell.tsx", "WorkspaceShell");
    const pending = Promise.withResolvers<boolean>();
    fixture.guard.mockReturnValue(pending.promise);
    const tree = fixture.render();
    fixture.runEffects();
    clickLink(tree, "/rhymes");
    fixture.document.dispatchEvent(new Event("compositionstart"));
    pending.resolve(true);
    await vi.waitFor(() => expect(text(fixture.render())).toContain("아직 저장되지 않은 입력"));
    expect(fixture.location.assign).not.toHaveBeenCalled();
  });
});

describe("PWA status visibility and safety", () => {
  it("omits the idle online row and still shows offline and registration failure notices", async () => {
    const fixture = componentFixture("pwa-manager.tsx", "PwaManager");
    expect(fixture.render()).toBeNull();
    fixture.serviceWorker.register.mockRejectedValue(new Error("registration failed"));
    fixture.runEffects();
    await vi.waitFor(() => expect(elements(fixture.render()).some((node) => node.props.className === "pwa-message")).toBe(true));
    expect(text(fixture.render())).toContain("일반 웹 모드");
    fixture.navigator.onLine = false;
    fixture.window.dispatchEvent(new Event("offline"));
    expect(text(fixture.render())).toContain("오프라인 · 초안은 이 기기에 보관됩니다");
  });

  it("keeps install actions and the update guard for unsent drafts", async () => {
    const fixture = componentFixture("pwa-manager.tsx", "PwaManager");
    const waiting = { postMessage: vi.fn() };
    fixture.registration.waiting = waiting;
    fixture.render(); fixture.runEffects();
    const prompt = vi.fn(async () => undefined);
    fixture.window.dispatchEvent(Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt, userChoice: Promise.resolve({ outcome: "dismissed" })
    }));
    const button = (label: string) => elements(fixture.render()).find((node) => node.type === "button" && text(node) === label);
    button("앱 설치").props.onClick();
    expect(prompt).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(button("업데이트 적용")).toBeDefined());
    fixture.drafts.mockResolvedValue(true);
    button("업데이트 적용").props.onClick();
    await vi.waitFor(() => expect(button("업데이트 적용").props.disabled).toBe(true));
    expect(text(fixture.render())).toContain("미전송 초안 보존 중");
    expect(waiting.postMessage).not.toHaveBeenCalled();
    expect(fixture.location.reload).not.toHaveBeenCalled();
  });
});
