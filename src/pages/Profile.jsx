import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, auth } from '../services/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { ALL_BADGES } from '../utils/badgeChecker';
import { createBattleChallenge } from '../services/battleService';
import { getHistorySnapshots, calculateGrowthMoments } from '../services/historyService';
import SkillRadar from '../components/SkillRadar';
import './Profile.css';

const MOCK_RATING_DATA = [
  { date: 'Jan', rating: 1000 },
  { date: 'Feb', rating: 1150 },
  { date: 'Mar', rating: 1200 },
  { date: 'Apr', rating: 1280 },
  { date: 'May', rating: 1350 },
  { date: 'Jun', rating: 1420 },
];

const getTierFromRating = (rating) => {
  if (rating < 1100) return { name: 'Beginner', class: 'beginner' };
  if (rating < 1200) return { name: 'Intermediate', class: 'intermediate' };
  if (rating < 1350) return { name: 'Expert', class: 'expert' };
  return { name: 'Master', class: 'master' };
};

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // 1v1 Battle challenge states
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('Easy');
  const [isSending, setIsSending] = useState(false);

  // Time Machine States
  const [snapshots, setSnapshots] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [milestones, setMilestones] = useState([]);
  const [activeMilestone, setActiveMilestone] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [isTimelapseActive, setIsTimelapseActive] = useState(false);
  const [timelapseTimer, setTimelapseTimer] = useState(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Get current user's profile to pass rating to matchmaking
  const { data: challengerData } = useQuery({
    queryKey: ['userProfile', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return null;
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!currentUser
  });
  
  // Fetch primary profile data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['userProfile', username],
    queryFn: async () => {
      const userRef = doc(db, 'users', username);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data();
      }
      return {
        displayName: username || 'User',
        rating: 1420,
        solvedProblems: Array.from({ length: 28 }),
        streak: 7,
        completedCourses: ['dsa-fundamentals'],
        contests: 2,
        badges: ['Century Club', 'Initiate'],
        ratingHistory: MOCK_RATING_DATA
      };
    }
  });

  // Fetch full submissions history for weekly chronological backfills
  const { data: allSubmissions = [] } = useQuery({
    queryKey: ['allUserSubmissions', username],
    queryFn: async () => {
      try {
        const q = query(
          collection(db, 'submissions'),
          where('userId', '==', username),
          orderBy('timestamp', 'asc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        return [];
      }
    }
  });

  const { data: recentSubmissions = [] } = useQuery({
    queryKey: ['recentSubmissions', username],
    queryFn: async () => {
      try {
        const q = query(
          collection(db, 'submissions'),
          where('userId', '==', username),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        return [];
      }
    }
  });

  // Compile history snapshots on mount
  useEffect(() => {
    if (userData) {
      // Ensure mock submission history if empty to render a populated timeline
      const subsToUse = allSubmissions.length > 0 ? allSubmissions : Array.from({ length: 20 }).map((_, idx) => ({
        id: `mock_sub_${idx}`,
        userId: username,
        problemId: `problem_${idx}`,
        language: idx % 2 === 0 ? 'javascript' : 'python',
        verdict: 'Accepted',
        timestamp: { toDate: () => {
          const d = new Date();
          d.setDate(d.getDate() - (20 - idx) * 6);
          return d;
        }}
      }));

      getHistorySnapshots(username, userData.displayName || username, subsToUse).then(snaps => {
        setSnapshots(snaps);
        setCurrentIndex(snaps.length - 1);
        setMilestones(calculateGrowthMoments(snaps));
      });
    }
  }, [userData, allSubmissions, username]);

  const handleSendChallenge = async () => {
    if (!currentUser) return;
    setIsSending(true);
    try {
      const challengerName = challengerData?.displayName || currentUser.displayName || 'Challenger';
      const challengerRating = challengerData?.rating || 1200;
      const opponentName = userData?.displayName || 'Opponent';
      const opponentRating = userData?.rating || 1200;

      const battleId = await createBattleChallenge(
        currentUser.uid,
        challengerName,
        challengerRating,
        username,
        opponentName,
        opponentRating,
        selectedDifficulty
      );

      setIsChallengeModalOpen(false);
      navigate(`/battle/${battleId}`);
    } catch (error) {
      console.error("Error sending battle challenge:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Timelapse Auto-Play simulation
  const handleToggleTimelapse = () => {
    if (isTimelapseActive) {
      clearInterval(timelapseTimer);
      setIsTimelapseActive(false);
    } else {
      setIsTimelapseActive(true);
      setCurrentIndex(0);
      const timer = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= snapshots.length - 1) {
            clearInterval(timer);
            setIsTimelapseActive(false);
            return prev;
          }
          return prev + 1;
        });
      }, 180);
      setTimelapseTimer(timer);
    }
  };

  const handleShareJourney = () => {
    setCopiedShare(true);
    navigator.clipboard.writeText(window.location.href);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  if (userLoading) return <div className="loading">Loading profile...</div>;
  if (!userData) return <div className="error">User not found.</div>;

  // Active snapshot states
  const activeSnap = snapshots[currentIndex] || null;
  const latestSnap = snapshots[snapshots.length - 1] || null;

  // Stats values to present (either history scrubbed or actual profile)
  const displayRating = activeSnap ? activeSnap.rating : (userData.rating || 1200);
  const displaySolved = activeSnap ? activeSnap.solvedCount : (userData.solvedProblems?.length || 0);
  const displayStreak = activeSnap ? activeSnap.streak : (userData.streak || 0);
  const displayCourses = activeSnap ? activeSnap.coursesCompleted : (userData.completedCourses?.length || 0);
  const displayContests = activeSnap ? activeSnap.contestsEntered : (userData.contests || 0);
  const displayBadges = activeSnap ? activeSnap.badges : (userData.badges || []);

  const initials = userData.displayName ? userData.displayName.substring(0, 2) : 'U';
  const tier = getTierFromRating(displayRating);

  // Dynamic Rank Tier frame border overlays
  const frameClass = tier.name.toLowerCase();

  // Morphing Radar Skill Axis Scores
  const historicalRadarScores = activeSnap ? ['Arrays', 'Trees', 'Graphs', 'DP', 'Math', 'Strings', 'Greedy', 'Backtracking'].map(axis => {
    return activeSnap.topicsProgress[axis] !== undefined ? activeSnap.topicsProgress[axis] : 25;
  }) : null;

  // Morphing Heatmap Activity level bound to timeline time limits
  const activeSnapTime = activeSnap ? activeSnap.timestamp : Date.now();
  const heatmapData = Array.from({ length: 52 * 7 }).map((_, index) => {
    const cellTime = Date.now() - (52 * 7 - index) * 24 * 60 * 60 * 1000;
    if (cellTime > activeSnapTime) return 0;
    return (index % 7 === 1 || index % 13 === 4) ? Math.min(4, (index % 4) + 1) : 0;
  });

  // Calculate past vs now split statistics
  const currentSolved = latestSnap ? latestSnap.solvedCount : displaySolved;
  const currentRating = latestSnap ? latestSnap.rating : displayRating;
  const solvedDiff = currentSolved - displaySolved;
  const ratingDiff = currentRating - displayRating;
  const growthMultiplier = displaySolved > 0 ? (currentSolved / displaySolved).toFixed(1) : '3.0';

  return (
    <div className="profile-container">
      
      {/* Compare Past vs Now Splitted layouts */}
      {compareMode && activeSnap && latestSnap && (
        <div className="cp-tm-split-grid">
          
          {/* PAST SNAPSHOT PANEL (LEFT) */}
          <div className="cp-tm-split-panel">
            <h3 className="cp-tm-split-title past">PAST SNAPSHOT // {activeSnap.dateStr}</h3>
            
            <div className={`profile-header cp-tm-profile-header-frame cp-tm-frame-${activeSnap.rank.toLowerCase()}`}>
              <div className="avatar-circle">{initials}</div>
              <div className="profile-info">
                <h1>{userData.displayName}</h1>
                <span className={`tier-badge ${activeSnap.rank.toLowerCase()}`}>{activeSnap.rank} ({activeSnap.rating})</span>
              </div>
            </div>

            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="stat-card">
                <div className="stat-value">{activeSnap.solvedCount}</div>
                <div className="stat-label">Solved</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{activeSnap.streak} 🔥</div>
                <div className="stat-label">Streak</div>
              </div>
            </div>
          </div>

          {/* LATEST STATUS PANEL (RIGHT) */}
          <div className="cp-tm-split-panel">
            <h3 className="cp-tm-split-title now">PRESENT CURRENT STATE</h3>
            
            <div className={`profile-header cp-tm-profile-header-frame cp-tm-frame-${latestSnap.rank.toLowerCase()}`}>
              <div className="avatar-circle">{initials}</div>
              <div className="profile-info">
                <h1>{userData.displayName}</h1>
                <span className={`tier-badge ${latestSnap.rank.toLowerCase()}`}>{latestSnap.rank} ({latestSnap.rating})</span>
              </div>
            </div>

            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="stat-card">
                <div className="stat-value">{latestSnap.solvedCount}</div>
                <div className="stat-label">Solved</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{latestSnap.streak} 🔥</div>
                <div className="stat-label">Streak</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Standard layout */}
      {(!compareMode || !compareMode) && (
        <>
          <div className={`profile-header cp-tm-profile-header-frame cp-tm-frame-${frameClass}`}>
            <div className="avatar-circle">
              {initials}
            </div>
            <div className="profile-info">
              <h1>{userData.displayName}</h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
                <span className={`tier-badge ${tier.class}`}>{tier.name} ({displayRating})</span>
                {currentUser && currentUser.uid !== username && (
                  <button className="cp-profile-challenge-btn" onClick={() => setIsChallengeModalOpen(true)}>
                    ⚔️ 1v1 CHALLENGE
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{displaySolved}</div>
              <div className="stat-label">Problems Solved</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{displayStreak} 🔥</div>
              <div className="stat-label">Current Streak</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{displayCourses}</div>
              <div className="stat-label">Courses Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{displayContests}</div>
              <div className="stat-label">Contests</div>
            </div>
          </div>
        </>
      )}

      {/* Compare Past vs Now Growth Indicator panel banner */}
      {compareMode && activeSnap && (
        <div className="cp-tm-growth-banner">
          <div className="cp-tm-growth-message">
            🚀 YOU'VE GROWN {growthMultiplier}x IN PROBLEMS SOLVED SINCE {activeSnap.dateStr}!
          </div>
          <div className="cp-tm-comparison-diffs">
            <span className="cp-tm-diff-pill">+{solvedDiff} Solved</span>
            <span className="cp-tm-diff-pill">+{ratingDiff} Rating</span>
          </div>
        </div>
      )}

      {/* Genomic Skill Radar Chart */}
      <SkillRadar userId={username} historicalScores={historicalRadarScores} />

      <div className="heatmap-section">
        <h3 className="section-title">Submission Activity</h3>
        <div className="heatmap-container">
          <div className="heatmap-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(52, 1fr)', gridTemplateRows: 'repeat(7, 1fr)', gap: '4px', width: 'max-content' }}>
            {heatmapData.map((level, i) => (
              <div key={i} className="heatmap-cell" data-level={level}></div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-section">
        <h3 className="section-title">Rating History</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={userData.ratingHistory || MOCK_RATING_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1d2d', borderColor: '#334155', color: '#fff' }}
                itemStyle={{ color: '#6366f1' }}
              />
              <Line type="monotone" dataKey="rating" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#a855f7', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="badges-section">
        <h3 className="section-title">Badges</h3>
        <div className="badges-container">
          <div className="badges-grid">
            {ALL_BADGES.map(badge => {
              const isEarned = displayBadges.includes(badge.name) || (userData.badges || []).includes(badge.id);
              return (
                <div key={badge.id} className={`badge-item ${isEarned ? 'earned' : 'locked'}`}>
                  <div className="badge-icon">
                    {badge.id === 'first_blood' ? '🩸' : 
                     badge.id === 'week_warrior' ? '⚔️' : 
                     badge.id === 'century_club' ? '💯' : '🎓'}
                  </div>
                  <div className="badge-name">{badge.name}</div>
                  <div className="badge-desc">{badge.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="recent-subs-section">
        <h3 className="section-title">Recent Submissions</h3>
        {recentSubmissions.length > 0 ? (
          <table className="recent-subs-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Language</th>
                <th>Verdict</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentSubmissions.map(sub => (
                <tr key={sub.id}>
                  <td>{sub.problemId}</td>
                  <td>{sub.language}</td>
                  <td>
                    <span className={`badge ${sub.verdict === 'Accepted' ? 'easy' : 'hard'}`}>
                      {sub.verdict}
                    </span>
                  </td>
                  <td>{sub.timestamp ? new Date(sub.timestamp.toDate()).toLocaleDateString() : 'Just now'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>No recent submissions found.</div>
        )}
      </div>

      {/* ── PROGRESS TIME MACHINE scrubber bottom panel HUD ── */}
      {snapshots.length > 0 && (
        <div className="cp-tm-timeline-panel">
          <div className="cp-tm-timeline-header">
            <h3 className="cp-tm-timeline-title">
              ⏳ PROGRESS TIME MACHINE // ACTIVE TARGET: {activeSnap?.dateStr}
            </h3>

            <div className="cp-radar-controls" style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={`cp-radar-btn ${isTimelapseActive ? 'cp-radar-btn--active' : ''}`}
                onClick={handleToggleTimelapse}
              >
                {isTimelapseActive ? 'STOP TIMELAPSE ⏹' : 'PLAY TIMELAPSE ▶'}
              </button>

              <button 
                className={`cp-radar-btn ${compareMode ? 'cp-radar-btn--active' : ''}`}
                onClick={() => setCompareMode(!compareMode)}
              >
                COMPARE PAST VS NOW
              </button>

              <button className="cp-radar-btn" onClick={handleShareJourney}>
                {copiedShare ? 'COPIED LINK! 🔗' : 'SHARE MY JOURNEY'}
              </button>
            </div>
          </div>

          <div className="cp-tm-timeline-scrub-row">
            <div className="cp-tm-timeline-line" />
            <div 
              className="cp-tm-timeline-line-filled"
              style={{ width: `${(currentIndex / (snapshots.length - 1)) * 100}%` }}
            />

            {/* Special Growth Markers */}
            {milestones.map((marker, idx) => {
              // Calculate horizontal percent offset
              const snapIdx = snapshots.findIndex(s => s.dateStr === marker.dateStr);
              if (snapIdx === -1) return null;
              const percent = (snapIdx / (snapshots.length - 1)) * 100;

              return (
                <div 
                  key={idx}
                  className="cp-tm-milestone-dot"
                  style={{ left: `calc(20px + ${percent}% * (100% - 40px) / 100)`, background: marker.color }}
                  onClick={() => setActiveMilestone(activeMilestone === marker ? null : marker)}
                >
                  <span style={{ fontSize: '0.6rem', color: '#0A0A0F' }}>{marker.icon}</span>
                </div>
              );
            })}

            {/* Slider scrub input */}
            <input
              type="range"
              min="0"
              max={snapshots.length - 1}
              value={currentIndex}
              onChange={e => {
                setCurrentIndex(Number(e.target.value));
                setActiveMilestone(null);
              }}
              className="cp-tm-slider"
              disabled={isTimelapseActive}
            />

            {/* Date marker indicators labels below timeline */}
            {snapshots.map((snap, idx) => {
              if (idx % 4 !== 0 && idx !== snapshots.length - 1) return null;
              const percent = (idx / (snapshots.length - 1)) * 100;
              const dateStrShort = new Date(snap.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div 
                  key={idx}
                  className="cp-tm-timeline-marker"
                  style={{ left: `calc(20px + ${percent}% * (100% - 40px) / 100)` }}
                >
                  {dateStrShort}
                </div>
              );
            })}

            {/* Click popup milestones card */}
            {activeMilestone && (
              <div 
                className="cp-tm-milestone-popup"
                style={{ 
                  left: `calc(20px + ${(() => {
                    const snapIdx = snapshots.findIndex(s => s.dateStr === activeMilestone.dateStr);
                    return (snapIdx / (snapshots.length - 1)) * 100;
                  })()}% * (100% - 40px) / 100)` 
                }}
              >
                <h4>{activeMilestone.label}</h4>
                <p>{activeMilestone.text}</p>
                <button 
                  style={{ background: 'transparent', border: 'none', color: '#FF2D78', fontSize: '0.65rem', cursor: 'pointer', marginTop: '4px' }}
                  onClick={() => setActiveMilestone(null)}
                >
                  DISMISS
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 1v1 Matchmaking Selection Dialog */}
      {isChallengeModalOpen && (
        <div className="cp-challenge-modal-backdrop" onClick={() => setIsChallengeModalOpen(false)}>
          <div className="cp-challenge-modal" onClick={e => e.stopPropagation()}>
            <button className="cp-challenge-modal-close" onClick={() => setIsChallengeModalOpen(false)}>✕</button>
            <h3 className="cp-challenge-modal-title">// BATTLE MATCHMAKING</h3>
            
            <div className="cp-challenge-form-group">
              <label className="cp-challenge-label">OPPONENT</label>
              <div style={{ color: '#E8E8FF', fontSize: '0.95rem', fontWeight: 'bold' }}>
                {userData.displayName} ({userData.rating || 1200} Elo)
              </div>
            </div>

            <div className="cp-challenge-form-group">
              <label className="cp-challenge-label">COMPILATION DIFFICULTY</label>
              <div className="cp-challenge-difficulty-grid">
                {['Easy', 'Medium', 'Hard'].map(diff => (
                  <button
                    key={diff}
                    className={`cp-challenge-difficulty-btn ${selectedDifficulty === diff ? `cp-challenge-difficulty-btn--selected diff-${diff.toLowerCase()}` : ''}`}
                    onClick={() => setSelectedDifficulty(diff)}
                  >
                    {diff.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button 
              className="cp-challenge-modal-submit-btn" 
              onClick={handleSendChallenge}
              disabled={isSending}
            >
              {isSending ? 'COMPILING LOBBY...' : '⚔️ TRANSMIT CHALLENGE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
