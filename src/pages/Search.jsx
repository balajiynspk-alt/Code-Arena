import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { searchUsers } from '../services/searchService';
import { followUser, unfollowUser, checkIsFollowing } from '../services/followService';
import { createBattleInvite } from '../services/battleService';
import ChallengeModal from '../components/ChallengeModal';
import PresenceAvatar from '../components/PresenceAvatar';
import './Search.css';

const RANK_TIERS = ['All', 'Beginner', 'Intermediate', 'Expert', 'Master'];
const COLLEGES = [
  'All', 
  'Nexus Institute of Technology', 
  'Silicon Guild Academy', 
  'Aether Cyber Academy', 
  'Local Terminal Academy'
];
const LANGUAGES = ['All', 'Python', 'JavaScript', 'C++', 'Java', 'Rust', 'Go'];

const Search = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRank, setSelectedRank] = useState('All');
  const [selectedCollege, setSelectedCollege] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [minRating, setMinRating] = useState(1000);
  const [maxRating, setMaxRating] = useState(2200);
  const [sortBy, setSortBy] = useState('rating');

  // Search results
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({});

  // Challenge modal states
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [battleDifficulty, setBattleDifficulty] = useState('medium');
  const [challenging, setChallenging] = useState(false);

  // Fetch logged in user details for battle stats
  const { data: myData } = useQuery({
    queryKey: ['searchMyData', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return null;
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!currentUser,
  });

  const fetchResults = async () => {
    setLoading(true);
    try {
      const filters = {
        rank: selectedRank,
        college: selectedCollege,
        language: selectedLanguage,
        minRating: Number(minRating),
        maxRating: Number(maxRating)
      };
      const results = await searchUsers(searchTerm, filters, sortBy);
      
      // Determine following status for all retrieved users
      const followMap = {};
      if (currentUser) {
        await Promise.all(
          results.map(async (u) => {
            followMap[u.uid] = await checkIsFollowing(u.uid);
          })
        );
      }
      setFollowingMap(followMap);
      setUsersList(results);
    } catch (err) {
      console.error("Search fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [searchTerm, selectedRank, selectedCollege, selectedLanguage, minRating, maxRating, sortBy]);

  const handleFollowToggle = async (e, targetUser) => {
    e.stopPropagation();
    if (!currentUser) {
      alert("Authentication required to follow operators.");
      return;
    }
    const isCurrentlyFollowing = !!followingMap[targetUser.uid];
    
    // Optimistic state toggle
    setFollowingMap(prev => ({ ...prev, [targetUser.uid]: !isCurrentlyFollowing }));

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUser.uid);
      } else {
        await followUser(targetUser.uid);
        // Dispatch follow notification
        const { createNotification } = await import('../services/notificationService');
        await createNotification(
          targetUser.uid,
          'NEW_FOLLOWER',
          `@${currentUser.displayName || 'Operator'} established a link to your node profile.`,
          `/profile/${currentUser.displayName || currentUser.uid}`
        );
      }
    } catch (err) {
      console.error("Follow toggling failed:", err);
      // Revert on failure
      setFollowingMap(prev => ({ ...prev, [targetUser.uid]: isCurrentlyFollowing }));
    }
  };

  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  const openChallengeDialog = (e, opponent) => {
    e.stopPropagation();
    if (!currentUser) {
      alert("Please login to issue 1v1 speed combat challenges.");
      return;
    }
    if (opponent.uid === currentUser.uid || opponent.displayName === currentUser.displayName) {
      alert("Self-clash simulation is not allowed.");
      return;
    }
    setSelectedOpponent(opponent);
    setIsChallengeModalOpen(true);
  };

  const handleSendChallenge = async ({ difficulty, timeLimit }) => {
    if (!selectedOpponent) return;
    try {
      const myName = myData?.displayName || currentUser.displayName || 'Challenger';
      await createBattleInvite(
        currentUser.uid,
        myName,
        selectedOpponent.username || selectedOpponent.displayName,
        selectedOpponent.displayName,
        difficulty,
        timeLimit
      );
      alert(`⚔️ COMBAT SIGNAL DISPATCHED! Battle invite successfully sent to @${selectedOpponent.displayName}!`);
      setIsChallengeModalOpen(false);
    } catch (err) {
      console.error("Combat signal dispatch failure:", err);
      alert("Failed to send battle invite: " + err.message);
    }
  };

  return (
    <div className="cp-search-container">
      {/* Header heading */}
      <div className="cp-search-header-deck">
        <h1 className="cp-search-title">
          <span className="cp-title-pink">OPERATOR</span>{' '}
          <span className="cp-title-green">DIRECTORIES</span>
        </h1>
        <p className="cp-search-subtitle">// SEARCH ACTIVE CONSOLE NODES ACROSS THE COLLEGE GRID</p>
      </div>

      <div className="cp-search-layout">
        {/* Sidebar Filters */}
        <aside className="cp-search-sidebar">
          <div className="cp-filter-section-header">// SEARCH FILTERS</div>

          {/* College Filter */}
          <div className="cp-filter-group">
            <label className="cp-filter-label">College Guild</label>
            <select 
              value={selectedCollege} 
              onChange={e => setSelectedCollege(e.target.value)}
              className="cp-filter-select"
            >
              {COLLEGES.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Rank Tier Filter */}
          <div className="cp-filter-group">
            <label className="cp-filter-label">Rank Tier</label>
            <select 
              value={selectedRank} 
              onChange={e => setSelectedRank(e.target.value)}
              className="cp-filter-select"
            >
              {RANK_TIERS.map(t => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Favorite Languages Filter */}
          <div className="cp-filter-group">
            <label className="cp-filter-label">Preferred Compiler</label>
            <select 
              value={selectedLanguage} 
              onChange={e => setSelectedLanguage(e.target.value)}
              className="cp-filter-select"
            >
              {LANGUAGES.map(l => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Rating slider range */}
          <div className="cp-filter-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="cp-filter-label">Rating Spectrum</label>
              <span className="cp-slider-value">{minRating} - {maxRating} ELO</span>
            </div>
            <div className="cp-slider-wrapper">
              <input 
                type="range" 
                min="1000" 
                max="2200" 
                step="50"
                value={maxRating}
                onChange={e => setMaxRating(Number(e.target.value))}
                className="cp-filter-slider"
              />
            </div>
          </div>
        </aside>

        {/* Search Input & Results catalog */}
        <main className="cp-search-main">
          {/* Top panel: Search input + sorting */}
          <div className="cp-search-bar-row">
            <div className="cp-search-input-wrap">
              <span className="cp-search-lens">🔍</span>
              <input 
                type="text" 
                placeholder="ENTER OPERATOR CALLSIGN OR NODE ID..."
                className="cp-search-bar-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="cp-sort-wrap">
              <label className="cp-sort-label">SORT:</label>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                className="cp-sort-select"
              >
                <option value="rating">ELO RATING</option>
                <option value="solved">SOLVED PROBLEMS</option>
                <option value="streak">ACTIVE STREAK</option>
              </select>
            </div>
          </div>

          {/* Results grid */}
          {loading ? (
            <div className="cp-search-loading">// HARVESTING LINK ENVELOPE telemetry...</div>
          ) : usersList.length === 0 ? (
            <div className="cp-search-empty">// NO OPERATORS MATCHING SEARCH MATRIX DETECTED</div>
          ) : (
            <div className="cp-search-results-grid">
              {usersList.map(user => {
                const isMe = currentUser && (currentUser.uid === user.uid || currentUser.displayName === user.displayName);
                const isFollowing = !!followingMap[user.uid];
                const initials = user.displayName?.substring(0, 2).toUpperCase() || 'OP';
                
                return (
                  <div 
                    key={user.uid} 
                    className="cp-user-search-card"
                    onClick={() => navigate(`/profile/${user.uid}`)}
                  >
                    <div className="cp-card-accent" />
                    
                    {/* Header: avatar + name + tier */}
                    <div className="cp-search-card-header">
                      <PresenceAvatar
                        uid={user.uid}
                        avatarUrl={user.avatarUrl}
                        displayName={user.displayName}
                        size={48}
                      />
                      
                      <div className="cp-search-card-name-block">
                        <h4 className="cp-search-card-name">{user.displayName || user.username}</h4>
                        <span className={`cp-search-rank ${user.rank?.toLowerCase() || 'beginner'}`}>
                          {user.rank?.toUpperCase() || 'EXPERT'}
                        </span>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="cp-search-card-bio">
                      // {user.bio ? user.bio.substring(0, 75) : "Active developer terminal."}
                    </p>

                    {/* Stats metrics list */}
                    <div className="cp-search-card-stats">
                      <div className="cp-card-stat-item">
                        <span className="cp-card-stat-val text-pink">{user.rating || 1200} ELO</span>
                        <span className="cp-card-stat-lbl">RATING</span>
                      </div>
                      <div className="cp-card-stat-item">
                        <span className="cp-card-stat-val text-green">{user.solvedCount ?? 0}</span>
                        <span className="cp-card-stat-lbl">SOLVED</span>
                      </div>
                      <div className="cp-card-stat-item">
                        <span className="cp-card-stat-val text-gold">{user.streak || 0} 🔥</span>
                        <span className="cp-card-stat-lbl">STREAK</span>
                      </div>
                    </div>

                    {/* College & Lang lists */}
                    <div className="cp-search-card-details">
                      <div className="cp-detail-row">🏫 {user.college || "Nexus Academy"}</div>
                      <div className="cp-detail-row">
                        💻 {user.favoriteLanguages?.map(l => l.toUpperCase()).join(' · ') || 'PYTHON'}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!isMe && (
                      <div className="cp-search-card-actions">
                        <button 
                          onClick={(e) => handleFollowToggle(e, user)}
                          className={`cp-search-btn-follow ${isFollowing ? 'unfollow' : 'follow'}`}
                        >
                          {isFollowing ? "DISCONNECT" : "ESTABLISH LINK"}
                        </button>
                        <button 
                          onClick={(e) => openChallengeDialog(e, user)}
                          className="cp-search-btn-challenge"
                        >
                          ⚔️ BATTLE
                        </button>
                      </div>
                    )}
                    {isMe && (
                      <div className="cp-search-self-tag">[YOUR ACTIVE TERMINAL]</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <ChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        opponentName={selectedOpponent?.displayName}
        onSubmit={handleSendChallenge}
      />
    </div>
  );
};

export default Search;
