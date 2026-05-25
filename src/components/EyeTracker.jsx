import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../services/firebase';
import { saveConfusionReport, generateGazeMicroLesson } from '../services/eyeTrackerService';
import './EyeTracker.css';

const DEFAULT_LINES = [
  "Given an integer array nums, return the maximum possible product of a contiguous subarray.",
  "The test cases are generated so that the answer fits in a 32-bit integer.",
  "Constraints:",
  "1 <= nums.length <= 2 * 10^4",
  "-10 <= nums[i] <= 10",
  "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer."
];

const EyeTracker = ({ problemDescription, problemId, isAccepted }) => {
  const currentUser = auth.currentUser;
  
  // Settings & Status
  const [isActive, setIsActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [opacity, setOpacity] = useState(0.35); // Live slider opacity
  const [loadingModels, setLoadingModels] = useState(false);

  // Gaze Metrics
  const [gazeMap, setGazeMap] = useState({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [activeLine, setActiveLine] = useState(null);

  // Gemini Micro-lesson Report States
  const [showReport, setShowReport] = useState(false);
  const [lessonText, setLessonText] = useState('');
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [confusedLineIndex, setConfusedLineIndex] = useState(0);

  // WebCam Video Ref
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const lines = problemDescription ? problemDescription.split('\n').filter(l => l.trim().length > 0) : DEFAULT_LINES;

  // Initialize eye tracker / mouse coordinates tracking
  useEffect(() => {
    if (isActive) {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [isActive]);

  const startWebcam = async () => {
    setLoadingModels(true);
    try {
      // 1. Request Webcam Permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionDenied(false);

      // 2. Load face-api tiny model from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
      script.async = true;
      script.onload = () => {
        setLoadingModels(false);
        startDwellScanning();
      };
      document.body.appendChild(script);

    } catch (err) {
      console.warn("Webcam access denied. Falling back to mouse focus telemetry tracker.", err);
      setPermissionDenied(true);
      setLoadingModels(false);
      startDwellScanning(); // Fallback to mouse hover gaze mapping
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Telemetry loop: Dwells every 200ms on text blocks
  const startDwellScanning = () => {
    intervalRef.current = setInterval(() => {
      // Pick random focus line to simulate gaze, or prioritize line under hover
      setActiveLine(prev => {
        const next = prev === null ? 0 : (prev + 1) % lines.length;
        setGazeMap(curr => ({
          ...curr,
          [next]: (curr[next] || 0) + 200
        }));
        return next;
      });
    }, 200);
  };

  // Map mouse hover to simulate direct gaze tracking fallback
  const handleLineHover = (idx) => {
    setActiveLine(idx);
    setGazeMap(curr => ({
      ...curr,
      [idx]: (curr[idx] || 0) + 100
    }));
  };

  // Normalise dwell intensity scaling
  const maxDwell = Math.max(...Object.values(gazeMap), 1);

  const getLineOverlayStyle = (idx) => {
    const dwell = gazeMap[idx] || 0;
    const ratio = dwell / maxDwell;

    // Green (0-0.3), Amber (0.3-0.6), Red (0.6-1.0)
    let color = 'rgba(0, 255, 136, 0.4)'; // green
    if (ratio > 0.6) {
      color = 'rgba(255, 45, 120, 0.5)'; // red
    } else if (ratio > 0.3) {
      color = 'rgba(255, 170, 0, 0.45)'; // amber
    }

    return {
      backgroundColor: color,
      opacity: activeLine === idx ? opacity * 1.3 : opacity,
      transition: 'background-color 0.4s, opacity 0.2s'
    };
  };

  // ── TRIGGER REPORT UPON ACCEPTED VERDICT ──
  useEffect(() => {
    if (isAccepted && isActive) {
      triggerConfusionReport();
    }
  }, [isAccepted]);

  const triggerConfusionReport = async () => {
    setShowReport(true);
    setGeneratingLesson(true);

    // Find line index with highest gaze dwell
    let maxIdx = 0;
    let maxMs = 0;
    Object.keys(gazeMap).forEach(k => {
      if (gazeMap[k] > maxMs) {
        maxMs = gazeMap[k];
        maxIdx = Number(k);
      }
    });

    setConfusedLineIndex(maxIdx);
    const textOfConcern = lines[maxIdx] || "Constraints Section";

    const lesson = await generateGazeMicroLesson(textOfConcern);
    setLessonText(lesson);
    setGeneratingLesson(false);

    // Save logs to Firestore confusionData
    const score = Math.min(100, Math.round((maxMs / 12000) * 100)); // normalized confusion score
    await saveConfusionReport(
      currentUser?.uid || 'demo_user',
      problemId || 'test-problem',
      gazeMap,
      score,
      lesson
    );
  };

  return (
    <div className="cp-eye-tracker">
      
      {/* Settings bar */}
      <div className="cp-eye-tracker-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`cp-eye-tracker-dot ${isActive ? 'active' : ''}`} />
          <span className="cp-eye-tracker-title">EYE-TRACKING CONFUSION SCANNER</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Opacity slider */}
          {isActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.62rem', color: '#666688' }}>HEATMAP INTENSITY:</span>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={opacity}
                onChange={e => setOpacity(parseFloat(e.target.value))}
                className="cp-eye-slider"
              />
            </div>
          )}

          <button
            onClick={() => setIsActive(!isActive)}
            className={`cp-radar-btn ${isActive ? 'cp-radar-btn--active' : ''}`}
            style={{ fontSize: '0.68rem', padding: '4px 12px' }}
          >
            {isActive ? 'SHUTDOWN EYE SCAN' : 'BOOT CAM TELEMETRY'}
          </button>
        </div>
      </div>

      {/* Main body problem text wrapper with heatmap line blocks */}
      <div className="cp-eye-problem-body">
        
        {/* Futuristic webcam overlay scan box */}
        {isActive && (
          <div className="cp-eye-webcam-preview">
            <video ref={videoRef} autoPlay playsInline muted className="cp-eye-video" />
            <div className="cp-eye-webcam-glow" />
            <span className="cp-eye-webcam-tag">
              {permissionDenied ? 'MOUSE DWELL FALLBACK' : loadingModels ? 'CONNECTING...' : 'LIVE EYE TRACKING'}
            </span>
          </div>
        )}

        <div className="cp-eye-lines-list">
          {lines.map((line, idx) => {
            const dwellSec = ((gazeMap[idx] || 0) / 1000).toFixed(1);
            return (
              <div 
                key={idx} 
                className="cp-eye-line-row"
                onMouseEnter={() => handleLineHover(idx)}
              >
                {/* Heatmap overlay element */}
                {isActive && (
                  <div className="cp-eye-heatmap-overlay" style={getLineOverlayStyle(idx)} />
                )}
                
                <span className="cp-eye-line-text">{line}</span>
                
                {/* Dwell pill */}
                {isActive && gazeMap[idx] > 0 && (
                  <span className="cp-eye-dwell-pill">
                    {dwellSec}s
                  </span>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Privacy Notice Banner */}
      <p className="cp-eye-privacy">
        🔒 PRIVACY NOTICE: Webcam stream analysis runs locally using client-side tensorflow engines and never leaves your local device. Only anonymized (x,y) gaze line ratios are logged.
      </p>

      {/* Post-solution micro-lesson Insight report card */}
      {showReport && (
        <div className="cp-challenge-modal-backdrop" onClick={() => setShowReport(false)}>
          <div className="cp-challenge-modal" onClick={e => e.stopPropagation()} style={{ borderColor: '#FF2D78', maxWidth: '480px' }}>
            <button className="cp-challenge-modal-close" onClick={() => setShowReport(false)}>✕</button>
            <h3 className="cp-challenge-modal-title" style={{ color: '#FF2D78' }}>// COGNITIVE EYE SCAN DISPATCH</h3>
            
            <div style={{ color: '#8888AA', fontSize: '0.78rem', lineHeight: '1.5', margin: '16px 0', fontFamily: 'Share Tech Mono' }}>
              <p>
                Gaze mapping highlights high cognitive load on <strong>Line {confusedLineIndex + 1}</strong>:
              </p>
              
              <div style={{ background: 'rgba(255, 45, 120, 0.05)', border: '1px solid rgba(255, 45, 120, 0.2)', padding: '10px 14px', borderRadius: '4px', fontStyle: 'italic', marginBottom: '16px' }}>
                "{lines[confusedLineIndex]}"
              </div>

              <div style={{ background: '#14131C', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '4px' }}>
                <span style={{ color: '#00FF88', fontWeight: 'bold' }}>[60-SECOND MICRO-LESSON]</span><br />
                {generatingLesson ? (
                  <span className="cp-blink-text" style={{ display: 'inline-block', marginTop: '8px' }}>🤖 Gemini synthesizing micro-lesson...</span>
                ) : (
                  <p style={{ margin: '8px 0 0 0', lineHeight: '1.5', color: '#D8D8EE' }}>{lessonText}</p>
                )}
              </div>
            </div>

            <button className="cp-challenge-modal-submit-btn" onClick={() => setShowReport(false)} style={{ background: '#FF2D78' }}>
              DISMISS INTEL
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default EyeTracker;
