"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export interface FixedPosition {
  x: number;
  y: number;
}

interface Options {
  storageKey: string;
  width: number;
  height: number;
  margin?: number;
  getDefault: () => FixedPosition;
}

interface DragSurfaceOptions {
  width?: number;
  height?: number;
  getOrigin?: () => FixedPosition;
  onTap?: () => void;
}

const DRAG_THRESHOLD_PX = 5;

function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  margin: number,
): FixedPosition {
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(maxX, Math.max(margin, x)),
    y: Math.min(maxY, Math.max(margin, y)),
  };
}

function loadPosition(
  key: string,
  fallback: () => FixedPosition,
  width: number,
  height: number,
  margin: number,
): FixedPosition {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FixedPosition>;
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return clampPosition(parsed.x, parsed.y, width, height, margin);
      }
    }
  } catch {
    // ignore corrupt storage
  }
  const d = fallback();
  return clampPosition(d.x, d.y, width, height, margin);
}

export function useDraggableFixedPosition({
  storageKey,
  width,
  height,
  margin = 16,
  getDefault,
}: Options) {
  const [position, setPosition] = useState<FixedPosition>(() =>
    loadPosition(storageKey, getDefault, width, height, margin),
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  const persist = useCallback(
    (next: FixedPosition) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // quota / private mode
      }
    },
    [storageKey],
  );

  const clampAndSet = useCallback(
    (x: number, y: number, w = width, h = height) => {
      setPosition(clampPosition(x, y, w, h, margin));
    },
    [height, margin, width],
  );

  useEffect(() => {
    const onResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y, width, height, margin));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [height, margin, width]);

  const endDrag = useCallback(
    (save: boolean) => {
      const { moved } = dragRef.current;
      dragRef.current.active = false;
      dragRef.current.pointerId = -1;
      setIsDragging(false);
      if (save && moved) {
        setPosition((prev) => {
          persist(prev);
          return prev;
        });
      }
      return moved;
    },
    [persist],
  );

  const bindDragSurface = useCallback(
    (onPosition: (x: number, y: number) => void, opts?: DragSurfaceOptions) => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const origin = opts?.getOrigin?.() ?? { x: position.x, y: position.y };
        dragRef.current = {
          active: true,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          originX: origin.x,
          originY: origin.y,
          moved: false,
        };
        setIsDragging(true);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        if (!dragRef.current.moved && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
          dragRef.current.moved = true;
        }
        if (dragRef.current.moved) {
          const w = opts?.width ?? width;
          const h = opts?.height ?? height;
          const next = clampPosition(
            dragRef.current.originX + dx,
            dragRef.current.originY + dy,
            w,
            h,
            margin,
          );
          onPosition(next.x, next.y);
        }
      },
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
        if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        const moved = endDrag(true);
        if (!moved) opts?.onTap?.();
      },
      onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
        if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
        endDrag(false);
      },
    }),
    [endDrag, height, margin, position.x, position.y, width],
  );

  const fixedStyle: CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: 60,
    touchAction: isDragging ? "none" : undefined,
  };

  return {
    position,
    setPosition: (next: FixedPosition) => setPosition(clampPosition(next.x, next.y, width, height, margin)),
    isDragging,
    fixedStyle,
    bindDragSurface,
  };
}
