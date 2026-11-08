import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Safely generate manifest URL, falling back gracefully if window.location.origin is invalid
const getManifestUrl = () => {
  try {
    const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null')
      ? window.location.origin
      : '';
    return origin ? `${origin}/tonconnect-manifest.json` : '/tonconnect-manifest.json';
  } catch (e) {
    return '/tonconnect-manifest.json';
  }
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

