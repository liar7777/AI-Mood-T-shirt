
export type AppView = 'LANDING' | 'CHAT' | 'EDITOR' | 'CHECKOUT';

export interface InspirationCard {
  id: string;
  imageUrl: string;
  tag: string;
  prompt: string;
}

export interface DesignState {
  originalImage?: string;
  currentImage?: string;
  history: string[];
  mockupType: 'TEE' | 'HOODIE' | 'VEST';
  vibeTag?: string;
}

export interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  text: string;
  image?: string;
  options?: string[];
}
