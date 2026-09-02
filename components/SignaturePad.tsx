"use client";

import { useRef, useState, useEffect } from "react";

export default function SignaturePad({
  onSave,
  existingUrl,
  isPending,
}: {
  onSave: (blob: Blob) => void;
  existingUrl?: string | null;
  isPending?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0f2a47";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes(true);
  }

  function stopDraw() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  function save() {
    canvasRef.current!.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  }

  return (
    <div className="space-y-3">
      {existingUrl && (
        <div>
          <p className="mb-1 text-xs text-gray-500">Current signature</p>
          <img
            src={existingUrl}
            alt="Current signature"
            className="h-16 rounded border border-gray-200 bg-gray-50 object-contain px-2"
          />
        </div>
      )}
      <div>
        <p className="mb-1 text-xs text-gray-500">
          {existingUrl ? "Draw new signature to replace" : "Draw your signature below"}
        </p>
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          className="w-full touch-none rounded-lg border-2 border-dashed border-gray-300 bg-white cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasStrokes || isPending}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Signature"}
        </button>
      </div>
    </div>
  );
}
