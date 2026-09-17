// ==============================================================================
// Maison MIPA Memories — ConfirmDialog UI Primitive
// Standardized confirmation with destructive / affirmative variants
// ==============================================================================
import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import Modal from './Modal';
import { Button } from './Button';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  variant = 'danger',
  loading = false,
}) => {
  const iconMap: Record<ConfirmVariant, React.ReactNode> = {
    danger: <AlertTriangle size={22} color="var(--mipa-danger)" />,
    warning: <AlertTriangle size={22} color="var(--mipa-warning)" />,
    info: <Info size={22} color="var(--mipa-info)" />,
  };

  const colorMap: Record<ConfirmVariant, string> = {
    danger: 'var(--mipa-danger)',
    warning: 'var(--mipa-warning)',
    info: 'var(--mipa-info)',
  };

  const bgMap: Record<ConfirmVariant, string> = {
    danger: 'var(--mipa-danger-soft)',
    warning: 'var(--mipa-warning-soft)',
    info: 'var(--mipa-info-soft)',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="400px"
      hideCloseButton
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'outline' : 'gold'}
            size="md"
            loading={loading}
            onClick={async () => { await onConfirm(); }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: bgMap[variant],
            border: `1px solid ${colorMap[variant]}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {iconMap[variant]}
        </div>

        <div>
          <h3
            style={{
              fontFamily: 'var(--mipa-font-heading)',
              fontSize: '1.15rem',
              fontWeight: 600,
              color: 'var(--mipa-text)',
              margin: '0 0 0.5rem',
            }}
          >
            {title}
          </h3>
          <div
            style={{
              fontFamily: 'var(--mipa-font-body)',
              fontSize: '0.875rem',
              color: 'var(--mipa-text-soft)',
              lineHeight: 1.6,
            }}
          >
            {message}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
