
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

// 1. Generate 4 design sketches
app.post('/api/sketches', async (req, res) => {
  try {
    const { prompt, vibe } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const finalPrompt = `Create a streetwear graphic design. Style: ${vibe}. Theme: ${prompt}. High quality, clean graphic design on a solid background, suitable for silk screen printing. Unique variation.`;

    // Generate 4 variations in parallel
    const tasks = Array.from({ length: 4 }).map(() => 
      ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: finalPrompt }] },
        config: {
          imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
        }
      })
    );

    const results = await Promise.all(tasks);
    const images = results
      .map(r => r.candidates?.[0]?.content?.parts.find(p => p.inlineData))
      .filter(p => !!p)
      .map(p => `data:image/png;base64,${p.inlineData.data}`);

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
    
    const garmentMap = {
      '圆领T': 'high-quality round neck T-shirt',
      '卫ie': 'streetwear hoodie',
      '冲锋衣': 'technical windbreaker shell jacket'
    };

    const description = garmentMap[garmentType] || garmentType;
    const prompt = `An East Asian medium-build male model wearing a ${description} with the provided graphic design printed clearly on the chest. Clean white studio background, professional fashion photography, high-end streetwear aesthetic, realistic fabric textures. The model is standing in a neutral, cool pose.`;

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
