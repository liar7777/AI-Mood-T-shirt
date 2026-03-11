
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
          <p className="text-xs text-zinc-500 font-mono">趋势情绪 · 实时采样</p>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0057FF] animate-pulse"></div>
          <span className="text-[10px] font-mono text-zinc-500">同步中</span>
        </div>
      </div>

      <div className="columns-2 gap-4 space-y-4">
        {INSPIRATION_DATA.map((card) => (
          <div 
            key={card.id} 
            className="group relative break-inside-avoid rounded-xl overflow-hidden glass border border-black/10 hover:border-[#0057FF]/40 transition-all duration-500"
          >
            <img 
              src={card.imageUrl} 
              alt={card.tag} 
              className="w-full grayscale-[30%] group-hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
              <span className="text-[#0057FF] font-bold text-lg mb-2">{card.tag}</span>
              <button 
                onClick={() => onSelect(card.prompt)}
                className="w-full py-2 bg-[#0057FF] text-white text-xs font-bold rounded flex items-center justify-center gap-2 hover:bg-[#0046CC] transition-colors"
              >
                使用此灵感
              </button>
            </div>
            <div className="p-3">
              <span className="text-[10px] font-mono text-zinc-500 tracking-wider">标签：{card.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InspirationFlow;
