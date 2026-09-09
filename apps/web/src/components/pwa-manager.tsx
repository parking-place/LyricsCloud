"use client";

import { hasOwnerPendingDrafts, migrateOwnerLocalDrafts } from "@lyricscloud/editor";
import { useEffect, useRef, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const UPDATE_APPROVED = "lc:pwa:update-approved";

export function PwaManager({ ownerId }: { ownerId: string }) {
  const [online, setOnline] = useState(true);
  const [supported, setSupported] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState(false);
  const [message, setMessage] = useState("");
  const composing = useRef(false);
  const activated = useRef(false);

  function memoryPending() {
    return composing.current || Boolean(document.querySelector('[data-pending-input="true"]'));
  }
  async function updateBlocked() {
    const before = memoryPending();
    const durable = await hasOwnerPendingDrafts(ownerId).catch(() => true);
    return before || durable || memoryPending();
  }
  useEffect(() => {
    const start = () => { composing.current = true; };
    const end = () => { composing.current = false; };
    window.addEventListener("compositionstart", start, true);
    window.addEventListener("compositionend", end, true);
    return () => {
      window.removeEventListener("compositionstart", start, true);
      window.removeEventListener("compositionend", end, true);
    };
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onlineChanged = () => setOnline(navigator.onLine);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => { setInstallPrompt(null); setMessage("이 기기에 앱을 설치했습니다."); };
    window.addEventListener("online", onlineChanged);
    window.addEventListener("offline", onlineChanged);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);

    if (!("serviceWorker" in navigator) || !(window.isSecureContext || location.hostname === "127.0.0.1" || location.hostname === "localhost")) {
      setSupported(false);
      return () => {
        window.removeEventListener("online", onlineChanged);
        window.removeEventListener("offline", onlineChanged);
        window.removeEventListener("beforeinstallprompt", beforeInstall);
        window.removeEventListener("appinstalled", installed);
      };
    }

    let active = true;
    let poll: ReturnType<typeof setInterval> | undefined;
    const controllerChanged = async () => {
      if (sessionStorage.getItem(UPDATE_APPROVED) !== "1") return;
      sessionStorage.removeItem(UPDATE_APPROVED);
      activated.current = true;
      // Input may have changed while the worker was activating.
      if (await updateBlocked()) {
        if (active) { setPendingDrafts(true); setMessage("현재 입력을 보존하기 위해 새로고침을 보류했습니다. 저장 후 업데이트를 다시 적용해 주세요."); }
        return;
      }
      if (!active || memoryPending()) return;
      location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);
    void migrateOwnerLocalDrafts(ownerId).catch(() => setMessage("로컬 초안 저장소를 준비하지 못했습니다."));
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((registration) => {
      if (!active) return;
      setWaiting(registration.waiting);
      sendStaticAssets(registration.active ?? registration.installing);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            if (navigator.serviceWorker.controller) setWaiting(worker);
            sendStaticAssets(worker);
          }
        });
      });
      poll = setInterval(() => { void registration.update(); }, 60 * 60 * 1_000);
    }).catch(() => setSupported(false));

    return () => {
      active = false;
      clearInterval(poll);
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged);
      window.removeEventListener("online", onlineChanged);
      window.removeEventListener("offline", onlineChanged);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, [ownerId]);

  useEffect(() => {
    if (!waiting) return;
    let active = true;
    async function refresh() {
      const pending = await updateBlocked();
      if (active) setPendingDrafts(pending);
    }
    void refresh();
    const poll = setInterval(() => { void refresh(); }, 2_000);
    const events = ["online", "input", "change", "compositionstart", "compositionend"];
    for (const event of events) window.addEventListener(event, refresh, true);
    return () => { active = false; clearInterval(poll); for (const event of events) window.removeEventListener(event, refresh, true); };
  }, [ownerId, waiting]);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "dismissed") setMessage("설치를 취소했습니다. 웹에서는 그대로 사용할 수 있습니다.");
  }

  async function applyUpdate() {
    if (!waiting) return;
    const pending = await updateBlocked();
    setPendingDrafts(pending);
    if (pending) {
      setMessage("현재 입력과 미전송 초안을 저장한 뒤 업데이트할 수 있습니다.");
      return;
    }
    if (activated.current) { location.reload(); return; }
    sessionStorage.setItem(UPDATE_APPROVED, "1");
    setMessage("업데이트를 적용하고 있습니다…");
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  const standalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
  return <aside className={`pwa-status${online ? " is-online" : " is-offline"}`} aria-label="앱 연결 및 설치 상태">
    <p aria-live="polite"><span aria-hidden="true" />{online ? "온라인" : "오프라인 · 초안은 이 기기에 보관됩니다"}{!supported ? " · 일반 웹 모드" : ""}</p>
    {installPrompt && !standalone ? <button type="button" onClick={() => void install()}>앱 설치</button> : null}
    {waiting ? <><span>{pendingDrafts ? "업데이트 준비됨 · 미전송 초안 보존 중" : "안전한 업데이트가 준비되었습니다"}</span><button type="button" onClick={() => void applyUpdate()} disabled={pendingDrafts}>업데이트 적용</button></> : null}
    {message ? <span className="pwa-message">{message}</span> : null}
  </aside>;
}

function sendStaticAssets(worker: ServiceWorker | null): void {
  if (!worker) return;
  const urls = new Set<string>();
  for (const entry of performance.getEntriesByType("resource")) urls.add(entry.name);
  for (const element of document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src],link[rel=stylesheet][href],link[rel=modulepreload][href]")) {
    const value = element instanceof HTMLScriptElement ? element.src : element.href;
    if (value) urls.add(value);
  }
  worker.postMessage({ type: "PRECACHE_STATIC", urls: [...urls] });
}
