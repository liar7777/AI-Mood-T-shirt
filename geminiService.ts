
export class GeminiService {
  async generateSketches(prompt: string, vibe: string): Promise<string[]> {
    const response = await fetch('/api/sketches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, vibe })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate sketches');
    }

    const data = await response.json();
    return data.images;
  }

  async generateMockup(designBase64: string, garmentType: string): Promise<string> {
    const response = await fetch('/api/mockup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designBase64, garmentType })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate mockup');
    }

    const data = await response.json();
    return data.image;
  }

  async editDesign(originalImageBase64: string, instruction: string): Promise<string> {
    const response = await fetch('/api/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalImageBase64, instruction })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to edit design');
    }

    const data = await response.json();
    return data.image;
  }
}

export const gemini = new GeminiService();
