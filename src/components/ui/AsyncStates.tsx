// ==============================================================================
// Maison MIPA Memories — Async State Primitives
// EmptyState, LoadingState, ErrorState — resilient async UI patterns
// ==============================================================================
import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Button } from './Button';

// ── Loading State ──────────────────────────────────────────────────────────────
interface LoadingStateProps {
  label?: string;
  height?: string | number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Đang tải...',
  height = 200,
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      height,
      color: 'var(--mipa-text-muted)',
    }}
  >
    <Loader2
      size={28}
      style={{ animation: 'spin 0.8s linear infinite', color: 'var(--mipa-gold)' }}
    />
    <span style={{ fontFamily: 'var(--mipa-font-body)', fontSize: '0.875rem' }}>{label}</span>
  </div>
);

// ── Error State ────────────────────────────────────────────────────────────────
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  height?: string | number;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã xảy ra lỗi',
  message,
  onRetry,
  height = 200,
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      height,
      padding: '1.5rem',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'var(--mipa-danger-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AlertCircle size={22} color="var(--mipa-danger)" />
    </div>
    <div>
      <p
        style={{
          fontFamily: 'var(--mipa-font-body)',
          fontWeight: 600,
          color: 'var(--mipa-text)',
          margin: '0 0 0.35rem',
          fontSize: '0.9375rem',
        }}
      >
        {title}
      </p>
      {message && (
        <p
          style={{
            fontFamily: 'var(--mipa-font-body)',
            fontSize: '0.8125rem',
            color: 'var(--mipa-text-muted)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      )}
    </div>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Thử lại
      </Button>
    )}
  </div>
);

// ── Empty State ────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  height?: string | number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'Chưa có dữ liệu',
  message,
  action,
  height = 220,
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      height,
      padding: '1.5rem',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: 'rgba(198, 164, 95, 0.08)',
        border: '1px solid var(--mipa-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--mipa-text-muted)',
      }}
    >
      {icon ?? <Inbox size={22} />}
    </div>
    <div>
      <p
        style={{
          fontFamily: 'var(--mipa-font-body)',
          fontWeight: 600,
          color: 'var(--mipa-text-soft)',
          margin: '0 0 0.35rem',
          fontSize: '0.9375rem',
        }}
      >
        {title}
      </p>
      {message && (
        <p
          style={{
            fontFamily: 'var(--mipa-font-body)',
            fontSize: '0.8125rem',
            color: 'var(--mipa-text-muted)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      )}
    </div>
    {action}
  </div>
);

export default { LoadingState, ErrorState, EmptyState };
