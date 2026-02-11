
import React from 'react';

const Checkout: React.FC = () => {
  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h2 className="text-3xl font-black italic">FINAL SPECS</h2>
        <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Industrial Grade Parameters / 工业级参数</p>
      </div>

      <div className="glass p-6 rounded-3xl border border-[#CCFF00]/20 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500">VERSION</span>
            <p className="font-bold">ZC-2522 CORE</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500">MATERIAL</span>
            <p className="font-bold">280G 重磅棉</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500">RESOLUTION</span>
            <p className="font-bold text-[#CCFF00]">300DPI / LOSSLESS</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500">EST. DELIVERY</span>
            <p className="font-bold">48H PRODUCTION</p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 space-y-4">
           <p className="text-[10px] font-mono text-zinc-500">SELECT SIZE / 尺码选择</p>
           <div className="flex gap-2">
             {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
               <button key={size} className="w-10 h-10 border border-white/10 flex items-center justify-center text-xs font-bold hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors">{size}</button>
             ))}
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end p-2 border-b border-white/10">
          <span className="text-zinc-500 text-sm">DESIGN FEE (AI)</span>
          <span className="font-mono text-sm">¥0.00 (MEMBERS ONLY)</span>
        </div>
        <div className="flex justify-between items-end p-2 border-b border-white/10">
          <span className="text-zinc-500 text-sm">PRODUCT FEE</span>
          <span className="font-mono text-sm">¥199.00</span>
        </div>
        <div className="flex justify-between items-end p-4 bg-[#CCFF00] rounded-xl text-black">
          <span className="font-black">TOTAL</span>
          <span className="text-2xl font-black italic">¥199.00</span>
        </div>
      </div>

      <button className="w-full py-5 bg-white text-black font-black text-xl rounded-full shadow-2xl hover:bg-[#CCFF00] transition-all transform active:scale-95">
        ORDER NOW / 立即结算
      </button>

      <p className="text-center text-[10px] font-mono text-zinc-600">
        POWERED BY TRIE AI ENGINE V1.2.5 <br/>
        ALL RIGHTS RESERVED 2024
      </p>
    </div>
  );
};

export default Checkout;
