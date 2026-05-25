import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTopReplays } from '../services/replayService';
import './TopReplays.css';

const TopReplays = () => {
  const navigate = useNavigate();
  const [replays, setReplays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReplays = async () => {
      try {
        const list = await getTopReplays();
        setReplays(list);
      } catch (err) {
        console.error("Error fetching scoreboard replays:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReplays();
  }, []);

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
          // QUERYING ARENA SPECTRUM
        </h2>
        <span className="cp-battle-lobby-status">Aggregating record solve sessions...</span>
      </div>
    );
  }

  return (
    <div className="cp-top-replays-container">
      <div className="cp-top-replays-glow" />

      {/* Header HUD */}
      <div className="cp-top-replays-header">
        <h1 className="cp-top-replays-title">THEATRE SCOREBOARD</h1>
        <span className="cp-top-replays-subtitle">Browse fastest developer code replays and trace optimal routes</span>
      </div>

      {replays.length > 0 ? (
        <div className="cp-replays-grid">
          {replays.map(replay => (
            <div key={replay.id} className="cp-replay-card">
              <div>
                <h3 className="cp-replay-problem-title">
                  {replay.problemTitle?.toUpperCase()}
                </h3>
                <div className="cp-replay-user">
                  Solved by: <strong>{replay.userName}</strong>
                </div>

                {/* Performance stats */}
                <div className="cp-replay-metrics">
                  
                  <div className="cp-replay-metric-item">
                    <span className="cp-replay-metric-label">SOLVE TIME</span>
                    <span className="cp-replay-metric-value time">
                      {formatTime(replay.solveTime)}
                    </span>
                  </div>

                  <div className="cp-replay-metric-item">
                    <span className="cp-replay-metric-label">HESITATIONS</span>
                    <span className="cp-replay-metric-value hesitations">
                      {replay.pauseCount || 0} pauses
                    </span>
                  </div>

                  <div className="cp-replay-metric-item">
                    <span className="cp-replay-metric-label">CHARACTERS</span>
                    <span className="cp-replay-metric-value">
                      {replay.writtenChars || 0} chars
                    </span>
                  </div>

                  <div className="cp-replay-metric-item">
                    <span className="cp-replay-metric-label">BACKSPACES</span>
                    <span className="cp-replay-metric-value">
                      {replay.deletedChars || 0} keys
                    </span>
                  </div>

                </div>
              </div>

              <button 
                className="cp-replay-watch-btn"
                onClick={() => navigate(`/replay/${replay.userId}/${replay.problemId}`)}
              >
                WATCH REPLAY ▷
              </button>

            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '64px', color: '#5A5A72', fontStyle: 'italic' }}>
          // No record replays saved to the theatre archives yet. Solve a problem to save yours!
        </div>
      )}

    </div>
  );
};

export default TopReplays;
