// ==============================================================================
// Maison MIPA Memories — Route Chunk Error Boundary
// Gracefully handles lazy route import failures (stale chunk, network drop).
// ==============================================================================

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const message = error.message.toLowerCase();
    const isChunk =
      message.includes('failed to fetch dynamically imported module') ||
      message.includes('loading chunk') ||
      message.includes('importing a module script failed');

    return {
      hasError: true,
      isChunkError: isChunk,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('RouteErrorBoundary', 'Lazy route chunk loading failure', {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = (): void => {
    // Avoid infinite loops by checking reload count
    const reloadKey = 'mipa_route_reload_count';
    const count = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
    if (count < 2) {
      sessionStorage.setItem(reloadKey, String(count + 1));
      window.location.reload();
    } else {
      sessionStorage.removeItem(reloadKey);
      window.location.href = '/';
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '4rem 1.5rem',
            textAlign: 'center',
            backgroundColor: '#FAF8F3',
            color: '#29231F',
            minHeight: '50vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '440px',
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(140, 110, 83, 0.25)',
              borderRadius: '6px',
              padding: '2rem',
              boxShadow: '0 4px 20px rgba(41, 35, 31, 0.06)',
            }}
          >
            <h2
              style={{
                fontSize: '1.2rem',
                fontWeight: 600,
                color: '#29231F',
                marginBottom: '0.5rem',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
              }}
            >
              {this.state.isChunkError ? 'Phiên bản trang vừa được cập nhật' : 'Không thể tải nội dung'}
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6E5F55',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
              }}
            >
              {this.state.isChunkError
                ? 'Đã có phiên bản mới của website hoặc kết nối mạng bị gián đoạn. Vui lòng tải lại trang để tiếp tục.'
                : 'Đã xảy ra lỗi khi tải phân đoạn này. Quý khách vui lòng thử lại.'}
            </p>
            <button
              onClick={this.handleRetry}
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
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
