import React from 'react';
import { X, ExternalLink, Edit3, Trash2, Calendar, RefreshCw } from 'lucide-react';
import type { Influencer } from '../models/influencer';
import { Avatar } from '../components/Avatar';
import { StatusBadge, TagPill } from '../components/Badge';
import { Button } from '../components/Button';

interface InfluencerDetailModalProps {
  influencer: Influencer;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatFollowers(raw: string | null, numeric: number | null): string {
  if (numeric) {
    if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (numeric >= 1_000) return `${(numeric / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(numeric);
  }
  return raw ?? 'Not available';
}

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
    <span style={{ color: '#9ca3af', fontWeight: 500, minWidth: 96, flexShrink: 0, fontSize: 12 }}>{label}</span>
    <span style={{ flex: 1, color: '#111827', wordBreak: 'break-word', lineHeight: 1.5 }}>{children}</span>
  </div>
);

export const InfluencerDetailModal: React.FC<InfluencerDetailModalProps> = ({
  influencer: inf,
  onClose,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar
              imageUrl={inf.profileImage}
              name={inf.displayName}
              username={inf.normalizedUsername}
              size={44}
            />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
                {inf.displayName}
                {inf.verified && (
                  <span style={{ fontSize: 11, background: '#e0eaff', color: '#4a5af0', padding: '1px 6px', borderRadius: 9999, fontWeight: 600 }}>
                    ✓ Verified
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 1 }}>@{inf.normalizedUsername}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8, background: '#f3f4f6',
              border: 'none', cursor: 'pointer', color: '#6b7280',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ paddingTop: 16 }}>
          {/* Status + actions row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <StatusBadge status={inf.status} />
            <div style={{ flex: 1 }} />
            <Button
              variant="secondary"
              size="sm"
              icon={<ExternalLink size={13} />}
              onClick={() => window.open(inf.profileUrl, '_blank', 'noopener,noreferrer')}
            >
              Instagram
            </Button>
          </div>

          {/* Profile stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            background: '#f9fafb',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 16,
            border: '1px solid #f3f4f6',
          }}>
            {[
              { label: 'Followers', value: formatFollowers(inf.followers, inf.followersNumeric) },
              { label: 'Following', value: inf.following ?? '—' },
              { label: 'Posts', value: inf.posts ?? '—' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginTop: 2 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div>
            <DetailRow label="Bio">
              <span style={{ color: inf.bio ? '#111827' : '#d1d5db', fontStyle: inf.bio ? 'normal' : 'italic' }}>
                {inf.bio ?? 'Not available'}
              </span>
            </DetailRow>
            {inf.category && <DetailRow label="Category">{inf.category}</DetailRow>}
            <DetailRow label="Profile URL">
              <a
                href={inf.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4a5af0', textDecoration: 'none', fontSize: 12 }}
              >
                {inf.profileUrl}
              </a>
            </DetailRow>
            <DetailRow label="Tags">
              {inf.tags.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {inf.tags.map((tag) => <TagPill key={tag} label={tag} />)}
                </div>
              ) : (
                <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>No tags</span>
              )}
            </DetailRow>
            <DetailRow label="Notes">
              <span style={{ color: inf.notes ? '#111827' : '#d1d5db', fontStyle: inf.notes ? 'normal' : 'italic', lineHeight: 1.6 }}>
                {inf.notes || 'No notes yet'}
              </span>
            </DetailRow>
            <DetailRow label="Added">
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280' }}>
                <Calendar size={12} />
                {formatDate(inf.createdAt)}
              </span>
            </DetailRow>
            <DetailRow label="Updated">
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280' }}>
                <RefreshCw size={12} />
                {formatDate(inf.updatedAt)}
              </span>
            </DetailRow>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={onDelete}>
            Delete
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          <Button variant="primary" size="sm" icon={<Edit3 size={13} />} onClick={onEdit}>
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
};
