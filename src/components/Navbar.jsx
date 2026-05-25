import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auth, db, rtdb } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { acceptChallenge, declineChallenge } from '../services/battleService';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Problems',  path: '/problems' },
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
  { label: 'Quantum AI', path: '/quantum' },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const [activeChallenge, setActiveChallenge] = useState(null);

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
        <span className="cp-logo-code">CODE</span>
        <span className="cp-logo-arena">ARENA</span>
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
