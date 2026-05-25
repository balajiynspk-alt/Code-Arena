import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, auth } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import './SkillRadar.css';

const AXES = ['Arrays', 'Trees', 'Graphs', 'DP', 'Math', 'Strings', 'Greedy', 'Backtracking'];

// easeOutBack animation curve
const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const SkillRadar = ({ userId, preContestScores = null, historicalScores = null }) => {
  const currentUser = auth.currentUser;
  const canvasRef = useRef(null);

  // Score states
  const [userScores, setUserScores] = useState([85, 60, 45, 50, 75, 80, 70, 40]);
  const [compareMode, setCompareMode] = useState(null); // 'top10' | 'friends' | null
  const [selectedFriend, setSelectedFriend] = useState('');

  // Interactive states
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [pulseIndex, setPulseIndex] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Coordinates of all vertices for hover tracking
  const [verticesCoords, setVerticesCoords] = useState([]);

  // Ideal benchmarks (Top 10% of CodeArena developers)
  const top10Scores = useMemo(() => [95, 90, 85, 92, 88, 94, 89, 85], []);

  // Mapped friend details
  const friendsData = useMemo(() => ({
    'alice_uid': { name: 'Alice (1650 Elo)', scores: [70, 55, 60, 40, 65, 72, 68, 35] },
    'bob_uid': { name: 'Bob (1890 Elo)', scores: [90, 80, 75, 85, 80, 85, 88, 70] },
    'charlie_uid': { name: 'Charlie (1420 Elo)', scores: [60, 45, 30, 35, 50, 55, 50, 25] }
  }), []);

  // Compute active comparison scores
  const comparisonScores = useMemo(() => {
    if (preContestScores) return preContestScores; // Embedded mode for contest results
    if (compareMode === 'top10') return top10Scores;
    if (compareMode === 'friends' && selectedFriend && friendsData[selectedFriend]) {
      return friendsData[selectedFriend].scores;
    }
    return null;
  }, [compareMode, selectedFriend, preContestScores, top10Scores, friendsData]);

  // Bind historicalScores updates
  useEffect(() => {
    if (historicalScores) {
      setUserScores(historicalScores);
    }
  }, [historicalScores]);

  // 1. Calculate dynamic skill index from User's Firestore stats on mount
  useEffect(() => {
    if (historicalScores) return; // Skip if in historical preview mode

    const fetchUserData = async () => {
      const targetId = userId || currentUser?.uid;
      if (!targetId) return;

      try {
        const snap = await getDoc(doc(db, 'users', targetId));
        if (snap.exists()) {
          const data = snap.val() || snap.data();
          // Map solved topic statistics to axes ratios if present, otherwise fall back to preset
          if (data.solvedTopics) {
            const mapped = AXES.map(topic => {
              const stats = data.solvedTopics[topic.toLowerCase()] || { easy: 0, medium: 0, hard: 0 };
              const score = (stats.easy * 1 + stats.medium * 2 + stats.hard * 3) * 5; // scaled out-of-100
              return Math.min(100, Math.max(15, score));
            });
            setUserScores(mapped);
          }
        }
      } catch (err) {
        console.warn("Could not retrieve custom user solved metrics, using benchmark preset:", err);
      }
    };

    fetchUserData();
  }, [userId, currentUser]);

  // 2. Load growth animation loop
  useEffect(() => {
    let start = null;
    const duration = 800; // 800ms animation duration

    const anim = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / duration);
      setAnimationProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(anim);
      }
    };

    requestAnimationFrame(anim);
  }, []);

  // 3. Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const cx = 220;
    const cy = 220;
    const radius = 130;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply animation scale using easeOutBack
    const animScale = easeOutBack(animationProgress);

    // ── Drawing concentric octagons (grid lines) ──
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    for (let r = 1; r <= 5; r++) {
      const ringRadius = (r / 5) * radius;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = i * (Math.PI / 4) - Math.PI / 2;
        const x = cx + ringRadius * Math.cos(angle);
        const y = cy + ringRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // ── Drawing 8 axis lines & labels ──
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillStyle = '#8888AA';
    ctx.font = '10px "Orbitron", sans-serif';

    const coords = [];

    for (let i = 0; i < 8; i++) {
      const angle = i * (Math.PI / 4) - Math.PI / 2;
      const ax = cx + radius * Math.cos(angle);
      const ay = cy + radius * Math.sin(angle);

      // Axis line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      // Axis label placement
      const lx = cx + (radius + 24) * Math.cos(angle);
      const ly = cx + (radius + 24) * Math.sin(angle);

      // Text Alignment calculations based on quadrant
      if (Math.abs(Math.cos(angle)) < 0.1) ctx.textAlign = 'center';
      else if (Math.cos(angle) > 0) ctx.textAlign = 'left';
      else ctx.textAlign = 'right';

      if (Math.abs(Math.sin(angle)) < 0.1) ctx.textBaseline = 'middle';
      else if (Math.sin(angle) > 0) ctx.textBaseline = 'top';
      else ctx.textBaseline = 'bottom';

      ctx.fillText(AXES[i].toUpperCase(), lx, ly);

      // Calculate user vertex coordinate for interactive hovers
      const userValRadius = (userScores[i] / 100) * radius * animScale;
      const ux = cx + userValRadius * Math.cos(angle);
      const uy = cy + userValRadius * Math.sin(angle);
      coords.push({ x: ux, y: uy, score: userScores[i], label: AXES[i] });
    }

    setVerticesCoords(coords);

    // ── Draw Comparison Polygon (Overlay) ──
    if (comparisonScores) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = i * (Math.PI / 4) - Math.PI / 2;
        const compValRadius = (comparisonScores[i] / 100) * radius * animScale;
        const cxVertex = cx + compValRadius * Math.cos(angle);
        const cyVertex = cy + compValRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(cxVertex, cyVertex);
        else ctx.lineTo(cxVertex, cyVertex);
      }
      ctx.closePath();

      // Style: Green `#00FF88` comparison
      ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#00FF88';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // ── Draw User Skill Polygon ──
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = i * (Math.PI / 4) - Math.PI / 2;
      const userValRadius = (userScores[i] / 100) * radius * animScale;
      const ux = cx + userValRadius * Math.cos(angle);
      const uy = cy + userValRadius * Math.sin(angle);
      if (i === 0) ctx.moveTo(ux, uy);
      else ctx.lineTo(ux, uy);
    }
    ctx.closePath();

    // Style: Pink `#FF2D78` User outline
    ctx.fillStyle = 'rgba(255, 45, 120, 0.22)';
    ctx.fill();
    ctx.strokeStyle = '#FF2D78';
    ctx.lineWidth = 3;
    ctx.stroke();

    // ── Draw glowing vertices ──
    coords.forEach((c, idx) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = idx === hoveredIndex ? '#FFAA00' : '#FF2D78';
      ctx.shadowBlur = idx === hoveredIndex ? 10 : 4;
      ctx.shadowColor = idx === hoveredIndex ? '#FFAA00' : '#FF2D78';
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    });

    // ── Render new unlock "Pulse Burst" on a specified axis ──
    if (pulseIndex !== null) {
      const angle = pulseIndex * (Math.PI / 4) - Math.PI / 2;
      const pulseValRadius = (userScores[pulseIndex] / 100) * radius * animScale;
      const px = cx + pulseValRadius * Math.cos(angle);
      const py = cy + pulseValRadius * Math.sin(angle);

      // Draw growing pulse ring
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

  }, [animationProgress, userScores, comparisonScores, hoveredIndex, pulseIndex]);

  // 4. Mouse movement mouse coordinates translation for tooltip hovers
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let foundIdx = null;
    for (let i = 0; i < verticesCoords.length; i++) {
      const c = verticesCoords[i];
      const dist = Math.hypot(mx - c.x, my - c.y);
      if (dist < 8) {
        foundIdx = i;
        setTooltipPos({ x: c.x, y: c.y });
        break;
      }
    }

    setHoveredIndex(foundIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Mock unlock pulse trigger
  const triggerPulse = (idx) => {
    setPulseIndex(idx);
    setTimeout(() => setPulseIndex(null), 1000);
  };

  // Calculate generic mock rank percentage
  const getRank = (score) => {
    if (score >= 90) return 'TOP 5%';
    if (score >= 80) return 'TOP 12%';
    if (score >= 70) return 'TOP 20%';
    if (score >= 50) return 'TOP 45%';
    return 'TOP 70%';
  };

  return (
    <div className="cp-radar-card">
      
      {/* Radar HUD controls */}
      <div className="cp-radar-header">
        <h3 className="cp-radar-title">GENOMIC SKILL RADAR</h3>

        {!preContestScores && (
          <div className="cp-radar-controls">
            
            {/* Compare benchmarks toggle */}
            <button 
              className={`cp-radar-btn ${compareMode === 'top10' ? 'cp-radar-btn--active' : ''}`}
              onClick={() => {
                setCompareMode(compareMode === 'top10' ? null : 'top10');
                triggerPulse(0);
              }}
            >
              TOP 10% IDEAL
            </button>

            {/* Friends compare selector */}
            <select 
              className="cp-radar-select"
              value={selectedFriend}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedFriend(val);
                setCompareMode(val ? 'friends' : null);
              }}
            >
              <option value="">COMPARE WITH FRIENDS...</option>
              {Object.keys(friendsData).map(uid => (
                <option key={uid} value={uid}>
                  {friendsData[uid].name}
                </option>
              ))}
            </select>

          </div>
        )}
      </div>

      {/* Radar viewport frame */}
      <div className="cp-radar-viewport" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        
        <canvas 
          ref={canvasRef}
          width={440}
          height={440}
          style={{ width: '440px', height: '440px', cursor: hoveredIndex !== null ? 'pointer' : 'default' }}
        />

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && verticesCoords[hoveredIndex] && (
          <div 
            className="cp-radar-tooltip"
            style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          >
            <span className="cp-radar-tooltip-title">
              {verticesCoords[hoveredIndex].label.toUpperCase()}
            </span>
            <span className="cp-radar-tooltip-score">
              Score: <strong>{verticesCoords[hoveredIndex].score} / 100</strong>
            </span>
            <span className="cp-radar-tooltip-rank">
              Rank: <strong>{getRank(verticesCoords[hoveredIndex].score)}</strong>
            </span>
          </div>
        )}

      </div>

    </div>
  );
};

export default SkillRadar;
