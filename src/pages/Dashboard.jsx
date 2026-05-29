import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auth, db } from '../services/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { getProblems } from '../services/problemService';
import { getHomeFeed, toggleReaction } from '../services/feedService';
import FlowTracker from '../components/FlowTracker';
import SolutionCard from '../components/SolutionCard';
import { createBattleInvite } from '../services/battleService';
import ChallengeModal from '../components/ChallengeModal';
import PresenceAvatar from '../components/PresenceAvatar';
import { searchUsers } from '../services/searchService';
import './Dashboard.css';

const StatCard = ({ label, value, color, icon }) => (
  <div className={`cp-stat-card cp-stat-card--${color}`}>
    <div className="cp-stat-accent" />
    <div className="cp-stat-icon">{icon}</div>
    <div className={`cp-stat-value cp-stat-value--${color}`}>{value ?? '—'}</div>
    <div className="cp-stat-label">{label}</div>
  </div>
);

const DifficultyBadge = ({ difficulty }) => {
  const map = {
    Easy:   'easy',
    Medium: 'medium',
    Hard:   'hard',
  };
  return (
    <span className={`cp-diff-badge cp-diff-badge--${map[difficulty] ?? 'easy'}`}>
      {difficulty}
    </span>
  );
};

const Dashboard = () => {
  const currentUser = auth.currentUser;

  /* ── Follower Activity Feed States & Logic ── */
  const [feedItems, setFeedItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'solutions' | 'problems'
  const [sharedSolutions, setSharedSolutions] = useState([]);
  const [loadingSolutions, setLoadingSolutions] = useState(false);

  const loadSolutions = async () => {
    setLoadingSolutions(true);
    try {
      const { getSharedSolutions } = await import('../services/solutionShareService');
      const list = await getSharedSolutions();
      setSharedSolutions(list);
    } catch (err) {
      console.error("Failed to load public shared solutions:", err);
    } finally {
      setLoadingSolutions(false);
    }
  };

  useEffect(() => {
    loadSolutions();
    window.addEventListener('mock_solution_update', loadSolutions);
    return () => window.removeEventListener('mock_solution_update', loadSolutions);
  }, []);

  const [loadingFeed, setLoadingFeed] = useState(false);

  const loadFeed = async (nextCursor = null) => {
    if (!currentUser) return;
    setLoadingFeed(true);
    try {
      const res = await getHomeFeed(currentUser.uid, nextCursor, 5); // load 5 for clean scrolling
      if (nextCursor) {
        setFeedItems(prev => [...prev, ...res.items]);
      } else {
        setFeedItems(res.items);
      }
      setCursor(res.lastVisible);
    } catch (e) {
      console.error("Error loading feed:", e);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadFeed();
    }
  }, [currentUser]);

  const [trendingTags, setTrendingTags] = useState([]);

  // Battle Challenge & Presence States
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challengeTargetName, setChallengeTargetName] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const list = await searchUsers();
        // Exclude current user from the list
        const filtered = list.filter(u => u.username !== currentUser?.displayName && u.uid !== currentUser?.uid).slice(0, 4);
        setOnlineUsers(filtered);
      } catch (err) {
        console.error("Failed to load online operators:", err);
      }
    };
    if (currentUser) {
      fetchOnline();
    }
  }, [currentUser]);

  const triggerChallenge = (opponentUsername) => {
    setChallengeTargetName(opponentUsername);
    setIsChallengeModalOpen(true);
  };

  const handleInitiateChallenge = async ({ difficulty, timeLimit }) => {
    if (!currentUser || !challengeTargetName) return;
    try {
      await createBattleInvite(
        currentUser.uid,
        currentUser.displayName || 'Operator',
        challengeTargetName,
        challengeTargetName, // opponentDisplayName
        difficulty,
        timeLimit
      );
      alert(`⚔️ DUEL TRANSMISSION PROTOCOL: Challenge sent successfully to @${challengeTargetName}!`);
      setIsChallengeModalOpen(false);
    } catch (err) {
      console.error("Challenge launch failure:", err);
      alert("Failed to send challenge invite: " + err.message);
    }
  };
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const { getTrendingTags } = await import('../services/tagService');
        const list = await getTrendingTags();
        setTrendingTags(list);
      } catch (err) {
        console.error("Failed to load trending tags:", err);
      }
    };
    fetchTrending();
  }, []);

  const handleReact = async (itemId, rxType) => {
    if (!currentUser) return;
    try {
      const updatedCounts = await toggleReaction(itemId, rxType, currentUser.uid);
      if (updatedCounts) {
        setFeedItems(prev => prev.map(item => {
          if (item.id === itemId) {
            const rxUsers = item.reactionUsers || { fire: [], celebrate: [], helpful: [], clap: [] };
            const currentUsersList = rxUsers[rxType] || [];
            const hasReacted = currentUsersList.includes(currentUser.uid);
            
            const updatedUsers = hasReacted
              ? currentUsersList.filter(uid => uid !== currentUser.uid)
              : [...currentUsersList, currentUser.uid];

            return {
              ...item,
              reactions: updatedCounts,
              reactionUsers: {
                ...rxUsers,
                [rxType]: updatedUsers
              }
            };
          }
          return item;
        }));
      }
    } catch (e) {
      console.error("Reaction failed:", e);
    }
  };

  /* ── User doc ─────────────────────────────────────────── */
  const { data: userData } = useQuery({
    queryKey: ['dashUser', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return null;
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      return snap.exists() ? snap.data() : {};
    },
    enabled: !!currentUser,
  });

  /* ── Problems list ────────────────────────────────────── */
  const { data: problemsData, isLoading: problemsLoading } = useQuery({
    queryKey: ['dashProblems'],
    queryFn: () => getProblems({}, null),
  });

  /* ── Recent submissions ───────────────────────────────── */
  const { data: recentSubs = [] } = useQuery({
    queryKey: ['dashSubs', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return [];
      try {
        const q = query(
          collection(db, 'submissions'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch { return []; }
    },
    enabled: !!currentUser,
  });

  const solvedSet = new Set(userData?.solvedProblems ?? []);
  const problems  = problemsData?.problems ?? [];

  return (
    <div className="cp-dashboard">

      {/* ── Page heading ────────────────────────────────── */}
      <div className="cp-dash-header">
        <h1 className="cp-dash-title">
          <span className="cp-t-pink">OPERATOR</span>{' '}
          <span className="cp-t-green">DASHBOARD</span>
        </h1>
        <p className="cp-dash-sub">
          // SYSTEM STATUS: <span className="cp-t-green">ONLINE</span>
        </p>
      </div>

      {/* ── Stat grid ───────────────────────────────────── */}
      <div className="cp-stats-grid">
        <StatCard
          label="PROBLEMS SOLVED"
          value={userData?.solvedProblems?.length ?? 0}
          color="pink"
          icon="⚡"
        />
        <StatCard
          label="RATING"
          value={userData?.rating ?? 1200}
          color="pink"
          icon="📊"
        />
        <StatCard
          label="STREAK"
          value={`${userData?.streak ?? 0} DAYS`}
          color="green"
          icon="🔥"
        />
        <StatCard
          label="COINS"
          value={userData?.coinsBalance ?? 0}
          color="green"
          icon="🪙"
        />
      </div>

      <FlowTracker />

      {/* ── 20 Cyberpunk Features Showcase Hub ── */}
      <section className="cp-showcase-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 45, 120, 0.2)', paddingBottom: '12px' }}>
          <h2 className="cp-flow-section-title" style={{ color: '#FF2D78', textShadow: '0 0 10px rgba(255, 45, 120, 0.3)' }}>
            // CODE ARENA COMPREHENSIVE 20-FEATURE showcase
          </h2>
          <span style={{ fontSize: '0.72rem', color: '#00FF88', letterSpacing: '1px' }}>
            OPERATIONAL STATUS: HIGH-FIDELITYFALLBACKS ENABLED
          </span>
        </div>
        <div className="cp-showcase-grid">
          {[
            { id: 1, title: 'Problems Library', desc: 'Browse and filter all algorithmic challenges.', path: '/problems' },
            { id: 2, title: 'Code Editor & Sandbox', desc: 'Monaco coding console with instant unit tests.', path: '/problems/two-sum' },
            { id: 3, title: '1v1 Matchmaking Arena', desc: 'Speed-coding battle lobby with active simulation.', path: '/contest' },
            { id: 4, title: 'Interactive Whiteboard Canvas', desc: 'Architecture flowchart canvas linked with editor.', path: '/whiteboard' },
            { id: 5, title: 'Algorithmic Flowchart Library', desc: 'Browse customized architecture models by community creators.', path: '/whiteboard/library' },
            { id: 6, title: 'Constellation Skills Map', desc: 'Visualize dynamic developer skill path progression.', path: '/constellation' },
            { id: 7, title: 'Interactive Courses Deck', desc: 'Learn algorithms systematically with embedded quizzes.', path: '/courses' },
            { id: 8, title: 'Interactive Technical Interview', desc: 'Simulate high-tech technical mock interviews.', path: '/interview' },
            { id: 9, title: 'Arena Boss Battles', desc: 'Combat challenges matching special code puzzles.', path: '/boss' },
            { id: 10, title: 'Pair Programming Sandbox', desc: 'Simulated real-time collaborative workspace.', path: '/pair/default-room' },
            { id: 11, title: 'Multi-Agent Code Multiverse', desc: 'Explore diverse solution paths dynamically.', path: '/multiverse/two-sum' },
            { id: 12, title: 'Quantum Problem Generator', desc: 'Generate customized challenges using template criteria.', path: '/quantum' },
            { id: 13, title: 'Spectator Live Watch Stream', desc: 'Watch coders battle with active commentator reactions.', path: '/watch' },
            { id: 14, title: 'Algorithmic Replay Theatre', desc: 'Watch recorded code histories run step-by-step.', path: '/theatre' },
            { id: 15, title: 'Guild & Clan Deck', desc: 'Gather your coder squad and climb faction leagues.', path: '/guild' },
            { id: 16, title: 'Global Leaderboards', desc: 'Climb the ELO rankings across standard brackets.', path: '/leaderboard' },
            { id: 17, title: 'Emotion-Responsive Badge', desc: 'Floating feedback showing real-time developer status (bottom-right).', path: '/dashboard' },
            { id: 18, title: 'Practice Daily Streaks', desc: 'Dynamic practices logger maintaining streaks.', path: '/dashboard' },
            { id: 19, title: 'High-Fidelity Code Replay', desc: 'Review correct historical code submissions.', path: '/dashboard' },
            { id: 20, title: 'Offline Fallback Architecture', desc: 'Seamless offline fallbacks across all core modules.', path: '/dashboard' }
          ].map(feature => (
            <div key={feature.id} className="cp-showcase-card">
              <div className="cp-showcase-card-header">
                <span className="cp-showcase-num">FEAT #{feature.id.toString().padStart(2, '0')}</span>
                <span className="cp-showcase-status">ACTIVE</span>
              </div>
              <h4 className="cp-showcase-title">{feature.title.toUpperCase()}</h4>
              <p className="cp-showcase-desc">{feature.desc}</p>
              <Link to={feature.path} className="cp-showcase-launch-btn">
                LAUNCH FEATURE ⚡
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Main grid: table + sidebar ───────────────────── */}
      <div className="cp-dash-main">

        {/* Double-Tab Operator Feed and Problems Panel */}
        <section className="cp-section">
          
          <div className="cp-section-header" style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px', marginBottom: '16px' }}>
            <button 
              onClick={() => setActiveTab('feed')} 
              className={`cp-tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'Orbitron',
                fontSize: '0.82rem',
                color: activeTab === 'feed' ? 'var(--cyber-pink)' : '#666688',
                borderBottom: activeTab === 'feed' ? '2px solid var(--cyber-pink)' : 'none',
                paddingBottom: '8px',
                cursor: 'pointer',
                letterSpacing: '1px',
                fontWeight: 'bold',
                textShadow: activeTab === 'feed' ? '0 0 8px rgba(255, 45, 120, 0.4)' : 'none'
              }}
            >
              // OPERATOR FEED
            </button>
            <button 
              onClick={() => setActiveTab('solutions')} 
              className={`cp-tab-btn ${activeTab === 'solutions' ? 'active' : ''}`}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'Orbitron',
                fontSize: '0.82rem',
                color: activeTab === 'solutions' ? 'var(--cyber-pink)' : '#666688',
                borderBottom: activeTab === 'solutions' ? '2px solid var(--cyber-pink)' : 'none',
                paddingBottom: '8px',
                cursor: 'pointer',
                letterSpacing: '1px',
                fontWeight: 'bold',
                textShadow: activeTab === 'solutions' ? '0 0 8px rgba(255, 45, 120, 0.4)' : 'none'
              }}
            >
              // SHARED SOLUTIONS
            </button>
            <button 
              onClick={() => setActiveTab('problems')} 
              className={`cp-tab-btn ${activeTab === 'problems' ? 'active' : ''}`}
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'Orbitron',
                fontSize: '0.82rem',
                color: activeTab === 'problems' ? 'var(--cyber-green)' : '#666688',
                borderBottom: activeTab === 'problems' ? '2px solid var(--cyber-green)' : 'none',
                paddingBottom: '8px',
                cursor: 'pointer',
                letterSpacing: '1px',
                fontWeight: 'bold',
                textShadow: activeTab === 'problems' ? '0 0 8px rgba(0, 255, 136, 0.4)' : 'none'
              }}
            >
              // PROBLEMS SET
            </button>
          </div>

          {/* TAB 1: Real-Time Activity Feed */}
          {activeTab === 'feed' && (
            <div className="cp-feed-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {feedItems.length === 0 && !loadingFeed && (
                <p style={{ fontSize: '0.72rem', color: '#666688', textAlign: 'center', padding: '30px' }}>
                  // NO UPLINK ACTIVITY FROM FOLLOWED OPERATORS YET.
                </p>
              )}

              {feedItems.map(item => {
                const borderMap = {
                  SOLVED: 'var(--cyber-green)',
                  BATTLE_WIN: 'var(--cyber-pink)',
                  CONTEST: 'var(--cyber-gold)',
                  COURSE: '#00A2FF',
                  STREAK: '#FF5500'
                };
                const borderColor = borderMap[item.type] || 'rgba(255,255,255,0.1)';
                
                // Get relative timestamp
                const relTime = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div 
                    key={item.id} 
                    className="cp-feed-card"
                    style={{
                      background: '#0F0F1A',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderLeft: `4px solid ${borderColor}`,
                      borderRadius: '4px',
                      padding: '16px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div 
                          style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            background: borderColor + '22', 
                            color: borderColor,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: '0.68rem',
                            fontWeight: 'bold',
                            border: `1px solid ${borderColor}`
                          }}
                        >
                          {item.username?.substring(0, 2).toUpperCase() || 'OP'}
                        </div>
                        <Link 
                          to={`/profile/${item.username}`} 
                          style={{ 
                            fontFamily: 'Orbitron', 
                            fontSize: '0.78rem', 
                            color: '#FFF', 
                            textDecoration: 'none', 
                            fontWeight: 'bold' 
                          }}
                        >
                          {item.username}
                        </Link>
                        {currentUser && item.username !== currentUser.displayName && (
                          <button
                            onClick={() => triggerChallenge(item.username)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--cyber-pink)',
                              borderRadius: '4px',
                              color: 'var(--cyber-pink)',
                              padding: '2px 8px',
                              fontSize: '0.52rem',
                              fontFamily: 'Share Tech Mono',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginLeft: '8px',
                              boxShadow: '0 0 6px rgba(255, 45, 120, 0.1)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={e => {
                              e.target.style.background = 'rgba(255, 45, 120, 0.1)';
                              e.target.style.boxShadow = '0 0 10px rgba(255, 45, 120, 0.3)';
                            }}
                            onMouseLeave={e => {
                              e.target.style.background = 'transparent';
                              e.target.style.boxShadow = '0 0 6px rgba(255, 45, 120, 0.1)';
                            }}
                          >
                            ⚔️ CHALLENGE
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '0.62rem', color: '#666688', fontFamily: 'Share Tech Mono' }}>
                        ⏳ {relTime}
                      </span>
                    </div>

                    {/* Content highlighted payload description */}
                    <div style={{ fontSize: '0.76rem', color: '#B4B4D0', lineHeight: '1.4' }}>
                      {(() => {
                        const { username, type, payload } = item;
                        switch (type) {
                          case 'SOLVED':
                            return (
                              <span>
                                solved <Link to={`/problems/${payload.problemId || 'two-sum'}`} style={{ color: 'var(--cyber-green)', textDecoration: 'none', fontWeight: 'bold' }}>{payload.problem?.toUpperCase()}</Link> in <span style={{ color: '#00A2FF', fontFamily: 'Share Tech Mono' }}>{payload.time}</span> · <span style={{ color: 'var(--cyber-gold)', fontFamily: 'Share Tech Mono' }}>{payload.lang?.toUpperCase()}</span> · <span style={{ color: '#8888AA' }}>{payload.runtime}</span>
                              </span>
                            );
                          case 'BATTLE_WIN':
                            return (
                              <span>
                                won speed 1v1 battle against <span style={{ color: 'var(--cyber-pink)', fontWeight: 'bold' }}>{payload.opponent}</span> · <span style={{ color: 'var(--cyber-green)', fontWeight: 'bold', fontFamily: 'Share Tech Mono' }}>+{payload.rating} ELO RATING</span>
                              </span>
                            );
                          case 'CONTEST':
                            return (
                              <span>
                                completed arena clash, ranking <span style={{ color: 'var(--cyber-gold)', fontWeight: 'bold', fontFamily: 'Share Tech Mono' }}>#{payload.rank}</span> inside <span style={{ color: '#00A2FF', fontWeight: 'bold' }}>{payload.contest}</span>
                              </span>
                            );
                          case 'COURSE':
                            return (
                              <span>
                                successfully compiled curriculum: <span style={{ color: '#B57CFF', fontWeight: 'bold' }}>{payload.course}</span>
                              </span>
                            );
                          case 'STREAK':
                            return (
                              <span>
                                reached streak record: <span style={{ color: '#FF5500', fontWeight: 'bold', fontFamily: 'Share Tech Mono' }}>{payload.n}-DAY CONTINUOUS TELEMETRY STREAK</span> 🔥
                              </span>
                            );
                          default:
                            return <span>Logged transaction event.</span>;
                        }
                      })()}
                    </div>

                    {/* Actions and reactions row */}
                    <div 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        borderTop: '1px solid rgba(255, 255, 255, 0.03)', 
                        paddingTop: '8px', 
                        marginTop: '4px' 
                      }}
                    >
                      {/* Emojis list reaction deck */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[
                          { key: 'fire', icon: '🔥' },
                          { key: 'celebrate', icon: '🎉' },
                          { key: 'helpful', icon: '💡' },
                          { key: 'clap', icon: '👏' }
                        ].map(rx => {
                          const users = item.reactionUsers?.[rx.key] || [];
                          const hasReacted = currentUser && users.includes(currentUser.uid);
                          const count = item.reactions?.[rx.key] || 0;

                          return (
                            <button
                              key={rx.key}
                              onClick={() => handleReact(item.id, rx.key)}
                              style={{
                                background: hasReacted ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                                border: hasReacted ? `1px solid ${borderColor}` : '1px solid rgba(255,255,255,0.04)',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '0.62rem',
                                color: '#FFF',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{rx.icon}</span>
                              <span style={{ fontFamily: 'Share Tech Mono', color: hasReacted ? borderColor : '#8888AA' }}>{count}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Comment count + Launch link */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.62rem', color: '#666688', fontFamily: 'Share Tech Mono' }}>
                          💬 {item.commentCount || 0} COMMENTS
                        </span>
                        
                        {item.type === 'SOLVED' && (
                          <Link 
                            to={`/problems/${item.payload.problemId || 'two-sum'}`}
                            className="cp-showcase-launch-btn"
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '0.52rem', 
                              margin: '0', 
                              background: 'transparent',
                              borderColor: 'var(--cyber-green)',
                              color: 'var(--cyber-green)'
                            }}
                          >
                            RUN CODE ⚡
                          </Link>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}

              {/* Load More Button pagination */}
              {cursor && (
                <button
                  onClick={() => loadFeed(cursor)}
                  disabled={loadingFeed}
                  className="cp-quick-btn"
                  style={{ 
                    alignSelf: 'center', 
                    marginTop: '8px', 
                    padding: '6px 16px', 
                    fontSize: '0.68rem', 
                    borderColor: 'var(--cyber-pink)',
                    color: 'var(--cyber-pink)',
                    background: 'rgba(255, 45, 120, 0.02)'
                  }}
                >
                  {loadingFeed ? 'LOADING DEEP SEARCH...' : 'LOAD MORE TRANSMISSIONS ⏬'}
                </button>
              )}
            </div>
          )}

          {activeTab === 'solutions' && (
            <div className="cp-solutions-feed" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {loadingSolutions && <p className="cp-loading-text">// HARVESTING SOLUTION FEEDS...</p>}
              {!loadingSolutions && sharedSolutions.length === 0 && (
                <p style={{ fontSize: '0.72rem', color: '#666688', textAlign: 'center', padding: '30px' }}>
                  // NO SOLUTIONS DISPATCHED TO PUBLIC DATABANKS YET.
                </p>
              )}
              {sharedSolutions.map(post => (
                <SolutionCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* TAB 2: Algorithms Problem List */}
          {activeTab === 'problems' && (
            <>
              {problemsLoading ? (
                <p className="cp-loading-text">FETCHING DATA...</p>
              ) : (
                <div className="cp-table-wrap">
                  <table className="cp-table">
                    <thead>
                      <tr>
                        <th className="cp-th">#</th>
                        <th className="cp-th">TITLE</th>
                        <th className="cp-th">DIFFICULTY</th>
                        <th className="cp-th">TOPICS</th>
                        <th className="cp-th">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.slice(0, 10).map(prob => {
                        const solved = solvedSet.has(prob.id);
                        return (
                          <tr key={prob.id} className="cp-tr">
                            <td className="cp-td cp-td--num">{prob.number}</td>
                            <td className="cp-td">
                              <Link to={`/problems/${prob.id}`} className="cp-prob-link">
                                {prob.title}
                              </Link>
                            </td>
                            <td className="cp-td">
                              <DifficultyBadge difficulty={prob.difficulty} />
                            </td>
                            <td className="cp-td">
                              <div className="cp-topics">
                                {prob.topics?.slice(0, 2).map(t => (
                                  <span key={t} className="cp-topic-chip">{t}</span>
                                ))}
                              </div>
                            </td>
                            <td className="cp-td">
                              <span className={`cp-status-dot ${solved ? 'cp-status-dot--solved' : ''}`} title={solved ? 'Solved' : 'Unsolved'} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        {/* Sidebar */}
        <aside className="cp-sidebar">

          {/* Online Operators Presence Widget */}
          <section className="cp-section cp-section--sidebar" style={{ border: '1px solid var(--cyber-green)', boxShadow: '0 0 15px rgba(0, 255, 136, 0.1)', marginBottom: '20px' }}>
            <div className="cp-section-header" style={{ borderBottomColor: 'rgba(0, 255, 136, 0.15)', background: 'rgba(0, 255, 136, 0.03)' }}>
              <h2 className="cp-section-title" style={{ color: 'var(--cyber-green)' }}>ACTIVE OPERATORS</h2>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {onlineUsers.length === 0 ? (
                <p style={{ fontSize: '0.72rem', color: '#666688', margin: 0, textAlign: 'center' }}>// NO OTHER ONLINE NODES DETECTED</p>
              ) : (
                onlineUsers.map(user => (
                  <div key={user.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <PresenceAvatar
                        uid={user.uid}
                        avatarUrl={user.avatarUrl}
                        displayName={user.displayName}
                        size={32}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Link 
                          to={`/profile/${user.username}`} 
                          style={{
                            fontFamily: 'Orbitron',
                            fontSize: '0.74rem',
                            color: '#FFF',
                            textDecoration: 'none',
                            fontWeight: 'bold'
                          }}
                        >
                          {user.displayName?.toUpperCase()}
                        </Link>
                        <span style={{ fontSize: '0.58rem', color: 'var(--cyber-green)', fontFamily: 'Share Tech Mono' }}>
                          ELO: {user.rating || 1500}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => triggerChallenge(user.username)}
                      className="cp-quick-btn"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.58rem',
                        borderColor: 'var(--cyber-pink)',
                        color: 'var(--cyber-pink)',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '3px',
                        fontFamily: 'Share Tech Mono'
                      }}
                    >
                      ⚔️ DUEL
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Quantum Problem Generator Spotlight */}
          <section className="cp-section cp-section--sidebar" style={{ border: '1px solid #00DDFF', boxShadow: '0 0 15px rgba(0, 221, 255, 0.1)', marginBottom: '20px' }}>
            <div className="cp-section-header" style={{ borderBottomColor: '#00DDFF22', background: 'rgba(0, 221, 255, 0.03)' }}>
              <h2 className="cp-section-title" style={{ color: '#00DDFF' }}>QUANTUM GENERATOR</h2>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: '0.72rem', color: '#8888AA', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                // AI COMPILING PROBLEMS TUNED TO YOUR WEAKNESS SPECTRUM
              </p>
              <Link to="/quantum" className="cp-quick-btn" style={{ color: '#00DDFF', borderColor: '#00DDFF66', background: 'rgba(0, 221, 255, 0.05)', textDecoration: 'none' }}>
                GENERATE MY PROBLEM ⚡
              </Link>
            </div>
          </section>

          {/* Recent submissions */}
          <section className="cp-section cp-section--sidebar">
            <div className="cp-section-header">
              <h2 className="cp-section-title">RECENT ACTIVITY</h2>
            </div>
            {recentSubs.length === 0 ? (
              <p className="cp-empty">NO SUBMISSIONS YET</p>
            ) : (
              <ul className="cp-activity-list">
                {recentSubs.map(sub => (
                  <li key={sub.id} className="cp-activity-item">
                    <span className={`cp-activity-verdict cp-activity-verdict--${sub.verdict === 'Accepted' ? 'ok' : 'fail'}`}>
                      {sub.verdict === 'Accepted' ? 'AC' : 'WA'}
                    </span>
                    <span className="cp-activity-prob">{sub.problemId}</span>
                    <span className="cp-activity-lang">{sub.language}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Trending Tags Widget */}
          <section className="cp-section cp-section--sidebar">
            <div className="cp-section-header">
              <h2 className="cp-section-title">TRENDING TOPICS</h2>
            </div>
            <div className="cp-trending-tags-box" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {trendingTags.length === 0 ? (
                <p style={{ fontSize: '0.72rem', color: '#666688', margin: 0 }}>// NO TRENDING TOPICS INDICES</p>
              ) : (
                trendingTags.map(tag => (
                  <Link 
                    key={tag.name} 
                    to={`/tag/${tag.name}`}
                    style={{
                      fontFamily: 'Share Tech Mono',
                      fontSize: '0.72rem',
                      color: 'var(--cyber-pink)',
                      border: '1px solid rgba(255, 45, 120, 0.25)',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      background: 'rgba(255, 45, 120, 0.02)'
                    }}
                  >
                    #{tag.name} <span style={{ color: '#8888AA', fontSize: '0.62rem' }}>({tag.count})</span>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Quick links */}
          <section className="cp-section cp-section--sidebar">
            <h2 className="cp-section-title">QUICK ACCESS</h2>
            <div className="cp-quick-links">
              <Link to="/problems" className="cp-quick-btn cp-quick-btn--pink">⚡ PROBLEMS</Link>
              <Link to="/courses"  className="cp-quick-btn cp-quick-btn--green">📚 COURSES</Link>
              {currentUser && (
                <Link to={`/profile/${currentUser.uid}`} className="cp-quick-btn cp-quick-btn--pink">👤 PROFILE</Link>
              )}
            </div>
          </section>

        </aside>
      </div>

      <ChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        opponentName={challengeTargetName}
        onSubmit={handleInitiateChallenge}
      />

    </div>
  );
};

export default Dashboard;
