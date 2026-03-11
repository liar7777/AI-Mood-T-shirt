
import React from 'react';

const Checkout: React.FC = () => {
  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h2 className="text-3xl font-black italic">最终规格</h2>
        <p className="text-xs text-zinc-500 font-mono tracking-widest">工业级参数</p>
        <p className="text-[10px] font-mono text-zinc-500">生产单据：自动生成</p>
      </div>

      <div className="glass p-6 rounded-3xl border border-black/10 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500">版本</span>
            <p className="font-bold">核心型号 2522</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500">面料</span>
            <p className="font-bold">280G 重磅棉</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500">分辨率</span>
            <p className="font-bold text-[#0057FF]">300 分辨率 / 无损</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500">预计交付</span>
            <p className="font-bold">48 小时生产</p>
          </div>
        </div>

        <div className="pt-6 border-t border-black/10 space-y-4">
           <p className="text-[10px] font-mono text-zinc-500">尺码选择</p>
           <div className="flex gap-2">
             {['小', '中', '大', '加大', '特大'].map(size => (
               <button key={size} className="w-10 h-10 border border-black/10 flex items-center justify-center text-xs font-bold hover:border-[#0057FF] hover:text-[#0057FF] transition-colors">{size}</button>
             ))}
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end p-2 border-b border-black/10">
          <span className="text-zinc-500 text-sm">设计费用（智能）</span>
          <span className="font-mono text-sm">¥0.00（会员专享）</span>
        </div>
        <div className="flex justify-between items-end p-2 border-b border-black/10">
          <span className="text-zinc-500 text-sm">产品费用</span>
          <span className="font-mono text-sm">¥199.00</span>
        </div>
        <div className="flex justify-between items-end p-4 bg-[#0057FF] rounded-xl text-white">
          <span className="font-black">合计</span>
          <span className="text-2xl font-black italic">¥199.00</span>
        </div>
      </div>

      <button className="w-full py-5 bg-white text-black font-black text-xl rounded-full shadow-2xl hover:bg-[#0057FF] hover:text-white transition-all transform active:scale-95">
        立即结算
      </button>

      <p className="text-center text-[10px] font-mono text-zinc-600">
        情绪引擎 版本 1.2.5 <br/>
        版权归属 2024
      </p>
    </div>
  );
};

export default Checkout;
