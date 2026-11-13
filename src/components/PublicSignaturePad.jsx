import React, { useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';
import { Button } from '@/components/ui/button';

export default function PublicSignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const padRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = 200 * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    const pad = new SignaturePad(canvas);
    pad.addEventListener('endStroke', () => {
      onChange(pad.isEmpty() ? null : pad.toDataURL());
    });
    padRef.current = pad;
    return () => {
      pad.off();
    };
  }, []);

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        className="border-2 border-dashed border-slate-300 rounded-lg bg-white w-full cursor-crosshair touch-none"
        style={{ maxWidth: '100%' }}
      ></canvas>
      <Button
        variant="outline"
        onClick={() => {
          padRef.current?.clear();
          onChange(null);
        }}
        className="w-full"
      >
        Limpar assinatura
      </Button>
    </div>
  );
}