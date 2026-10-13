import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ModalProvider } from '@/components/ModalProvider';
import { GameProvider } from '@/game/GameProvider';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ModalProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </ModalProvider>
    </ErrorBoundary>
  </StrictMode>,
);
