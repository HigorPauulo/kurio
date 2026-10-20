import { useRef, useState, type DragEvent, type MouseEvent, type PointerEvent } from "react";

const SWIPE_THRESHOLD_PX = 50;
const DRAG_START_PX = 5;

type SwipeHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onClickCapture: (event: MouseEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
};

export type Swipe = { offset: number | null; handlers: SwipeHandlers };

export function useSwipe(onSwipe: (direction: 1 | -1) => void): Swipe {
  const [offset, setOffset] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);

  function end(): void {
    if (startRef.current === null) return;
    if (offset !== null && Math.abs(offset) >= SWIPE_THRESHOLD_PX) onSwipe(offset < 0 ? 1 : -1);
    startRef.current = null;
    setOffset(null);
  }

  return {
    offset,
    handlers: {
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        startRef.current = event.clientX;
        hasDraggedRef.current = false;
        setOffset(0);
      },
      onPointerMove: (event) => {
        if (startRef.current === null) return;
        const next = event.clientX - startRef.current;
        if (Math.abs(next) > DRAG_START_PX && !hasDraggedRef.current) {
          hasDraggedRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        setOffset(next);
      },
      onPointerUp: end,
      onPointerCancel: end,
      onClickCapture: (event) => {
        if (!hasDraggedRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        hasDraggedRef.current = false;
      },
      onDragStart: (event) => event.preventDefault(),
    },
  };
}
