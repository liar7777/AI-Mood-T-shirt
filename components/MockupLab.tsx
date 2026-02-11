
import React, { useState, useEffect } from 'react';
import { REFINEMENT_TAGS } from '../constants';
import { gemini } from '../geminiService';

interface Props {
  designUrl: string;
  onNext: () => void;
}

type GarmentType = '圆领T' | '卫衣' | '冲锋衣';

const MockupLab: React.FC<Props> = ({ designUrl, onNext }) => {
  const [currentDesign, setCurrentDesign] = useState(designUrl);
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [garmentType, setGarmentType] = useState<GarmentType>('圆领T');
  const [isUpdating, setIsUpdating] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Generate initial mockup
  useEffect(() => {
    updateMockup();
  }, [garmentType, currentDesign]);

  const updateMockup = async () => {
    setIsUpdating(true);
    try {
      const mockup = await gemini.generateMockup(currentDesign, garmentType);
      setMockupImage(mockup);
    } catch (e) {
      console.error("Mockup generation failed", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    setIsUpdating(true);
    try {
      const result = await gemini.editDesign(currentDesign, instruction);
      setCurrentDesign(result);
      // Mockup will update via useEffect
    } catch (e) {
      alert("Refinement failed. Try again!");
      setIsUpdating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col p-4 space-y-6 bg-[#050505]">
      <div className="flex-1 relative glass rounded-3xl overflow-hidden border border-white/5 flex items-center justify-center bg-white">
        {/* Mockup Base */}
        <div 
          className="relative w-full h-full transition-transform duration-500 flex items-center justify-center" 
          style={{ transform: `scale(${zoom})` }}
        >
          {mockupImage ? (
            <img 
              src={mockupImage} 
              alt="Model Mockup" 
              className={`w-full h-full object-contain transition-opacity duration-700 ${isUpdating ? 'opacity-40' : 'opacity-100'}`} 
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#CCFF00] border-t-transparent rounded-full animate-spin" />
              <p className="text-black font-mono text-[10px] font-bold animate-pulse">RENDERING MODEL PREVIEW...</p>
            </div>
          )}
          
          {isUpdating && mockupImage && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 border-4 border-[#A020F0] border-t-transparent rounded-full animate-spin" />
                  <span className="text-black font-mono text-[10px] font-bold">UPDATING FABRIC...</span>
                </div>
             </div>
          )}
        </div>

        {/* Industrial Labels */}
        <div className="absolute top-4 left-4 flex flex-col gap-1 z-10">
          <div className="bg-[#CCFF00] text-black text-[9px] font-mono px-2 py-0.5 font-bold tracking-tighter shadow-sm">ZC2522_CORE_PHYSICS_ON</div>
          <div className="bg-black text-white text-[9px] font-mono px-2 py-0.5 border border-white/20">EAST_ASIAN_MALE_FIT / 300DPI</div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
           <button onClick={() => setZoom(prev => Math.min(2, prev + 0.2))} className="w-10 h-10 rounded-full glass border border-white/20 flex items-center justify-center text-xl hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors bg-black/40 text-white">+</button>
           <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))} className="w-10 h-10 rounded-full glass border border-white/20 flex items-center justify-center text-xl hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors bg-black/40 text-white">-</button>
        </div>
      </div>

      {/* Controls Area */}
      <div className="space-y-6">
        {/* Type Selection */}
        <div className="flex justify-around items-center glass p-2 rounded-2xl border border-white/10">
          {(['圆领T', '卫衣', '冲锋衣'] as const).map(type => (
            <button 
              key={type}
              onClick={() => setGarmentType(type)}
              disabled={isUpdating}
              className={`flex-1 mx-1 py-2.5 rounded-xl text-xs font-bold transition-all ${garmentType === type ? 'bg-[#CCFF00] text-black shadow-[0_0_15px_rgba(204,255,0,0.4)]' : 'text-zinc-500 hover:text-white disabled:opacity-30'}`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Refinement Tags */}
        <div className="space-y-3">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-2">微调标签 / REFINEMENT</p>
          <div className="flex flex-wrap gap-2">
            {REFINEMENT_TAGS.map(tag => (
              <button 
                key={tag}
                onClick={() => handleRefine(tag)}
                disabled={isUpdating}
                className="px-3 py-1.5 border border-white/10 rounded-lg text-[11px] font-mono hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-50"
              >
                [{tag}]
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={onNext}
          disabled={isUpdating || !mockupImage}
          className="w-full py-5 bg-[#A020F0] text-white font-bold rounded-2xl shadow-xl purple-glow hover:scale-[1.02] active:scale-95 transition-all text-lg tracking-widest disabled:opacity-50 disabled:grayscale"
        >
          CONFIRM PRODUCTION
        </button>
      </div>
    </div>
  );
};

export default MockupLab;
