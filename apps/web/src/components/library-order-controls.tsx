"use client";

import { useRef, useState, type Dispatch, type DragEvent, type KeyboardEvent, type SetStateAction } from "react";

export interface OrderableLibraryItem {
  readonly id: string;
  readonly title: string;
  readonly isPinned: boolean;
}

interface MoveBody {
  readonly requestId: string;
  readonly itemId: string;
  readonly beforeId: string | null;
  readonly afterId: string | null;
  readonly expectedVersion: number;
}

interface PendingMove<T> {
  readonly body: MoveBody;
  readonly title: string;
  readonly snapshot: T[];
  readonly optimistic: T[];
}

export function useLibraryCardOrder<T extends OrderableLibraryItem>({
  items, setItems, orderVersion, setOrderVersion, endpoint, noun, activateManual, reload, setNotice
}: {
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  orderVersion: number;
  setOrderVersion: Dispatch<SetStateAction<number>>;
  endpoint: string;
  noun: string;
  activateManual: () => void;
  reload: () => void;
  setNotice: Dispatch<SetStateAction<string>>;
}) {
  const [movingId, setMovingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [retryMove, setRetryMove] = useState<PendingMove<T> | null>(null);
  const moveInFlight = useRef(false);

  async function submitMove(pending: PendingMove<T>) {
    if (moveInFlight.current) return;
    moveInFlight.current = true;
    setMovingId(pending.body.itemId);
    setRetryMove(null);
    setNotice("");
    setItems(pending.optimistic);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.body)
      });
      if (response.status === 409) {
        setItems(pending.snapshot);
        activateManual();
        reload();
        setNotice(`다른 화면에서 ${noun} 순서가 변경되어 최신 사용자 정렬을 불러왔습니다.`);
        return;
      }
      if (!response.ok) throw new Error("SAVE_FAILED");
      const result = await response.json() as { orderVersion: number };
      setOrderVersion(result.orderVersion);
      activateManual();
      setNotice(`${pending.title} 순서를 사용자 정렬로 저장했습니다.`);
    } catch {
      setItems(pending.snapshot);
      setRetryMove(pending);
      setNotice(`${noun} 순서를 저장하지 못했습니다. 원래 순서로 복원했습니다.`);
    } finally {
      moveInFlight.current = false;
      setMovingId(null);
    }
  }

  function moveItem(itemId: string, destinationIndex: number) {
    if (moveInFlight.current) return;
    const item = items.find(({ id }) => id === itemId);
    if (!item) return;
    const group = items.filter(({ isPinned }) => isPinned === item.isPinned);
    const sourceIndex = group.findIndex(({ id }) => id === itemId);
    if (sourceIndex < 0 || group.length < 2) return;
    const without = group.filter(({ id }) => id !== itemId);
    const boundedIndex = Math.max(0, Math.min(destinationIndex, without.length));
    const nextGroup = [...without.slice(0, boundedIndex), item, ...without.slice(boundedIndex)];
    if (nextGroup.every((candidate, index) => candidate.id === group[index]?.id)) return;
    let groupIndex = 0;
    const optimistic = items.map((candidate) => candidate.isPinned === item.isPinned ? nextGroup[groupIndex++]! : candidate);
    const newIndex = nextGroup.findIndex(({ id }) => id === itemId);
    void submitMove({
      title: item.title,
      snapshot: items,
      optimistic,
      body: {
        requestId: crypto.randomUUID(),
        itemId,
        beforeId: nextGroup[newIndex + 1]?.id ?? null,
        afterId: nextGroup[newIndex - 1]?.id ?? null,
        expectedVersion: orderVersion
      }
    });
  }

  function moveToTarget(itemId: string, targetId: string, after: boolean) {
    const item = items.find(({ id }) => id === itemId);
    const target = items.find(({ id }) => id === targetId);
    if (!item || !target || item.isPinned !== target.isPinned || itemId === targetId) return;
    const without = items.filter(({ isPinned, id }) => isPinned === item.isPinned && id !== itemId);
    const targetIndex = without.findIndex(({ id }) => id === targetId);
    if (targetIndex >= 0) moveItem(itemId, targetIndex + (after ? 1 : 0));
  }

  return {
    movingId,
    draggedId,
    setDraggedId,
    retryMove,
    submitMove,
    moveItem,
    moveToTarget
  };
}

export function LibraryOrderHandle({ title, moving, canMoveBefore, canMoveAfter, onMove, onDragStart, onDragEnd }: {
  title: string;
  moving: boolean;
  canMoveBefore: boolean;
  canMoveAfter: boolean;
  onMove: (destination: "first" | "previous" | "next" | "last") => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  function keyboardMove(event: KeyboardEvent<HTMLButtonElement>) {
    const destination = event.key === "Home" ? "first" : event.key === "ArrowUp" || event.key === "ArrowLeft" ? "previous"
      : event.key === "ArrowDown" || event.key === "ArrowRight" ? "next" : event.key === "End" ? "last" : null;
    if (!destination) return;
    event.preventDefault();
    onMove(destination);
  }
  return <div className="song-order-controls">
    <button type="button" className="song-drag-handle" draggable={!moving} disabled={moving}
      aria-label={`${title} 드래그 또는 방향키로 순서 이동`}
      onKeyDown={keyboardMove}
      onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}>⠿</button>
    <button type="button" disabled={moving || !canMoveBefore} aria-label={`${title} 맨 앞으로 이동`} title="맨 앞으로" onClick={() => onMove("first")}>⇤</button>
    <button type="button" disabled={moving || !canMoveBefore} aria-label={`${title} 앞으로 이동`} onClick={() => onMove("previous")}>↑</button>
    <button type="button" disabled={moving || !canMoveAfter} aria-label={`${title} 뒤로 이동`} onClick={() => onMove("next")}>↓</button>
    <button type="button" disabled={moving || !canMoveAfter} aria-label={`${title} 맨 뒤로 이동`} title="맨 뒤로" onClick={() => onMove("last")}>⇥</button>
  </div>;
}

export function dropAfter(event: DragEvent<HTMLElement>): boolean {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientY >= box.top + box.height / 2;
}
