import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgb(0 0 0 / 0.4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="animate-fade-in"
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 20px 60px rgb(0 0 0 / 0.2)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
          {danger && (
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: '#fee2e2', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={18} color="#dc2626" />
            </div>
          )}
          <div>
            <h3 id="dialog-title" style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
              {title}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
