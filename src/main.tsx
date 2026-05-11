import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App.tsx';
import './index.css';
import './lib/wallet'; // Initialize web3modal (optional fallback)

// Fallback to absolute URL with cache breaker to ensure fresh manifest fetch
const manifestUrl = `${window.location.origin}/tonconnect-manifest.json?v=${Date.now()}`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
);
