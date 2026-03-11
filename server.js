
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
const { GoogleGenAI } = require("@google/genai");
const app = express();

// Increase JSON limit to handle base64 image strings
app.use(express.json({ limit: '10mb' }));

// Static files directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

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
