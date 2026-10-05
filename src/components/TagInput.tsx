import React from 'react';
import { X, Plus } from 'lucide-react';
import { SUGGESTED_TAGS } from '../models/influencer';
import { TagPill } from './Badge';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Add tag...',
  maxTags = 10,
}) => {
  const [input, setInput] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredSuggestions = SUGGESTED_TAGS.filter(
    (tag) =>
      !tags.includes(tag) &&
      (input === '' || tag.toLowerCase().includes(input.toLowerCase()))
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return;
    onChange([...tags, trimmed]);
    setInput('');
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '8px 10px',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          minHeight: 40,
          cursor: 'text',
          background: '#fff',
          transition: 'border-color 150ms',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <TagPill key={tag} label={tag} onRemove={() => removeTag(tag)} />
        ))}
        {tags.length < maxTags && (
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={tags.length === 0 ? placeholder : ''}
            style={{
              flex: 1,
              minWidth: 80,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              background: 'transparent',
              color: '#111827',
            }}
          />
        )}
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgb(0 0 0 / 0.12)',
            zIndex: 50,
            maxHeight: 180,
            overflowY: 'auto',
            padding: 6,
          }}
        >
          <div style={{ fontSize: 11, color: '#9ca3af', padding: '4px 8px 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Suggestions
          </div>
          {filteredSuggestions.slice(0, 8).map((tag) => (
            <button
              key={tag}
              onMouseDown={(e) => { e.preventDefault(); addTag(tag); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: '#374151',
                textAlign: 'left',
                transition: 'background 100ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <Plus size={12} style={{ color: '#9ca3af', flexShrink: 0 }} />
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
