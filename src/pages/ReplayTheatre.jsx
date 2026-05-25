import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { db, auth } from '../services/firebase';
import { getReplay, addReplayComment, getReplayComments } from '../services/replayService';
import './ReplayTheatre.css';

const ReplayTheatre = () => {
  const { userId, problemId } = useParams();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // Replay Data states
  const [replayData, setReplayData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCode, setCurrentCode] = useState('');

  // Playback Control States
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 4x
  const [currentSecond, setCurrentSecond] = useState(0);

  // Social Features (Comments)
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. Load Replay Payload from Firestore
  useEffect(() => {
    const loadReplayData = async () => {
      setIsLoading(true);
      try {
        const data = await getReplay(userId, problemId);
        if (data) {
          setReplayData(data);
          if (data.events?.length > 0) {
            setCurrentCode(data.events[0].value || '');
          }
        }
      } catch (err) {
        console.error("Error loading replay theatre stream:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadReplayData();
  }, [userId, problemId]);

  // 2. Load Replay Comments
  const loadComments = async () => {
    const replayId = `${userId}_${problemId}`;
    try {
      const list = await getReplayComments(replayId);
      setComments(list);
    } catch (err) {
      console.warn("Could not retrieve comment list:", err);
    }
  };

  useEffect(() => {
    loadComments();
  }, [userId, problemId]);

  // 3. Playback timer ticks every 100ms for high-frequency animations
  useEffect(() => {
    if (!isPlaying || !replayData) return;

    const interval = setInterval(() => {
      setCurrentSecond(prev => {
        const next = prev + 0.1 * speed;
        if (next >= replayData.totalTime) {
          setIsPlaying(false);
          return replayData.totalTime;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, speed, replayData]);

  // 4. Update Monaco code content in read-only mode based on playhead position
  useEffect(() => {
    if (!replayData || !replayData.events) return;

    // Find the last event that occurred before or at the current playhead
    const matchingEvent = [...replayData.events]
      .reverse()
      .find(e => e.timestamp <= currentSecond);

    if (matchingEvent) {
      setCurrentCode(matchingEvent.value || '');
    }
  }, [currentSecond, replayData]);

  // ── Computations & Heuristics ──

  // Compute live character metrics up to the active playhead
  const liveStats = useMemo(() => {
    let written = 0;
    let deleted = 0;
    let pauses = 0;

    if (!replayData || !replayData.events) return { written, deleted, pauses };

    let lastLen = replayData.events[0]?.value.length || 0;
    let lastTime = 0;

    for (let i = 1; i < replayData.events.length; i++) {
      const ev = replayData.events[i];
      if (ev.timestamp > currentSecond) break;

      const diff = ev.value.length - lastLen;
      if (diff > 0) {
        written += diff;
      } else if (diff < 0) {
        deleted += Math.abs(diff);
      }

      if (ev.timestamp - lastTime > 5) {
        pauses += 1;
      }

      lastLen = ev.value.length;
      lastTime = ev.timestamp;
    }

    return {
      written,
      deleted,
      pauses
    };
  }, [currentSecond, replayData]);

  // Visual markers placement percentage
  const visualMarkers = useMemo(() => {
    if (!replayData || !replayData.markers) return [];
    return replayData.markers.map((m, idx) => {
      const percent = (m.timestamp / replayData.totalTime) * 100;
      return {
        ...m,
        id: idx,
        percent: Math.min(100, Math.max(0, percent))
      };
    });
  }, [replayData]);

  // Handlers
  const handleScrubChange = (e) => {
    if (!replayData) return;
    const value = parseFloat(e.target.value);
    setCurrentSecond(value);
  };

  const handleShareCopy = () => {
    const url = `codearena.app/replay/${userId}/${problemId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentUser) return;
    
    const replayId = `${userId}_${problemId}`;
    const timestampSeconds = Math.floor(currentSecond);

    await addReplayComment(
      currentUser.uid,
      currentUser.displayName || 'Coder',
      replayId,
      timestampSeconds,
      commentInput
    );

    setCommentInput('');
    loadComments();
  };

  // Convert seconds to mm:ss format
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="cp-battle-lobby">
        <div className="cp-battle-lobby-glow" style={{ background: 'rgba(0, 255, 136, 0.05)' }} />
        <h2 className="cp-battle-lobby-title" style={{ color: '#00FF88', textShadow: '0 0 15px rgba(0, 255, 136, 0.3)' }}>
          // ENGAGING THEATRE BEAMS
        </h2>
        <span className="cp-battle-lobby-status">Loading session stream...</span>
      </div>
    );
  }

  if (!replayData) {
    return (
      <div className="cp-battle-lobby">
        <h2 className="cp-battle-lobby-title" style={{ color: '#FF2D78' }}>// THEATRE BLANK</h2>
        <span className="cp-battle-lobby-status">Replay not found in archive.</span>
        <button className="cp-battle-action-btn cp-battle-action-btn--run" onClick={() => navigate('/dashboard')}>
          RETURN TO DASHBOARD
        </button>
      </div>
    );
  }

  return (
    <div className="cp-theatre-container">
      
      {/* Theatre HUD */}
      <div className="cp-theatre-hud">
        <h1 className="cp-theatre-title">CODE REPLAY THEATRE</h1>
        <span className="cp-theatre-problem-tag">
          Problem: <strong>{replayData.problemTitle?.toUpperCase()}</strong> | Solver: <strong>{replayData.userName}</strong>
        </span>
      </div>

      {/* Main Theatre Grid */}
      <div className="cp-theatre-layout">
        
        {/* Left Side: Playback Editor */}
        <div className="cp-theatre-main">
          
          <div className="cp-theatre-editor-wrap">
            <Editor
              height="100%"
              theme="vs-dark"
              language="javascript"
              value={currentCode}
              options={{
                readOnly: true,
                fontSize: 14,
                lineHeight: 22,
                minimap: { enabled: false },
                fontFamily: "'Share Tech Mono', monospace",
                domReadOnly: true
              }}
            />
          </div>

          {/* Timeline deck */}
          <div className="cp-theatre-deck">
            
            {/* Timeline scrubber bar */}
            <div className="cp-theatre-timeline-container">
              <div className="cp-theatre-timeline-bar" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percent = clickX / rect.width;
                setCurrentSecond(percent * replayData.totalTime);
              }}>
                <div 
                  className="cp-theatre-timeline-fill" 
                  style={{ width: `${(currentSecond / replayData.totalTime) * 100}%` }}
                />

                {/* Colored Markers mapping */}
                {visualMarkers.map(marker => (
                  <div 
                    key={marker.id}
                    className={`cp-theatre-marker ${marker.type}`}
                    style={{ left: `${marker.percent}%` }}
                    title={`[${formatTime(marker.timestamp)}] ${marker.text}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSecond(marker.timestamp);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Playback Controls & Time displays */}
            <div className="cp-theatre-controls">
              
              <div className="cp-theatre-btn-group">
                <button 
                  className={`cp-theatre-btn ${isPlaying ? 'cp-theatre-btn--active' : ''}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>

                {/* Speed Multipliers */}
                {[1, 2, 4].map(s => (
                  <button 
                    key={s}
                    className={`cp-theatre-btn ${speed === s ? 'cp-theatre-btn--active' : ''}`}
                    onClick={() => setSpeed(s)}
                  >
                    {s}X SPEED
                  </button>
                ))}

                <span className="cp-theatre-time-chip">
                  {formatTime(currentSecond)} / {formatTime(replayData.totalTime)}
                </span>
              </div>

              {/* Dynamic stats row */}
              <div className="cp-theatre-live-stats">
                <span className="cp-theatre-stat-widget">
                  Characters Written: <strong>{liveStats.written}</strong>
                </span>
                <span className="cp-theatre-stat-widget">
                  Backspaces: <strong>{liveStats.deleted}</strong>
                </span>
                <span className="cp-theatre-stat-widget">
                  Pauses (&gt;5s): <strong>{liveStats.pauses}</strong>
                </span>
              </div>

            </div>

          </div>

        </div>

        {/* Right Side: Comments, Shares, Top Replays */}
        <div className="cp-theatre-sidebar">
          
          {/* Share replay deck */}
          <div className="cp-theatre-share-card">
            <h4 className="cp-theatre-share-title">// REPLAY TRANSMISSION LINK</h4>
            <div className="cp-theatre-share-row">
              <input 
                type="text" 
                readOnly 
                value={`codearena.app/replay/${userId}/${problemId}`} 
                className="cp-theatre-share-input" 
              />
              <button className="cp-theatre-btn" onClick={handleShareCopy}>
                {copiedLink ? 'COPIED!' : 'COPY'}
              </button>
            </div>
          </div>

          {/* Comment list chapters */}
          <div className="cp-theatre-comments-section">
            <div className="cp-theatre-comments-header">
              <h4 className="cp-theatre-comments-title">// ARENA CHRONICLES FEED</h4>
            </div>

            <div className="cp-theatre-comments-list">
              {comments.length > 0 ? (
                comments.map(c => (
                  <div key={c.id} className="cp-theatre-comment-item">
                    <span 
                      className="cp-theatre-comment-stamp"
                      onClick={() => setCurrentSecond(c.timestampSeconds)}
                    >
                      [{formatTime(c.timestampSeconds)}]
                    </span>
                    <span className="cp-theatre-comment-user">{c.userName}:</span>
                    <span className="cp-theatre-comment-text">{c.text}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#5A5A72', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                  No chapters or review transcripts logged.
                </div>
              )}
            </div>

            {/* Comment Input */}
            {currentUser && (
              <form className="cp-theatre-comment-input-row" onSubmit={handleAddComment}>
                <input
                  type="text"
                  placeholder="Record comment timestamp..."
                  className="cp-theatre-comment-input"
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                />
                <button type="submit" className="cp-theatre-comment-send">
                  🚀
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

      {/* Insight and metrics dashboard below player */}
      <div className="cp-theatre-insight-panel">
        <h3 className="cp-theatre-insight-title">// RECONSTRUCTIVE INSIGHT REPORT</h3>
        
        <div className="cp-theatre-insight-list">
          
          <div className="cp-theatre-insight-card hesitation">
            You hesitated <strong>{replayData.pauseCount || 0} times</strong> during coding construction, indicating points of algorithmic planning.
          </div>

          <div className="cp-theatre-insight-card">
            Total solve footprint is <strong>{replayData.writtenChars || 0} characters</strong> written with <strong>{replayData.deletedChars || 0} backspaces</strong>.
          </div>

          <div className="cp-theatre-insight-card">
            Optimal solving rate: <strong>{formatTime(replayData.solveTime || 0)}</strong>. Fastest Solve record: <strong>{formatTime(Math.max(15, (replayData.solveTime || 60) - 45))}</strong>.
          </div>

        </div>
      </div>

    </div>
  );
};

export default ReplayTheatre;
