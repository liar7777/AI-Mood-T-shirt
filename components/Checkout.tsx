import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { gemini } from '../geminiService';

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const MIN_SPINNER_MS = 3000;

const mockOrder = {
  orderNo: 'GD-20260311-0001',
  sku: 'TRIE-TS-2522-WH',
  style: '圆领T',
  color: '白色',
  material: '280G 重磅棉',
  resolution: '300DPI',
  delivery: '48 小时生产',
  receiver: '张三',
  phone: '13800000000',
  address: '上海市徐汇区衡山路 100 号 3 楼',
  sizes: {
    小: 6,
    中: 10,
    大: 12,
    加大: 8,
    特大: 4,
  },
  printPositions: ['前', '后', '侧'],
  printSize: '30×40 厘米',
  designPreviewUrl: '/mockups/front.jpg',
  designBackUrl: '/mockups/back.jpg',
  designDownloadUrl: 'https://example.com/print-assets/transparent-design.png',
  notes: '对齐胸前安全区，避免袖口与缝线。',
};

const SIZE_OPTIONS = [
  { key: 'XS', label: 'XS–165/84A' },
  { key: 'S', label: 'S–170/88A' },
  { key: 'M', label: 'M–175/92A' },
  { key: 'L', label: 'L–180/96A' },
  { key: 'XL', label: 'XL–185/100A' },
  { key: 'XXL', label: 'XXL–190/104A' },
];

const SIZE_GUIDE = {
  heights: ['155-165', '165-170', '170-175', '175-180', '180-195'],
  weights: ['40-50', '50-60', '60-70', '70-75', '75-80', '80-90'],
  matrix: [
    ['XS', 'S', 'M', 'M', 'L'],
    ['S', 'S', 'M', 'L', 'XL'],
    ['S', 'M', 'L', 'L', 'XL'],
    ['M', 'M', 'L', 'XL', 'XXL'],
    ['M', 'L', 'L', 'XL', 'XXL'],
    ['L', 'L', 'XL', 'XXL', 'XXL'],
  ],
};

type PreviewType = 'garment' | 'print' | null;

type PdfUrls = {
  garment?: string;
  print?: string;
};

type CheckoutView = 'checkout' | 'address';

type DeliveryMode = 'delivery' | 'pickup';

type PreviewSide = 'front' | 'back';

type AddressInfo = {
  name: string;
  phone: string;
  region: string;
  detail: string;
  isDefault: boolean;
};

type PreviewImages = {
  front?: string;
  back?: string;
  side?: string;
};

type OrderData = {
  orderNo: string;
  sku: string;
  style: string;
  color: string;
  material: string;
  resolution: string;
  delivery: string;
  receiver: string;
  phone: string;
  address: string;
  sizes: Record<string, number>;
  printPositions: string[];
  printSize: string;
  designPreviewUrl: string;
  designBackUrl: string;
  designSideUrl?: string;
  designDownloadUrl: string;
  notes: string;
};

const buildPdf = async (element: HTMLElement, filename: string) => {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#FFFFFF',
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  let imgWidth = pageWidth;
  let imgHeight = (canvas.height * pageWidth) / canvas.width;
  if (imgHeight > pageHeight) {
    imgHeight = pageHeight;
    imgWidth = (canvas.width * pageHeight) / canvas.height;
  }

  const x = (pageWidth - imgWidth) / 2;
  const y = (pageHeight - imgHeight) / 2;

  pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  pdf.save(filename);

  return url;
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

const OrderTemplate: React.FC<{
  type: 'garment' | 'print';
  qrDataUrl: string;
  order: OrderData;
}> = ({ type, qrDataUrl, order }) => {
  const sizes = Object.entries(order.sizes);

  return (
    <div
      className="bg-white text-black"
      style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX }}
    >
      <div className="p-10 h-full flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {type === 'garment' ? 'Garment_Order' : 'Print_Order'}
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">订单号：{order.orderNo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">SKU</p>
            <p className="text-sm font-bold">{order.sku}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="border border-black/10 rounded-lg p-3">
            <p className="text-[10px] font-mono text-zinc-500">产品信息</p>
            <p className="font-semibold">{order.style} / {order.color}</p>
            <p className="text-xs text-zinc-500">{order.material}</p>
            <p className="text-xs text-zinc-500">分辨率：{order.resolution}</p>
          </div>
          <div className="border border-black/10 rounded-lg p-3">
            <p className="text-[10px] font-mono text-zinc-500">收件信息</p>
            <p className="font-semibold">{order.receiver} · {order.phone}</p>
            <p className="text-xs text-zinc-500">{order.address}</p>
          </div>
        </div>

        {type === 'garment' && (
          <div className="border border-black/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono text-zinc-500">尺码汇总矩阵</p>
              <p className="text-xs text-zinc-500">交付：{order.delivery}</p>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-3">
              {sizes.map(([size, qty]) => (
                <div key={size} className="border border-black/10 rounded-md p-2 text-center">
                  <p className="text-xs font-semibold">{size}</p>
                  <p className="text-sm font-bold">{qty}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'print' && (
          <div className="border border-black/10 rounded-lg p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-zinc-500">印花位置</p>
                <p className="text-sm font-semibold">{order.printPositions.join(' / ')}</p>
                <p className="text-xs text-zinc-500">物理尺寸：{order.printSize}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-zinc-500">原图下载</p>
                <img src={qrDataUrl} alt="二维码" className="w-16 h-16" />
              </div>
            </div>
            <div className="border border-dashed border-black/20 rounded-lg p-4">
              <p className="text-[10px] font-mono text-zinc-500">尺寸参考图</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="border border-black/10 rounded-md p-2 text-center">
                  {order.designPreviewUrl ? (
                    <img src={order.designPreviewUrl} alt="前" className="w-full h-24 object-contain" />
                  ) : (
                    <span className="text-xs text-zinc-400">前</span>
                  )}
                </div>
                <div className="border border-black/10 rounded-md p-2 text-center">
                  {order.designBackUrl ? (
                    <img src={order.designBackUrl} alt="后" className="w-full h-24 object-contain" />
                  ) : (
                    <span className="text-xs text-zinc-400">后</span>
                  )}
                </div>
                <div className="border border-black/10 rounded-md p-2 text-center">
                  {order.designSideUrl ? (
                    <img src={order.designSideUrl} alt="侧" className="w-full h-24 object-contain" />
                  ) : (
                    <span className="text-xs text-zinc-400">侧</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-zinc-500">备注：{order.notes}</div>
          </div>
        )}

        <div className="mt-auto text-xs text-zinc-400">
          TRIE 生产系统 · 自动生成
        </div>
      </div>
    </div>
  );
};

const Checkout: React.FC<{ previewImages?: PreviewImages; onBack?: () => void }> = ({ previewImages, onBack }) => {
  const garmentRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [preview, setPreview] = useState<PreviewType>(null);
  const [pdfUrls, setPdfUrls] = useState<PdfUrls>({});
  const [enhancedPreviews, setEnhancedPreviews] = useState<PreviewImages | null>(null);
  const [mockupStatus, setMockupStatus] = useState({ front: false, back: false });
  const mockupStartRef = useRef({ front: 0, back: 0 });
  const mockupTimerRef = useRef<{ front?: number; back?: number }>({});

  const [view, setView] = useState<CheckoutView>('checkout');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('delivery');
  const [previewSide, setPreviewSide] = useState<PreviewSide>('front');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const [address, setAddress] = useState<AddressInfo>({
    name: '',
    phone: '',
    region: '',
    detail: '',
    isDefault: false,
  });

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    SIZE_OPTIONS.reduce((acc, item) => {
      acc[item.key] = 0;
      return acc;
    }, {} as Record<string, number>)
  );

  const unitPrice = 78;
  const totalQty = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = unitPrice * totalQty;
  const effectivePreviews = useMemo(() => enhancedPreviews ?? previewImages ?? {}, [enhancedPreviews, previewImages]);
  const orderSizes = useMemo(() => {
    const next: Record<string, number> = {};
    SIZE_OPTIONS.forEach((size) => {
      const qty = quantities[size.key] || 0;
      if (qty > 0) next[size.key] = qty;
    });
    if (Object.keys(next).length === 0) {
      SIZE_OPTIONS.forEach((size) => {
        next[size.key] = 0;
      });
    }
    return next;
  }, [quantities]);

  const positions = useMemo(() => {
    const list: string[] = [];
    if (effectivePreviews?.front) list.push('前');
    if (effectivePreviews?.back) list.push('后');
    if (effectivePreviews?.side) list.push('侧');
    return list.length ? list : ['前'];
  }, [effectivePreviews]);

  const getMockupPath = (side: 'front' | 'back' | 'side') => {
    if (gender === 'female') {
      if (side === 'front') return '/mockups/wfront.jpg';
      if (side === 'back') return '/mockups/wback.jpg';
      return '/mockups/wside.jpg';
    }
    if (side === 'front') return '/mockups/front.jpg';
    if (side === 'back') return '/mockups/back.jpg';
    return '/mockups/side.jpg';
  };

  const orderData = useMemo<OrderData>(() => {
    const receiver = address.name || mockOrder.receiver;
    const phone = address.phone || mockOrder.phone;
    const addressText = address.detail
      ? `${address.region} ${address.detail}`.trim()
      : mockOrder.address;
    return {
      orderNo: mockOrder.orderNo,
      sku: mockOrder.sku,
      style: mockOrder.style,
      color: mockOrder.color,
      material: mockOrder.material,
      resolution: mockOrder.resolution,
      delivery: deliveryMode === 'delivery' ? '物流配送' : '现场自提',
      receiver,
      phone,
      address: addressText,
      sizes: orderSizes,
      printPositions: positions,
      printSize: mockOrder.printSize,
      designPreviewUrl: effectivePreviews?.front || getMockupPath('front'),
      designBackUrl: effectivePreviews?.back || getMockupPath('back'),
      designSideUrl: effectivePreviews?.side || undefined,
      designDownloadUrl: mockOrder.designDownloadUrl,
      notes: notes || mockOrder.notes,
    };
  }, [address, deliveryMode, orderSizes, positions, effectivePreviews, notes, gender]);

  useEffect(() => {
    QRCode.toDataURL(mockOrder.designDownloadUrl, { width: 160, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, []);

  // 监听来自 MockupLab 的性别切换事件（嵌入页面右侧按钮）
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        // @ts-ignore
        const g = (e as CustomEvent)?.detail?.gender;
        if (g === 'male' || g === 'female') setGender(g);
      } catch {
        // ignore
      }
    };
    window.addEventListener('trie:gender-change', handler as EventListener);
    return () => window.removeEventListener('trie:gender-change', handler as EventListener);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!previewImages?.front && !previewImages?.back) {
        setEnhancedPreviews(null);
        return;
      }

      setEnhancedPreviews({ ...previewImages });

      const generate = async (side: 'front' | 'back') => {
        const source = side === 'front' ? previewImages?.front : previewImages?.back;
        if (!source) {
          return;
        }
        mockupStartRef.current[side] = Date.now();
        setMockupStatus((prev) => ({ ...prev, [side]: true }));
        await new Promise((resolve) => setTimeout(resolve, 50));
        try {
          const dataUrl = await ensureDataUrl(source);
          const result = await gemini.generateMockupWhite(dataUrl);
          if (cancelled) return;
          setEnhancedPreviews((prev) => ({
            ...(prev ?? {}),
            [side]: result,
            side: previewImages?.side ?? prev?.side,
          }));
        } catch (error) {
          console.error(`生成${side === 'front' ? '正' : '背'}面上身图失败`, error);
        } finally {
          if (!cancelled) {
            const elapsed = Date.now() - mockupStartRef.current[side];
            const remaining = Math.max(0, MIN_SPINNER_MS - elapsed);
            const timer = window.setTimeout(() => {
              if (!cancelled) {
                setMockupStatus((prev) => ({ ...prev, [side]: false }));
              }
            }, remaining);
            mockupTimerRef.current[side] = timer;
          }
        }
      };

      await Promise.all([generate('front'), generate('back')]);
    };

    run();
    return () => {
      cancelled = true;
      if (mockupTimerRef.current.front) {
        window.clearTimeout(mockupTimerRef.current.front);
      }
      if (mockupTimerRef.current.back) {
        window.clearTimeout(mockupTimerRef.current.back);
      }
    };
  }, [previewImages?.front, previewImages?.back, previewImages?.side]);


  const handleExportAll = async () => {
    if (!garmentRef.current || !printRef.current) return;
    setIsExporting(true);
    try {
      const garmentUrl = await buildPdf(garmentRef.current, `Garment_Order_${mockOrder.orderNo}.pdf`);
      const printUrl = await buildPdf(printRef.current, `Print_Order_${mockOrder.orderNo}.pdf`);
      setPdfUrls({ garment: garmentUrl, print: printUrl });
    } finally {
      setIsExporting(false);
    }
  };

  const openPreview = async (type: PreviewType) => {
    if (!type) return;
    if (type === 'garment' && !pdfUrls.garment && garmentRef.current) {
      const url = await buildPdf(garmentRef.current, `Garment_Order_${mockOrder.orderNo}.pdf`);
      setPdfUrls((prev) => ({ ...prev, garment: url }));
    }
    if (type === 'print' && !pdfUrls.print && printRef.current) {
      const url = await buildPdf(printRef.current, `Print_Order_${mockOrder.orderNo}.pdf`);
      setPdfUrls((prev) => ({ ...prev, print: url }));
    }
    setPreview(type);
  };

  const handleQtyChange = (sizeKey: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[sizeKey] || 0) + delta);
      return { ...prev, [sizeKey]: next };
    });
  };

  const handleDeliverySelect = (mode: DeliveryMode) => {
    setDeliveryMode(mode);
    if (mode === 'delivery') {
      setView('address');
    }
  };

  const saveAddress = () => {
    const hasAll = address.name && address.phone && address.region && address.detail;
    if (!hasAll) {
      alert('地址信息未完整，已暂存');
    }
    setView('checkout');
  };

  if (view === 'address') {
    return (
      <div className="min-h-screen bg-white p-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView('checkout')}
            className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center"
          >
            ←
          </button>
          <h2 className="text-lg font-bold">地址新增</h2>
          <div className="w-9 h-9" />
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-sm text-zinc-500">姓名</label>
            <input
              value={address.name}
              onChange={(e) => setAddress({ ...address, name: e.target.value })}
              placeholder="收货人姓名"
              className="w-full border border-black/10 rounded-xl px-4 py-3"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-500">手机号</label>
            <input
              value={address.phone}
              onChange={(e) => setAddress({ ...address, phone: e.target.value })}
              placeholder="收货人手机号"
              className="w-full border border-black/10 rounded-xl px-4 py-3"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-500">所在地区</label>
            <input
              value={address.region}
              onChange={(e) => setAddress({ ...address, region: e.target.value })}
              placeholder="所在地区"
              className="w-full border border-black/10 rounded-xl px-4 py-3"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-500">详细地址</label>
            <textarea
              value={address.detail}
              onChange={(e) => setAddress({ ...address, detail: e.target.value })}
              placeholder="详细地址"
              className="w-full border border-black/10 rounded-xl px-4 py-3 min-h-[120px]"
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={address.isDefault}
              onChange={(e) => setAddress({ ...address, isDefault: e.target.checked })}
            />
            设为默认
          </label>
          <div className="flex gap-3">
            <button
              className="flex-1 border border-black/10 rounded-xl py-3"
              onClick={() => alert('定位功能即将开放')}
            >
              定位
            </button>
            <button
              className="flex-1 border border-black/10 rounded-xl py-3"
              onClick={() => alert('智能识别即将开放')}
            >
              智能识别
            </button>
          </div>
          <button
            onClick={saveAddress}
            className="w-full py-4 bg-black text-white rounded-full font-bold"
          >
            立即保存地址
          </button>
          <button
            onClick={() => alert('导入微信地址即将开放')}
            className="w-full py-4 bg-black text-white rounded-full font-bold"
          >
            导入微信地址
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-black italic">选择尺码</h2>
          <p className="text-xs text-zinc-500 font-mono tracking-widest">智能规格 · 即时生产</p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="h-9 px-4 rounded-full border border-black/10 text-xs font-mono hover:border-[#0057FF] hover:text-[#0057FF] transition-colors"
          >
            ← 返回编辑
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-black/10 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-bold">¥{unitPrice}</p>
            <p className="text-sm text-zinc-500">{mockOrder.color} · {mockOrder.style}</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 mr-2">
              <button
                onClick={() => setGender('male')}
                className={`px-3 py-1 rounded-full text-xs border ${gender === 'male' ? 'bg-black text-white border-black' : 'border-black/10'}`}
              >
                男
              </button>
              <button
                onClick={() => setGender('female')}
                className={`px-3 py-1 rounded-full text-xs border ${gender === 'female' ? 'bg-black text-white border-black' : 'border-black/10'}`}
              >
                女
              </button>
            </div>
            <button
              onClick={() => setPreviewSide('front')}
              className={`px-3 py-1 rounded-full text-xs border ${previewSide === 'front' ? 'bg-black text-white border-black' : 'border-black/10'}`}
            >
              正面
            </button>
            <button
              onClick={() => setPreviewSide('back')}
              className={`px-3 py-1 rounded-full text-xs border ${previewSide === 'back' ? 'bg-black text-white border-black' : 'border-black/10'}`}
            >
              背面
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-zinc-50 border border-black/5 p-4 flex items-center justify-center relative overflow-hidden">
            <img
              src={previewSide === 'front' ? orderData.designPreviewUrl : orderData.designBackUrl}
              alt="预览"
              className="w-full max-w-[140px]"
            />
          {((previewSide === 'front' && mockupStatus.front) || (previewSide === 'back' && mockupStatus.back)) && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-[#0057FF] text-white text-[10px] font-mono tracking-widest rounded-full shadow z-10">
              生成中
            </div>
          )}
          {((previewSide === 'front' && mockupStatus.front) || (previewSide === 'back' && mockupStatus.back)) && (
            <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center text-[#0057FF] z-10">
              <div className="w-5 h-5 border-2 border-[#0057FF] border-t-transparent rounded-full animate-spin" />
              <span className="mt-2 text-[10px] font-mono tracking-widest">生成中…</span>
            </div>
          )}
        </div>
        <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowSizeGuide((prev) => !prev)}
                className="px-3 py-1 text-xs border border-black/10 rounded-full"
              >
                推荐尺码
              </button>
              {recommendedSize && (
                <span className="text-xs text-[#0057FF]">推荐：{recommendedSize}</span>
              )}
            </div>
            {showSizeGuide && (
              <div className="border border-black/10 rounded-xl overflow-hidden text-xs">
                <div className="grid grid-cols-6 bg-zinc-50">
                  <div className="p-2 text-center">体重</div>
                  {SIZE_GUIDE.heights.map((h) => (
                    <div key={h} className="p-2 text-center">{h}</div>
                  ))}
                </div>
                {SIZE_GUIDE.weights.map((w, rowIndex) => (
                  <div key={w} className="grid grid-cols-6">
                    <div className="p-2 text-center bg-zinc-50">{w}</div>
                    {SIZE_GUIDE.matrix[rowIndex].map((size, colIndex) => (
                      <button
                        key={`${w}-${colIndex}`}
                        onClick={() => setRecommendedSize(size)}
                        className={`p-2 text-center border-t border-black/5 ${recommendedSize === size ? 'bg-[#0057FF]/10 text-[#0057FF]' : ''}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {SIZE_OPTIONS.map((size) => (
                <div key={size.key} className="flex items-center justify-between border-b border-black/5 pb-2">
                  <span className="text-sm">{size.label}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleQtyChange(size.key, -1)}
                      className="w-8 h-8 border border-black/10 rounded-full"
                    >
                      -
                    </button>
                    <span className="w-6 text-center">{quantities[size.key]}</span>
                    <button
                      onClick={() => handleQtyChange(size.key, 1)}
                      className="w-8 h-8 border border-black/10 rounded-full"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-black/10 p-4 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => handleDeliverySelect('delivery')}
            className={`flex-1 py-2 rounded-xl border ${deliveryMode === 'delivery' ? 'bg-black text-white border-black' : 'border-black/10'}`}
          >
            物流配送
          </button>
          <button
            onClick={() => handleDeliverySelect('pickup')}
            className={`flex-1 py-2 rounded-xl border ${deliveryMode === 'pickup' ? 'bg-black text-white border-black' : 'border-black/10'}`}
          >
            现场自提
          </button>
        </div>

        {deliveryMode === 'delivery' && (
          <button
            onClick={() => setView('address')}
            className="w-full border border-black/10 rounded-xl p-3 text-left"
          >
            {address.name || address.detail ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{address.name || '收货人'}</span>
                  <span className="text-xs text-zinc-400">编辑</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{address.phone || '手机号'}</p>
                <p className="text-xs text-zinc-500">{address.region} {address.detail}</p>
              </div>
            ) : (
              <div className="text-xs text-zinc-500">点击添加收货地址</div>
            )}
          </button>
        )}

        <div className="space-y-2">
          <label className="text-xs text-zinc-500">备注</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="备注"
            className="w-full border border-black/10 rounded-xl px-4 py-3 min-h-[80px]"
          />
        </div>

        <div className="border border-black/10 rounded-xl p-3 text-xs text-zinc-500">
          温馨提示：因个性化定制，非质量问题不支持退换
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end p-2 border-b border-black/10">
          <span className="text-zinc-500 text-sm">产品费用</span>
          <span className="font-mono text-sm">¥{unitPrice}</span>
        </div>
        <div className="flex justify-between items-end p-2 border-b border-black/10">
          <span className="text-zinc-500 text-sm">数量</span>
          <span className="font-mono text-sm">{totalQty}</span>
        </div>
        <div className="flex justify-between items-end p-4 bg-[#0057FF] rounded-xl text-white">
          <span className="font-black">合计</span>
          <span className="text-2xl font-black italic">¥{totalPrice.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => openPreview('garment')}
          className="w-full py-3 bg-white text-black font-bold text-sm rounded-xl border border-black/10 hover:border-[#0057FF] hover:text-[#0057FF] transition-all"
        >
          查看底衫生产单
        </button>
        <button
          onClick={() => openPreview('print')}
          className="w-full py-3 bg-white text-black font-bold text-sm rounded-xl border border-black/10 hover:border-[#0057FF] hover:text-[#0057FF] transition-all"
        >
          查看印花生产单
        </button>
      </div>

        <button
          onClick={handleExportAll}
          disabled={isExporting}
          className="w-full py-5 bg-white text-black font-black text-xl rounded-full shadow-2xl hover:bg-[#0057FF] hover:text-white transition-all transform active:scale-95 disabled:opacity-50"
        >
          {isExporting ? '生成中…' : '完成支付'}
        </button>

      {totalQty === 0 && (
        <p className="text-center text-[10px] font-mono text-zinc-500">请选择尺码数量</p>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 px-6 py-3 flex justify-around text-xs">
        <button onClick={() => alert('已生成分享链接')} className="flex flex-col items-center gap-1">
          <span>分享</span>
        </button>
        <button onClick={() => alert('暂无可用优惠券')} className="flex flex-col items-center gap-1">
          <span>领券结算</span>
        </button>
        <button onClick={() => alert('已加入购物车')} className="flex flex-col items-center gap-1">
          <span>加入购物车</span>
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-black/10 px-4 py-3 flex justify-between items-center">
              <span className="font-bold">
                {preview === 'garment' ? '底衫生产单预览' : '印花生产单预览'}
              </span>
              <button onClick={() => setPreview(null)} className="text-sm text-zinc-500">关闭</button>
            </div>
            <div className="p-4 flex justify-center">
              <div className="scale-90 origin-top">
                <OrderTemplate type={preview} qrDataUrl={qrDataUrl} order={orderData} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute -left-[9999px] top-0">
        <div ref={garmentRef}>
          <OrderTemplate type="garment" qrDataUrl={qrDataUrl} order={orderData} />
        </div>
        <div ref={printRef}>
          <OrderTemplate type="print" qrDataUrl={qrDataUrl} order={orderData} />
        </div>
      </div>
    </div>
  );
};

export default Checkout;
