import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeNotifications, markAsRead, markAllAsRead } from '../services/notificationService';
import { auth } from '../services/firebase';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setLoading(true);
    const unsub = subscribeNotifications(currentUser.uid, (list) => {
      setNotifications(list);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const handleNotifClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(currentUser.uid, notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return;
    try {
      await markAllAsRead(currentUser.uid, notifications);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  // Color-coded categorization mappings
  const getCategoryClass = (type) => {
    switch (type) {
      case 'NEW_FOLLOWER':
      case 'REACTION':
      case 'FOLLOWER_SOLVED':
        return 'social';
      case 'BATTLE_INVITE':
      case 'BATTLE_RESULT':
        return 'battle';
      case 'CONTEST_REMINDER':
        return 'system';
      case 'BADGE_EARNED':
        return 'achievement';
      default:
        return 'system';
    }
  };

  if (loading) {
    return <div className="cp-notif-state">// DECODING TELEMETRY SIGNALS...</div>;
  }

  return (
    <div className="cp-notifications-page">
      
      {/* Header telemetry deck */}
      <div className="cp-notif-header">
        <div>
          <h1 className="cp-notif-title">// INCOMING TELEMETRY LOGS</h1>
          <p className="cp-notif-subtitle">View system achievements, follower solves, combat invitation matches, and dynamic replies.</p>
        </div>

        {notifications.some(n => !n.read) && (
          <button onClick={handleMarkAllRead} className="cp-notif-clear-btn">
            CLEAR ALL ALERTS // MARK READ
          </button>
        )}
      </div>

      {/* Notifications grid lists */}
      <div className="cp-notif-timeline">
        {notifications.length === 0 ? (
          <div className="cp-notif-empty">// NO SYSTEM ALERTS REGISTERED ON THIS TERMINAL</div>
        ) : (
          notifications.map(n => {
            const cat = getCategoryClass(n.type);
            const timeStr = new Date(n.createdAt).toLocaleString();

            return (
              <div
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className={`cp-notif-item cp-notif-cat--${cat} ${n.read ? 'read' : 'unread'}`}
              >
                {/* Visual badge/emoji matching type */}
                <span className="cp-notif-icon-badge">
                  {n.type === 'NEW_FOLLOWER' ? '👤' : 
                   n.type === 'REACTION' ? '🔥' : 
                   n.type === 'COMMENT_REPLY' ? '💬' : 
                   n.type === 'BATTLE_INVITE' ? '⚔️' : 
                   n.type === 'BATTLE_RESULT' ? '🏆' : 
                   n.type === 'BADGE_EARNED' ? '🎖️' : '🔔'}
                </span>

                <div className="cp-notif-body">
                  <p className="cp-notif-text">{n.text}</p>
                  <span className="cp-notif-time">⏳ {timeStr}</span>
                </div>

                {!n.read && <span className="cp-notif-unread-dot" />}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default Notifications;
