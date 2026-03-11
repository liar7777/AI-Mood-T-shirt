
import React, { useState } from 'react';
import Layout from './components/Layout';
import InspirationFlow from './components/InspirationFlow';
import ChatInterface from './components/ChatInterface';
import MockupLab from './components/MockupLab';
import Checkout from './components/Checkout';
import { AppView } from './types';
import { gemini } from './geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('LANDING');
  const [designUrl, setDesignUrl] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [isRecipeLoading, setIsRecipeLoading] = useState<boolean>(false);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});

  const extractInstruction =
    '请将图片中 T 恤上的印花图案单独提取，并在纯白背景下重新生成。去除阴影、褶皱和配饰，仅保留图案本身';

  const resolveAssetUrl = (url: string) => {
    if (!url) return '';
    if (/^(https?:|data:)/.test(url)) return url;
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    const normalizedUrl = url.replace(/^\//, '');
    return `${normalizedBase}${normalizedUrl}`;
  };

  const imageUrlToBase64 = async (url: string) => {
    const resolvedUrl = resolveAssetUrl(url);
    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      throw new Error('加载配方图片失败');
    }
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('配方图片读取失败'));
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const handleVibeSelection = (prompt: string) => {
    setSelectedPrompt(prompt);
    setView('CHAT');
  };

  const handleRecipeSelection = async (imageUrl: string) => {
    setView('EDITOR');
    setIsRecipeLoading(true);
    setDesignUrl('');
    try {
      const base64 = await imageUrlToBase64(imageUrl);
      const extracted = await gemini.editDesign(base64, extractInstruction);
      setDesignUrl(extracted);
    } catch (error) {
      console.error(error);
      alert('配方加载失败，请重试');
    } finally {
      setIsRecipeLoading(false);
    }
  };

  const handleGenerationComplete = (url: string) => {
    setDesignUrl(url);
    setIsRecipeLoading(false);
    setView('EDITOR');
  };

  const handleCheckout = (previews: Record<string, string>) => {
    setPreviewImages(previews);
    setView('CHECKOUT');
  };

  return (
    <Layout activeView={view} onViewChange={setView}>
      {view === 'LANDING' && (
        <InspirationFlow onSelect={(imageUrl, _id) => handleRecipeSelection(imageUrl)} />
      )}

      {view === 'CHAT' && (
        <ChatInterface 
          onComplete={handleGenerationComplete} 
          initialPrompt={selectedPrompt}
        />
      )}

      {view === 'EDITOR' && (
        <MockupLab 
          designUrl={designUrl} 
          isLoading={isRecipeLoading}
          loadingText="配方加载中"
          onNext={handleCheckout}
          onBack={() => setView('CHAT')}
        />
      )}

      {view === 'CHECKOUT' && (
        <Checkout previewImages={previewImages} />
      )}
    </Layout>
  );
};

export default App;
