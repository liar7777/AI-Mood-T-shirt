
import React, { useState } from 'react';
import Layout from './components/Layout';
import InspirationFlow from './components/InspirationFlow';
import ChatInterface from './components/ChatInterface';
import MockupLab from './components/MockupLab';
import Checkout from './components/Checkout';
import { AppView } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('LANDING');
  const [designUrl, setDesignUrl] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [isRecipeLoading, setIsRecipeLoading] = useState<boolean>(false);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});

  const handleVibeSelection = (prompt: string) => {
    setSelectedPrompt(prompt);
    setView('CHAT');
  };

  const handleRecipeSelection = (imageUrl: string, id?: string) => {
    const recipeUrl = id ? `/images/${id}.jpg` : imageUrl;
    setDesignUrl(recipeUrl);
    setIsRecipeLoading(false);
    setView('EDITOR');
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
        <InspirationFlow onSelect={(imageUrl, id) => handleRecipeSelection(imageUrl, id)} />
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
          onBack={() => setView('LANDING')}
        />
      )}

      {view === 'CHECKOUT' && (
        <Checkout previewImages={previewImages} onBack={() => setView('EDITOR')} />
      )}
    </Layout>
  );
};

export default App;
