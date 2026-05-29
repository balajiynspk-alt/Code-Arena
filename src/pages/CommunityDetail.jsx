import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  getCommunityBySlug, 
  getCommunityPosts, 
  createCommunityPost, 
  upvotePost, 
  getCommunityMembers,
  checkIsMember,
  joinCommunity,
  leaveCommunity
} from '../services/communityService';
import { getProblemById } from '../services/problemService';
import { auth } from '../services/firebase';
import './CommunityDetail.css';

const CommunityDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const [community, setCommunity] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'leaderboard' | 'challenge' | 'members'
  
  // Feed states
  const [posts, setPosts] = useState([]);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postTags, setPostTags] = useState('');
  const [postType, setPostType] = useState('question'); // 'solution' | 'question' | 'resource'
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Leaderboard & Members states
  const [members, setMembers] = useState([]);
  
  // Weekly Challenge states
  const [challengeProblem, setChallengeProblem] = useState(null);

  const [loading, setLoading] = useState(true);

  const loadCommunityData = async () => {
    setLoading(true);
    try {
      const comm = await getCommunityBySlug(slug);
      if (!comm) {
        setCommunity(null);
        return;
      }
      setCommunity(comm);

      // Check membership
      const joined = await checkIsMember(comm.id);
      setIsMember(joined);

      // Load posts
      const postList = await getCommunityPosts(comm.id);
      setPosts(postList);

      // Load members & leaderboard
      const memberList = await getCommunityMembers(comm.id);
      setMembers(memberList);

      // Load weekly challenge problem
      if (comm.weeklyChallengeProblemId) {
        try {
          const prob = await getProblemById(comm.weeklyChallengeProblemId);
          setChallengeProblem(prob);
        } catch (e) {
          console.warn("Failed to load problem details:", e);
        }
      }
    } catch (err) {
      console.error("Error loading community detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunityData();
  }, [slug, currentUser]);

  const handleJoinToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    try {
      if (isMember) {
        await leaveCommunity(community.id);
        setIsMember(false);
      } else {
        await joinCommunity(community.id);
        setIsMember(true);
      }
      await loadCommunityData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postBody.trim()) return;

    const tagsArray = postTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      await createCommunityPost(
        community.id,
        postTitle,
        postBody,
        tagsArray,
        postType
      );
      setPostTitle('');
      setPostBody('');
      setPostTags('');
      setShowCreateForm(false);
      
      // Reload posts
      const postList = await getCommunityPosts(community.id);
      setPosts(postList);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpvote = async (e, postId) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    try {
      const newUp = await upvotePost(community.id, postId);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) return { ...p, upvotes: newUp };
        return p;
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="cp-detail-state">// LOADING COMMUNITY TELEMETRY SECTOR...</div>;
  }

  if (!community) {
    return <div className="cp-detail-state cp-detail-state--err">// COMMUNITY SECTOR DEFUNCT OR UNRESOLVED</div>;
  }

  // Sort posts: Pinned ones strictly first on top!
  const sortedPosts = [...posts].sort((a, b) => {
    const aPin = a.isPinned ? 1 : 0;
    const bPin = b.isPinned ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="cp-community-detail-container">
      
      {/* Community Jumbotron Header */}
      <div className="cp-detail-jumbotron">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span className="cp-detail-emoji">{community.emoji}</span>
          <div>
            <h1 className="cp-detail-name">{community.name}</h1>
            <p className="cp-detail-description">{community.description}</p>
          </div>
        </div>

        <div className="cp-detail-meta-actions">
          <span className="cp-detail-members-badge">{community.memberCount || 0} OPERATORS CONNECTED</span>
          <button
            onClick={handleJoinToggle}
            className={`cp-detail-connect-btn ${isMember ? 'joined' : ''}`}
          >
            {isMember ? 'DISCONNECT NODE' : 'CONNECT NODE'}
          </button>
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="cp-detail-tabs">
        {[
          { key: 'feed', label: 'TIMELINE FEED' },
          { key: 'leaderboard', label: 'LEADERBOARD' },
          { key: 'challenge', label: 'WEEKLY TARGET' },
          { key: 'members', label: 'OPERATORS' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cp-detail-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab render containers */}
      <div className="cp-detail-tab-body">
        
        {/* FEED TAB */}
        {activeTab === 'feed' && (
          <div className="cp-feed-tab-layout">
            
            <div className="cp-feed-header-row">
              <span className="cp-feed-timeline-heading">// LATEST TRANSMISSIONS</span>
              {isMember && (
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="cp-create-post-toggle"
                >
                  {showCreateForm ? 'CANCEL POST' : 'CREATE TRANSMISSION ⚡'}
                </button>
              )}
            </div>

            {/* Post Create Panel */}
            {showCreateForm && (
              <form onSubmit={handleSubmitPost} className="cp-create-post-form">
                <h3 className="cp-form-title">// NEW TELEMETRY TRANSMISSION</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="TRANSMISSION TITLE..."
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    style={{ width: '140px' }}
                  >
                    <option value="question">PINK // QUESTION</option>
                    <option value="solution">GREEN // SOLUTION</option>
                    <option value="resource">AMBER // RESOURCE</option>
                  </select>
                </div>
                
                <textarea
                  placeholder="TRANSMISSION BODY (MARKDOWN SUPPORTED)..."
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  required
                  rows={6}
                />

                <input
                  type="text"
                  placeholder="TAGS (COMMA SEPARATED, E.G. Algorithms, DP, C++)..."
                  value={postTags}
                  onChange={(e) => setPostTags(e.target.value)}
                />

                <button type="submit" className="cp-post-submit-btn">
                  TRANSMIT TELEMETRY
                </button>
              </form>
            )}

            {/* Posts Grid */}
            <div className="cp-timeline-posts">
              {sortedPosts.length === 0 ? (
                <div className="cp-feed-empty">// NO TRANSMISSIONS RECORDED IN THIS SECTOR</div>
              ) : (
                sortedPosts.map(p => (
                  <div key={p.id} className={`cp-post-card cp-post-type--${p.type}`}>
                    {/* Header info */}
                    <div className="cp-post-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="cp-post-owner">@{p.username}</span>
                        {p.isPinned && <span className="cp-post-pin-badge">📌 PINNED</span>}
                        <span className={`cp-post-type-badge ${p.type}`}>{p.type.toUpperCase()}</span>
                      </div>
                      <span className="cp-post-time">⏳ {new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>

                    <h2 className="cp-post-card-title">{p.title}</h2>
                    
                    <div className="cp-post-card-body">
                      <ReactMarkdown>{p.body}</ReactMarkdown>
                    </div>

                    {/* Footer buttons row */}
                    <div className="cp-post-card-footer">
                      <div className="cp-post-tags">
                        {p.tags?.map(t => (
                          <span key={t} className="cp-post-tag">#{t.toUpperCase()}</span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <button
                          onClick={(e) => handleUpvote(e, p.id)}
                          className="cp-post-upvote-btn"
                        >
                          🔺 <span style={{ fontFamily: 'Share Tech Mono' }}>{p.upvotes || 0} UPVOTES</span>
                        </button>
                        <span className="cp-post-comments-count">💬 {p.commentCount || 0} REPLIES</span>
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div className="cp-leaderboard-tab">
            <h3 className="cp-lead-heading">// WEEKLY SECTOR RANKINGS</h3>
            <table className="cp-leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>RANK</th>
                  <th>OPERATOR</th>
                  <th>ROLE</th>
                  <th style={{ textAlign: 'right' }}>WEEKLY POINTS</th>
                </tr>
              </thead>
              <tbody>
                {members.sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0)).map((m, idx) => (
                  <tr key={m.uid} className={m.uid === currentUser?.uid ? 'me' : ''}>
                    <td>
                      <span className={`cp-rank-badge rank-${idx + 1}`}>#{idx + 1}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="cp-lead-initials">
                          {m.username?.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="cp-lead-username">{m.username}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`cp-lead-role ${m.role}`}>{m.role.toUpperCase()}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'Share Tech Mono', color: '#00FF88', fontWeight: 'bold' }}>
                      {m.weeklyPoints || 0} PTS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* WEEKLY CHALLENGE TAB */}
        {activeTab === 'challenge' && (
          <div className="cp-challenge-tab">
            <h3 className="cp-challenge-heading">// WEEKLY TARGET PROBLEM</h3>
            {challengeProblem ? (
              <div className="cp-challenge-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 className="cp-challenge-title">
                    <span style={{ color: '#8888AA', fontSize: '0.9rem' }}>{challengeProblem.number}.</span> {challengeProblem.title}
                  </h4>
                  <span className={`cp-challenge-diff cp-challenge-diff--${challengeProblem.difficulty?.toLowerCase()}`}>
                    {challengeProblem.difficulty?.toUpperCase()}
                  </span>
                </div>
                
                <p className="cp-challenge-description">
                  {challengeProblem.description?.substring(0, 360)}...
                </p>

                <div className="cp-challenge-topics">
                  {challengeProblem.topics?.map(t => (
                    <span key={t} className="cp-challenge-topic-tag">{t}</span>
                  ))}
                </div>

                <button
                  onClick={() => navigate(`/problems/${community.weeklyChallengeProblemId}`)}
                  className="cp-challenge-solve-btn"
                >
                  SOLVE CHALLENGE ⚡
                </button>
              </div>
            ) : (
              <div className="cp-feed-empty">// NO WEEKLY TARGET PROBLEM ASSIGNED IN THIS SECTOR</div>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="cp-members-tab">
            <h3 className="cp-members-heading">// DEPLOYED OPERATORS ({members.length})</h3>
            <div className="cp-members-grid">
              {members.map(m => (
                <div key={m.uid} className="cp-member-badge-card">
                  <div className="cp-member-avatar-fallback">
                    {m.username?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="cp-member-info">
                    <span className="cp-member-name">{m.username}</span>
                    <span className={`cp-member-badge-role ${m.role}`}>{m.role.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default CommunityDetail;
