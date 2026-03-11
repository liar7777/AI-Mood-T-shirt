
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111] flex flex-col max-w-md mx-auto relative overflow-hidden">
      {/* Subtle Background Wash */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#0057FF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-64 h-64 bg-[#111111]/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between sticky top-0 z-50 glass">
        <div className="flex items-center gap-2" onClick={() => onViewChange('LANDING')}>
          <div className="w-8 h-8 bg-[#0057FF] flex items-center justify-center rounded-sm rotate-45">
            <span className="text-white font-bold -rotate-45">情</span>
          </div>
          <h1 className="text-xl font-bold tracking-tighter">情绪定制</h1>
        </div>
        
        <button 
          onClick={() => alert("团队定制功能即将开放（内测）")}
          className="text-xs font-mono px-3 py-1.5 border border-black/10 rounded-full text-[#0057FF] hover:bg-[#0057FF]/5 transition-all flex items-center gap-2 group relative overflow-hidden"
        >
          <span className="relative z-10">团队定制（内测）</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Navigation - Only visible in Landing */}
      {activeView === 'LANDING' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button 
            onClick={() => onViewChange('CHAT')}
            className="px-8 py-4 bg-[#0057FF] text-white font-bold rounded-full shadow-lg neon-glow hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.21 12"/><path d="m12 12 1.21-.1"/><path d="M12 12v10a10 10 0 0 0 10-10H12z"/></svg>
            唤起设计
          </button>
        </div>
      )}
    </div>
  );
};

export default Layout;
