import React, { useEffect, useRef, useState } from 'react';

// Canvas is local-only until the signer explicitly submits. No biometric analysis.
export default function SignatureCapture({ onChange, disabled = false }) {
  const canvas = useRef(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, element.width, element.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#152238';
    setHasInk(false);
    onChange(null);
  }, []);
  function point(event) {
    const rect = canvas.current.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.current.width / rect.width,
      y: (event.clientY - rect.top) * canvas.current.height / rect.height,
    };
  }
  function start(event) {
    if (disabled) return;
    event.preventDefault();
    canvas.current.setPointerCapture(event.pointerId);
    drawing.current = true;
    const {x,y} = point(event);
    const ctx = canvas.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x + .1,y + .1);
    ctx.stroke();
    setHasInk(true);
  }
  function move(event) {
    if (!drawing.current || disabled) return;
    event.preventDefault();
    const {x,y} = point(event);
    const ctx = canvas.current.getContext('2d');
    ctx.lineTo(x,y);
    ctx.stroke();
  }
  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvas.current.toDataURL('image/png'));
  }
  function clear() {
    const ctx = canvas.current.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.current.width,canvas.current.height);
    setHasInk(false);
    onChange(null);
  }
  return <div className="space-y-2">
    <label className="block font-medium" htmlFor="assinatura-drafer">Assinatura do cliente</label>
    <canvas id="assinatura-drafer" ref={canvas} width={700} height={220}
      className="w-full border rounded bg-white touch-none"
      aria-label="Área para desenhar assinatura" role="img"
      onPointerDown={start} onPointerMove={move} onPointerUp={finish}
      onPointerCancel={finish} onLostPointerCapture={finish} />
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{hasInk?'Assinatura desenhada':'Assine com mouse, caneta ou dedo'}</span>
      <button type="button" disabled={disabled} className="border rounded px-3 py-1 text-sm" onClick={clear}>Limpar assinatura</button>
    </div>
  </div>;
}
