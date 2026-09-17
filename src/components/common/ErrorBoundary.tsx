// ==============================================================================
// Maison MIPA Memories — Production App-Level Error Boundary
// Catches unhandled React render errors, displays branded French editorial fallback,
// and strictly conceals internal stack traces and secrets in production.
// ==============================================================================

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { monitoring } from '../../utils/monitoring';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary', 'Unhandled React render exception', {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });
    monitoring.captureException(error, { componentStack: errorInfo.componentStack });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV !== 'production';

      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAF8F3',
            color: '#29231F',
            fontFamily: 'sans-serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(140, 110, 83, 0.25)',
              borderRadius: '8px',
              padding: '2.5rem 2rem',
              boxShadow: '0 8px 32px rgba(41, 35, 31, 0.08)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 1.25rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(198, 164, 95, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8C6E53',
                fontSize: '1.5rem',
              }}
            >
              ✦
            </div>

            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 600,
                color: '#29231F',
                marginBottom: '0.75rem',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                letterSpacing: '0.02em',
              }}
            >
              Maison MIPA gặp sự cố khi tải trang
            </h1>

            <p
              style={{
                fontSize: '0.925rem',
                color: '#6E5F55',
                lineHeight: 1.6,
                marginBottom: '2rem',
              }}
            >
              Đã có lỗi không mong muốn xảy ra trong quá trình kết xuất dữ liệu. Quý khách vui lòng thử tải lại trang hoặc quay về trang chủ.
            </p>

            {isDev && this.state.error && (
              <pre
                style={{
                  textAlign: 'left',
                  backgroundColor: '#F5EFE6',
                  padding: '1rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  marginBottom: '1.5rem',
                  color: '#9D174D',
                }}
              >
                {this.state.error.message}
              </pre>
            )}

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleReset}
                style={{
                  backgroundColor: '#8C6E53',
                  color: '#FFFDF9',
                  border: 'none',
                  padding: '0.65rem 1.4rem',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Thử lại
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  backgroundColor: 'transparent',
                  color: '#29231F',
                  border: '1px solid rgba(140, 110, 83, 0.4)',
                  padding: '0.65rem 1.4rem',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
