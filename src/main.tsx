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
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      const pathSegments = pathname.split('/').filter(Boolean);
      const subpath = pathSegments.length > 0 && !pathname.endsWith('.html') && !pathname.endsWith('/') ? '/' + pathSegments[0] : '';
      if (origin && origin !== 'null' && origin.startsWith('http')) {
        return `${origin}${subpath}/tonconnect-manifest.json`;
      }
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
