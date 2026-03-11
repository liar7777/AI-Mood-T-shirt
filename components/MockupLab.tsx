import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Maximize2, Move, RotateCw, Wand2 } from 'lucide-react';
import { REFINEMENT_TAGS } from '../constants';
import { gemini } from '../geminiService';

interface Props {
  designUrl: string;
  isLoading?: boolean;
  loadingText?: string;
  onNext: (previews: Record<string, string>) => void;
  onBack?: () => void;
}

type PositionType = '前' | '后' | '侧';

type ViewMode = '2D' | '3D';

type StageSize = { w: number; h: number };

type DesignPos = { x: number; y: number };

type DragMode = 'move' | 'scale' | 'rotate';

type DragState = {
  mode: DragMode;
  startX: number;
  startY: number;
  startPos: DesignPos;
  startScale: number;
  startRotate: number;
};

const CHEST_ANCHOR_DEFAULT: Record<PositionType, { x: number; y: number }> = {
  '前': { x: 0.5, y: 0.38 },
  '后': { x: 0.5, y: 0.36 },
  '侧': { x: 0.55, y: 0.4 },
};

const SAFE_BOX_RATIO: Record<PositionType, { left: number; top: number; width: number; height: number }> = {
  // Based on the user-drawn front reference
  '前': { left: 0.2600, top: 0.2275, width: 0.4609, height: 0.5333 },
  // Based on the user-drawn back reference
  '后': { left: 0.2628, top: 0.2085, width: 0.4408, height: 0.5021 },
  // Based on the user-drawn side reference
  '侧': { left: 0.4208, top: 0.3534, width: 0.2684, height: 0.2721 },
};

const DEFAULT_SCALE: Record<PositionType, number> = {
  '前': 0.75,
  '后': 0.75,
  '侧': 0.375,
};

const POSITION_IMAGES: Record<PositionType, string> = {
  '前': '/mockups/front.jpg',
  '后': '/mockups/back.jpg',
  '侧': '/mockups/side.jpg',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const MockupLab: React.FC<Props> = ({ designUrl, isLoading = false, loadingText = '加载中', onNext, onBack }) => {
  const [currentDesign, setCurrentDesign] = useState(designUrl);
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [positionType, setPositionType] = useState<PositionType>('前');
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('2D');
  const [refineInput, setRefineInput] = useState('');

  const [stage, setStage] = useState<StageSize>({ w: 0, h: 0 });
  const [designPos, setDesignPos] = useState<DesignPos>({ x: 0.5, y: 0.45 });
  const [designScale, setDesignScale] = useState(DEFAULT_SCALE['前']);
  const [designRotate, setDesignRotate] = useState(0);
  const [designPosMap, setDesignPosMap] = useState<Record<PositionType, DesignPos>>({
    '前': { x: 0.5, y: 0.38 },
    '后': { x: 0.5, y: 0.36 },
    '侧': { x: 0.55, y: 0.4 },
  });
  const [designScaleMap, setDesignScaleMap] = useState<Record<PositionType, number>>({
    '前': DEFAULT_SCALE['前'],
    '后': DEFAULT_SCALE['后'],
    '侧': DEFAULT_SCALE['侧'],
  });
  const [designRotateMap, setDesignRotateMap] = useState<Record<PositionType, number>>({
    '前': 0,
    '后': 0,
    '侧': 0,
  });
  const [touchedPositions, setTouchedPositions] = useState<Record<PositionType, boolean>>({
    '前': true,
    '后': false,
    '侧': false,
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    setCurrentDesign(designUrl);
  }, [designUrl]);

  useEffect(() => {
    if (viewMode === '3D') {
      setMockupImage(null);
    }
  }, [positionType, currentDesign, viewMode]);

  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const updateSize = () => {
      setStage({ w: el.clientWidth, h: el.clientHeight });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setDesignPos(designPosMap[positionType]);
    setDesignScale(designScaleMap[positionType]);
    setDesignRotate(designRotateMap[positionType]);
  }, [positionType, designPosMap, designScaleMap, designRotateMap]);

  const baseSize = useMemo(() => {
    if (!stage.w || !stage.h) return 0;
    return Math.min(stage.w, stage.h) * 0.46;
  }, [stage]);

  const safeBox = useMemo(() => {
    const ratio = SAFE_BOX_RATIO[positionType];
    const w = stage.w * ratio.width;
    const h = stage.h * ratio.height;
    return {
      w,
      h,
      left: stage.w * ratio.left,
      top: stage.h * ratio.top,
    };
  }, [stage, positionType]);

  const minScale = useMemo(() => {
    if (!baseSize || !safeBox.w || !safeBox.h) return 0.5;
    const minByWidth = (safeBox.w * 0.5) / baseSize;
    const minByHeight = (safeBox.h * 0.5) / baseSize;
    return clamp(Math.min(minByWidth, minByHeight), 0.3, 2);
  }, [baseSize, safeBox]);

  const maxScale = useMemo(() => {
    if (!baseSize || !safeBox.w || !safeBox.h) return 1.6;
    const maxByWidth = (safeBox.w * 0.98) / baseSize;
    const maxByHeight = (safeBox.h * 0.98) / baseSize;
    return clamp(Math.min(maxByWidth, maxByHeight), 0.6, 2.5);
  }, [baseSize, safeBox]);

  const clampCenterToSafe = (x: number, y: number, size: number) => {
    const half = size / 2;
    const minX = safeBox.left + half;
    const maxX = safeBox.left + safeBox.w - half;
    const minY = safeBox.top + half;
    const maxY = safeBox.top + safeBox.h - half;
    return {
      x: clamp(x, minX, maxX),
      y: clamp(y, minY, maxY),
    };
  };

  const designStyle = useMemo(() => {
    const size = baseSize * designScale;
    const center = clampCenterToSafe(stage.w * designPos.x, stage.h * designPos.y, size);
    const left = center.x - size / 2;
    const top = center.y - size / 2;
    return {
      width: `${size}px`,
      height: `${size}px`,
      transform: `rotate(${designRotate}deg)`,
      left: `${left}px`,
      top: `${top}px`,
    } as React.CSSProperties;
  }, [baseSize, designScale, designPos, designRotate, stage, safeBox]);

  const startDrag = (mode: DragMode, e: React.PointerEvent) => {
    if (!stage.w || !stage.h) return;
    if (e.pointerType === 'touch') {
      e.preventDefault();
    }
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startPos: { ...designPos },
      startScale: designScale,
      startRotate: designRotate,
    };
  };

  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !stage.w || !stage.h) return;
    if (e.pointerType === 'touch') {
      e.preventDefault();
    }

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.mode === 'move') {
      const nextX = drag.startPos.x + dx / stage.w;
      const nextY = drag.startPos.y + dy / stage.h;
      const size = baseSize * designScale;
      const center = clampCenterToSafe(nextX * stage.w, nextY * stage.h, size);
      setDesignPos({ x: center.x / stage.w, y: center.y / stage.h });
      return;
    }

    if (drag.mode === 'scale') {
      const delta = (dx + dy) / Math.max(stage.w, stage.h);
      const nextScale = clamp(drag.startScale + delta * 0.9, minScale, maxScale);
      setDesignScale(nextScale);
      return;
    }

    if (drag.mode === 'rotate') {
      const centerX = stage.w * designPos.x;
      const centerY = stage.h * designPos.y;
      const angleStart = Math.atan2(drag.startY - centerY, drag.startX - centerX);
      const angleNow = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const deltaDeg = ((angleNow - angleStart) * 180) / Math.PI;
      setDesignRotate(clamp(drag.startRotate + deltaDeg, -30, 30));
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (e.pointerType === 'touch') {
      e.preventDefault();
    }
    try {
      (e.target as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const updateMockup = async () => {
    setIsUpdating(true);
    try {
      const mockup = await gemini.generateMockup(currentDesign, positionType);
      setMockupImage(mockup);
    } catch (e) {
      console.error('模特渲染失败', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!currentDesign) {
      onNext({ front: '', back: '', side: '' });
      return;
    }
    setIsUpdating(true);
    try {
      const prompt = `仅调整印花图案本身，不修改T恤、背景、光影或任何服装细节。调整要求：${instruction}`;
      const result = await gemini.editDesign(currentDesign, prompt);
      setCurrentDesign(result);
    } catch (e) {
      alert('微调失败，请再试一次。');
    }
    setIsUpdating(false);
  };

  const handleGenerate3D = async () => {
    setViewMode('3D');
    await updateMockup();
  };

  const handleReset = () => {
    setDesignPos(CHEST_ANCHOR_DEFAULT[positionType]);
    setDesignScale(DEFAULT_SCALE[positionType]);
    setDesignRotate(0);
    setDesignPosMap((prev) => ({ ...prev, [positionType]: CHEST_ANCHOR_DEFAULT[positionType] }));
    setDesignScaleMap((prev) => ({ ...prev, [positionType]: DEFAULT_SCALE[positionType] }));
    setDesignRotateMap((prev) => ({ ...prev, [positionType]: 0 }));
  };

  const persistCurrentTransform = () => {
    setDesignPosMap((prev) => ({ ...prev, [positionType]: designPos }));
    setDesignScaleMap((prev) => ({ ...prev, [positionType]: designScale }));
    setDesignRotateMap((prev) => ({ ...prev, [positionType]: designRotate }));
  };

  const renderComposite = async (pos: PositionType, designSrc: string) => {
    const baseSrc = POSITION_IMAGES[pos];
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    const [baseImg, designImg] = await Promise.all([loadImage(baseSrc), loadImage(designSrc)]);
    const canvas = document.createElement('canvas');
    canvas.width = baseImg.naturalWidth || baseImg.width;
    canvas.height = baseImg.naturalHeight || baseImg.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

    const ratio = SAFE_BOX_RATIO[pos];
    const baseSize = Math.min(canvas.width, canvas.height) * 0.46;
    const size = baseSize * (designScaleMap[pos] ?? DEFAULT_SCALE[pos]);
    const centerX = canvas.width * (designPosMap[pos]?.x ?? 0.5);
    const centerY = canvas.height * (designPosMap[pos]?.y ?? 0.45);
    const safeBox = {
      left: canvas.width * ratio.left,
      top: canvas.height * ratio.top,
      w: canvas.width * ratio.width,
      h: canvas.height * ratio.height,
    };
    const half = size / 2;
    const clampedX = clamp(centerX, safeBox.left + half, safeBox.left + safeBox.w - half);
    const clampedY = clamp(centerY, safeBox.top + half, safeBox.top + safeBox.h - half);

    ctx.save();
    ctx.translate(clampedX, clampedY);
    ctx.rotate(((designRotateMap[pos] ?? 0) * Math.PI) / 180);
    ctx.drawImage(designImg, -size / 2, -size / 2, size, size);
    ctx.restore();

    return canvas.toDataURL('image/png');
  };

  const handleProceed = async () => {
    if (!currentDesign) return;
    persistCurrentTransform();
    const results: Record<string, string> = { front: '', back: '', side: '' };
    results.front = await renderComposite('前', currentDesign);
    if (touchedPositions['后']) {
      results.back = await renderComposite('后', currentDesign);
    }
    if (touchedPositions['侧']) {
      results.side = await renderComposite('侧', currentDesign);
    }
    onNext(results);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <main className="flex-1 flex flex-col w-full mx-auto">
        <div className="flex-1 p-4 flex flex-col items-center justify-center relative">

          <div className="w-full aspect-[3/4] relative bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm">
            {viewMode === '2D' && (
              <div
                ref={stageRef}
                className="absolute inset-0 touch-none"
                onPointerMove={onDrag}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
              >
                <img
                  src={POSITION_IMAGES[positionType]}
                  alt="底衫模板"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                <div
                  className="absolute border border-dashed border-[#0057FF]/60 rounded-xl pointer-events-none"
                  style={{
                    width: `${safeBox.w}px`,
                    height: `${safeBox.h}px`,
                    left: `${safeBox.left}px`,
                    top: `${safeBox.top}px`,
                  }}
                />
                <div
                  className="absolute text-[10px] font-mono text-[#0057FF] bg-white/80 px-2 py-0.5 rounded pointer-events-none"
                  style={{ left: `${safeBox.left + 8}px`, top: `${safeBox.top + 8}px` }}
                >
                  胸前安全区（建议 30×40厘米）
                </div>

                {currentDesign ? (
                  <div
                    className="absolute"
                    style={designStyle}
                  >
                    <img
                      src={currentDesign}
                      alt="图案预览"
                      onPointerDown={(e) => startDrag('move', e)}
                      className="absolute inset-0 w-full h-full cursor-move select-none mix-blend-multiply touch-none"
                      draggable={false}
                    />
                    <div className="absolute top-2 left-2 p-1 rounded-md bg-white/90 border border-[#0057FF]/50 text-[#0057FF] pointer-events-none">
                      <Move size={14} />
                    </div>

                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <button
                        type="button"
                        onPointerDown={(e) => startDrag('rotate', e)}
                        className="w-7 h-7 rounded-full border border-[#0057FF] bg-white text-[#0057FF] shadow-sm cursor-grab touch-none flex items-center justify-center"
                      >
                        <RotateCw size={14} />
                      </button>
                    </div>

                    <div className="absolute -bottom-3 -right-3">
                      <button
                        type="button"
                        onPointerDown={(e) => startDrag('scale', e)}
                        className="w-7 h-7 rounded-full border border-[#0057FF] bg-white text-[#0057FF] shadow-sm cursor-nwse-resize touch-none flex items-center justify-center"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>

                    <div className="absolute inset-0 border border-[#0057FF]/60 rounded-lg pointer-events-none" />
                  </div>
                ) : null}
              </div>
            )}

            {viewMode === '3D' && (
              <div className="absolute inset-0 flex items-center justify-center">
                {mockupImage ? (
                  <img
                    src={mockupImage}
                    alt="模特预览"
                    className={`w-full h-full object-contain transition-opacity duration-700 ${isUpdating ? 'opacity-40' : 'opacity-100'}`}
                  />
                ) : isUpdating ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-[#0057FF]" size={32} />
                    <p className="font-mono text-sm tracking-widest">正在渲染上身效果…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <span className="text-sm font-bold text-black">尚未生成上身大片</span>
                    <span className="text-[10px] font-mono">点击右侧按钮开始渲染</span>
                  </div>
                )}
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-3 text-[#0057FF]">
                  <Loader2 className="animate-spin" size={28} />
                  <span className="text-sm font-mono tracking-widest">{loadingText}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            {(['前', '后', '侧'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => {
                  persistCurrentTransform();
                  setTouchedPositions((prev) => ({ ...prev, [pos]: true }));
                  setPositionType(pos);
                }}
                className={`px-4 py-2 rounded-full border text-sm font-medium tracking-wider transition-colors ${
                  positionType === pos
                    ? 'bg-black text-white border-black'
                    : 'border-black/10 hover:bg-gray-100'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full p-4 flex flex-col bg-white border-t border-black/10">
          <div className="mb-8">
            <div className="inline-block px-2 py-1 bg-gray-100 rounded text-xs font-mono mb-2">当前风格</div>
            <h2 className="text-2xl font-bold">参数设置</h2>
            <p className="text-xs text-gray-400 mt-1">高级功能（内测）</p>
            <p className="text-sm text-gray-500 mt-2">在不改变工艺约束的前提下微调图案效果。</p>
          </div>

          <div className="mb-8 flex flex-col gap-4">
            <div className="p-4 border border-black/10 rounded-xl bg-gray-50">
              <h3 className="text-sm font-bold tracking-wider mb-3 flex items-center gap-2">
                <Wand2 size={16} />
                智能微调
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="例如：颜色更明亮，字形更硬朗"
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-[#0057FF]"
                />
                <button
                  onClick={() => {
                    if (!refineInput.trim()) return;
                    handleRefine(refineInput.trim());
                  }}
                  disabled={isUpdating || !refineInput.trim()}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : '应用'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {REFINEMENT_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleRefine(tag)}
                  disabled={isUpdating}
                  className="px-3 py-2 border border-black/10 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="p-4 border border-black/10 rounded-xl bg-white">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-2">
                <span>图案操作</span>
                <button onClick={handleReset} className="text-[#0057FF]">重置</button>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between text-xs text-zinc-600">
                  缩放
                  <span className="font-mono text-[10px]">{designScale.toFixed(2)} 倍</span>
                </label>
                <input
                  type="range"
                  min={minScale}
                  max={maxScale}
                  step={0.02}
                  value={designScale}
                  onChange={(e) => setDesignScale(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="space-y-3 mt-4">
                <label className="flex items-center justify-between text-xs text-zinc-600">
                  旋转
                  <span className="font-mono text-[10px]">{designRotate}°</span>
                </label>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={designRotate}
                  onChange={(e) => setDesignRotate(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setViewMode('2D')}
                className={`py-2 rounded-xl text-sm font-medium border ${
                  viewMode === '2D' ? 'bg-black text-white border-black' : 'border-black/10 hover:bg-gray-50'
                }`}
              >
                二维预览
              </button>
              <button
                onClick={handleGenerate3D}
                disabled={isUpdating}
                className={`py-2 rounded-xl text-sm font-medium border ${
                  viewMode === '3D' ? 'bg-black text-white border-black' : 'border-black/10 hover:bg-gray-50'
                }`}
              >
                生成上身大片
              </button>
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-black/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">基础价格</span>
              <span className="font-bold text-xl">¥78</span>
            </div>
            <button
              onClick={handleProceed}
              disabled={isUpdating}
              className="w-full py-4 bg-[#0057FF] text-white rounded-xl font-bold text-lg hover:bg-[#0046CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check size={20} />
              进入结算
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MockupLab;
