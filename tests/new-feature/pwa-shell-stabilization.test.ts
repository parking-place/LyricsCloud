import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it, vi } from "vitest";

// Exercise the real handlers/JSX with isolated hooks and browser boundaries.
// Layout and actual browser lifecycle acceptance remain in the E2E harness.
function componentFixture(file: string, exportName: string) {
  const slots: unknown[] = [];
  const effects: Array<() => unknown> = [];
  const frames: Array<() => void> = [];
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
  const router = { push: vi.fn() };
  const drafts = vi.fn(async () => false);
  const registration = { waiting: null as null | { postMessage: ReturnType<typeof vi.fn> }, active: null, installing: null, addEventListener() {} };
  const serviceWorker = Object.assign(new EventTarget(), { register: vi.fn(async () => registration), controller: null as null | { postMessage: ReturnType<typeof vi.fn> } });
  const location = Object.assign(new URL("https://lyrics.example/songs"), { assign: vi.fn(), reload: vi.fn(), replace: vi.fn() });
  const window = Object.assign(new EventTarget(), { location, isSecureContext: true, matchMedia: () => ({ matches: false }) });
  const document = Object.assign(new EventTarget(), {
    querySelector: vi.fn((_selector?: string) => null as unknown), querySelectorAll: vi.fn((_selector?: string) => [] as unknown[]), documentElement: { dataset: {} }, activeElement: null as unknown, body: null as unknown
  });
  class ElementFixture {
    isConnected = true;
    items: ElementFixture[] = [];
    getClientRects() { return this.isConnected ? [{}] : []; }
    contains(item: unknown) { return item === this || this.items.includes(item as ElementFixture); }
    querySelector() { return this.items[0] ?? null; }
    querySelectorAll() { return this.items; }
    focus() { document.activeElement = this; }
  }
  const navigator = { onLine: true, serviceWorker };
  const storage = new Map<string, string>();
  const fetch = vi.fn(async (_url: string, _options?: unknown) => ({ ok: false, status: 503 }));
  const dependencies: Record<string, unknown> = {
    "next/navigation": { useRouter: () => router },
    react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "@lyricscloud/editor": { hasOwnerPendingDrafts: drafts, migrateOwnerLocalDrafts: async () => undefined },
    "../lib/account-cache.js": { guardWorkspaceNavigation: guard, coordinateAccountLogout: () => ({ dispose() {} }) },
    "../lib/profile-state.js": { profileChannelName: () => "profile", PROFILE_UPDATED_EVENT: "profile-updated" },
    "../lib/update-safety.js": { serviceWorkerScriptUrl: () => "/sw.js?build=test" }
  };
  const module = { exports: {} as Record<string, (props: any) => any> };
  const focusModule = { exports: {} as Record<string, (props: any) => any> };
  const frameApi = { requestAnimationFrame: (callback: () => void) => { frames.push(callback); return frames.length; }, cancelAnimationFrame() {} };
  vm.runInNewContext(transformSync(readFileSync(new URL("../../apps/web/src/lib/dialog-focus.ts", import.meta.url), "utf8"), { loader: "ts", format: "cjs" }).code, {
    module: focusModule, exports: focusModule.exports, require: () => react,
    document, HTMLElement: ElementFixture, Node: ElementFixture, ...frameApi
  });
  dependencies["../lib/dialog-focus.js"] = focusModule.exports;
  const source = readFileSync(new URL(`../../apps/web/src/components/${file}`, import.meta.url), "utf8");
  vm.runInNewContext(transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module, exports: module.exports, require: (name: string) => dependencies[name] ?? {},
    window, document, navigator, location, URL, HTMLElement: ElementFixture, ...frameApi,
    sessionStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
    fetch,
    setInterval: () => 1, clearInterval() {}, setTimeout, clearTimeout, AbortSignal,
    performance: { getEntriesByType: () => [] }, BroadcastChannel: undefined
  });
  return {
    guard, router, drafts, registration, serviceWorker, location, window, document, navigator, ElementFixture, fetch,
    render(props: unknown = { ownerId: "test-owner", profile: { userId: "test-owner", displayName: "Test", avatarUrl: null }, children: null }) {
      cursor = 0; effects.length = 0;
      return module.exports[exportName]!(props);
    },
    runEffects() { for (const effect of effects) effect(); },
    mountBoundary(props: unknown) {
      const start = effects.length;
      focusModule.exports.DialogFocusBoundary!(props);
      const cleanups = effects.slice(start).map((effect) => effect());
      return () => { for (const cleanup of cleanups) if (typeof cleanup === "function") cleanup(); };
    },
    mountRenderedBoundaries(tree: any) {
      for (const node of elements(tree)) if (node.type === focusModule.exports.DialogFocusBoundary) this.mountBoundary(node.props);
    },
    flushFrames() { for (const frame of frames.splice(0)) frame(); }
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
  it("uses the server profile on mount while retaining focus refresh and session validation", async () => {
    const fixture = componentFixture("app-shell.tsx", "WorkspaceShell");
    fixture.render(); fixture.runEffects();
    expect(fixture.fetch.mock.calls.map((call) => call[0])).not.toContain("/api/profile");
    expect(fixture.fetch.mock.calls.map((call) => call[0])).toContain("/api/auth/session");
    fixture.window.dispatchEvent(new Event("focus"));
    expect(fixture.fetch.mock.calls.map((call) => call[0])).toContain("/api/profile");
  });
  it("R07 dismisses only QuickAdd over More and returns focus inside the remaining dialog", () => {
    const fixture = componentFixture("app-shell.tsx", "WorkspaceShell");
    const more = new fixture.ElementFixture();
    const moreLink = new fixture.ElementFixture(); more.items = [moreLink];
    const quick = new fixture.ElementFixture();
    const input = new fixture.ElementFixture(); quick.items = [input];
    fixture.document.querySelector.mockImplementation((selector?: string) => selector === "[data-mobile-more-dialog]" ? more : quick);
    fixture.document.querySelectorAll.mockImplementation((selector?: string) => selector === '[aria-modal="true"]' ? [more, quick].filter((root) => root.isConnected) : []);
    elements(fixture.render()).find((node) => node.props.className?.includes("mobile-more-button")).props.onClick();
    const opened = fixture.render(); fixture.runEffects(); fixture.mountRenderedBoundaries(opened);
    moreLink.focus();
    let quickClosed = false;
    const cleanupQuick = fixture.mountBoundary({ selector: ".quick-add-dialog", onClose: () => { quickClosed = true; quick.isConnected = false; } });
    fixture.flushFrames();
    fixture.document.dispatchEvent(Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" }));
    expect(quickClosed).toBe(true);
    expect(elements(fixture.render()).some((node) => node.props["data-mobile-more-dialog"] !== undefined)).toBe(true);
    cleanupQuick(); fixture.flushFrames();
    expect(fixture.document.activeElement).toBe(moreLink);
  });

  it("keeps focus within the remaining modal if the nested trigger was outside it", () => {
    const fixture = componentFixture("app-shell.tsx", "WorkspaceShell");
    const more = new fixture.ElementFixture(); const link = new fixture.ElementFixture(); more.items = [link];
    const quick = new fixture.ElementFixture(); const input = new fixture.ElementFixture(); quick.items = [input];
    const externalTrigger = new fixture.ElementFixture();
    fixture.document.querySelector.mockReturnValue(quick);
    fixture.document.querySelectorAll.mockImplementation((selector?: string) => selector === '[aria-modal="true"]' ? [more, quick].filter((root) => root.isConnected) : []);
    externalTrigger.focus();
    const cleanup = fixture.mountBoundary({ selector: ".quick-add-dialog", onClose: () => undefined });
    fixture.flushFrames(); quick.isConnected = false;
    cleanup(); fixture.flushFrames();
    expect(fixture.document.activeElement).toBe(link);
  });
  it("restores the expanded dialog trigger when a touch open left focus on the body", () => {
    const fixture = componentFixture("app-shell.tsx", "WorkspaceShell");
    const body = new fixture.ElementFixture(); fixture.document.body = body;
    const trigger = new fixture.ElementFixture();
    const dialog = new fixture.ElementFixture(); const input = new fixture.ElementFixture(); dialog.items = [input];
    fixture.document.querySelector.mockReturnValue(dialog);
    fixture.document.querySelectorAll.mockImplementation((selector) => selector === '[aria-modal="true"]' ? [] : [trigger]);
    body.focus();
    const cleanup = fixture.mountBoundary({ selector: "[data-mobile-more-dialog]", onClose: () => undefined });
    fixture.flushFrames(); cleanup(); fixture.flushFrames();
    expect(fixture.document.activeElement).toBe(trigger);
  });
  it("suppresses exact current URLs but preserves modified clicks and filtered-list navigation", async () => {
    const fixture = componentFixture("app-shell.tsx", "WorkspaceShell");
    const tree = fixture.render();
    expect(clickLink(tree, "/songs").defaultPrevented).toBe(true);
    expect(fixture.guard).not.toHaveBeenCalled();
    expect(fixture.location.assign).not.toHaveBeenCalled();
    expect(clickLink(tree, "/songs", { ctrlKey: true }).defaultPrevented).toBe(false);
    fixture.location.search = "?q=filtered";
    clickLink(tree, "/songs");
    await vi.waitFor(() => expect(fixture.router.push).toHaveBeenCalledWith("/songs"));
    expect(fixture.location.assign).not.toHaveBeenCalled();
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
  it("reports the old document build without consent and can explicitly reload after another tab activates", async () => {
    const fixture = componentFixture("pwa-manager.tsx", "PwaManager");
    const waiting = { postMessage: vi.fn(), state: "installed" };
    fixture.registration.waiting = waiting;
    fixture.document.querySelector.mockImplementation((selector?: string) => selector === 'meta[name="lyricscloud-build-id"]' ? { content: "old-document-build" } : null);
    fixture.render(); fixture.runEffects();
    const apply = () => elements(fixture.render()).find((node) => node.type === "button" && text(node) === "업데이트 적용");
    await vi.waitFor(() => expect(apply()).toBeDefined());
    waiting.state = "activated"; fixture.serviceWorker.controller = waiting;
    fixture.serviceWorker.dispatchEvent(new Event("controllerchange"));
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "CLIENT_BUILD", buildId: "old-document-build" });
    expect(fixture.location.reload).not.toHaveBeenCalled();
    fixture.drafts.mockResolvedValue(true);
    apply().props.onClick();
    await vi.waitFor(() => expect(apply().props.disabled).toBe(true));
    expect(fixture.location.reload).not.toHaveBeenCalled();
    fixture.drafts.mockResolvedValue(false);
    apply().props.onClick();
    await vi.waitFor(() => expect(fixture.location.reload).toHaveBeenCalledTimes(1));
    expect(waiting.postMessage).not.toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });
  it("announces PWA notices without adding a competing feature status role", async () => {
    const fixture = componentFixture("pwa-manager.tsx", "PwaManager");
    const shell = componentFixture("app-shell.tsx", "WorkspaceShell").render({
      profile: { userId: "test-owner", displayName: "Test", avatarUrl: null }, loginCompleted: true, children: null
    });
    fixture.serviceWorker.register.mockRejectedValue(new Error("registration failed"));
    fixture.render(); fixture.runEffects();
    await vi.waitFor(() => expect(text(fixture.render())).toContain("일반 웹 모드"));

    const statusMessages = () => elements([shell, fixture.render()]).filter((node) => node.props.role === "status").map(text);
    expect(statusMessages()).toEqual(["로그인이 완료되었습니다. 개인 작업 공간으로 이동했습니다."]);
    const notice = () => elements(fixture.render()).find((node) => node.props.className === "pwa-message");
    expect(text(notice())).toBe("일반 웹 모드");
    expect(notice().props).toMatchObject({ "aria-live": "polite", "aria-atomic": "true" });

    fixture.window.dispatchEvent(new Event("appinstalled"));
    expect(text(notice())).toBe("이 기기에 앱을 설치했습니다.");
    expect(notice().props).toMatchObject({ "aria-live": "polite", "aria-atomic": "true" });
    expect(statusMessages()).toHaveLength(1);
  });

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
