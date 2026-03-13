
require('dotenv').config();
// Optional: route all outbound fetch (used by @google/genai) via proxy if set
try {
  const { setGlobalDispatcher, ProxyAgent } = require('undici');
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    console.log(`Proxy enabled for outbound requests: ${proxyUrl}`);
  }
} catch (e) {
  console.warn(`Proxy setup skipped: ${e.message}`);
}
const express = require('express');
const path = require('path');
const { GoogleGenAI, Type } = require("@google/genai");
const QRCode = require('qrcode');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const app = express();

// Increase JSON limit to handle base64 image strings
app.use(express.json({ limit: '10mb' }));

// Static files directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

const INTERNAL_TOKEN_HEADER = 'x-internal-token';

const ensureDataUri = (value, mimeType) => {
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  return `data:${mimeType};base64,${value}`;
};

const stripDataUri = (value) => {
  if (!value) return '';
  return value.includes(',') ? value.split(',')[1] : value;
};

const dataUriToBytes = (dataUri) => {
  const base64 = stripDataUri(dataUri);
  return Buffer.from(base64, 'base64');
};

const getMimeFromDataUri = (dataUri, fallback = 'image/png') => {
  if (!dataUri || !dataUri.startsWith('data:')) return fallback;
  const match = dataUri.match(/^data:([^;]+);base64,/);
  return match ? match[1] : fallback;
};

const MOCK_PNG_DATA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

const safeJsonParse = (text, fallback) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

const debugError = (error) => {
  if (typeof error === 'string') {
    return { message: error };
  }
  const message = error?.message || error?.toString?.() || 'Unknown error';
  return {
    message,
    name: error?.name,
    stack: error?.stack,
  };
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const DEFAULT_ORDER = {
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
  designPreviewUrl: '',
  designBackUrl: '',
  designSideUrl: '',
  designDownloadUrl: 'https://example.com/print-assets/transparent-design.png',
  notes: '对齐胸前安全区，避免袖口与缝线。',
};

const buildOrderData = ({ mockupImage, printAssetImage, backMockupImage, topic }) => ({
  ...DEFAULT_ORDER,
  // Use mockup / print asset as the preview reference
  designPreviewUrl: printAssetImage || mockupImage || '',
  designBackUrl: backMockupImage || '',
  designSideUrl: '',
  // Keep topic in notes if provided for traceability
  notes: topic ? `${DEFAULT_ORDER.notes} | Topic: ${topic}` : DEFAULT_ORDER.notes,
});

const renderOrderHtml = ({ type, order, qrDataUrl }) => {
  const sizes = Object.entries(order.sizes || {});
  const positions = order.printPositions || [];
  const preview = order.designPreviewUrl || '';
  const back = order.designBackUrl || '';
  const side = order.designSideUrl || '';

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @page { size: A4; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { font-family: "PingFang SC", "Noto Sans CJK SC", "Helvetica", "Arial", sans-serif; }
    </style>
  </head>
  <body>
    <div class="bg-white text-black" style="width: 794px; height: 1123px;">
      <div class="p-10 h-full flex flex-col gap-6">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-2xl font-black tracking-tight">
              ${type === 'garment' ? 'Garment_Order' : 'Print_Order'}
            </h1>
            <p class="text-xs text-zinc-500 font-mono mt-1">订单号：${escapeHtml(order.orderNo)}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-zinc-500">SKU</p>
            <p class="text-sm font-bold">${escapeHtml(order.sku)}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="border border-black/10 rounded-lg p-3">
            <p class="text-[10px] font-mono text-zinc-500">产品信息</p>
            <p class="font-semibold">${escapeHtml(order.style)} / ${escapeHtml(order.color)}</p>
            <p class="text-xs text-zinc-500">${escapeHtml(order.material)}</p>
            <p class="text-xs text-zinc-500">分辨率：${escapeHtml(order.resolution)}</p>
          </div>
          <div class="border border-black/10 rounded-lg p-3">
            <p class="text-[10px] font-mono text-zinc-500">收件信息</p>
            <p class="font-semibold">${escapeHtml(order.receiver)} · ${escapeHtml(order.phone)}</p>
            <p class="text-xs text-zinc-500">${escapeHtml(order.address)}</p>
          </div>
        </div>

        ${
          type === 'garment'
            ? `<div class="border border-black/10 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <p class="text-[10px] font-mono text-zinc-500">尺码汇总矩阵</p>
                  <p class="text-xs text-zinc-500">交付：${escapeHtml(order.delivery)}</p>
                </div>
                <div class="grid grid-cols-5 gap-2 mt-3">
                  ${sizes
                    .map(
                      ([size, qty]) => `<div class="border border-black/10 rounded-md p-2 text-center">
                        <p class="text-xs font-semibold">${escapeHtml(size)}</p>
                        <p class="text-sm font-bold">${escapeHtml(qty)}</p>
                      </div>`
                    )
                    .join('')}
                </div>
              </div>`
            : `<div class="border border-black/10 rounded-lg p-4 flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-[10px] font-mono text-zinc-500">印花位置</p>
                    <p class="text-sm font-semibold">${escapeHtml(positions.join(' / '))}</p>
                    <p class="text-xs text-zinc-500">物理尺寸：${escapeHtml(order.printSize)}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-[10px] font-mono text-zinc-500">原图下载</p>
                    ${qrDataUrl ? `<img src="${qrDataUrl}" alt="二维码" class="w-16 h-16" />` : ''}
                  </div>
                </div>
                <div class="border border-dashed border-black/20 rounded-lg p-4">
                  <p class="text-[10px] font-mono text-zinc-500">尺寸参考图</p>
                  <div class="mt-2 grid grid-cols-3 gap-2">
                    <div class="border border-black/10 rounded-md p-2 text-center">
                      ${preview ? `<img src="${preview}" alt="前" class="w-full h-24 object-contain" />` : `<span class="text-xs text-zinc-400">前</span>`}
                    </div>
                    <div class="border border-black/10 rounded-md p-2 text-center">
                      ${back
                        ? `<img src="${back}" alt="后" class="w-full h-24 object-contain" />`
                        : `<div class="w-full h-24 rounded-md bg-zinc-100 flex flex-col items-center justify-center text-zinc-400 text-[10px]">
                             <div>后</div>
                             <div>默认版型</div>
                           </div>`}
                    </div>
                    <div class="border border-black/10 rounded-md p-2 text-center">
                      ${side
                        ? `<img src="${side}" alt="侧" class="w-full h-24 object-contain" />`
                        : `<div class="w-full h-24 rounded-md bg-zinc-100 flex flex-col items-center justify-center text-zinc-400 text-[10px]">
                             <div>侧</div>
                             <div>默认版型</div>
                           </div>`}
                    </div>
                  </div>
                </div>
                <div class="text-xs text-zinc-500">备注：${escapeHtml(order.notes)}</div>
              </div>`
        }

        <div class="mt-auto text-xs text-zinc-400">
          TRIE 生产系统 · 自动生成
        </div>
      </div>
    </div>
  </body>
</html>`;
};

const launchBrowser = async () => {
  const isVercel = Boolean(process.env.VERCEL);
  if (isVercel) {
    const executablePath = await chromium.executablePath();
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  }
  const localExecutable =
    process.env.CHROME_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return puppeteer.launch({
    headless: 'new',
    executablePath: localExecutable,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
};

const analyzeStyleFromImage = async (ai, imageBase64) => {
  if (process.env.MOCK_GEMINI) {
    return {
      theme: 'mock-theme',
      colors: ['black', 'white'],
      vibe: 'mock-vibe',
      elements: ['mock-element'],
      lighting: 'studio',
    };
  }
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: stripDataUri(imageBase64),
          },
        },
        {
          text: "Analyze this fashion image. Extract the core visual identity (theme, color palette, vibe, and specific graphic elements). Return a valid JSON object.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          theme: { type: Type.STRING },
          colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          vibe: { type: Type.STRING },
          elements: { type: Type.ARRAY, items: { type: Type.STRING } },
          lighting: { type: Type.STRING },
        },
        required: ["theme", "colors", "vibe", "elements", "lighting"],
      },
    },
  });

  return safeJsonParse(response.text || '{}', {
    theme: 'streetwear',
    colors: ['black', 'white'],
    vibe: 'urban',
    elements: ['typography'],
    lighting: 'studio',
  });
};

const buildAnalysisFromTopic = (topicText) => ({
  theme: topicText || 'streetwear',
  colors: ['black', 'white', 'cobalt blue'],
  vibe: 'urban, bold, meme-driven',
  elements: ['bold typography', 'minimal icon', 'glitch accents'],
  lighting: 'clean studio',
});

const generateSketchFromAnalysis = async (ai, analysis, customPrompt, imageSize = "1K") => {
  if (process.env.MOCK_GEMINI) {
    console.log('[MOCK_GEMINI] generateSketchFromAnalysis');
    return MOCK_PNG_DATA;
  }
  const prompt = `Create a streetwear graphic design. Theme: ${analysis.theme}. Vibe: ${analysis.vibe}. Colors: ${analysis.colors?.join(', ') || 'black, white'}. Elements: ${analysis.elements?.join(', ') || 'typography'}. High quality, clean graphic design on a solid background, suitable for silk screen printing. ${customPrompt || ''}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize,
      },
    },
  });

  for (const candidate of response.candidates || []) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image generated in sketch stage");
};

const generateMockupWhiteFromDesign = async (ai, designBase64, styleHint = '', view = 'front', imageSize = "1K") => {
  if (process.env.MOCK_GEMINI) {
    console.log('[MOCK_GEMINI] generateMockupWhiteFromDesign');
    return MOCK_PNG_DATA;
  }
  const base64Data = stripDataUri(designBase64);
  const styleLine = styleHint ? `T恤整体配色与印花风格参考：${styleHint}。` : '';
  const viewLine = view === 'back' ? '生成同一件T恤的背面视图，可略微变化，但需与正面一致。' : '生成T恤正面视图。';
  const prompt = `生成纯白背景的平整T恤（无模特、无人体），将提供的印花贴到T恤${view === 'back' ? '背面' : '正面'}。${viewLine}${styleLine}仅体现在图案/色彩风格，不要生成任何文字，不要在衣服上写字。背景必须完全干净，画面只包含T恤。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: 'image/png' } },
        { text: prompt },
      ],
    },
    config: {
      imageConfig: { aspectRatio: "3:4", imageSize: "1K" }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated in mockup-white stage");
};

const extractGraphicAsset = async (ai, modelImageBase64) => {
  if (process.env.MOCK_GEMINI) {
    console.log('[MOCK_GEMINI] extractGraphicAsset');
    return MOCK_PNG_DATA;
  }
  const prompt = "Identify the core graphic design on the T-shirt in this photo. Re-create ONLY the graphic as a clean, high-resolution 2D digital asset. Requirements: Pure white background (#FFFFFF), centered, perfectly flat, NO human features, NO clothing folds, NO fabric texture, NO perspective distortion. It should be a production-ready print file.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: stripDataUri(modelImageBase64),
          },
        },
        { text: prompt },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K",
      },
    },
  });

  for (const candidate of response.candidates || []) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image generated in asset extraction stage");
};

const createOrderPdfs = async ({ topic, analysis, modelImageBase64, printAssetBase64, backImageBase64 }) => {
  const order = buildOrderData({
    mockupImage: modelImageBase64,
    printAssetImage: printAssetBase64,
    backMockupImage: backImageBase64,
    topic: topic || analysis?.theme,
  });

  const qrDataUrl = await QRCode.toDataURL(order.designDownloadUrl, {
    width: 160,
    margin: 1,
  });

  const browser = await launchBrowser();
  try {
    const buildPdf = async (type) => {
      const html = renderOrderHtml({ type, order, qrDataUrl });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      await page.close();
      const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
      return `data:application/pdf;base64,${buffer.toString('base64')}`;
    };

    const garmentOrder = await buildPdf('garment');
    const printOrder = await buildPdf('print');
    return { garmentOrder, printOrder };
  } finally {
    await browser.close();
  }
};

/**
 * GEMINI API PROXY ROUTES
 * Using gemini-3-pro-image-preview for high-quality streetwear design tasks.
 */

// 1. Generate 1 design sketch
app.post('/api/sketches', async (req, res) => {
  try {
    const { prompt, vibe } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const finalPrompt = `Create a streetwear graphic design. Style: ${vibe}. Theme: ${prompt}. High quality, clean graphic design on a solid background, suitable for silk screen printing. Unique variation.`;

    const result = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: finalPrompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
      }
    });

    const part = result.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    const images = part ? [`data:image/png;base64,${part.inlineData.data}`] : [];

    res.json({ images });
  } catch (error) {
    console.error("Sketches Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Generate model mockup
app.post('/api/mockup', async (req, res) => {
  try {
  const { designBase64, garmentType } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = designBase64.split(',')[1];
    
    const positionMap = {
      '前': 'front chest',
      '后': 'back',
      '侧': 'left sleeve',
    };

    const position = positionMap[garmentType] || 'front chest';
    const prompt = `An East Asian medium-build male model wearing a high-quality white T-shirt with the provided graphic design printed clearly on the ${position}. Clean white studio background, professional fashion photography, high-end streetwear aesthetic, realistic fabric textures. The model is standing in a neutral, cool pose.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/png' } },
          { text: prompt },
        ],
      },
      config: {
        imageConfig: { aspectRatio: "3:4", imageSize }
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part) {
      res.json({ image: `data:image/png;base64,${part.inlineData.data}` });
    } else {
      throw new Error("No image in response");
    }
  } catch (error) {
    console.error("Mockup Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2.1 Generate white background T-shirt mockup (fixed prompt)
app.post('/api/mockup-white', async (req, res) => {
  try {
    const { designBase64 } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = designBase64.split(',')[1];

    const prompt = '生成白底T恤图片。';

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/png' } },
          { text: prompt },
        ],
      },
      config: {
        imageConfig: { aspectRatio: "3:4", imageSize: "1K" }
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part) {
      res.json({ image: `data:image/png;base64,${part.inlineData.data}` });
    } else {
      throw new Error("No image in response");
    }
  } catch (error) {
    console.error("Mockup White Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Edit design via refinement tags
app.post('/api/edit', async (req, res) => {
  try {
    const { originalImageBase64, instruction } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = originalImageBase64.split(',')[1];
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/png' } },
          { text: `Modify this graphic design following these instructions: ${instruction}. Maintain the streetwear aesthetic and high-quality printing standard. Solid background.` },
        ],
      },
      config: {
        imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part) {
      res.json({ image: `data:image/png;base64,${part.inlineData.data}` });
    } else {
      throw new Error("No image in response");
    }
  } catch (error) {
    console.error("Edit Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Internal SSE stream for OpenClaw (not for frontend)
app.post('/api/internal/stream', async (req, res) => {
  const internalToken = process.env.INTERNAL_TOKEN;
  if (!internalToken) {
    return res.status(500).json({ error: 'INTERNAL_TOKEN not configured' });
  }
  const provided = req.headers[INTERNAL_TOKEN_HEADER];
  if (provided !== internalToken) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.flushHeaders) res.flushHeaders();

  const heartbeat = setInterval(() => {
    if (res.writableEnded) return;
    try {
      res.write(': ping\n\n');
      if (res.flush) res.flush();
    } catch {
      // ignore write errors after close
    }
  }, 5000);
  req.on('close', () => {
    clearInterval(heartbeat);
  });

  const sendStep = (payload) => {
    if (res.writableEnded) return;
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      if (res.flush) res.flush();
    } catch {
      // ignore write errors after close
    }
  };

  try {
    const input = req.body?.input || {};
    const options = req.body?.options || {};
    const lightMode = input.type === 'topic' && options.light_mode !== false;
    if (!input.type) {
      sendStep({ step: 'error', message: 'Missing input.type' });
      return res.end();
    }

    sendStep({ step: 'start', message: '收到指令，初始化中...' });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let analysis;
    if (input.type === 'image') {
      if (!input.image_base64) {
        sendStep({ step: 'error', message: 'Missing image_base64' });
        return res.end();
      }
      sendStep({ step: 'analyze', message: '解析风格中...' });
      analysis = await analyzeStyleFromImage(ai, input.image_base64);
    } else if (input.type === 'topic') {
      if (!input.topic_text) {
        sendStep({ step: 'error', message: 'Missing topic_text' });
        return res.end();
      }
      sendStep({ step: 'analyze', message: '生成风格结构中（本地）...' });
      analysis = buildAnalysisFromTopic(input.topic_text);
    } else {
      sendStep({ step: 'error', message: 'Unsupported input.type' });
      return res.end();
    }

    const shouldGeneratePrint = lightMode ? false : options.generate_print !== false;
    const shouldGeneratePdf = options.generate_pdf !== false;

    sendStep({ step: 'render', message: '生成印花图（轻量）...' });
    const sketchImage = await generateSketchFromAnalysis(ai, analysis, options.custom_prompt, "1K");

    sendStep({ step: 'render', message: '生成平铺T恤效果图（图生图/轻量）...' });
    const styleHint = input.type === 'topic' ? input.topic_text : '';
    const modelImage = await generateMockupWhiteFromDesign(ai, sketchImage, styleHint, 'front', "1K");
    const backImage = await generateMockupWhiteFromDesign(ai, sketchImage, styleHint, 'back', "1K");

    // Emit mockup immediately for "light mode" fast preview usage
    sendStep({
      step: 'mockup_ready',
      result: {
        images: {
          mockup: ensureDataUri(modelImage, 'image/png'),
          mockup_back: ensureDataUri(backImage, 'image/png'),
        },
      },
    });

    let printAsset = '';
    if (shouldGeneratePrint) {
      sendStep({ step: 'asset', message: '提取印花资产...' });
      printAsset = await extractGraphicAsset(ai, modelImage);
    }

    let pdfs = {};
    if (shouldGeneratePdf) {
      sendStep({ step: 'pdf', message: '生成生产单 PDF...' });
      pdfs = await createOrderPdfs({
        topic: input.topic_text,
        analysis,
        modelImageBase64: modelImage,
        backImageBase64: backImage,
        // In light mode, reuse mockup as print image to avoid extra extraction step
        printAssetBase64: printAsset || modelImage,
      });
    }

    sendStep({
      step: 'completed',
      result: {
        images: {
          mockup: ensureDataUri(modelImage, 'image/png'),
          mockup_back: ensureDataUri(backImage, 'image/png'),
          print_asset: ensureDataUri(printAsset || modelImage, 'image/png'),
        },
        pdfs: pdfs.garmentOrder
          ? {
              garment_order: pdfs.garmentOrder,
              print_order: pdfs.printOrder,
            }
          : {},
      },
    });
    res.end();
  } catch (error) {
    console.error('[internal/stream] error', error);
    const detail = debugError(error);
    sendStep({ step: 'error', message: detail.message, detail });
    res.end();
  } finally {
    clearInterval(heartbeat);
  }
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', version: '1.2.6' });
});

// SPA Support
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  });
});

if (require.main === module) {
  const port = process.env.PORT || 8080;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
