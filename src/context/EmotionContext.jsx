import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth } from '../services/firebase';
import { logEmotionState } from '../services/emotionService';

const EmotionContext = createContext();

export const EmotionProvider = ({ children }) => {
  const currentUser = auth.currentUser;

  // Real-time emotion classification state
  const [activeState, setActiveState] = useState('CALM'); // CALM, FLOW STATE, FRUSTRATED, CONFUSED, BORED, ANXIOUS
  
  // Custom manual override state
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Behavioral Telemetry Metrics
  const keystrokesCount = useRef(0);
  const backspaceCount = useRef(0);
  const mouseDistance = useRef(0);
  const inactiveSeconds = useRef(0);
  const tabSwitches = useRef(0);
  const submitsCount = useRef(0);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // ── Global Adaptations ──
  const [themeColor, setThemeColor] = useState('#FF2D78'); // Pink default
  const [isMinimalMode, setIsMinimalMode] = useState(false);
  const [cognitiveTrigger, setCognitiveTrigger] = useState(null); // break-reminder, refresher-tip, combat-challenge

  // Track global document mouse movement, keys, and tab visibility
  useEffect(() => {
    const handleKeyPress = (e) => {
      keystrokesCount.current += 1;
      inactiveSeconds.current = 0;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        backspaceCount.current += 1;
      }
    };

    const handleMouseMove = (e) => {
      const dx = Math.abs(e.clientX - lastMousePos.current.x);
      const dy = Math.abs(e.clientY - lastMousePos.current.y);
      mouseDistance.current += dx + dy;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitches.current += 1;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ── Telemetry Analysis Loop (Every 5 seconds) ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (isManualOverride) return;

      const kps = keystrokesCount.current / 5;
      const backspaceRatio = backspaceCount.current / Math.max(1, keystrokesCount.current);
      const mouseErratic = mouseDistance.current > 6000;
      const stuckState = inactiveSeconds.current >= 4;
      const switches = tabSwitches.current;
      const submits = submitsCount.current;

      let newState = 'CALM';

      if (kps >= 1.5 && backspaceRatio < 0.08 && !stuckState) {
        newState = 'FLOW STATE';
      } else if (backspaceRatio >= 0.22 || submits >= 2 || (kps >= 1.2 && mouseErratic)) {
        newState = 'FRUSTRATED';
      } else if (stuckState && mouseErratic && kps > 0 && kps < 0.8) {
        newState = 'CONFUSED';
      } else if (kps < 0.25 && inactiveSeconds.current >= 8) {
        newState = 'BORED';
      } else if (switches >= 2 && kps >= 1.0) {
        newState = 'ANXIOUS';
      }

      updateEmotionState(newState);

      // Reset intervals and counts
      keystrokesCount.current = 0;
      backspaceCount.current = 0;
      mouseDistance.current = 0;
      tabSwitches.current = 0;
      submitsCount.current = 0;
    }, 5000);

    return () => clearInterval(interval);
  }, [isManualOverride]);

  // Keep track of inactivity bounds every second
  useEffect(() => {
    const timer = setInterval(() => {
      inactiveSeconds.current += 1;
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateEmotionState = (state) => {
    setActiveState(state);

    // Apply adaptations
    if (state === 'FLOW STATE') {
      setThemeColor('#00FF88'); // Glowing green
      setIsMinimalMode(true);
      setCognitiveTrigger(null);
    } else if (state === 'FRUSTRATED') {
      setThemeColor('#00AAFF'); // Calming Blue
      setIsMinimalMode(false);
      setCognitiveTrigger('break-reminder');
    } else if (state === 'CONFUSED') {
      setThemeColor('#FFAA00'); // Warning Amber
      setIsMinimalMode(false);
      setCognitiveTrigger('refresher-tip');
    } else if (state === 'BORED') {
      setThemeColor('#AA66FF'); // Cyber Purple
      setIsMinimalMode(false);
      setCognitiveTrigger('combat-challenge');
    } else {
      setThemeColor('#FF2D78'); // Default pink accent
      setIsMinimalMode(false);
      setCognitiveTrigger(null);
    }

    // Persist daily emotion logs
    if (currentUser) {
      logEmotionState(currentUser.uid, state, 5);
    }
  };

  // Allow manual state testing
  const forceEmotionState = (state) => {
    setIsManualOverride(true);
    updateEmotionState(state);
  };

  const resetManualOverride = () => {
    setIsManualOverride(false);
  };

  const registerSubmitAttempt = () => {
    submitsCount.current += 1;
  };

  return (
    <EmotionContext.Provider value={{
      activeState,
      themeColor,
      isMinimalMode,
      cognitiveTrigger,
      forceEmotionState,
      resetManualOverride,
      isManualOverride,
      registerSubmitAttempt,
      telemetryStats: {
        keystrokes: keystrokesCount.current,
        backspaces: backspaceCount.current,
        mouseMovement: mouseDistance.current,
        inactiveTime: inactiveSeconds.current
      }
    }}>
      {children}
    </EmotionContext.Provider>
  );
};

export const useEmotion = () => useContext(EmotionContext);
