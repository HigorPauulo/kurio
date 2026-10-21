import { useRef, type DragEvent, type MouseEvent, type PointerEvent } from "react";

const DRAG_START_PX = 5;

type DragScrollHandlers<Element extends HTMLElement> = {
  onPointerDown: (event: PointerEvent<Element>) => void;
  onPointerMove: (event: PointerEvent<Element>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onClickCapture: (event: MouseEvent<Element>) => void;
  onDragStart: (event: DragEvent<Element>) => void;
};

export function isVerticalScroller(element: HTMLElement): boolean {
  return getComputedStyle(element).flexDirection === "column";
}

export function useDragScroll<Element extends HTMLElement>(): DragScrollHandlers<Element> {
  const dragRef = useRef<{ start: number; scroll: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  function end(): void {
    if (dragRef.current?.moved) suppressClickRef.current = true;
    dragRef.current = null;
  }

  function cancel(): void {
    dragRef.current = null;
  }

  return {
    onPointerDown: (event) => {
      suppressClickRef.current = false;
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      const element = event.currentTarget;
      const vertical = isVerticalScroller(element);
      dragRef.current = {
        start: vertical ? event.clientY : event.clientX,
        scroll: vertical ? element.scrollTop : element.scrollLeft,
        moved: false,
      };
    },
    onPointerMove: (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const element = event.currentTarget;
      const vertical = isVerticalScroller(element);
      const delta = (vertical ? event.clientY : event.clientX) - drag.start;
      if (Math.abs(delta) > DRAG_START_PX && !drag.moved) {
        drag.moved = true;
        element.setPointerCapture(event.pointerId);
      }
      if (!drag.moved) return;
      if (vertical) element.scrollTop = drag.scroll - delta;
      else element.scrollLeft = drag.scroll - delta;
    },
    onPointerUp: end,
    onPointerCancel: cancel,
    onClickCapture: (event) => {
      if (!suppressClickRef.current) return;
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    onDragStart: (event) => event.preventDefault(),
  };
}
