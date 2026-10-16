import { useEffect, useRef, useCallback } from "react";
import type { Stroke } from "../types";
import type { Socket } from "socket.io-client";

const COLORS = ["#000000", "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#ffffff"];

interface Props {
  strokes: Stroke[];
  canDraw: boolean;
  socket: Socket;
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, scaleX: number, scaleY: number) {
  if (stroke.points.length < 1) return;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.size * Math.min(scaleX, scaleY);
  if (stroke.isEraser) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
  }
  ctx.beginPath();
  const p0 = stroke.points[0];
  ctx.moveTo(p0.x * scaleX, p0.y * scaleY);
  for (let i = 1; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    ctx.lineTo(p.x * scaleX, p.y * scaleY);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
}

export function DrawingCanvas({ strokes, canDraw, socket }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const currentStrokeIdRef = useRef<string | null>(null);
  const colorRef = useRef("#000000");
  const sizeRef = useRef(8);
  const eraserRef = useRef(false);
  const logicalSize = { w: 800, h: 500 };

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scaleX = canvas.width / logicalSize.w;
    const scaleY = canvas.height / logicalSize.h;
    for (const s of strokes) drawStroke(ctx, s, scaleX, scaleY);
  }, [strokes]);

  useEffect(() => {
    repaint();
  }, [repaint]);

  useEffect(() => {
    const onResize = () => repaint();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [repaint]);

  const toLogical = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * logicalSize.w,
      y: ((e.clientY - rect.top) / rect.height) * logicalSize.h,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canDraw) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = toLogical(e);
    socket.emit(
      "draw_start",
      {
        x,
        y,
        color: eraserRef.current ? "#ffffff" : colorRef.current,
        size: sizeRef.current,
        isEraser: eraserRef.current,
      },
      (res: { ok?: boolean; data?: { strokeId: string } }) => {
        if (res?.data?.strokeId) currentStrokeIdRef.current = res.data.strokeId;
      }
    );
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!canDraw || !drawingRef.current || !currentStrokeIdRef.current) return;
    const { x, y } = toLogical(e);
    socket.emit("draw_move", { strokeId: currentStrokeIdRef.current, x, y });
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    currentStrokeIdRef.current = null;
    socket.emit("draw_end", {});
  };

  const setColor = (c: string) => {
    eraserRef.current = false;
    colorRef.current = c;
  };

  return (
    <div className="canvas-panel">
      {canDraw && (
        <div className="toolbar">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch ${colorRef.current === c && !eraserRef.current ? "active" : ""}`}
              style={{ background: c, border: c === "#ffffff" ? "1px solid #ccc" : undefined }}
              onClick={() => setColor(c)}
            />
          ))}
          <button type="button" onClick={() => { sizeRef.current = 4; }}>Thin</button>
          <button type="button" onClick={() => { sizeRef.current = 12; }}>Thick</button>
          <button type="button" onClick={() => { eraserRef.current = true; }}>Eraser</button>
          <button type="button" onClick={() => socket.emit("draw_undo", {})}>Undo</button>
          <button type="button" onClick={() => socket.emit("canvas_clear", {})}>Clear</button>
        </div>
      )}
      <div ref={wrapRef} className="canvas-wrap">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
    </div>
  );
}
