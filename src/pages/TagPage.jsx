import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPostsByTag, getTagLeaderboard } from '../services/tagService';
import SolutionCard from '../components/SolutionCard';
import './TagPage.css';

const TagPage = () => {
  const { topic } = useParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortBy, setSortBy] = useState('new');
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const fetchTaggedData = async () => {
    setLoadingPosts(true);
    try {
      const list = await getPostsByTag(topic, sortBy);
      setPosts(list);
    } catch (err) {
      console.error("Failed to load tag posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchLeaderboardData = async () => {
    setLoadingLeaderboard(true);
    try {
      const leaders = await getTagLeaderboard(topic);
      setLeaderboard(leaders);
    } catch (err) {
      console.error("Failed to load tag leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    fetchTaggedData();
  }, [topic, sortBy]);

  useEffect(() => {
    fetchLeaderboardData();
  }, [topic]);

  return (
    <div className="cp-tag-container">
      {/* Header Deck */}
      <div className="cp-tag-header-row">
        <div>
          <span className="cp-tag-breadcrumb" onClick={() => navigate('/dashboard')}>
            // HOME NODE / TARGET DECK
          </span>
          <h1 className="cp-tag-title">
            TAG STREAM: <span className="cp-tag-highlight">#{topic}</span>
          </h1>
          <p className="cp-tag-subtitle">
            Reviewing shared optimal algorithms and active solvers tuned to #{topic} matrices.
          </p>
        </div>

        {/* Sorting options */}
        <div className="cp-tag-actions">
          <button 
            onClick={() => setSortBy('new')}
            className={`cp-tag-sort-btn ${sortBy === 'new' ? 'active' : ''}`}
          >
            🛰️ NEWEST TRANSMISSIONS
          </button>
          <button 
            onClick={() => setSortBy('top')}
            className={`cp-tag-sort-btn ${sortBy === 'top' ? 'active' : ''}`}
          >
            🔥 TOP REACTION RATING
          </button>
        </div>
      </div>

      <div className="cp-tag-layout">
        {/* Solution feed column */}
        <main className="cp-tag-main-feed">
          {loadingPosts ? (
            <div className="cp-tag-loading">// HARVESTING Tagged telemetry buffers...</div>
          ) : posts.length === 0 ? (
            <div className="cp-tag-empty-feed">
              <span className="cp-tag-empty-icon">📂</span>
              <p className="cp-tag-empty-txt">
                NO SOLUTIONS DISPATCHED WITH TAG #{topic} YET.
              </p>
              <button 
                onClick={() => navigate('/problems')}
                className="cp-tag-nav-problems-btn"
              >
                SOLVE CHALLENGE & START TRANSMISSION //
              </button>
            </div>
          ) : (
            <div className="cp-tag-posts-list">
              {posts.map(post => (
                <SolutionCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </main>

        {/* Tag Leaderboard Column */}
        <aside className="cp-tag-sidebar">
          <div className="cp-tag-leaderboard-box">
            <div className="cp-leaderboard-accent" />
            <h3 className="cp-leaderboard-title">
              🏆 #{topic.toUpperCase()} TOP SOLVERS
            </h3>
            <p className="cp-leaderboard-subtitle">// RANKED BY SYSTEM SUBMISSIONS UNDER THIS TAG</p>

            {loadingLeaderboard ? (
              <div className="cp-leaderboard-loading">COMPILING AGENT RANKINGS...</div>
            ) : leaderboard.length === 0 ? (
              <div className="cp-leaderboard-empty">NO LEADER DATA REGISTERED</div>
            ) : (
              <div className="cp-leaderboard-table">
                {leaderboard.map(user => {
                  const rankClass = user.rankIndex === 1 ? 'gold' : user.rankIndex === 2 ? 'silver' : user.rankIndex === 3 ? 'bronze' : 'normal';
                  return (
                    <div 
                      key={user.displayName}
                      className="cp-leaderboard-row"
                      onClick={() => navigate(`/profile/${user.displayName}`)}
                    >
                      <div className={`cp-leaderboard-rank ${rankClass}`}>
                        {user.rankIndex.toString().padStart(2, '0')}
                      </div>
                      <div className="cp-leaderboard-identity">
                        <span className="cp-leader-name">{user.displayName}</span>
                        <span className={`cp-leader-badge ${user.rank.toLowerCase()}`}>
                          {user.rank.toUpperCase()}
                        </span>
                      </div>
                      <div className="cp-leaderboard-stats">
                        <span className="cp-leader-val text-green">{user.solvedCount}</span>
                        <span className="cp-leader-lbl">SOLVED</span>
                      </div>
                      <div className="cp-leaderboard-rating">
                        {user.rating} ELO
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TagPage;
