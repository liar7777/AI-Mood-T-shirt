import React from 'react';

type HeaderProps = {
  onBack?: () => void;
};

const Header: React.FC<HeaderProps> = ({ onBack }) => {
  return (
    <header className="h-16 px-6 flex items-center justify-between sticky top-0 z-50 glass">
      <div className="flex items-center gap-2" onClick={onBack}>
        <div className="w-8 h-8 bg-[#0057FF] flex items-center justify-center rounded-sm rotate-45">
          <span className="text-white font-bold -rotate-45">情</span>
        </div>
        <h1 className="text-xl font-bold tracking-tighter">情绪定制</h1>
      </div>
      <div className="text-xs font-mono px-3 py-1.5 border border-black/10 rounded-full text-[#0057FF]">
        团队定制（内测）
      </div>
    </header>
  );
};

export default Header;
