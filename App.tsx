
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

  const handleRecipeSelection = (imageUrl: string) => {
    setDesignUrl(imageUrl);
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
