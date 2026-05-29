import React, { useState } from 'react';
import { shareSolution } from '../services/solutionShareService';
import { TOPIC_TAGS, APPROACH_TAGS } from '../services/tagService';
import './ShareSolutionModal.css';

const ALL_SUGGESTION_TAGS = [...TOPIC_TAGS, ...APPROACH_TAGS];

const ShareSolutionModal = ({
  problemId,
  problemTitle,
  difficulty,
  code,
  language,
  runtime_ms = 24,
  memory_kb = 1240,
  onClose,
  onSuccess
}) => {
  const [caption, setCaption] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  const handleTagInputChange = (val) => {
    setTagInput(val);
    const lastCommaIndex = val.lastIndexOf(',');
    const currentWord = (lastCommaIndex === -1 ? val : val.substring(lastCommaIndex + 1)).trim().toLowerCase();

    if (currentWord.length > 0) {
      const filtered = ALL_SUGGESTION_TAGS.filter(tag => 
        tag.toLowerCase().includes(currentWord) && 
        !val.toLowerCase().includes(tag.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (tag) => {
    const lastCommaIndex = tagInput.lastIndexOf(',');
    const prefix = lastCommaIndex === -1 ? '' : tagInput.substring(0, lastCommaIndex + 1) + ' ';
    setTagInput(prefix + tag + ', ');
    setSuggestions([]);
  };

  // Extract first 8 lines of code for preview
  const codeLines = code.split('\n');
  const previewCode = codeLines.slice(0, 8).join('\n');
  const hasMoreLines = codeLines.length > 8;

  const handleShare = async (e) => {
    e.preventDefault();
    if (!caption.trim()) {
      setError('Please provide a short caption describing your approach.');
      return;
    }

    // Split tags on commas
    const parsedTags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (difficulty && !parsedTags.some(t => t.toLowerCase() === difficulty.toLowerCase())) {
      parsedTags.push(difficulty);
    }

    setSharing(true);
    setError('');

    try {
      await shareSolution({
        problemId,
        problemTitle,
        difficulty,
        code,
        language,
        runtime_ms,
        memory_kb,
        caption,
        tags: parsedTags,
        isPublic
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to dispatch solution transmission.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="cp-share-modal-overlay">
      <div className="cp-share-modal-box">
        
        {/* Header decoration */}
        <div className="cp-share-modal-header">
          <div>
            <h3 className="cp-share-title">// DISPATCH SOLUTION SCHEMATIC</h3>
            <p className="cp-share-subtitle">Publish your optimal code execution matrix to the public grid.</p>
          </div>
          <button className="cp-share-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleShare} className="cp-share-form">
          {error && <div className="cp-share-error">// ERROR: {error}</div>}

          {/* Code Preview snippet blocks */}
          <div className="cp-share-preview-section">
            <span className="cp-preview-tag">// CODE BLOCK PREVIEW (FIRST 8 LINES)</span>
            <pre className="cp-share-code-pre">
              <code>{previewCode}</code>
              {hasMoreLines && <div className="cp-code-more-indicator">// ... {codeLines.length - 8} MORE LINES IN DECK ...</div>}
            </pre>
          </div>

          {/* Caption Input */}
          <div className="cp-share-field">
            <label className="cp-share-label">
              CAPTION (APPROACH OVERVIEW · {120 - caption.length} CHARS REMAINING)
            </label>
            <input
              type="text"
              className="cp-share-input"
              placeholder="e.g. Blazing fast single-pass HashMap approach! Converges DP in O(N)."
              maxLength={120}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              required
            />
          </div>

          {/* Tags Inputs */}
          <div className="cp-share-field" style={{ position: 'relative' }}>
            <label className="cp-share-label">
              APPROACH TAGS (COMMAS SEPARATED)
            </label>
            <input
              type="text"
              className="cp-share-input"
              placeholder="HashMap, Two Pointers, Greedy, DFS"
              value={tagInput}
              onChange={e => handleTagInputChange(e.target.value)}
            />
            {suggestions.length > 0 && (
              <div 
                className="cp-tag-suggestions-box"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  width: '100%',
                  background: '#090912',
                  border: '1px solid var(--cyber-pink, #FF2D78)',
                  borderRadius: '0 0 4px 4px',
                  zIndex: 10,
                  maxHeight: '120px',
                  overflowY: 'auto',
                  boxShadow: '0 5px 15px rgba(255, 45, 120, 0.25)'
                }}
              >
                {suggestions.map(tag => (
                  <div
                    key={tag}
                    onClick={() => selectSuggestion(tag)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontFamily: 'Share Tech Mono',
                      color: '#FFF',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    🚀 ADD #{tag.toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Public vs Private toggle switch */}
          <div className="cp-share-toggle-row">
            <label className="cp-share-label">TRANSMISSION FREQUENCY</label>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`cp-share-toggle-btn ${isPublic ? 'public' : 'private'}`}
            >
              {isPublic ? '🌐 PUBLIC GRID TELEMETRY' : '🔒 PRIVATE ROOM NODE'}
            </button>
          </div>

          {/* Modal compile action footer */}
          <div className="cp-share-actions">
            <button type="button" onClick={onClose} className="cp-share-btn-cancel">
              ABORT
            </button>
            <button type="submit" disabled={sharing} className="cp-share-btn-submit">
              {sharing ? 'TRANSMITTING...' : 'DISPATCH SOLUTION // TRANSMIT'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ShareSolutionModal;
