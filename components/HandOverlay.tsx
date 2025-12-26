
import React, { useEffect, useRef } from 'react';

interface HandOverlayProps {
  results: any;
  labelInput: string;
}

const HandOverlay: React.FC<HandOverlayProps> = ({ results, labelInput }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !results?.landmarks) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    results.landmarks.forEach((hand: any[]) => {
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      const connections = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12], [0, 13, 14, 15, 16], [0, 17, 18, 19, 20], [5, 9, 13, 17, 5]];
      connections.forEach(path => {
        ctx.beginPath();
        path.forEach((idx, i) => {
          const x = (1 - hand[idx].x) * canvasRef.current!.width;
          const y = hand[idx].y * canvasRef.current!.height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
      hand.forEach(lm => {
        const x = (1 - lm.x) * canvasRef.current!.width;
        const y = lm.y * canvasRef.current!.height;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }, [results]);

  return (
    <div className="absolute bottom-10 left-10 w-48 h-36 bg-black/60 border border-white/20 rounded-2xl overflow-hidden backdrop-blur-md pointer-events-none z-30 shadow-2xl transition-all duration-500">
      <canvas ref={canvasRef} width={192} height={144} className="w-full h-full opacity-80" />
      <div className="absolute top-2 left-3 text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-400 drop-shadow-sm whitespace-nowrap">
        {labelInput}
      </div>
    </div>
  );
};

export default HandOverlay;
