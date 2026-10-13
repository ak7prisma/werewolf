import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AudioProvider } from '@/audio/AudioProvider';
import { ModalProvider } from '@/components/ModalProvider';
import { GameProvider } from '@/game/GameProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AudioProvider>
        <ModalProvider>
          <GameProvider>
            <App />
          </GameProvider>
        </ModalProvider>
      </AudioProvider>
    </ErrorBoundary>
  </StrictMode>,
);
