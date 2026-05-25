import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getThoughtMap } from '../services/thoughtService';
import './ThoughtReplay.css';

const ThoughtReplay = () => {
  const { userId, problemId } = useParams();
  const navigate = useNavigate();

  // Thought map data states
  const [thoughtMap, setThoughtMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Interaction highlights
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Typewriter reveal state
  const [hoveredBubbleIdx, setHoveredBubbleIdx] = useState(null);

  // 1. Load Thought Map payload from Firestore
  useEffect(() => {
    const loadThoughts = async () => {
      setIsLoading(true);
      try {
        const data = await getThoughtMap(userId, problemId);
        if (data) {
          setThoughtMap(data);
        }
      } catch (err) {
        console.error("Error loading voice thought logs:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadThoughts();
  }, [userId, problemId]);

  // 2. Parse code block into separate lines for exact matching
  const codeLines = useMemo(() => {
    if (!thoughtMap || !thoughtMap.code) return [];
    return thoughtMap.code.split('\n');
  }, [thoughtMap]);

  // 3. Map thoughts array by line number for O(1) alignment lookups
  const lineThoughts = useMemo(() => {
    if (!thoughtMap || !thoughtMap.thoughts) return {};
    const map = {};
    thoughtMap.thoughts.forEach(t => {
      map[t.line] = t;
    });
    return map;
  }, [thoughtMap]);

  const handleShareCopy = () => {
    const url = `codearena.app/thoughts/${userId}/${problemId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="cp-battle-lobby">
        <div className="cp-battle-lobby-glow" style={{ background: 'rgba(255, 45, 120, 0.05)' }} />
        <h2 className="cp-battle-lobby-title" style={{ color: '#FF2D78', textShadow: '0 0 15px rgba(255, 45, 120, 0.3)' }}>
          // ENGAGING THOUGHT BEAMS
        </h2>
        <span className="cp-battle-lobby-status">Synchronizing vocal transcript map...</span>
      </div>
    );
  }

  if (!thoughtMap) {
    return (
      <div className="cp-battle-lobby">
        <h2 className="cp-battle-lobby-title" style={{ color: '#FF2D78' }}>// THOUGHT GRAPH BLANK</h2>
        <span className="cp-battle-lobby-status">No vocal debugger transcript found in archive.</span>
        <button className="cp-battle-action-btn cp-battle-action-btn--run" onClick={() => navigate('/dashboard')}>
          RETURN
        </button>
      </div>
    );
  }

  return (
    <div className="cp-thoughts-page">
      
      {/* HUD Details */}
      <div className="cp-thoughts-hud">
        <h1 className="cp-thoughts-title">VOICE THOUGHT DEBUGGER</h1>
        <span className="cp-thoughts-meta">
          Problem: <strong>{thoughtMap.problemTitle?.toUpperCase()}</strong> | Spoken by: <strong>{thoughtMap.userName}</strong>
        </span>
      </div>

      {/* Split Aligned layout */}
      <div className="cp-thoughts-layout">
        
        {/* Left Side: Code line list */}
        <div className="cp-thoughts-code-panel">
          {codeLines.map((lineContent, idx) => {
            const lineNum = idx + 1;
            const hasThought = !!lineThoughts[lineNum];
            const isHighlighted = highlightedLine === lineNum;

            return (
              <div 
                key={idx}
                className={`cp-thoughts-line-row ${hasThought ? 'has-thought' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                onMouseEnter={() => {
                  if (hasThought) setHighlightedLine(lineNum);
                }}
                onMouseLeave={() => setHighlightedLine(null)}
              >
                <span className="cp-thoughts-line-num">{lineNum}</span>
                <span className="cp-thoughts-line-content">
                  {lineContent || ' '}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Side: Spoken bubbles aligned to matching index slots */}
        <div className="cp-thoughts-bubble-panel">
          {codeLines.map((_, idx) => {
            const lineNum = idx + 1;
            const thought = lineThoughts[lineNum];

            return (
              <div key={idx} className="cp-thoughts-bubble-slot">
                {thought ? (
                  <div 
                    className="cp-thought-bubble"
                    onMouseEnter={() => {
                      setHighlightedLine(lineNum);
                      setHoveredBubbleIdx(lineNum);
                    }}
                    onMouseLeave={() => {
                      setHighlightedLine(null);
                      setHoveredBubbleIdx(null);
                    }}
                  >
                    {hoveredBubbleIdx === lineNum ? (
                      <span className="cp-thought-typewriter">
                        {thought.text}
                      </span>
                    ) : (
                      <span>{thought.text}</span>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

      </div>

      {/* Share card & AI Insight Ratings */}
      <div className="cp-thoughts-insight-panel">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="cp-thoughts-insight-header">// AI COGNITIVE RATINGS ANALYSIS</div>
          
          {/* Share links card */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={`codearena.app/thoughts/${userId}/${problemId}`}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '4px',
                color: '#FF2D78',
                fontSize: '0.7rem',
                padding: '4px 8px',
                width: '220px',
                fontFamily: 'Share Tech Mono'
              }}
            />
            <button 
              className="cp-radar-btn" 
              onClick={handleShareCopy}
              style={{ padding: '4px 10px', fontSize: '0.62rem', border: '1px solid #FF2D78', color: '#FF2D78' }}
            >
              {copiedLink ? 'COPIED!' : 'COPY MAP'}
            </button>
          </div>
        </div>

        <div className="cp-thoughts-insight-body">
          {thoughtMap.insightScore}
        </div>

      </div>

    </div>
  );
};

export default ThoughtReplay;
