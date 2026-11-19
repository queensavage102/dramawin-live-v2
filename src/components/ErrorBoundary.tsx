import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('DramaWin ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      let readable = 'Something interrupted your session. Please reload to continue.';
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          readable = `Connection notice: ${parsed.error}`;
        }
      } catch {
        if (this.state.message) {
          readable = this.state.message;
        }
      }

      return (
        <div className="min-h-screen bg-[#070709] text-[#F6F2E9] flex items-center justify-center p-6">
          <div className="obsidian-card rounded-2xl max-w-md w-full p-6 space-y-4 text-center">
            <h1 className="text-2xl font-display font-bold gold-gradient-text">
              DRAMA WIN TORNEMENT
            </h1>
            <p className="text-sm text-[#A69F91] leading-relaxed">{readable}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] rounded-xl gold-gradient-bg text-[#181307] font-semibold text-sm transition-transform active:scale-[0.98]"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
