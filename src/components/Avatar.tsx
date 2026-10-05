import React from 'react';
import { getAvatarColor, getInitials } from '../services/influencerService';

interface AvatarProps {
  imageUrl?: string | null;
  name: string;
  username?: string;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  imageUrl,
  name,
  username = name,
  size = 40,
  className = '',
}) => {
  const [imgError, setImgError] = React.useState(false);
  const initials = getInitials(name) || username.slice(0, 2).toUpperCase();
  const bgColor = getAvatarColor(username);

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={className}
        onError={() => setImgError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          background: '#f3f4f6',
        }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={className}
      aria-label={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 600,
        fontSize: size * 0.38,
        flexShrink: 0,
        letterSpacing: '-0.02em',
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  );
};
