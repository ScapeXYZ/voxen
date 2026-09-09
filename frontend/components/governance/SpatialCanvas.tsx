"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Maximize2, Minus, Plus, Move } from "lucide-react";

export interface GraphPoint {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function graphPosition(point: GraphPoint): CSSProperties {
  return {
    "--node-x": `${point.x}px`,
    "--node-y": `${point.y}px`,
    "--node-width": `${point.width}px`,
  } as CSSProperties;
}
interface Camera {
  x: number;
  y: number;
  zoom: number;
}
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Shared presentation camera. The DOM stays in reading order, including on mobile. */
export function SpatialCanvas({
  children,
  width,
  height,
  label,
  focus,
  onOverview,
  className = "",
  caption,
}: {
  children: ReactNode;
  width: number;
  height: number;
  label: string;
  focus?: GraphPoint | null;
  onOverview?: () => void;
  className?: string;
  caption: ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    camera: Camera;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(false);
  const [mobile, setMobile] = useState(false);
  const instructions = useId();
  const fit = useCallback(() => {
    const zoom = Math.min(
      (size.width - 48) / width,
      (size.height - 55) / height,
      1,
    );
    return {
      x: (size.width - width * zoom) / 2,
      y: (size.height - height * zoom) / 2,
      zoom: Math.max(0.1, zoom),
    };
  }, [size, width, height]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(element);
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, []);
  useEffect(() => {
    if (!size.width || mobile) return;
    if (!focus) {
      setCamera(fit());
      return;
    }
    const zoom = Math.min(
      1.22,
      size.width / (focus.width + 260),
      size.height / (focus.height + 160),
    );
    setCamera({
      x: size.width / 2 - (focus.x + focus.width / 2) * zoom,
      y: size.height / 2 - (focus.y + focus.height / 2) * zoom,
      zoom,
    });
  }, [focus, fit, size, mobile]);
  // Native focus scrolling must not add a second offset to the graph camera.
  useEffect(() => {
    if (!mobile) viewport.current?.scrollTo({ left: 0, top: 0, behavior: "instant" });
  }, [camera, mobile]);
  const zoomBy = useCallback(
    (factor: number) => {
      setCamera((current) => {
        const zoom = clamp(current.zoom * factor, fit().zoom * 0.8, 1.7);
        const ratio = zoom / current.zoom;
        return {
          x: size.width / 2 - (size.width / 2 - current.x) * ratio,
          y: size.height / 2 - (size.height / 2 - current.y) * ratio,
          zoom,
        };
      });
    },
    [fit, size],
  );
  function overview() {
    setCamera(fit());
    onOverview?.();
  }
  return (
    <div
      className={`spatial-canvas ${className} ${dragging ? "is-dragging" : ""}`}
    >
      <div className="spatial-topline">
        <span className="eyebrow">
          <span className="dot" />
          {label}
        </span>
        <span className="spatial-desktop-hint">
          A SHARED VIEW OF WHAT CONNECTS US
        </span>
      </div>
      <div
        ref={viewport}
        className="spatial-viewport"
        tabIndex={mobile ? -1 : 0}
        role="region"
        aria-label={`${label} interactive graph`}
        aria-describedby={instructions}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || mobile) return;
          const shifts: Record<string, [number, number]> = {
            ArrowLeft: [65, 0],
            ArrowRight: [-65, 0],
            ArrowUp: [0, 65],
            ArrowDown: [0, -65],
          };
          if (shifts[event.key]) {
            event.preventDefault();
            const [x, y] = shifts[event.key];
            setCamera((c) => ({
              ...c,
              x: clamp(c.x + x, -width * c.zoom, size.width),
              y: clamp(c.y + y, -height * c.zoom, size.height),
            }));
          } else if (["+", "=", "-", "0", "Escape"].includes(event.key)) {
            event.preventDefault();
            if (event.key === "0" || event.key === "Escape") overview();
            else zoomBy(event.key === "-" ? 1 / 1.18 : 1.18);
          }
        }}
        onPointerDown={(event) => {
          if (
            mobile ||
            event.button !== 0 ||
            (event.target as HTMLElement).closest("a, button, input, select")
          )
            return;
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            camera,
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) + Math.abs(dy) < 4 && !start.moved) return;
          start.moved = true;
          setDragging(true);
          setCamera({
            ...start.camera,
            x: clamp(
              start.camera.x + dx,
              -width * start.camera.zoom,
              size.width,
            ),
            y: clamp(
              start.camera.y + dy,
              -height * start.camera.zoom,
              size.height,
            ),
          });
        }}
        onPointerUp={(event) => {
          suppressClick.current = Boolean(drag.current?.moved);
          drag.current = null;
          setDragging(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        <div
          className="spatial-world"
          style={{
            width,
            height,
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            visibility: size.width || mobile ? "visible" : "hidden",
          }}
        >
          {children}
        </div>
      </div>
      <div className="spatial-bottom">
        <span className="spatial-caption">{caption}</span>
        <div className="spatial-controls" aria-label="Graph camera controls">
          <span className="camera-hint" id={instructions}>
            <Move size={13} />
            Drag to pan · arrows to move · +/− to zoom · 0 to reset
          </span>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / 1.18)}
            disabled={camera.zoom <= fit().zoom * 0.81}
          >
            <Minus size={15} />
          </button>
          <output aria-label="Graph zoom">
            {Math.round(camera.zoom * 100)}%
          </output>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomBy(1.18)}
            disabled={camera.zoom >= 1.69}
          >
            <Plus size={15} />
          </button>
          <button type="button" onClick={overview} className="overview-button">
            <Maximize2 size={14} />
            Overview
          </button>
        </div>
      </div>
    </div>
  );
}
