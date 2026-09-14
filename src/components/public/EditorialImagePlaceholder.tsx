// ==============================================================================
// Maison MIPA Memories — Editorial Image Placeholder
// Reusable neutral placeholder with warm paper background and Maison emblem.
// Strict Rule: Never substitute unrelated photography when an image is missing.
// ==============================================================================
import React from 'react';

interface EditorialImagePlaceholderProps {
  aspectRatio?: string;
  label?: string;
  caption?: string;
  minHeight?: string;
  height?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const EditorialImagePlaceholder: React.FC<EditorialImagePlaceholderProps> = ({
  aspectRatio = '4/3',
  label = 'Ảnh đang được cập nhật',
  caption,
  minHeight = '200px',
  height,
  className = '',
  style = {},
}) => {
  const displayLabel = caption || label;

  return (
    <div
      role="img"
      aria-label={displayLabel}
      className={`mipa-image-placeholder ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        aspectRatio: height ? undefined : aspectRatio,
        minHeight: height ? undefined : minHeight,
        backgroundColor: '#F5F0E6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '1.5rem',
        boxSizing: 'border-box',
        border: '1px solid rgba(140, 110, 83, 0.15)',
        borderRadius: '2px',
        color: '#8C6E53',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Maison Monogram Emblem */}
      <svg
        width="38"
        height="38"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.65 }}
        aria-hidden="true"
      >
        <circle cx="22" cy="22" r="21" stroke="#8C6E53" strokeWidth="1" />
        <circle cx="22" cy="22" r="18" stroke="#8C6E53" strokeWidth="0.5" strokeDasharray="2 1" />
        <path d="M14 29 V18 L18.5 24.5 L22 20 L25.5 24.5 L30 18 V29" stroke="#8C6E53" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="22" cy="14" r="1.3" fill="#8C6E53" />
      </svg>

      <span
        style={{
          fontFamily: 'var(--editorial-font-body, "Be Vietnam Pro", sans-serif)',
          fontSize: '0.78rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 400,
          color: '#8C6E53',
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default EditorialImagePlaceholder;
