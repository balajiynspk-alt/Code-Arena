import React, { useState } from 'react';
import './ChallengeModal.css';

const ChallengeModal = ({ isOpen, onClose, onSubmit, opponentName }) => {
  const [difficulty, setDifficulty] = useState('Medium');
  const [timeLimit, setTimeLimit] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ difficulty, timeLimit });
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to establish combat link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cp-challenge-modal-backdrop" onClick={onClose}>
      <div className="cp-challenge-modal" onClick={e => e.stopPropagation()}>
        <div className="cp-challenge-modal-header">
          <h3 className="cp-challenge-modal-title">// DUEL SYNAPSE LINK PROTOCOL</h3>
          <button className="cp-challenge-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="cp-challenge-opponent-status">
          TARGET NODE: <span className="target-name">@{opponentName}</span>
        </div>

        <form onSubmit={handleSubmit} className="cp-challenge-form">
          {/* Difficulty Tier */}
          <div className="cp-form-group">
            <label className="cp-form-label">// SELECT INTELLECT TIER (DIFFICULTY)</label>
            <div className="cp-difficulty-selector">
              {['Easy', 'Medium', 'Hard'].map(tier => (
                <button
                  key={tier}
                  type="button"
                  className={`cp-difficulty-btn ${tier.toLowerCase()} ${difficulty === tier ? 'active' : ''}`}
                  onClick={() => setDifficulty(tier)}
                >
                  {tier.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Time Duration */}
          <div className="cp-form-group">
            <label className="cp-form-label">// SYNC TIME QUANTUM (DURATION)</label>
            <div className="cp-time-selector">
              {[15, 30, 45].map(mins => (
                <button
                  key={mins}
                  type="button"
                  className={`cp-time-btn ${timeLimit === mins ? 'active' : ''}`}
                  onClick={() => setTimeLimit(mins)}
                >
                  {mins} MINUTES
                </button>
              ))}
            </div>
          </div>

          <div className="cp-challenge-warning">
            WARNING: Accepting the synapse link initiates a live 1v1 compile race. System rating delta is calculated dynamically on completion.
          </div>

          {/* Submit Deck */}
          <div className="cp-challenge-submit-deck">
            <button type="button" className="cp-challenge-cancel-btn" onClick={onClose}>
              ABORT LINK
            </button>
            <button type="submit" className="cp-challenge-send-btn" disabled={submitting}>
              {submitting ? 'ESTABLISHING LINK...' : 'INITIATE ARENA COMBAT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChallengeModal;
