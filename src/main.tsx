import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Guaranteed valid absolute manifest URL for TON Connect in all browser/webview contexts
const getManifestUrl = () => {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin;
      if (origin && origin !== 'null' && origin.startsWith('http')) {
        return `${origin}/tonconnect-manifest.json`;
      }
      if (window.location.href && window.location.href.startsWith('http')) {
        const u = new URL(window.location.href);
        return `${u.origin}/tonconnect-manifest.json`;
      }
    }
  } catch (e) {}
  return 'https://ais-pre-nhvt7gz2jkftcpn46aupes-568480704747.asia-southeast1.run.app/tonconnect-manifest.json';
};

const manifestUrl = getManifestUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <App />
      </TonConnectUIProvider>
    </ErrorBoundary>
  </StrictMode>,
);
