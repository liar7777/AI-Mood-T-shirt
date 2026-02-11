
import React from 'react';
import { InspirationCard } from './types';

export const INSPIRATION_DATA: InspirationCard[] = [
  { id: '1', imageUrl: 'https://picsum.photos/seed/cyber1/800/1200', tag: '#已老实', prompt: 'Cyberpunk chinese typography, high contrast neon, street art style' },
  { id: '2', imageUrl: 'https://picsum.photos/seed/cyber2/800/1200', tag: '#赛博道士', prompt: 'Digital monk, glitch art, holographic robes, futuristic temple' },
  { id: '3', imageUrl: 'https://picsum.photos/seed/vibe3/800/1200', tag: '#离离原上草', prompt: 'Surreal landscape, vibrant green, psychedelic patterns' },
  { id: '4', imageUrl: 'https://picsum.photos/seed/vibe4/800/1200', tag: '#躺平美学', prompt: 'Lo-fi aesthetic, minimalist line art, cozy vibes' },
];

export const STYLE_CARDS = [
  { label: '故障艺术', value: 'glitch art, VHS distortion, digital errors' },
  { label: '中式硬核', value: 'Hardcore Chinese typography, ink wash meets industrial' },
  { label: '多巴胺插画', value: 'High saturation, playful characters, maximalist' },
  { label: '赛博朋克', value: 'Neon lights, futuristic city, chrome texture' },
];

export const REFINEMENT_TAGS = [
  '加一点发疯文学',
  '颜色再亮一点',
  '文字居中',
  '再硬核一点',
  '金属质感'
];
