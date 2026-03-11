
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
        
        {activeView === 'LANDING' && (
          <button
            onClick={() => onViewChange('CHAT')}
            className="text-xs font-mono px-3 py-1.5 border border-black/10 rounded-full text-[#0057FF] hover:bg-[#0057FF]/5 transition-all flex items-center gap-2 group relative overflow-hidden"
          >
            <span className="relative z-10">高级用户定制（内测）</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

    </div>
  );
};

export default Layout;
