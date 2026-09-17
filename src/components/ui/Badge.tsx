// ==============================================================================
// Maison MIPA Memories — Status Badge / Chip
// Displays domain booking status with Vietnamese human-readable labels
// ==============================================================================
import React from 'react';
import type { BookingStatus } from '../../types';

interface StatusConfig {
  label: string;
  bg: string;
  color: string;
  border: string;
  dot?: string;
}

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, StatusConfig> = {
  DRAFT: {
    label: 'Nháp',
    bg: 'rgba(156, 163, 175, 0.15)',
    color: '#9CA3AF',
    border: 'rgba(156, 163, 175, 0.3)',
  },
  CONSULTATION_REQUESTED: {
    label: 'Chờ tư vấn',
    bg: 'rgba(251, 191, 36, 0.12)',
    color: '#F59E0B',
    border: 'rgba(245, 158, 11, 0.35)',
    dot: '#F59E0B',
  },
  CONSULTING: {
    label: 'Đang tư vấn',
    bg: 'rgba(139, 92, 246, 0.12)',
    color: '#8B5CF6',
    border: 'rgba(139, 92, 246, 0.35)',
    dot: '#8B5CF6',
  },
  PENDING_PAYMENT: {
    label: 'Chờ đặt cọc',
    bg: 'rgba(251, 191, 36, 0.12)',
    color: '#F59E0B',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  DEPOSIT_PAID: {
    label: 'Đã đặt cọc',
    bg: 'rgba(59, 130, 246, 0.12)',
    color: '#3B82F6',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#10B981',
    border: 'rgba(16, 185, 129, 0.35)',
    dot: '#10B981',
  },
  CHECKED_IN: {
    label: 'Đã check-in',
    bg: 'rgba(20, 184, 166, 0.12)',
    color: '#14B8A6',
    border: 'rgba(20, 184, 166, 0.35)',
    dot: '#14B8A6',
  },
  SHOOTING: {
    label: 'Đang chụp',
    bg: 'rgba(239, 68, 68, 0.12)',
    color: '#EF4444',
    border: 'rgba(239, 68, 68, 0.35)',
    dot: '#EF4444',
  },
  SHOOT_COMPLETED: {
    label: 'Chụp xong',
    bg: 'rgba(198, 164, 95, 0.15)',
    color: '#C6A45F',
    border: 'rgba(198, 164, 95, 0.4)',
  },
  AWAITING_SELECTION: {
    label: 'Chờ chọn ảnh',
    bg: 'rgba(251, 146, 60, 0.12)',
    color: '#FB923C',
    border: 'rgba(251, 146, 60, 0.35)',
    dot: '#FB923C',
  },
  EDITING: {
    label: 'Đang hậu kỳ',
    bg: 'rgba(168, 85, 247, 0.12)',
    color: '#A855F7',
    border: 'rgba(168, 85, 247, 0.35)',
    dot: '#A855F7',
  },
  READY_FOR_REVIEW: {
    label: 'Chờ duyệt',
    bg: 'rgba(59, 130, 246, 0.12)',
    color: '#3B82F6',
    border: 'rgba(59, 130, 246, 0.35)',
    dot: '#3B82F6',
  },
  DELIVERED: {
    label: 'Đã giao ảnh',
    bg: 'rgba(16, 185, 129, 0.15)',
    color: '#10B981',
    border: 'rgba(16, 185, 129, 0.4)',
    dot: '#10B981',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    bg: 'rgba(198, 164, 95, 0.18)',
    color: '#C6A45F',
    border: 'rgba(198, 164, 95, 0.5)',
  },
  CANCELLED: {
    label: 'Đã huỷ',
    bg: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
    border: 'rgba(239, 68, 68, 0.25)',
  },
  RESCHEDULED: {
    label: 'Đổi lịch',
    bg: 'rgba(251, 191, 36, 0.1)',
    color: '#F59E0B',
    border: 'rgba(245, 158, 11, 0.3)',
  },
};

interface BadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md';
  pulseDot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<BadgeProps> = ({
  status,
  size = 'md',
  pulseDot = false,
  style,
}) => {
  const config = BOOKING_STATUS_CONFIG[status] ?? {
    label: status,
    bg: 'rgba(156, 163, 175, 0.15)',
    color: '#9CA3AF',
    border: 'rgba(156, 163, 175, 0.3)',
  };

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '0.3rem' : '0.375rem',
        padding: isSmall ? '0.2rem 0.55rem' : '0.25rem 0.7rem',
        borderRadius: 'var(--radius-full)',
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        fontSize: isSmall ? '0.72rem' : '0.78rem',
        fontWeight: 600,
        fontFamily: 'var(--mipa-font-body)',
        letterSpacing: '0.025em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {config.dot && (
        <span
          style={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: '50%',
            background: config.dot,
            flexShrink: 0,
            ...(pulseDot && {
              animation: 'mipa-pulse 1.8s ease-in-out infinite',
            }),
          }}
        />
      )}
      {config.label}
    </span>
  );
};

interface GenericBadgeProps {
  label: string;
  variant?: 'gold' | 'info' | 'success' | 'warning' | 'danger' | 'muted';
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export const Badge: React.FC<GenericBadgeProps> = ({
  label,
  variant = 'muted',
  size = 'md',
  style,
}) => {
  const variantMap: Record<string, { bg: string; color: string; border: string }> = {
    gold: { bg: 'rgba(198, 164, 95, 0.18)', color: '#C6A45F', border: 'rgba(198, 164, 95, 0.45)' },
    info: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
    success: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
    danger: { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
    muted: { bg: 'rgba(156, 163, 175, 0.12)', color: '#9CA3AF', border: 'rgba(156, 163, 175, 0.25)' },
  };
  const v = variantMap[variant];
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: isSmall ? '0.2rem 0.55rem' : '0.25rem 0.7rem',
        borderRadius: 'var(--radius-full)',
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        fontSize: isSmall ? '0.72rem' : '0.78rem',
        fontWeight: 600,
        fontFamily: 'var(--mipa-font-body)',
        letterSpacing: '0.025em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
