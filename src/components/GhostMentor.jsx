import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { getGhostHint } from '../services/aiService';
import './GhostMentor.css';

const GhostMentor = ({ code = '', problemTitle = '', errorCount = 0, wrongAnswers = 0, isAccepted = false }) => {
  const currentUser = auth.currentUser;

  // Active UI States
  const [isVisible, setIsVisible] = useState(false);
  const [hint, setHint] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hintsCount, setHintsCount] = useState(1);

  // Heuristics trackers
  const timeOnProblemRef = useRef(0);
  const lastCodeStateRef = useRef('');
  const codeUnchangedTimeRef = useRef(0);
  const deleteCountRef = useRef(0);
  const lastCodeLengthRef = useRef(0);

  // Prevents multiple triggers within a short window
  const coolDownRef = useRef(false);

  // 1. Silent Heuristic Monitor Loop (Runs every 30 seconds)
  useEffect(() => {
    if (isAccepted) return;

    lastCodeLengthRef.current = code.length;
    lastCodeStateRef.current = code;

    const monitorInterval = setInterval(async () => {
      // Increment total problem solve time
      timeOnProblemRef.current += 30;

      // Track if code has been unchanged (same line / identical editor content)
      if (code === lastCodeStateRef.current && code.length > 30) {
        codeUnchangedTimeRef.current += 30;
      } else {
        codeUnchangedTimeRef.current = 0;
      }

      // Track Write-Delete Heuristic
      // If code size drops substantially twice, user is deleting same code
      if (code.length < lastCodeLengthRef.current - 15) {
        deleteCountRef.current += 1;
      }
      
      lastCodeLengthRef.current = code.length;
      lastCodeStateRef.current = code;

      // ── CHECK TRIGGER CONDITIONS ──
      const isUnchangedFor90s = codeUnchangedTimeRef.current >= 90;
      const isWrongAnswerLimit = wrongAnswers >= 3;
      const isWriteDeleteDouble = deleteCountRef.current >= 2;
      const isTimeOutLimit = timeOnProblemRef.current >= 1500; // 25 minutes

      const shouldTrigger = (
        isUnchangedFor90s || 
        isWrongAnswerLimit || 
        isWriteDeleteDouble || 
        isTimeOutLimit
      );

      if (shouldTrigger && !coolDownRef.current && !isVisible) {
        triggerGhost("Heuristic thresholds exceeded. Transmit hint.");
      }

    }, 30000);

    return () => clearInterval(monitorInterval);
  }, [code, wrongAnswers, isAccepted, isVisible]);

  // 2. Local second tracker for standard timeOnProblem
  useEffect(() => {
    const clock = setInterval(() => {
      timeOnProblemRef.current += 1;
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // 3. Typewriter Effect
  useEffect(() => {
    if (!hint) {
      setDisplayedText('');
      return;
    }

    setDisplayedText('');
    let charIndex = 0;
    const interval = setInterval(() => {
      setDisplayedText(prev => prev + hint.charAt(charIndex));
      charIndex++;
      if (charIndex >= hint.length) {
        clearInterval(interval);
      }
    }, 30); // 30ms per character

    return () => clearInterval(interval);
  }, [hint]);

  // 4. Auto-dismiss timer (20 seconds)
  useEffect(() => {
    if (!isVisible) return;

    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 20000);

    return () => clearTimeout(dismissTimer);
  }, [isVisible]);

  // ── Action Handlers ──

  const triggerGhost = async (reason) => {
    setIsLoading(true);
    setIsVisible(true);
    coolDownRef.current = true;

    // Reset delete count tracking to prevent loops
    deleteCountRef.current = 0;

    try {
      const response = await getGhostHint(problemTitle, code, "", false);
      setHint(response);
      incrementAnalyticsCount();
    } catch (err) {
      console.error("Error triggering Ghost Mentor:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowMoreHints = async () => {
    setIsLoading(true);
    setHintsCount(prev => prev + 1);
    try {
      const response = await getGhostHint(problemTitle, code, "", true);
      setHint(response);
    } catch (err) {
      console.error("Error generating advanced hint:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setHint('');
    setDisplayedText('');
    // Cooldown lifts after 2 minutes to prevent spamming
    setTimeout(() => {
      coolDownRef.current = false;
    }, 120000);
  };

  const incrementAnalyticsCount = async () => {
    // 1. Local Storage increment
    const currentLocal = parseInt(localStorage.getItem('ghost_triggers_total') || '0', 10);
    localStorage.setItem('ghost_triggers_total', (currentLocal + 1).toString());

    // 2. Firestore Sync
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          ghostMentorTriggers: increment(1)
        });
      } catch (err) {
        console.warn("Could not sync ghost trigger count to Firestore:", err);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="cp-ghost-container">
      
      {/* Pixel Art Ghost Skull Avatar */}
      <div className="cp-ghost-avatar">
        <svg 
          width="48" 
          height="48" 
          viewBox="0 0 8 8" 
          className="cp-ghost-svg"
          style={{ shapeRendering: 'crispEdges' }}
        >
          {/* Skull Base Outline */}
          <rect x="2" y="1" width="4" height="6" fill="#18182E" />
          <rect x="1" y="2" width="6" height="4" fill="#18182E" />
          
          {/* Inner skull bone structure */}
          <rect x="2" y="2" width="4" height="4" fill="#E8E8FF" />
          <rect x="1" y="3" width="6" height="2" fill="#E8E8FF" />
          
          {/* Teeth Gaps */}
          <rect x="3" y="6" width="1" height="1" fill="#18182E" />
          <rect x="4" y="6" width="1" height="1" fill="#18182E" />
          
          {/* Nose Cavity */}
          <rect x="3" y="4" width="2" height="1" fill="#18182E" />
          
          {/* Glowing Pink Eyes */}
          <rect x="2" y="3" width="1" height="1" fill="#FF2D78" className="pink-eyes-glow" />
          <rect x="5" y="3" width="1" height="1" fill="#FF2D78" className="pink-eyes-glow" />
        </svg>
      </div>

      {/* Glowing Dialog Bubble */}
      <div className="cp-ghost-bubble">
        
        {/* Header HUD */}
        <div className="cp-ghost-header">
          <div className="cp-ghost-status">
            <span className="cp-ghost-dot" />
            <span className="cp-ghost-label">GHOST MENTOR</span>
          </div>
          <button className="cp-ghost-close" onClick={handleDismiss}>✕</button>
        </div>

        {/* Dynamic Typewriter text area */}
        <div className="cp-ghost-content">
          {isLoading ? (
            <span className="cp-ghost-loading">Channeling algorithmic algorithms...</span>
          ) : (
            <p className="cp-ghost-text">{displayedText}</p>
          )}
        </div>

        {/* Show More Hints Action */}
        {!isLoading && hint && (
          <button 
            className="cp-ghost-more-btn" 
            onClick={handleShowMoreHints}
          >
            🔮 SHOW MORE DETAILS (Tier {hintsCount})
          </button>
        )}
      </div>

    </div>
  );
};

export default GhostMentor;
