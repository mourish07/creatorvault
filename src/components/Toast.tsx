import React from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const TOAST_STYLES: Record<ToastType, { bg: string; color: string; icon: React.ReactNode }> = {
  success: {
    bg: '#d1fae5',
    color: '#065f46',
    icon: <CheckCircle size={16} />,
  },
  error: {
    bg: '#fee2e2',
    color: '#991b1b',
    icon: <XCircle size={16} />,
  },
  warning: {
    bg: '#fef3c7',
    color: '#92400e',
    icon: <AlertCircle size={16} />,
  },
  info: {
    bg: '#dbeafe',
    color: '#1e40af',
    icon: <Info size={16} />,
  },
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const config = TOAST_STYLES[toast.type];

  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className="animate-slide-up"
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: config.bg,
        color: config.color,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)',
        minWidth: 240,
        maxWidth: 360,
      }}
    >
      <span style={{ flexShrink: 0 }}>{config.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.7,
          padding: 2,
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'bottom-right' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'bottom-right',
}) => {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: 16, right: 16 },
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-center': { bottom: 16, left: '50%', transform: 'translateX(-50%)' },
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        ...positionStyles[position],
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const addToast = React.useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    []
  );

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
