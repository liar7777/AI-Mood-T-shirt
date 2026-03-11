
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

  const handleVibeSelection = (prompt: string) => {
    setSelectedPrompt(prompt);
    setView('CHAT');
  };

  const handleGenerationComplete = (url: string) => {
    setDesignUrl(url);
    setView('EDITOR');
  };

  return (
    <Layout activeView={view} onViewChange={setView}>
      {view === 'LANDING' && (
        <InspirationFlow onSelect={handleVibeSelection} />
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
          onNext={() => setView('CHECKOUT')} 
          onBack={() => setView('CHAT')}
        />
      )}

      {view === 'CHECKOUT' && (
        <Checkout />
      )}
    </Layout>
  );
};

export default App;
