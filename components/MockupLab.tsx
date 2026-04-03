import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, ArrowUpDown, Check, Loader2, Move, RotateCw, Upload, Trash2, Wand2, ArrowLeft } from 'lucide-react';
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

type DragMode = 'move' | 'scale-x' | 'scale-y' | 'rotate' | 'crop-tl' | 'crop-tr' | 'crop-bl' | 'crop-br' | 'scale-uniform';

type DragState = {
  mode: DragMode;
  startX: number;
  startY: number;
  startPos: DesignPos;
  startScaleX: number;
  startScaleY: number;
  startRotate: number;
  startCrop: CropInsets;
  startWidth: number;
  startHeight: number;
  startDist?: number;
};

type CropInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
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
  const [designMap, setDesignMap] = useState<Record<PositionType, string>>({
    '前': '',
    '后': '',
    '侧': '',
  });
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [positionType, setPositionType] = useState<PositionType>('前');
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('2D');
  const [refineInput, setRefineInput] = useState('');

  const [stage, setStage] = useState<StageSize>({ w: 0, h: 0 });
  const [designPos, setDesignPos] = useState<DesignPos>({ x: 0.5, y: 0.45 });
  const [designScaleX, setDesignScaleX] = useState(DEFAULT_SCALE['前']);
  const [designScaleY, setDesignScaleY] = useState(DEFAULT_SCALE['前']);
  const [designRotate, setDesignRotate] = useState(0);
  const [designPosMap, setDesignPosMap] = useState<Record<PositionType, DesignPos>>({
    '前': { x: 0.5, y: 0.38 },
    '后': { x: 0.5, y: 0.36 },
    '侧': { x: 0.55, y: 0.4 },
  });
  const [designScaleXMap, setDesignScaleXMap] = useState<Record<PositionType, number>>({
    '前': DEFAULT_SCALE['前'],
    '后': DEFAULT_SCALE['后'],
    '侧': DEFAULT_SCALE['侧'],
  });
  const [designScaleYMap, setDesignScaleYMap] = useState<Record<PositionType, number>>({
    '前': DEFAULT_SCALE['前'],
    '后': DEFAULT_SCALE['后'],
    '侧': DEFAULT_SCALE['侧'],
  });
  const [designRotateMap, setDesignRotateMap] = useState<Record<PositionType, number>>({
    '前': 0,
    '后': 0,
    '侧': 0,
  });
  const [cropMap, setCropMap] = useState<Record<PositionType, CropInsets>>({
    '前': { top: 0, right: 0, bottom: 0, left: 0 },
    '后': { top: 0, right: 0, bottom: 0, left: 0 },
    '侧': { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const [cropInsets, setCropInsets] = useState<CropInsets>({ top: 0, right: 0, bottom: 0, left: 0 });
  const [touchedPositions, setTouchedPositions] = useState<Record<PositionType, boolean>>({
    '前': true,
    '后': false,
    '侧': false,
  });
  const [cornerMode, setCornerMode] = useState<'crop' | 'scale'>('crop');

  const stageRef = useRef<HTMLDivElement>(null);
  const baseRecipeRef = useRef<string>('');
  const lastDesignRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const snapshotRef = useRef<{
    design?: string;
    pos?: DesignPos;
    scaleX?: number;
    scaleY?: number;
    rotate?: number;
    crop?: CropInsets;
  }>({});
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!designUrl) return;
    baseRecipeRef.current = designUrl;
    setCurrentDesign(designUrl);
    setDesignMap((prev) => ({ ...prev, '前': designUrl }));
    setTouchedPositions((prev) => ({ ...prev, '前': true }));
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
    setDesignScaleX(designScaleXMap[positionType]);
    setDesignScaleY(designScaleYMap[positionType]);
    setDesignRotate(designRotateMap[positionType]);
    setCropInsets(cropMap[positionType]);
    setCurrentDesign(designMap[positionType] || '');
  }, [positionType, designPosMap, designScaleXMap, designScaleYMap, designRotateMap, cropMap, designMap]);

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

  const minScaleX = useMemo(() => {
    if (!baseSize || !safeBox.w) return 0.5;
    // 减小最小可见面积到原来的一半：对 X/Y 最小缩放分别乘以 sqrt(0.5)
    return clamp(((safeBox.w * 0.5) / baseSize) * Math.SQRT1_2, 0.15, 2);
  }, [baseSize, safeBox]);

  const minScaleY = useMemo(() => {
    if (!baseSize || !safeBox.h) return 0.5;
    // 减小最小可见面积到原来的一半：对 X/Y 最小缩放分别乘以 sqrt(0.5)
    return clamp(((safeBox.h * 0.5) / baseSize) * Math.SQRT1_2, 0.15, 2);
  }, [baseSize, safeBox]);

  const maxScaleX = useMemo(() => {
    if (!baseSize || !safeBox.w) return 1.6;
    return clamp((safeBox.w * 0.98) / baseSize, 0.6, 2.5);
  }, [baseSize, safeBox]);

  const maxScaleY = useMemo(() => {
    if (!baseSize || !safeBox.h) return 1.6;
    return clamp((safeBox.h * 0.98) / baseSize, 0.6, 2.5);
  }, [baseSize, safeBox]);

  const uniformMinScale = Math.min(minScaleX, minScaleY);
  const uniformMaxScale = Math.min(maxScaleX, maxScaleY);

  const clampCenterToSafe = (x: number, y: number, width: number, height: number) => {
    const halfW = width / 2;
    const halfH = height / 2;
    const minX = safeBox.left + halfW;
    const maxX = safeBox.left + safeBox.w - halfW;
    const minY = safeBox.top + halfH;
    const maxY = safeBox.top + safeBox.h - halfH;
    return {
      x: clamp(x, minX, maxX),
      y: clamp(y, minY, maxY),
    };
  };

  const designStyle = useMemo(() => {
    const fullWidth = baseSize * designScaleX;
    const fullHeight = baseSize * designScaleY;
    const visibleWidth = fullWidth * (1 - cropInsets.left - cropInsets.right);
    const visibleHeight = fullHeight * (1 - cropInsets.top - cropInsets.bottom);
    const offsetX = ((cropInsets.left - cropInsets.right) / 2) * fullWidth;
    const offsetY = ((cropInsets.top - cropInsets.bottom) / 2) * fullHeight;
    const fullCenterX = stage.w * designPos.x;
    const fullCenterY = stage.h * designPos.y;
    const visibleCenterX = fullCenterX + offsetX;
    const visibleCenterY = fullCenterY + offsetY;
    const clampedVisible = clampCenterToSafe(visibleCenterX, visibleCenterY, visibleWidth, visibleHeight);
    const left = clampedVisible.x - offsetX - fullWidth / 2;
    const top = clampedVisible.y - offsetY - fullHeight / 2;
    return {
      width: `${fullWidth}px`,
      height: `${fullHeight}px`,
      transform: `rotate(${designRotate}deg)`,
      left: `${left}px`,
      top: `${top}px`,
    } as React.CSSProperties;
  }, [baseSize, designScaleX, designScaleY, designPos, designRotate, stage, safeBox, cropInsets]);
  const startDrag = (mode: DragMode, e: React.PointerEvent) => {
    if (!stage.w || !stage.h) return;
    if (e.pointerType === 'touch') {
      e.preventDefault();
    }
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const width = baseSize * designScaleX;
    const height = baseSize * designScaleY;
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startPos: { ...designPos },
      startScaleX: designScaleX,
      startScaleY: designScaleY,
      startRotate: designRotate,
      startCrop: { ...cropInsets },
      startWidth: width,
      startHeight: height,
    };
    // If user toggled cornerMode to 'scale' and started dragging a corner, switch to uniform scale mode
    if (mode.startsWith('crop') && cornerMode === 'scale') {
      const centerX = stage.w * designPos.x;
      const centerY = stage.h * designPos.y;
      const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      if (dragRef.current) dragRef.current = { ...dragRef.current, mode: 'scale-uniform', startDist };
    }
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
      const fullWidth = baseSize * designScaleX;
      const fullHeight = baseSize * designScaleY;
      const visibleWidth = fullWidth * (1 - cropInsets.left - cropInsets.right);
      const visibleHeight = fullHeight * (1 - cropInsets.top - cropInsets.bottom);
      // use visible (cropped) size when constraining center so movement range follows crop
      const center = clampCenterToSafe(nextX * stage.w, nextY * stage.h, visibleWidth, visibleHeight);
      setDesignPos({ x: center.x / stage.w, y: center.y / stage.h });
      return;
    }

    if (drag.mode === 'scale-x') {
      const delta = dx / stage.w;
      const nextScaleX = clamp(drag.startScaleX + delta * 1.2, minScaleX, maxScaleX);
      setDesignScaleX(nextScaleX);
      return;
    }

    if (drag.mode === 'scale-y') {
      const delta = dy / stage.h;
      const nextScaleY = clamp(drag.startScaleY + delta * 1.2, minScaleY, maxScaleY);
      setDesignScaleY(nextScaleY);
      return;
    }

    if (drag.mode === 'rotate') {
      const centerX = stage.w * designPos.x;
      const centerY = stage.h * designPos.y;
      const angleStart = Math.atan2(drag.startY - centerY, drag.startX - centerX);
      const angleNow = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const deltaDeg = ((angleNow - angleStart) * 180) / Math.PI;
      setDesignRotate(clamp(drag.startRotate + deltaDeg, -30, 30));
      return;
    }

    if (drag.mode === 'scale-uniform') {
      const centerX = stage.w * drag.startPos.x;
      const centerY = stage.h * drag.startPos.y;
      const startDist = drag.startDist || Math.hypot(drag.startX - centerX, drag.startY - centerY);
      const nowDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      let ratio = startDist > 0 ? nowDist / startDist : 1;
      // compute allowed ratio ranges per axis so both axes remain within their min/max
      const minRatioX = minScaleX / (drag.startScaleX || 1);
      const maxRatioX = maxScaleX / (drag.startScaleX || 1);
      const minRatioY = minScaleY / (drag.startScaleY || 1);
      const maxRatioY = maxScaleY / (drag.startScaleY || 1);
      const allowedMin = Math.max(minRatioX, minRatioY);
      const allowedMax = Math.min(maxRatioX, maxRatioY);
      ratio = clamp(ratio, allowedMin, allowedMax);
      const nextScaleX = clamp(drag.startScaleX * ratio, minScaleX, maxScaleX);
      const nextScaleY = clamp(drag.startScaleY * ratio, minScaleY, maxScaleY);
      setDesignScaleX(nextScaleX);
      setDesignScaleY(nextScaleY);
      return;
    }

    if (drag.mode.startsWith('crop')) {
      const next = { ...drag.startCrop };
      const dxRatio = drag.startWidth ? dx / drag.startWidth : 0;
      const dyRatio = drag.startHeight ? dy / drag.startHeight : 0;
      if (drag.mode === 'crop-tl') {
        next.left = clamp(drag.startCrop.left + dxRatio, 0, 0.6);
        next.top = clamp(drag.startCrop.top + dyRatio, 0, 0.6);
      }
      if (drag.mode === 'crop-tr') {
        next.right = clamp(drag.startCrop.right - dxRatio, 0, 0.6);
        next.top = clamp(drag.startCrop.top + dyRatio, 0, 0.6);
      }
      if (drag.mode === 'crop-bl') {
        next.left = clamp(drag.startCrop.left + dxRatio, 0, 0.6);
        next.bottom = clamp(drag.startCrop.bottom - dyRatio, 0, 0.6);
      }
      if (drag.mode === 'crop-br') {
        next.right = clamp(drag.startCrop.right - dxRatio, 0, 0.6);
        next.bottom = clamp(drag.startCrop.bottom - dyRatio, 0, 0.6);
      }
      const maxInsetX = 0.8;
      const maxInsetY = 0.8;
      if (next.left + next.right > maxInsetX) {
        const overflow = next.left + next.right - maxInsetX;
        next.left = clamp(next.left - overflow / 2, 0, maxInsetX);
        next.right = clamp(next.right - overflow / 2, 0, maxInsetX);
      }
      if (next.top + next.bottom > maxInsetY) {
        const overflow = next.top + next.bottom - maxInsetY;
        next.top = clamp(next.top - overflow / 2, 0, maxInsetY);
        next.bottom = clamp(next.bottom - overflow / 2, 0, maxInsetY);
      }
      setCropInsets(next);
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    // Keep cropInsets as-is when user finishes cropping; do not automatically convert to scale.
    // User can manually apply crop via the "应用裁剪" button.
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

  const handleImportClick = () => {
    // 优先打开本地文件选择（允许用户上传本地图片）
    if (fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }
    // 回退：如果未能访问 file input，则加载配方图案
    const recipe = baseRecipeRef.current;
    if (!recipe) {
      alert('暂无可加载的配方图案');
      return;
    }
    setDesignMap((prev) => ({ ...prev, [positionType]: recipe }));
    setCurrentDesign(recipe);
    setTouchedPositions((prev) => ({ ...prev, [positionType]: true }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('仅支持图片文件');
      e.currentTarget.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      alert('读取图片失败');
      e.currentTarget.value = '';
    };
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl) {
        alert('读取图片为空');
        e.currentTarget.value = '';
        return;
      }
      // 将本地图片作为当前设计并存入 position map（不会覆盖远程原始配方）
      setCurrentDesign(dataUrl);
      setDesignMap((prev) => ({ ...prev, [positionType]: dataUrl }));
      lastDesignRef.current = dataUrl;
      setTouchedPositions((prev) => ({ ...prev, [positionType]: true }));
      e.currentTarget.value = '';
    };
    reader.readAsDataURL(file);
  };

  

  const handleDeleteDesign = () => {
    setDesignMap((prev) => ({ ...prev, [positionType]: '' }));
    setCurrentDesign('');
    setTouchedPositions((prev) => ({ ...prev, [positionType]: true }));
  };

  const ensureDataUrl = async (src: string) => {
    if (!src) return '';
    if (src.startsWith('data:')) return src;
    const response = await fetch(src);
    if (!response.ok) throw new Error('图案加载失败');
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('图案读取失败'));
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const updateMockup = async () => {
    if (!currentDesign) {
      alert('请先选择或加载图案');
      return;
    }
    setIsUpdating(true);
    try {
      const designDataUrl = await ensureDataUrl(currentDesign);
      const mockup = await gemini.generateMockup(designDataUrl, positionType);
      setMockupImage(mockup);
    } catch (e) {
      console.error('模特渲染失败', e);
      // 把错误向上抛出，确保调用方能感知失败并避免把视图切换为 3D
      throw e;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!currentDesign) return;
    setIsUpdating(true);
    try {
      const prompt = `仅调整印花图案本身，不修改T恤、背景、光影或任何服装细节。调整要求：${instruction}`;
      const designDataUrl = await ensureDataUrl(currentDesign);
      const result = await gemini.editDesign(designDataUrl, prompt);
      setCurrentDesign(result);
    } catch (e) {
      alert('微调失败，请再试一次。');
    }
    setIsUpdating(false);
  };

  const handleGenerate3D = async () => {
    // 在生成 3D 之前缓存当前完整状态，保证切回 2D 时能精确恢复
    snapshotRef.current = {
      design: currentDesign,
      pos: designPos,
      scaleX: designScaleX,
      scaleY: designScaleY,
      rotate: designRotate,
      crop: cropInsets,
    };
    // 持久化当前变换状态，保证回到 2D 时能恢复
    persistCurrentTransform();
    console.log('handleGenerate3D - BEFORE updateMockup', { currentDesign, snapshot: snapshotRef.current });
    try {
      await updateMockup();
      console.log('handleGenerate3D - updateMockup SUCCESS', { currentDesign, mockupImage });
      setViewMode('3D');
    } catch (err) {
      console.error('handleGenerate3D - updateMockup FAILED', err);
      // 保持在 2D 并提示用户，避免切换到 3D 后回退时丢失图案
      alert('生成上身大片失败，请稍后重试。');
    }
  };

  const handleReset = () => {
    setDesignPos(CHEST_ANCHOR_DEFAULT[positionType]);
    setDesignScaleX(DEFAULT_SCALE[positionType]);
    setDesignScaleY(DEFAULT_SCALE[positionType]);
    setDesignRotate(0);
    setCropInsets({ top: 0, right: 0, bottom: 0, left: 0 });
    setDesignPosMap((prev) => ({ ...prev, [positionType]: CHEST_ANCHOR_DEFAULT[positionType] }));
    setDesignScaleXMap((prev) => ({ ...prev, [positionType]: DEFAULT_SCALE[positionType] }));
    setDesignScaleYMap((prev) => ({ ...prev, [positionType]: DEFAULT_SCALE[positionType] }));
    setDesignRotateMap((prev) => ({ ...prev, [positionType]: 0 }));
    setCropMap((prev) => ({ ...prev, [positionType]: { top: 0, right: 0, bottom: 0, left: 0 } }));
  };

  const persistCurrentTransform = () => {
    setDesignPosMap((prev) => ({ ...prev, [positionType]: designPos }));
    setDesignScaleXMap((prev) => ({ ...prev, [positionType]: designScaleX }));
    setDesignScaleYMap((prev) => ({ ...prev, [positionType]: designScaleY }));
    setDesignRotateMap((prev) => ({ ...prev, [positionType]: designRotate }));
    setCropMap((prev) => ({ ...prev, [positionType]: cropInsets }));
    // Persist the current design src into designMap so restoration later uses it.
    // If currentDesign is a data URL, prefer to persist the last known remote src (`lastDesignRef`) to avoid overwriting original.
    const toSave = currentDesign && currentDesign.startsWith('data:') && lastDesignRef.current ? lastDesignRef.current : currentDesign;
    setDesignMap((prev) => ({ ...prev, [positionType]: toSave }));
  };

  useEffect(() => {
    // Only remember the last non-data: URL so we can restore original remote src
    if (currentDesign && !currentDesign.startsWith('data:')) lastDesignRef.current = currentDesign;
  }, [currentDesign]);

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
    const sizeW = baseSize * (designScaleXMap[pos] ?? DEFAULT_SCALE[pos]);
    const sizeH = baseSize * (designScaleYMap[pos] ?? DEFAULT_SCALE[pos]);
    const centerX = canvas.width * (designPosMap[pos]?.x ?? 0.5);
    const centerY = canvas.height * (designPosMap[pos]?.y ?? 0.45);
    const safeBox = {
      left: canvas.width * ratio.left,
      top: canvas.height * ratio.top,
      w: canvas.width * ratio.width,
      h: canvas.height * ratio.height,
    };
    const halfW = sizeW / 2;
    const halfH = sizeH / 2;
    const clampedX = clamp(centerX, safeBox.left + halfW, safeBox.left + safeBox.w - halfW);
    const clampedY = clamp(centerY, safeBox.top + halfH, safeBox.top + safeBox.h - halfH);

    ctx.save();
    ctx.translate(clampedX, clampedY);
    ctx.rotate(((designRotateMap[pos] ?? 0) * Math.PI) / 180);
    const crop = cropMap[pos] ?? { top: 0, right: 0, bottom: 0, left: 0 };
    const cropX = -sizeW / 2 + crop.left * sizeW;
    const cropY = -sizeH / 2 + crop.top * sizeH;
    const cropW = sizeW * (1 - crop.left - crop.right);
    const cropH = sizeH * (1 - crop.top - crop.bottom);
    ctx.beginPath();
    ctx.rect(cropX, cropY, cropW, cropH);
    ctx.clip();
    ctx.drawImage(designImg, -sizeW / 2, -sizeH / 2, sizeW, sizeH);
    ctx.restore();

    return canvas.toDataURL('image/png');
  };

  const handleProceed = async () => {
    if (!currentDesign) return;
    persistCurrentTransform();
    const getDesign = (pos: PositionType) => designMap[pos] || (pos === positionType ? currentDesign : '');
    const results: Record<string, string> = { front: '', back: '', side: '' };
    const frontDesign = getDesign('前');
    if (frontDesign) {
      results.front = await renderComposite('前', frontDesign);
    }
    if (touchedPositions['后']) {
      const backDesign = getDesign('后');
      if (backDesign) {
        results.back = await renderComposite('后', backDesign);
      }
    }
    if (touchedPositions['侧']) {
      const sideDesign = getDesign('侧');
      if (sideDesign) {
        results.side = await renderComposite('侧', sideDesign);
      }
    }
    onNext(results);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <input
        ref={(el) => (fileInputRef.current = el)}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <main className="flex-1 flex flex-col w-full mx-auto">
        {typeof onBack === 'function' && (
          <div className="fixed left-4 top-4 z-50">
            <button
              type="button"
              onClick={() => onBack && onBack()}
              className="w-10 h-10 rounded-full border border-black/10 bg-white shadow-sm flex items-center justify-center"
              title="返回首页"
            >
              <ArrowLeft size={16} />
            </button>
          </div>
        )}
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
                {/* 中线：垂直与水平虚线 */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${safeBox.left + safeBox.w / 2}px`,
                    top: `${safeBox.top}px`,
                    height: `${safeBox.h}px`,
                    borderLeft: '1px dashed rgba(0,0,0,0.6)'
                  }}
                />
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: `${safeBox.top + safeBox.h / 2}px`,
                    left: `${safeBox.left}px`,
                    width: `${safeBox.w}px`,
                    borderTop: '1px dashed rgba(0,0,0,0.6)'
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
                      style={{
                        clipPath: `inset(${cropInsets.top * 100}% ${cropInsets.right * 100}% ${cropInsets.bottom * 100}% ${cropInsets.left * 100}%)`,
                      }}
                      draggable={false}
                    />

                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <button
                        type="button"
                        onPointerDown={(e) => startDrag('rotate', e)}
                        className="w-7 h-7 rounded-full border border-[#0057FF] bg-white text-[#0057FF] shadow-sm cursor-grab touch-none flex items-center justify-center"
                      >
                        <RotateCw size={14} />
                      </button>
                    </div>

                    <div className="absolute -right-3 top-1/2 -translate-y-1/2">
                      <button
                        type="button"
                        onPointerDown={(e) => startDrag('scale-x', e)}
                        className="w-7 h-7 rounded-full border border-[#0057FF] bg-white text-[#0057FF] shadow-sm cursor-ew-resize touch-none flex items-center justify-center"
                      >
                        <ArrowLeftRight size={14} />
                      </button>
                    </div>

                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                      <button
                        type="button"
                        onPointerDown={(e) => startDrag('scale-y', e)}
                        className="w-7 h-7 rounded-full border border-[#0057FF] bg-white text-[#0057FF] shadow-sm cursor-ns-resize touch-none flex items-center justify-center"
                      >
                        <ArrowUpDown size={14} />
                      </button>
                    </div>

                    <div
                      className="absolute border border-dashed border-[#0057FF]/70 rounded-md pointer-events-none"
                      style={{
                        left: `${cropInsets.left * 100}%`,
                        top: `${cropInsets.top * 100}%`,
                        width: `${(1 - cropInsets.left - cropInsets.right) * 100}%`,
                        height: `${(1 - cropInsets.top - cropInsets.bottom) * 100}%`,
                      }}
                    />
                    {[
                      { key: 'crop-tl', style: { left: `${cropInsets.left * 100}%`, top: `${cropInsets.top * 100}%` }, cursor: 'nwse-resize' },
                      { key: 'crop-tr', style: { right: `${cropInsets.right * 100}%`, top: `${cropInsets.top * 100}%` }, cursor: 'nesw-resize' },
                      { key: 'crop-bl', style: { left: `${cropInsets.left * 100}%`, bottom: `${cropInsets.bottom * 100}%` }, cursor: 'nesw-resize' },
                      { key: 'crop-br', style: { right: `${cropInsets.right * 100}%`, bottom: `${cropInsets.bottom * 100}%` }, cursor: 'nwse-resize' },
                    ].map((handle) => (
                      <button
                        key={handle.key}
                        type="button"
                        onPointerDown={(e) => startDrag(handle.key as DragMode, e)}
                        className="absolute w-3 h-3 bg-white border border-[#0057FF] rounded-sm shadow-sm touch-none"
                        style={{
                          transform: 'translate(-50%, -50%)',
                          cursor: handle.cursor,
                          ...handle.style,
                        }}
                      />
                    ))}

                    <div
                      className="absolute border border-[#0057FF]/60 rounded-lg pointer-events-none"
                      style={{
                        left: `${cropInsets.left * 100}%`,
                        top: `${cropInsets.top * 100}%`,
                        width: `${(1 - cropInsets.left - cropInsets.right) * 100}%`,
                        height: `${(1 - cropInsets.top - cropInsets.bottom) * 100}%`,
                      }}
                    />
                  </div>
                ) : null}
                {!currentDesign && (
                  <div
                    className="absolute flex flex-col items-center justify-center gap-2 text-[#0057FF]"
                    style={{
                      left: `${safeBox.left}px`,
                      top: `${safeBox.top}px`,
                      width: `${safeBox.w}px`,
                      height: `${safeBox.h}px`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleImportClick}
                      className="w-10 h-10 rounded-full border border-[#0057FF] bg-white text-[#0057FF] shadow-sm flex items-center justify-center"
                    >
                      <Upload size={18} />
                    </button>
                    <span className="text-xs font-mono">加载图案</span>
                  </div>
                )}
                {currentDesign && (
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleImportClick}
                      className="w-7 h-7 rounded-full border border-[#0057FF] bg-white text-[#0057FF] shadow-sm touch-none flex items-center justify-center"
                      title="导入图案"
                    >
                      <Upload size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteDesign}
                      className="w-7 h-7 rounded-full border border-black/20 bg-white text-black/70 shadow-sm touch-none flex items-center justify-center"
                      title="删除图案"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                {/* 右侧切换：裁剪 / 放缩（等比例） */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setCornerMode('crop')}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium bg-white ${cornerMode === 'crop' ? 'border-[#0057FF] text-[#0057FF]' : 'border-black/10 text-zinc-600'}`}
                    title="角点进行裁剪"
                  >
                    裁剪
                  </button>
                  <button
                    type="button"
                    onClick={() => setCornerMode('scale')}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium bg-white ${cornerMode === 'scale' ? 'border-[#0057FF] text-[#0057FF]' : 'border-black/10 text-zinc-600'}`}
                    title="角点等比例放缩"
                  >
                    放缩
                  </button>
                </div>
                {/* 已移除：应用裁剪按钮（按需删除残留调用以避免未定义错误） */}
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

          <div className="w-full mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  // 切回 2D 时确保 currentDesign 恢复，防止因未保存或渲染流程导致无图
                  persistCurrentTransform();
                  const restored =
                    designMap[positionType] ||
                    snapshotRef.current?.design ||
                    baseRecipeRef.current ||
                    lastDesignRef.current ||
                    '';
                  setCurrentDesign(restored);
                  setTouchedPositions((prev) => ({ ...prev, [positionType]: !!restored }));
                  // 优先从 maps 恢复，若 maps 不包含则退回到 snapshot
                  const posRestore = designPosMap[positionType] || snapshotRef.current?.pos || CHEST_ANCHOR_DEFAULT[positionType];
                  const sxRestore = designScaleXMap[positionType] ?? snapshotRef.current?.scaleX ?? DEFAULT_SCALE[positionType];
                  const syRestore = designScaleYMap[positionType] ?? snapshotRef.current?.scaleY ?? DEFAULT_SCALE[positionType];
                  const rotRestore = designRotateMap[positionType] ?? snapshotRef.current?.rotate ?? 0;
                  const cropRestore = cropMap[positionType] ?? snapshotRef.current?.crop ?? { top: 0, right: 0, bottom: 0, left: 0 };
                  setDesignPos(posRestore);
                  setDesignScaleX(sxRestore);
                  setDesignScaleY(syRestore);
                  setDesignRotate(rotRestore);
                  setCropInsets(cropRestore);
                  setViewMode('2D');
                }}
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
