import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isRtl = document.documentElement.dir === 'rtl';

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--color-text-primary)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            color: '#ef4444'
          }}>
            <AlertTriangle size={32} />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 8px 0' }}>
            {isRtl ? 'حدث خطأ غير متوقع في تحميل هذه الصفحة' : 'An unexpected error occurred loading this page'}
          </h2>

          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem',
            maxWidth: '480px',
            margin: '0 0 1.5rem 0',
            lineHeight: 1.6
          }}>
            {isRtl 
              ? 'تم حصر الخطأ بنجاح للحفاظ على سلامة التطبيق. يمكنك إعادة تحميل الصفحة أو العودة للرئيسية.'
              : 'The error was successfully caught to keep the application stable. You can refresh or return home.'}
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RotateCcw size={16} />
              <span>{isRtl ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>

            <a
              href="/"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
            >
              <Home size={16} />
              <span>{isRtl ? 'الرئيسية' : 'Home'}</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
