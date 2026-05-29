import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCommunities, joinCommunity, leaveCommunity, getJoinedCommunityIds } from '../services/communityService';
import { auth } from '../services/firebase';
import './Communities.css';

const Communities = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const [communities, setCommunities] = useState([]);
  const [joinedIds, setJoinedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'joined' | 'trending' | 'college'
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getCommunities();
      setCommunities(list);
      if (currentUser) {
        const ids = await getJoinedCommunityIds();
        setJoinedIds(ids);
      }
    } catch (err) {
      console.error("Failed to load communities data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleJoinToggle = async (e, communityId, isJoined) => {
    e.stopPropagation(); // Avoid card navigation
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      if (isJoined) {
        await leaveCommunity(communityId);
        setJoinedIds(prev => prev.filter(id => id !== communityId));
      } else {
        await joinCommunity(communityId);
        setJoinedIds(prev => [...prev, communityId]);
      }
      // Reload count updates
      const list = await getCommunities();
      setCommunities(list);
    } catch (err) {
      alert(err.message);
    }
  };

  // ── FILTER & SORT PIPELINES ──
  const filtered = communities
    .filter(c => {
      // Search matches
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchSearch) return false;

      // Filter tabs
      if (activeFilter === 'joined') {
        return joinedIds.includes(c.id);
      }
      if (activeFilter === 'college') {
        // College tagged communities
        return c.tags.some(t => t.toLowerCase().includes('faang') || t.toLowerCase().includes('career'));
      }
      return true;
    })
    .sort((a, b) => {
      // Sort Trending first if selected
      if (activeFilter === 'trending') {
        return (b.memberCount || 0) - (a.memberCount || 0);
      }
      // Default: Joined communities shown first on top
      const aJoined = joinedIds.includes(a.id) ? 1 : 0;
      const bJoined = joinedIds.includes(b.id) ? 1 : 0;
      if (aJoined !== bJoined) {
        return bJoined - aJoined;
      }
      // Alphabetical secondary sort
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="cp-communities-container">
      
      {/* Header telemetry deck */}
      <div className="cp-comm-header">
        <h1 className="cp-comm-title">// CODEARENA COMMUNITIES</h1>
        <p className="cp-comm-subtitle">Join specialized cybernetic networks to build points, solve weekly targets, and debate algorithms.</p>
      </div>

      {/* Control panel (Search & Filter Row) */}
      <div className="cp-comm-toolbar">
        <div className="cp-comm-search-wrapper">
          <span className="cp-comm-search-icon">🔍</span>
          <input
            type="text"
            placeholder="SEARCH NETWORK ID OR TAG..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="cp-comm-search-input"
          />
        </div>

        <div className="cp-comm-filters">
          {[
            { key: 'all', label: 'ALL SECTORS' },
            { key: 'joined', label: 'MY JOINED' },
            { key: 'trending', label: 'TRENDING' },
            { key: 'college', label: 'COLLEGE HUBS' }
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setActiveFilter(opt.key)}
              className={`cp-comm-filter-btn ${activeFilter === opt.key ? 'active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Communities Grid */}
      {loading ? (
        <div className="cp-comm-loading">// SYNCHRONIZING TELEMETRY NETWORKS...</div>
      ) : filtered.length === 0 ? (
        <div className="cp-comm-empty">// NO COMMUNITIES RESPONDING TO THIS QUERY</div>
      ) : (
        <div className="cp-communities-grid">
          {filtered.map(c => {
            const isJoined = joinedIds.includes(c.id);
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/community/${c.slug}`)}
                className={`cp-community-card ${isJoined ? 'joined' : ''}`}
              >
                {/* Header info */}
                <div className="cp-card-main-header">
                  <span className="cp-card-emoji">{c.emoji}</span>
                  <div className="cp-card-titles">
                    <h3 className="cp-card-name">{c.name}</h3>
                    <span className="cp-card-members">{c.memberCount || 0} OPERATORS ACTIVE</span>
                  </div>
                </div>

                {/* Description */}
                <p className="cp-card-desc">{c.description}</p>

                {/* Tags row */}
                <div className="cp-card-tags">
                  {c.tags?.map(t => (
                    <span key={t} className="cp-card-tag">#{t.toUpperCase()}</span>
                  ))}
                </div>

                {/* Join / Leave button */}
                <button
                  onClick={(e) => handleJoinToggle(e, c.id, isJoined)}
                  className={`cp-card-join-btn ${isJoined ? 'joined' : ''}`}
                >
                  {isJoined ? 'DISCONNECT' : 'CONNECT NODE'}
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default Communities;
