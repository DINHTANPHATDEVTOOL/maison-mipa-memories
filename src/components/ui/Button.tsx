// ==============================================================================
// Maison MIPA Memories — Button UI Primitive
// Variants: gold (primary), outline, ghost, danger
// ==============================================================================
import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'gold' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  gold: `
    background: linear-gradient(135deg, var(--mipa-gold) 0%, var(--mipa-gold-light) 100%);
    color: var(--mipa-espresso-dark);
    border: 1px solid transparent;
    box-shadow: var(--shadow-gold);
  `,
  outline: `
    background: transparent;
    color: var(--mipa-gold);
    border: 1px solid var(--mipa-border-active);
  `,
  ghost: `
    background: transparent;
    color: var(--mipa-text-soft);
    border: 1px solid transparent;
  `,
  danger: `
    background: var(--mipa-danger-soft);
    color: var(--mipa-danger);
    border: 1px solid rgba(239, 68, 68, 0.35);
  `,
  success: `
    background: var(--mipa-success-soft);
    color: var(--mipa-success);
    border: 1px solid rgba(16, 185, 129, 0.35);
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'padding: 0.375rem 0.875rem; font-size: 0.8125rem; gap: 0.375rem; border-radius: var(--radius-full);',
  md: 'padding: 0.625rem 1.375rem; font-size: 0.875rem; gap: 0.5rem; border-radius: var(--radius-full);',
  lg: 'padding: 0.75rem 1.75rem; font-size: 0.9375rem; gap: 0.5rem; border-radius: var(--radius-full);',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'gold',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  children,
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--mipa-font-body)',
        fontWeight: 500,
        letterSpacing: '0.01em',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition-normal)',
        width: fullWidth ? '100%' : undefined,
        opacity: isDisabled ? 0.55 : 1,
        outline: 'none',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...Object.fromEntries(
          variantStyles[variant]
            .trim()
            .split('\n')
            .map(l => l.trim().replace(/;$/, '').split(': '))
            .filter(([k]) => k)
            .map(([k, ...v]) => [
              k.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()),
              v.join(': ').trim(),
            ])
        ),
        ...Object.fromEntries(
          sizeStyles[size]
            .trim()
            .split(';')
            .filter(Boolean)
            .map(l => l.trim().split(': '))
            .filter(([k]) => k)
            .map(([k, ...v]) => [
              k.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()),
              v.join(': ').trim(),
            ])
        ),
        ...style,
      }}
      onMouseEnter={e => {
        if (!isDisabled) {
          const el = e.currentTarget;
          if (variant === 'gold') {
            el.style.transform = 'translateY(-2px)';
            el.style.boxShadow = '0 8px 28px rgba(198, 164, 95, 0.45)';
          } else if (variant === 'outline') {
            el.style.background = 'var(--mipa-gold-glow)';
            el.style.transform = 'translateY(-1px)';
          } else if (variant === 'ghost') {
            el.style.background = 'rgba(251, 246, 238, 0.07)';
          } else if (variant === 'danger') {
            el.style.background = 'rgba(239, 68, 68, 0.22)';
          } else if (variant === 'success') {
            el.style.background = 'rgba(16, 185, 129, 0.22)';
          }
          el.style.outline = 'none';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.transform = '';
        el.style.boxShadow = variant === 'gold' ? 'var(--shadow-gold)' : '';
        if (variant === 'outline') el.style.background = 'transparent';
        if (variant === 'ghost') el.style.background = 'transparent';
        if (variant === 'danger') el.style.background = 'var(--mipa-danger-soft)';
        if (variant === 'success') el.style.background = 'var(--mipa-success-soft)';
      }}
      onFocus={e => {
        e.currentTarget.style.boxShadow = 'var(--focus-ring)';
      }}
      onBlur={e => {
        e.currentTarget.style.boxShadow = variant === 'gold' ? 'var(--shadow-gold)' : '';
      }}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 13 : size === 'lg' ? 17 : 15} style={{ animation: 'spin 0.8s linear infinite' }} />
      ) : icon ? (
        icon
      ) : null}
      {children}
      {!loading && iconRight}
    </button>
  );
};

export default Button;
