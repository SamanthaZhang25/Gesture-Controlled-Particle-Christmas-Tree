
import React from 'react';
import { DecorationTemplate } from '../types';

export const DECORATIONS: DecorationTemplate[] = [
  { id: '1', type: 'ball', color: '#ff1a1a', label: 'Crimson' },
  { id: '2', type: 'ball', color: '#ffd700', label: 'Gold' },
  { id: '3', type: 'ball', color: '#1a75ff', label: 'Azure' },
  { id: '4', type: 'ball', color: '#ff66cc', label: 'Pink' },
  { id: '5', type: 'star', color: '#ffffff', label: 'White Star' },
  { id: '6', type: 'star', color: '#ffeb3b', label: 'Yellow Star' },
  { id: '7', type: 'gift', color: '#00ff00', label: 'Green Gift' },
  { id: '8', type: 'gift', color: '#a366ff', label: 'Purple Gift' },
];

interface SidebarProps {
  onDragStart: (item: DecorationTemplate) => void;
  activeDragId: string | null;
  handHoverIndex: number | null;
  labelCollection: string;
  labelDwell: string;
}

const DecorationSidebar: React.FC<SidebarProps> = ({ onDragStart, activeDragId, handHoverIndex, labelCollection, labelDwell }) => {
  return (
    <div className="absolute right-0 top-0 h-full w-28 bg-black/60 backdrop-blur-3xl border-l border-white/10 flex flex-col items-center py-8 gap-5 z-20 shadow-2xl overflow-y-auto no-scrollbar">
      <div className="text-[10px] text-white/50 uppercase vertical-text transform -rotate-90 origin-center mb-8 font-black tracking-[0.3em] h-24 flex items-center whitespace-nowrap">
        {labelCollection}
      </div>
      {DECORATIONS.map((item, idx) => (
        <button
          key={item.id}
          className={`relative w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
            activeDragId === item.id 
              ? 'border-blue-400 bg-blue-500/30 scale-110 shadow-[0_0_20px_rgba(96,165,250,0.6)]' 
              : handHoverIndex === idx
              ? 'border-white/60 bg-white/20 scale-105'
              : 'border-white/5 bg-white/5 hover:bg-white/10'
          }`}
          onClick={() => onDragStart(item)}
        >
          {handHoverIndex === idx && (
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
          )}
          <div 
            className={`w-10 h-10 shadow-2xl transition-transform duration-500 ${handHoverIndex === idx ? 'scale-110' : ''}`} 
            style={{ 
              backgroundColor: item.color,
              clipPath: item.type === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none',
              borderRadius: item.type === 'gift' ? '6px' : item.type === 'ball' ? '50%' : '0',
              boxShadow: `0 0 15px ${item.color}88`
            }}
          >
            {item.type === 'ball' && <div className="absolute top-1 left-1 w-3 h-3 bg-white/40 rounded-full blur-[1px]" />}
            {item.type === 'gift' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-1 bg-white/20" />
                <div className="h-full w-1 bg-white/20 absolute" />
              </div>
            )}
          </div>
        </button>
      ))}
      <div className="mt-auto pb-8 flex flex-col items-center gap-2 opacity-30">
        <div className="w-0.5 h-12 bg-gradient-to-b from-white to-transparent" />
        <span className="text-[7px] uppercase tracking-[0.2em] text-center px-4 leading-relaxed font-bold">{labelDwell}</span>
      </div>
    </div>
  );
};

export default DecorationSidebar;
