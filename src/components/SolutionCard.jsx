import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toggleReaction, getUserReaction } from '../services/solutionShareService';
import { auth } from '../services/firebase';
import './SolutionCard.css';

const SolutionCard = ({ post }) => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const [reactions, setReactions] = useState(post.reactionCounts || { fire: 0, clap: 0, mind: 0, helpful: 0 });
  const [activeReaction, setActiveReaction] = useState(null);
  const [hoverText, setHoverText] = useState({});

  useEffect(() => {
    if (currentUser) {
      getUserReaction(post.id).then(setActiveReaction);
    }
  }, [post.id, currentUser]);

  // Click triggers up/down reactions optimistically
  const handleReact = async (type) => {
    if (!currentUser) {
      alert("Authentication required to interact.");
      return;
    }

    // Optimistic UI updates
    const nextCounts = { ...reactions };
    let nextActive = null;

    if (activeReaction === type) {
      // Undo
      nextCounts[type] = Math.max(0, (nextCounts[type] || 0) - 1);
      nextActive = null;
    } else {
      // Clear previous type if existed
      if (activeReaction) {
        nextCounts[activeReaction] = Math.max(0, (nextCounts[activeReaction] || 0) - 1);
      }
      nextCounts[type] = (nextCounts[type] || 0) + 1;
      nextActive = type;
    }

    setReactions(nextCounts);
    setActiveReaction(nextActive);

    try {
      const confirmed = await toggleReaction(post.id, type);
      if (confirmed) {
        setReactions(confirmed);
      }
    } catch (err) {
      console.error("Failed to commit reaction:", err);
      // Rollback on database failure
      setReactions(post.reactionCounts);
      setActiveReaction(activeReaction);
    }
  };

  // Compile hover string: "Operator and [count] others"
  const getHoverLabel = (type, count) => {
    if (count <= 0) return "No reactions yet";
    if (activeReaction === type) {
      if (count === 1) return "You reacted";
      return `You and ${count - 1} other${count - 1 === 1 ? '' : 's'} reacted`;
    }
    return `${post.username || 'Operator'} and ${count - 1} other${count - 1 === 1 ? '' : 's'} reacted`;
  };

  // Syntax highlighter (pink keywords, green functions, amber strings)
  const highlightCode = (rawCode) => {
    if (!rawCode) return '';
    let escaped = rawCode
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 1. Double/Single quoted strings -> Amber
    escaped = escaped.replace(/(["'])(.*?)\1/g, '<span class="cp-code-string">"$2"</span>');

    // 2. Keywords -> Pink
    const keywords = [
      'def', 'function', 'return', 'if', 'else', 'for', 'while', 'const', 'let', 'var',
      'class', 'import', 'from', 'in', 'and', 'or', 'not', 'elif', 'break', 'continue'
    ];
    keywords.forEach(kw => {
      const reg = new RegExp(`\\b(${kw})\\b`, 'g');
      escaped = escaped.replace(reg, '<span class="cp-code-keyword">$1</span>');
    });

    // 3. Functions -> Green
    escaped = escaped.replace(/(\b[a-zA-Z_]\w*)\s*(?=\()/g, '<span class="cp-code-function">$1</span>');

    return escaped;
  };

  // Compute runtime average bar percentage (e.g. 18ms runtime is ~88% better than average 150ms DSA solutions)
  const performanceRate = Math.min(98, Math.max(45, Math.round(100 - (post.runtime_ms / 3))));

  return (
    <div className="cp-solution-card">
      
      {/* User profile header deck */}
      <div className="cp-sol-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="cp-sol-avatar-circle">
            {post.username?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="cp-sol-username">{post.username || 'Operator'}</div>
            <div className="cp-sol-time">📡 DISPATCHED AT {new Date(post.createdAt).toLocaleTimeString()}</div>
          </div>
        </div>

        <div className="cp-sol-problem-tag">
          <span className="cp-sol-prob-title">{post.problemTitle}</span>
          <span className={`cp-sol-prob-diff ${post.difficulty?.toLowerCase()}`}>
            {post.difficulty}
          </span>
        </div>
      </div>

      {/* Caption approach overview */}
      <p className="cp-sol-caption">{post.caption}</p>

      {/* Approach pills list */}
      {post.tags && post.tags.length > 0 && (
        <div className="cp-sol-tags-row">
          {post.tags.map(t => (
            <span 
              key={t} 
              className="cp-sol-tag-pill"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tag/${t}`);
              }}
              style={{ cursor: 'pointer' }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* High fidelity syntax highlighted box */}
      <div className="cp-sol-code-box">
        <pre className="cp-sol-code-pre">
          <code dangerouslySetInnerHTML={{ __html: highlightCode(post.code) }} />
        </pre>
      </div>

      {/* Performance benchmark stats row */}
      <div className="cp-sol-stats-container">
        <div className="cp-sol-stats-label">
          ⚡ RUNTIME: {post.runtime_ms}ms · MEMORY: {post.memory_kb}KB
        </div>
        <div className="cp-sol-bar-wrapper">
          <div className="cp-sol-bar-fill" style={{ width: `${performanceRate}%` }} />
          <span className="cp-sol-bar-label">BETTER THAN {performanceRate}% OF RUNS</span>
        </div>
      </div>

      {/* Interactive bottom bar */}
      <div className="cp-sol-footer">
        
        {/* Reactions catalog */}
        <div className="cp-sol-reactions-deck">
          {[
            { type: 'fire', icon: '🔥' },
            { type: 'mind', icon: '🧠' },
            { type: 'clap', icon: '👏' },
            { type: 'helpful', icon: '💡' }
          ].map(r => {
            const count = reactions[r.type] || 0;
            const active = activeReaction === r.type;

            return (
              <button
                key={r.type}
                onClick={() => handleReact(r.type)}
                className={`cp-sol-react-btn ${active ? 'active' : ''}`}
                title={getHoverLabel(r.type, count)}
              >
                <span className="cp-react-icon">{r.icon}</span>
                <span className="cp-react-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Redirect action button */}
        <button 
          onClick={() => navigate(`/problems/${post.problemId}`)}
          className="cp-sol-editor-btn"
        >
          OPEN IN EDITOR // SYNC
        </button>

      </div>

    </div>
  );
};

export default SolutionCard;
