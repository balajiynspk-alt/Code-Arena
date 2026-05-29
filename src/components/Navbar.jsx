import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auth, db, rtdb } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { acceptChallenge, declineChallenge } from '../services/battleService';
import { subscribeConversations } from '../services/dmService';
import { subscribeNotifications, markAllAsRead } from '../services/notificationService';
import logoImg from '../assets/logo.png';
import './Navbar.css';

import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Problems',  path: '/problems' },
  { label: 'Search Users', path: '/search' },
  { label: 'College Guild', path: '/guild' },
  { label: 'Standings', path: '/leaderboard' },
  { label: 'AI Whiteboard', path: '/whiteboard' },
  { label: 'Whiteboards Library', path: '/whiteboard/library' },
  { label: 'Skill Tree', path: '/skills' },
  { label: 'Courses',   path: '/courses' },
  { label: 'Contest',   path: '/contest' },
  { label: 'Theatre',    path: '/theatre' },
  { label: 'Daily Boss', path: '/boss' },
  { label: 'Interview',  path: '/interview' },
  { label: 'Constellations', path: '/constellation' },
  { label: 'Watch Live', path: '/watch' },
  { label: 'Communities', path: '/communities' },
  { label: 'Realtime Chat', path: '/chat' },
  { label: 'Quantum AI', path: '/quantum' },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [activeChallenge, setActiveChallenge] = useState(null);
  const [unreadDMs, setUnreadDMs] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setUnreadDMs(0);
      return;
    }
    const unsub = subscribeConversations((list) => {
      const total = list.reduce((acc, c) => acc + (c.unreadCount?.[currentUser.uid] || 0), 0);
      setUnreadDMs(total);
    });
    return () => unsub();
  }, [currentUser]);

  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const unsub = subscribeNotifications(currentUser.uid, (list) => {
      setNotifications(list);
    });
    return () => unsub();
  }, [currentUser]);

  const unreadNotifs = notifications.filter(n => !n.read).length;

  const handleToggleNotifDropdown = async () => {
    const nextState = !showNotifDropdown;
    setShowNotifDropdown(nextState);
    if (nextState && unreadNotifs > 0) {
      await markAllAsRead(currentUser.uid, notifications);
    }
  };

  const { data: userData } = useQuery({
    queryKey: ['navUserData', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return null;
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!currentUser,
    staleTime: 60_000,
  });

  // Listen for incoming 1v1 battles in Realtime DB
  useEffect(() => {
    if (!currentUser) {
      setActiveChallenge(null);
      return;
    }

    const battlesRef = ref(rtdb, 'battles');
    const pendingQuery = query(battlesRef, orderByChild('opponent'), equalTo(currentUser.uid));

    const unsubscribe = onValue(pendingQuery, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const pendingKey = Object.keys(data).find(key => data[key].status === 'pending');
        if (pendingKey) {
          setActiveChallenge(data[pendingKey]);
          return;
        }
      }
      setActiveChallenge(null);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAccept = async () => {
    if (!activeChallenge) return;
    try {
      await acceptChallenge(activeChallenge.battleId, activeChallenge.difficulty);
      navigate(`/battle/${activeChallenge.battleId}`);
      setActiveChallenge(null);
    } catch (error) {
      console.error("Error accepting challenge:", error);
    }
  };

  const handleDecline = async () => {
    if (!activeChallenge) return;
    try {
      await declineChallenge(activeChallenge.battleId);
      setActiveChallenge(null);
    } catch (error) {
      console.error("Error declining challenge:", error);
    }
  };

  return (
    <nav className="cp-navbar">
      {/* Logo */}
      <Link to="/" className="cp-logo">
        <img src={logoImg} alt="CodeArena" className="cp-logo-img" />
      </Link>

      {/* Nav Links */}
      <ul className="cp-nav-links">
        {NAV_LINKS.map(({ label, path }) => (
          <li key={path}>
            <Link
              to={path}
              className={`cp-nav-link ${location.pathname.startsWith(path) ? 'active' : ''}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Right side */}
      <div className="cp-nav-right">
        {currentUser ? (
          <>
            {/* Streak */}
            <div className="cp-streak" title="Current Streak">
              <span className="cp-streak-icon">🔥</span>
              <span className="cp-streak-count">{userData?.streak ?? 0}</span>
            </div>

            {/* Coins */}
            <div className="cp-coins" title="Coins">
              <span className="cp-coins-icon">🪙</span>
              <span className="cp-coins-count">{userData?.coinsBalance ?? 0}</span>
            </div>

            {/* Direct Messages */}
            <Link to="/messages" className="cp-nav-dm-link" title="Direct Transmissions">
              <span className="cp-nav-dm-icon">✉️</span>
              {unreadDMs > 0 && <span className="cp-nav-dm-badge">{unreadDMs}</span>}
            </Link>

            {/* Notification Bell */}
            <div className="cp-nav-notif-container" style={{ position: 'relative' }}>
              <button 
                onClick={handleToggleNotifDropdown} 
                className="cp-nav-notif-btn" 
                title="System Notifications"
              >
                <span className="cp-nav-notif-icon">🔔</span>
                {unreadNotifs > 0 && (
                  <span className="cp-nav-notif-badge">
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </span>
                )}
              </button>

              {/* Dropdown menu */}
              {showNotifDropdown && (
                <div className="cp-nav-notif-dropdown">
                  <div className="cp-dropdown-header">
                    <span>// SYSTEM ALERTS</span>
                    <button 
                      onClick={async () => {
                        await markAllAsRead(currentUser.uid, notifications);
                        setShowNotifDropdown(false);
                      }} 
                      className="cp-dropdown-clear"
                    >
                      MARK ALL READ
                    </button>
                  </div>
                  
                  <div className="cp-dropdown-list">
                    {notifications.length === 0 ? (
                      <div className="cp-dropdown-empty">// TIMELINE CLEAR</div>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            setShowNotifDropdown(false);
                            if (n.link) navigate(n.link);
                          }}
                          className={`cp-dropdown-item ${n.read ? 'read' : 'unread'}`}
                        >
                          <span style={{ fontSize: '0.9rem' }}>
                            {n.type === 'NEW_FOLLOWER' ? '👤' : 
                             n.type === 'REACTION' ? '🔥' : 
                             n.type === 'COMMENT_REPLY' ? '💬' : 
                             n.type === 'BATTLE_INVITE' ? '⚔️' : 
                             n.type === 'BATTLE_RESULT' ? '🏆' : 
                             n.type === 'BADGE_EARNED' ? '🎖️' : '🔔'}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <p className="cp-dropdown-text">{n.text}</p>
                            <span className="cp-dropdown-time">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Link 
                    to="/notifications" 
                    onClick={() => setShowNotifDropdown(false)} 
                    className="cp-dropdown-see-all"
                  >
                    SEE ALL SYSTEM ALERTS →
                  </Link>
                </div>
              )}
            </div>

            {/* Profile */}
            <Link to={`/profile/${currentUser.uid}`} className="cp-profile-btn">
              {userData?.displayName?.substring(0, 2).toUpperCase() ?? 'ME'}
            </Link>
          </>
        ) : (
          <Link to="/login" className="cp-login-btn">
            <span>LOGIN</span>
          </Link>
        )}
      </div>

      {/* 1v1 Battle Toast Alert Overlay */}
      {activeChallenge && (
        <div className="cp-battle-notification-overlay">
          <div className="cp-battle-notification-header">
            <span className="cp-battle-notification-icon">⚔️</span>
            <h4 className="cp-battle-notification-title">INCOMING BATTLE</h4>
          </div>
          <p className="cp-battle-notification-body">
            <strong>{activeChallenge.challengerName}</strong> (Rating: {activeChallenge.challengerRating}) has challenged you to a 1v1 Battle!
            <br />
            Difficulty: <strong style={{ color: '#FFAA00' }}>{activeChallenge.difficulty.toUpperCase()}</strong>
          </p>
          <div className="cp-battle-notification-actions">
            <button className="cp-battle-notification-btn cp-battle-notification-btn--accept" onClick={handleAccept}>
              ACCEPT
            </button>
            <button className="cp-battle-notification-btn cp-battle-notification-btn--decline" onClick={handleDecline}>
              DECLINE
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
