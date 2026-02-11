
import React from 'react';
import { INSPIRATION_DATA } from '../constants';

interface Props {
  onSelect: (prompt: string) => void;
}

const InspirationFlow: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-end px-2">
        <div>
          <h2 className="text-2xl font-bold italic">今日爆梗</h2>
          <p className="text-xs text-zinc-500 font-mono">TRENDING EMOTIONS // LIVE</p>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-[10px] font-mono text-zinc-400">SYNCING...</span>
        </div>
      </div>

      <div className="columns-2 gap-4 space-y-4">
        {INSPIRATION_DATA.map((card) => (
          <div 
            key={card.id} 
            className="group relative break-inside-avoid rounded-xl overflow-hidden glass border border-white/10 hover:border-[#CCFF00]/50 transition-all duration-500"
          >
            <img 
              src={card.imageUrl} 
              alt={card.tag} 
              className="w-full grayscale group-hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
              <span className="text-[#CCFF00] font-bold text-lg mb-2">{card.tag}</span>
              <button 
                onClick={() => onSelect(card.prompt)}
                className="w-full py-2 bg-white text-black text-xs font-bold rounded flex items-center justify-center gap-2 hover:bg-[#CCFF00] transition-colors"
              >
                GET THIS VIBE
              </button>
            </div>
            <div className="p-3">
              <span className="text-[10px] font-mono text-zinc-500 tracking-wider">TAG: {card.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InspirationFlow;
