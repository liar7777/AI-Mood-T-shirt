
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateSketches(prompt: string, vibe: string): Promise<string[]> {
    const ai = this.getClient();
    const finalPrompt = `Create a streetwear graphic design. Style: ${vibe}. Theme: ${prompt}. High quality, clean graphic design on a solid background, suitable for silk screen printing. Unique variation.`;
    
    // Generate 4 variations in parallel
    const tasks = Array.from({ length: 4 }).map(() => 
      ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: finalPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      })
    );

    const results = await Promise.all(tasks);
    const images: string[] = [];

    for (const response of results) {
      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        images.push(`data:image/png;base64,${part.inlineData.data}`);
      }
    }

    if (images.length === 0) throw new Error("No images generated");
    return images;
  }

  async generateMockup(designBase64: string, garmentType: string): Promise<string> {
    const ai = this.getClient();
    const base64Data = designBase64.split(',')[1];
    
    const garmentMap: Record<string, string> = {
      '圆领T': 'high-quality round neck T-shirt',
      '卫衣': 'streetwear hoodie',
      '冲锋衣': 'technical windbreaker shell jacket'
    };

    const description = garmentMap[garmentType] || garmentType;
    const prompt = `An East Asian medium-build male model wearing a ${description} with the provided graphic design printed clearly on the chest. Clean white studio background, professional fashion photography, high-end streetwear aesthetic, realistic fabric textures. The model is standing in a neutral, cool pose.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          },
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: "1K"
        }
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No mockup generated");
  }

  async editDesign(originalImageBase64: string, instruction: string): Promise<string> {
    const ai = this.getClient();
    const base64Data = originalImageBase64.split(',')[1];
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          },
          {
            text: `Modify this graphic design following these instructions: ${instruction}. Maintain the streetwear aesthetic and high-quality printing standard. Solid background.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image edited");
  }
}

export const gemini = new GeminiService();
