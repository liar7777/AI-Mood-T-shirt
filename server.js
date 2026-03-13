
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
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
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

const safeJsonParse = (text, fallback) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
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
    const payload = Buffer.from('mock-image').toString('base64');
    return `data:image/png;base64,${payload}`;
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

const generateMockupWhiteFromDesign = async (ai, designBase64, imageSize = "1K") => {
  if (process.env.MOCK_GEMINI) {
    console.log('[MOCK_GEMINI] generateMockupWhiteFromDesign');
    const payload = Buffer.from('mock-mockup').toString('base64');
    return `data:image/png;base64,${payload}`;
  }
  const base64Data = stripDataUri(designBase64);
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
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated in mockup-white stage");
};

const extractGraphicAsset = async (ai, modelImageBase64) => {
  if (process.env.MOCK_GEMINI) {
    console.log('[MOCK_GEMINI] extractGraphicAsset');
    const payload = Buffer.from('mock-asset').toString('base64');
    return `data:image/png;base64,${payload}`;
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

const createOrderPdfs = async ({ topic, analysis, modelImageBase64, printAssetBase64 }) => {
  const buildDoc = async (title, imageDataUri) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(title, { x: 50, y: 800, size: 18, font, color: rgb(0, 0, 0) });
    page.drawText(`Topic: ${topic || analysis?.theme || 'N/A'}`, { x: 50, y: 770, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`Vibe: ${analysis?.vibe || 'N/A'}`, { x: 50, y: 755, size: 10, font, color: rgb(0.2, 0.2, 0.2) });

    if (imageDataUri) {
      const mime = getMimeFromDataUri(imageDataUri, 'image/png');
      const imageBytes = dataUriToBytes(imageDataUri);
      const embedded = mime.includes('jpeg') ? await pdfDoc.embedJpg(imageBytes) : await pdfDoc.embedPng(imageBytes);
      const { width, height } = embedded.scale(1);
      const maxWidth = 420;
      const maxHeight = 420;
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      const drawWidth = width * scale;
      const drawHeight = height * scale;
      const x = 50;
      const y = 300;
      page.drawImage(embedded, { x, y, width: drawWidth, height: drawHeight });
    }

    const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: true });
    return pdfBase64;
  };

  const garmentOrder = await buildDoc('Garment_Order', modelImageBase64);
  const printOrder = await buildDoc('Print_Order', printAssetBase64);

  return { garmentOrder, printOrder };
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
    const shouldGeneratePdf = lightMode ? false : options.generate_pdf !== false;

    sendStep({ step: 'render', message: '生成印花图（轻量）...' });
    const sketchImage = await generateSketchFromAnalysis(ai, analysis, options.custom_prompt, "1K");

    sendStep({ step: 'render', message: '生成模特效果图（图生图/轻量）...' });
    const modelImage = await generateMockupWhiteFromDesign(ai, sketchImage, "1K");

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
        printAssetBase64: printAsset || modelImage,
      });
    }

    sendStep({
      step: 'completed',
      result: {
        images: {
          mockup: ensureDataUri(modelImage, 'image/png'),
          print_asset: ensureDataUri(printAsset || sketchImage, 'image/png'),
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
    sendStep({ step: 'error', message: error.message || 'Unknown error' });
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
