import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}) => {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: '#4a5af0',
      color: '#fff',
      border: 'none',
    },
    secondary: {
      background: '#fff',
      color: '#374151',
      border: '1px solid #e5e7eb',
    },
    ghost: {
      background: 'transparent',
      color: '#4b5563',
      border: 'none',
    },
    danger: {
      background: '#fee2e2',
      color: '#dc2626',
      border: '1px solid #fecaca',
    },
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: 12, borderRadius: 6 },
    md: { padding: '8px 16px', fontSize: 13, borderRadius: 8 },
    lg: { padding: '10px 20px', fontSize: 14, borderRadius: 8 },
  };

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        fontFamily: 'inherit',
        lineHeight: 1.4,
        ...styles[variant],
        ...sizes[size],
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <svg
          width="14" height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : icon ? (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
