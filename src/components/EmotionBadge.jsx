import React, { useState } from 'react';
import { useEmotion } from '../context/EmotionContext';
import './EmotionBadge.css';

const STATE_ICONS = {
  CALM: '🧘',
  'FLOW STATE': '🧠',
  FRUSTRATED: '🌋',
  CONFUSED: '❓',
  BORED: '🥱',
  ANXIOUS: '🌀'
};

const STATE_COLORS = {
  CALM: '#FF2D78',
  'FLOW STATE': '#00FF88',
  FRUSTRATED: '#00AAFF',
  CONFUSED: '#FFAA00',
  BORED: '#AA66FF',
  ANXIOUS: '#FF5555'
};

const STATE_DESCS = {
  CALM: 'Standard focused state. Normal visual highlights.',
  'FLOW STATE': 'Deep hyper-focus detected. Disabling notifications, hiding distraction tabs, and turning editor pure black!',
  FRUSTRATED: 'High backspace deleting and typing erratic. Calm blue tones enabled, auto break-reminders active.',
  CONFUSED: 'Long pauses and erratic mouse.concept refreshers and easier reference algorithm tabs popped.',
  BORED: 'Extremely slow engagement. Hard boss battle raids triggered, 1v1 challenges matched!',
  ANXIOUS: 'Rapid tab switching and high erratic pacing. Take a steady deep breath.'
};

const EmotionBadge = () => {
  const { 
    activeState, 
    themeColor, 
    forceEmotionState, 
    resetManualOverride,
    isManualOverride
  } = useEmotion();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="cp-emotion-badge-wrap">
      
      {/* Tiny floating 30% opacity trigger badge */}
      <button 
        className="cp-emotion-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          borderColor: themeColor,
          boxShadow: `0 0 10px ${themeColor}66`
        }}
      >
        <span className="cp-em-icon">{STATE_ICONS[activeState] || '🧘'}</span>
        <span className="cp-em-state-lbl" style={{ color: themeColor }}>
          {activeState}
        </span>
      </button>

      {/* Slide-out Override HUD Drawer */}
      {isOpen && (
        <div className="cp-emotion-drawer" style={{ borderColor: themeColor }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="cp-em-drawer-title" style={{ color: themeColor }}>
              🧠 COGNITIVE BIO-METRIC HUD
            </span>
            <button className="cp-em-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <p className="cp-em-diag-p">
            Real-time passive keyboard & mouse signals analyze your current mental velocity.
          </p>

          <div className="cp-em-metrics-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
              <span>CURRENT STATUS:</span>
              <strong style={{ color: STATE_COLORS[activeState] }}>{activeState}</strong>
            </div>
            <p className="cp-em-diag-desc">{STATE_DESCS[activeState]}</p>
          </div>

          {/* Manual state simulator overrides */}
          <div style={{ marginTop: '16px' }}>
            <span className="cp-em-drawer-title" style={{ fontSize: '0.62rem', color: '#666688' }}>
              TEST STATE ADAPTATIONS
            </span>
            
            <div className="cp-em-override-grid">
              {Object.keys(STATE_ICONS).map(state => (
                <button
                  key={state}
                  onClick={() => forceEmotionState(state)}
                  className={`cp-em-override-btn ${activeState === state ? 'active' : ''}`}
                  style={{ 
                    borderColor: activeState === state ? STATE_COLORS[state] : 'rgba(255,255,255,0.06)'
                  }}
                >
                  {STATE_ICONS[state]} {state}
                </button>
              ))}
            </div>

            {isManualOverride && (
              <button 
                onClick={resetManualOverride} 
                className="cp-toolbar-btn" 
                style={{ width: '100%', marginTop: '12px', fontSize: '0.65rem' }}
              >
                🔄 RESET TO PASSIVE DETECTOR
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default EmotionBadge;
