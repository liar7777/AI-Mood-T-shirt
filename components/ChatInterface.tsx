
import React, { useState, useRef, useEffect } from 'react';
import { STYLE_CARDS } from '../constants';
import { gemini } from '../geminiService';

interface ChatInterfaceProps {
  onComplete: (imageUrl: string) => void;
  initialPrompt?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onComplete, initialPrompt }) => {
  const [messages, setMessages] = useState<any[]>([
    { id: '1', role: 'agent', text: '已经捕捉到你现在的波段了吗？告诉我你今天想穿什么情绪。' }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const checkAndPromptKey = async () => {
    // Check if window.aistudio exists (environment check)
    if (typeof (window as any).aistudio !== 'undefined') {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }
    }
  };

  const handleSend = async (text: string, vibeOverride?: string) => {
    if (!text.trim() && !vibeOverride) return;

    await checkAndPromptKey();

    const userMsg = { id: Date.now().toString(), role: 'user', text: text || vibeOverride };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    try {
      const images = await gemini.generateSketches(text || 'Streetwear vibe', vibeOverride || 'Cyberpunk Glitch');
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        text: '情绪提取完毕。这是 1 张灵感草图，直接进入深化：',
        images: images
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        text: '哎呀，情绪波段过强，我的引擎卡住了。要再试一次吗？'
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] relative bg-[#F8F9FA]">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 pb-48"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[90%] space-y-3`}>
              <div className={`px-4 py-3 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-[#0057FF] text-white rounded-tr-none' 
                  : 'bg-white border border-black/10 rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
              
              {msg.images && (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in duration-500">
                  {msg.images.map((img: string, idx: number) => (
                    <div 
                      key={idx} 
                      className="group relative rounded-xl overflow-hidden border border-black/10 hover:border-[#0057FF] transition-all cursor-pointer"
                      onClick={() => onComplete(img)}
                    >
                      <img src={img} alt={`草图 ${idx}`} className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="bg-white text-black text-[10px] font-bold px-2 py-1 rounded">选用</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-black/10">
              <div className="flex flex-col gap-3">
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-[#0057FF] rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-[#0057FF] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-[#0057FF] rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[10px] font-mono ml-2 text-zinc-500 tracking-widest">正在生成 1 张草图…</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[1].map(i => (
                    <div key={i} className="aspect-square bg-zinc-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4 glass border-t border-black/10">
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 px-1">
          <span>状态：在线</span>
          <span>预计耗时：1–2 分钟</span>
        </div>
        {!isGenerating && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {STYLE_CARDS.map((style) => (
              <button
                key={style.label}
                onClick={() => handleSend('', style.value)}
                className="whitespace-nowrap px-4 py-2 rounded-full glass border border-black/10 text-xs font-bold hover:border-[#0057FF] hover:text-[#0057FF] transition-all active:scale-95"
              >
                [{style.label}]
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你此刻的情绪描述…"
            className="w-full bg-white border border-black/10 rounded-full px-6 py-4 pr-16 text-sm focus:outline-none focus:border-[#0057FF]/60 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          />
          <button 
            onClick={() => handleSend(input)}
            className="absolute right-2 top-2 bottom-2 w-12 bg-[#0057FF] text-white rounded-full flex items-center justify-center hover:scale-95 active:scale-90 transition-transform shadow-[0_0_10px_rgba(0,87,255,0.3)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
