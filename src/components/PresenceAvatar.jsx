import React, { useState, useEffect } from 'react';
import { subscribeToPresence } from '../services/presenceService';
import './PresenceAvatar.css';

export const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'offline';
  const diff = Date.now() - timestamp;
  if (diff < 0) return 'active online';
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'offline just now';
  if (minutes < 60) return `offline ${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `offline ${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `offline ${days}d ago`;
};

const PresenceAvatar = ({ uid, avatarUrl, displayName, size = 44, showTooltip = true }) => {
  const [presence, setPresence] = useState({ online: false, lastSeen: null });

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToPresence(uid, (status) => {
      setPresence(status || { online: false, lastSeen: null });
    });
    return () => unsubscribe();
  }, [uid]);

  const initials = displayName?.substring(0, 2).toUpperCase() || 'OP';
  const lastSeenText = presence.online ? 'Online now' : formatLastSeen(presence.lastSeen);

  return (
    <div 
      className="cp-presence-avatar-wrapper"
      style={{ width: size, height: size }}
      title={showTooltip ? `@${displayName || uid} - ${lastSeenText}` : ''}
    >
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt="" 
          className="cp-presence-avatar-img"
          style={{ width: size, height: size }} 
        />
      ) : (
        <div 
          className="cp-presence-avatar-fallback"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {initials}
        </div>
      )}
      
      {/* Dynamic Status Indicator */}
      <span className={`cp-status-dot ${presence.online ? 'online' : 'offline'}`} />
    </div>
  );
};

export default PresenceAvatar;
