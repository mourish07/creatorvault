import React from 'react';
import { X, Save } from 'lucide-react';
import type { Influencer, InfluencerStatus } from '../models/influencer';
import { ALL_STATUSES } from '../models/influencer';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { TagInput } from '../components/TagInput';

interface InfluencerEditModalProps {
  influencer: Influencer;
  onClose: () => void;
  onSave: (updates: Partial<Influencer>) => Promise<void>;
}

export const InfluencerEditModal: React.FC<InfluencerEditModalProps> = ({
  influencer,
  onClose,
  onSave,
}) => {
  const [displayName, setDisplayName] = React.useState(
    influencer.displayName
  );
  const [status, setStatus] = React.useState<InfluencerStatus>(
    influencer.status
  );
  const [tags, setTags] = React.useState<string[]>(influencer.tags);
  const [notes, setNotes] = React.useState(influencer.notes);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);

    try {
      await onSave({
        displayName,
        status,
        tags,
        notes,
      });
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    displayName !== influencer.displayName ||
    status !== influencer.status ||
    JSON.stringify(tags) !== JSON.stringify(influencer.tags) ||
    notes !== influencer.notes;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              imageUrl={influencer.profileImage}
              name={influencer.displayName}
              username={influencer.normalizedUsername}
              size={36}
            />

            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                Edit Creator
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: '#6b7280',
                }}
              >
                @{influencer.normalizedUsername}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#f3f4f6',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Display name */}
          <div className="form-group">
            <label className="form-label">Display Name</label>

            <input
              type="text"
              className="form-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Creator's display name"
            />
          </div>

          {/* Username (read-only) */}
          <div className="form-group">
            <label className="form-label">Instagram Username</label>

            <input
              type="text"
              className="form-input"
              value={`@${influencer.normalizedUsername}`}
              readOnly
              style={{
                background: '#f9fafb',
                color: '#9ca3af',
                cursor: 'default',
              }}
            />

            <span
              style={{
                fontSize: 11,
                color: '#9ca3af',
              }}
            >
              Username cannot be changed (used as unique identifier)
            </span>
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label">Pipeline Status</label>

            <select
              className="form-select"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as InfluencerStatus)
              }
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">Tags</label>

            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Add tags..."
            />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes</label>

            <textarea
              className="form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this creator..."
              rows={4}
            />
          </div>

          {/* Captured Instagram Data */}
          <div
            style={{
              padding: 14,
              background: '#f9fafb',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#111827',
                marginBottom: 12,
              }}
            >
              Captured Instagram Data
            </div>

            {/* Bio */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6b7280',
                  marginBottom: 4,
                }}
              >
                Bio
              </div>

              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: '#374151',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  padding: '8px 10px',
                  minHeight: 36,
                }}
              >
                {influencer.bio || 'No bio available'}
              </div>
            </div>

            {/* Profile statistics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 12,
              }}
            >
              {/* Followers */}
              <div
                style={{
                  padding: 10,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: '#6b7280',
                    marginBottom: 3,
                  }}
                >
                  Followers
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#111827',
                  }}
                >
                  {influencer.followers || 'Not available'}
                </div>
              </div>

              {/* Following */}
              <div
                style={{
                  padding: 10,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: '#6b7280',
                    marginBottom: 3,
                  }}
                >
                  Following
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#111827',
                  }}
                >
                  {influencer.following || 'Not available'}
                </div>
              </div>

              {/* Posts */}
              <div
                style={{
                  padding: 10,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: '#6b7280',
                    marginBottom: 3,
                  }}
                >
                  Posts
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#111827',
                  }}
                >
                  {influencer.posts || 'Not available'}
                </div>
              </div>
            </div>

            {/* Verified */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '9px 10px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 7,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: '#6b7280',
                }}
              >
                Verified account
              </span>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#374151',
                }}
              >
                {influencer.verified ? 'Yes' : 'No'}
              </span>
            </div>

            {/* Profile URL */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6b7280',
                  marginBottom: 4,
                }}
              >
                Instagram Profile
              </div>

              <div
                title={influencer.profileUrl}
                style={{
                  fontSize: 11,
                  color: '#374151',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  padding: '8px 10px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {influencer.profileUrl || 'Not available'}
              </div>
            </div>

            {/* Read-only explanation */}
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: '#9ca3af',
              }}
            >
              These details were captured from Instagram and are read-only.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Save size={13} />}
            onClick={handleSave}
            loading={saving}
            disabled={!isDirty || saving}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};