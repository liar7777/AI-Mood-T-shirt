
export class GeminiService {
  private async parseError(response: Response): Promise<string> {
    const prefix = `HTTP ${response.status} ${response.statusText}`.trim();
    try {
      const data = await response.json();
      if (data?.error) return `${prefix} - ${data.error}`;
      return prefix || 'Request failed';
    } catch {
      try {
        const text = await response.text();
        if (text) return `${prefix} - ${text}`;
        return prefix || 'Request failed';
      } catch {
        return prefix || 'Request failed';
      }
    }
  }

  async generateSketches(prompt: string, vibe: string): Promise<string[]> {
    const response = await fetch('/api/sketches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, vibe })
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new Error(error);
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
      const error = await this.parseError(response);
      throw new Error(error);
    }

    const data = await response.json();
    return data.image;
  }

  async generateMockupWhite(designBase64: string): Promise<string> {
    const response = await fetch('/api/mockup-white', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designBase64 })
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new Error(error);
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
      const error = await this.parseError(response);
      throw new Error(error);
    }

    const data = await response.json();
    return data.image;
  }
}

export const gemini = new GeminiService();
