import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Signal to initial diagnostic shell that JS execution has started
if (typeof window !== 'undefined') {
  (window as any).__SATOCRYP_MOUNTED = true;
}

const getManifestUrl = () => {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname && hostname.includes('github.io')) {
        return 'https://allinone420.github.io/cryptopulse/tonconnect-manifest.json';
      }
      const url = new URL(window.location.href);
      const pathname = url.pathname;
      const cleanPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
      const lastSlashIndex = cleanPath.lastIndexOf('/');
      const basePath = lastSlashIndex > 0 ? cleanPath.substring(0, lastSlashIndex) : '';
      return `${url.origin}${basePath}/tonconnect-manifest.json`;
    }
  } catch (e) {}
  return 'https://allinone420.github.io/cryptopulse/tonconnect-manifest.json';
};

const manifestUrl = getManifestUrl();

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <TonConnectUIProvider 
          manifestUrl={manifestUrl}
          actionsConfiguration={{
            twaReturnUrl: 'https://t.me/SatoCrypBot'
          }}
        >
          <App />
        </TonConnectUIProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
