import React from 'react';
import type { InfluencerStatus } from '../models/influencer';
import { STATUS_CONFIG } from '../models/influencer';

interface StatusBadgeProps {
  status: InfluencerStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: 9999,
        fontSize: size === 'sm' ? 11 : 12,
        fontWeight: 500,
        color: config.color,
        background: config.bg,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      {config.label}
    </span>
  );
};

interface TagPillProps {
  label: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export const TagPill: React.FC<TagPillProps> = ({ label, onRemove, size = 'md' }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: size === 'sm' ? '2px 8px' : '3px 10px',
      borderRadius: 9999,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 500,
      color: '#4a5af0',
      background: '#e0eaff',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
    {onRemove && (
      <button
        onClick={onRemove}
        title={`Remove ${label}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#6366f1',
          padding: 0,
          lineHeight: 1,
          fontSize: 14,
          width: 14,
          height: 14,
        }}
        aria-label={`Remove tag ${label}`}
      >
        ×
      </button>
    )}
  </span>
);
