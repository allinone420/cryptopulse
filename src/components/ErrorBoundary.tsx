import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SatoCryp ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    // Clear any potential broken local caches and reload
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f1218] flex flex-col items-center justify-center p-6 text-center text-white font-sans select-none">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-5 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-xl font-bold uppercase tracking-wider mb-2 text-white">Application Notice</h1>
          <p className="text-xs text-[#8e9299] max-w-sm mb-6 leading-relaxed">
            {this.state.error?.message || "An issue occurred while initializing the SatoCryp interface."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-[#f3ba2f] text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 shadow-lg"
            >
              <RefreshCw size={14} /> Reload SatoCryp
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  window.location.reload();
                } catch (e) {}
              }}
              className="px-4 py-2.5 bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/20 active:scale-95 transition-all"
            >
              Reset Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
