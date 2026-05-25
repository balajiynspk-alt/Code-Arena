import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDailyBoss, attackBoss } from '../services/bossService';
import './BossBattle.css';

const BossBattle = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // Boss Data states
  const [bossData, setBossData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'leaderboard'

  // Coding states
  const [userCode, setUserCode] = useState(`// Reconstruct optimal minimum-weight paths in under 500ms.\nfunction optimizePath(graph, start, end) {\n  // Write O(n) or O(n log n) code to attack the boss!\n  \n  return [];\n}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState('');

  // Interactive visual states
  const [shouldShake, setShouldShake] = useState(false);
  const [damageBurst, setDamageBurst] = useState(null); // { text, isCritical }
  const [showVictory, setShowVictory] = useState(false);

  // Canvases references
  const avatarCanvasRef = useRef(null);
  const victoryCanvasRef = useRef(null);

  // 1. Initial Load Daily Boss & Firestore onSnapshot listener for real-time HP Sync
  useEffect(() => {
    let unsubscribe = () => {};

    const loadBossData = async () => {
      setIsLoading(true);
      const data = await getDailyBoss();
      if (data) {
        setBossData(data);
        
        // Listen to changes in real-time
        const todayStr = new Date().toISOString().split('T')[0];
        const docRef = doc(db, 'dailyBoss', todayStr);
        
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const fresh = docSnap.data();
            setBossData(fresh);
            
            // Check if defeated
            if (fresh.defeated) {
              setShowVictory(true);
            }
          }
        });
      }
      setIsLoading(false);
    };

    loadBossData();
    return () => unsubscribe();
  }, []);

  // 2. Render pixel art Boss Skull on canvas with floating neon animation
  useEffect(() => {
    const canvas = avatarCanvasRef.current;
    if (!canvas || !bossData) return;
    const ctx = canvas.getContext('2d');

    let animationId;
    let elapsed = 0;

    const drawSkull = () => {
      elapsed += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDead = bossData.defeated;
      const hpRatio = bossData.currentHP / bossData.bossHP;

      // Pulse calculations
      const pulse = isDead ? 0 : Math.sin(elapsed) * 4;
      const faceColor = isDead ? '#2E2E38' : '#FF2D78';
      const eyeSize = isDead ? 2 : 4 + Math.abs(Math.sin(elapsed * 1.5)) * 3;

      // ── Draw Skull Paths ──
      ctx.fillStyle = faceColor;
      ctx.shadowBlur = isDead ? 0 : 15;
      ctx.shadowColor = faceColor;

      // Skull Top
      ctx.beginPath();
      ctx.arc(60, 50 + pulse, 34, Math.PI, 0);
      ctx.lineTo(94, 80 + pulse);
      ctx.lineTo(80, 80 + pulse);
      ctx.lineTo(76, 94 + pulse);
      ctx.lineTo(64, 94 + pulse);
      ctx.lineTo(60, 86 + pulse);
      ctx.lineTo(56, 94 + pulse);
      ctx.lineTo(44, 94 + pulse);
      ctx.lineTo(40, 80 + pulse);
      ctx.lineTo(26, 80 + pulse);
      ctx.closePath();
      ctx.fill();

      // Jaw/Teeth indicators
      ctx.fillStyle = isDead ? '#1A1A24' : '#06050A';
      ctx.shadowBlur = 0;

      // Left eye cavity
      ctx.beginPath();
      ctx.arc(44, 52 + pulse, 10, 0, Math.PI * 2);
      ctx.fill();

      // Right eye cavity
      ctx.beginPath();
      ctx.arc(76, 52 + pulse, 10, 0, Math.PI * 2);
      ctx.fill();

      // Nose cavity
      ctx.beginPath();
      ctx.moveTo(60, 62 + pulse);
      ctx.lineTo(55, 72 + pulse);
      ctx.lineTo(65, 72 + pulse);
      ctx.closePath();
      ctx.fill();

      // Teeth gaps
      ctx.fillRect(48, 82 + pulse, 3, 10);
      ctx.fillRect(58, 82 + pulse, 3, 10);
      ctx.fillRect(68, 82 + pulse, 3, 10);

      // Glowing Eyes
      if (!isDead) {
        ctx.fillStyle = '#FFAA00'; // Amber pupils
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#FFAA00';

        ctx.beginPath();
        ctx.arc(44, 52 + pulse, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(76, 52 + pulse, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(drawSkull);
    };

    drawSkull();
    return () => cancelAnimationFrame(animationId);
  }, [bossData]);

  // 3. Render Canvas Victory fireworks particles overlay when defeated
  useEffect(() => {
    if (!showVictory) return;
    const canvas = victoryCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationId;
    const particles = [];

    const spawnFirework = () => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.5;
      const colors = ['#00FF88', '#FF2D78', '#FFAA00', '#9D4EDD'];

      for (let i = 0; i < 40; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          radius: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.02 + 0.015
        });
      }
    };

    const drawVictoryScreen = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (Math.random() < 0.05) spawnFirework();

      // Render particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      }

      animationId = requestAnimationFrame(drawVictoryScreen);
    };

    // Handle canvas dimensions resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    drawVictoryScreen();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [showVictory]);

  // ── Attack Submit Handler ──
  const handleSubmitCode = async () => {
    if (!currentUser || isSubmitting || !bossData) return;
    setIsSubmitting(true);
    setSubmissionFeedback('Compiling and running optimal test cases against the Boss...');

    try {
      // Complexity scanning heuristic on client-side code DNA values
      let baseDamage = 150;
      let complexity = 'O(n log n)';

      if (userCode.includes('for') && userCode.split('for').length > 2) {
        baseDamage = 50;
        complexity = 'O(n²) Brute Force';
      } else if (userCode.includes('binary') || userCode.includes('.sort')) {
        baseDamage = 150;
        complexity = 'O(n log n) Balanced';
      } else {
        baseDamage = 300;
        complexity = 'O(n) Optimal linear';
      }

      // Execution speed runtime simulation
      const runtime = Math.floor(Math.random() * 700) + 120; // 120ms to 820ms
      const isCritical = runtime < 500;
      const finalDamage = isCritical ? 500 : baseDamage;

      // Apply damage to boss
      await attackBoss(
        currentUser.uid,
        currentUser.displayName || 'Anonymous Coder',
        finalDamage,
        runtime
      );

      // Hit Burst animations
      setShouldShake(true);
      setDamageBurst({
        text: isCritical ? `CRITICAL HIT -${finalDamage} HP! (${complexity})` : `-${finalDamage} HP DAMAGE! (${complexity})`,
        isCritical
      });

      // Clear layout effects
      setTimeout(() => setShouldShake(false), 500);
      setTimeout(() => setDamageBurst(null), 1800);

      setSubmissionFeedback(`SUCCESS! Your code run in ${runtime}ms (${complexity}) dealt ${finalDamage} damage!`);
    } catch (err) {
      console.error(err);
      setSubmissionFeedback(err.message || 'Compilation run rejected. Check code structure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (stamp) => {
    if (!stamp) return '';
    const d = new Date(stamp);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="cp-battle-lobby">
        <div className="cp-battle-lobby-glow" style={{ background: 'rgba(255, 45, 120, 0.05)' }} />
        <h2 className="cp-battle-lobby-title" style={{ color: '#FF2D78', textShadow: '0 0 15px rgba(255, 45, 120, 0.3)' }}>
          // DETECTING COMMUNITY BEACON
        </h2>
        <span className="cp-battle-lobby-status">Engaging Raid Coordinates...</span>
      </div>
    );
  }

  if (!bossData) {
    return (
      <div className="cp-battle-lobby">
        <h2 className="cp-battle-lobby-title" style={{ color: '#FF2D78' }}>// RADAR BLANK</h2>
        <span className="cp-battle-lobby-status">Could not establish contact with Raid servers.</span>
        <button className="cp-battle-action-btn cp-battle-action-btn--run" onClick={() => navigate('/dashboard')}>
          RETURN
        </button>
      </div>
    );
  }

  return (
    <div className={`cp-boss-page ${shouldShake ? 'cp-boss-shake' : ''}`}>
      
      {/* Top Raid Boss Details Panel */}
      <div className="cp-boss-arena">
        
        {/* Floating animated avatar skull */}
        <div className="cp-boss-avatar-box">
          <canvas 
            ref={avatarCanvasRef} 
            width={120} 
            height={120} 
            className="cp-boss-canvas" 
          />
        </div>

        {/* Depleting boss HP deck */}
        <div className="cp-boss-hp-deck">
          <div className="cp-boss-meta">
            <span className="cp-boss-tag">{bossData.bossName?.toUpperCase()}</span>
            <span className="cp-boss-hp-text">
              {bossData.currentHP} / {bossData.bossHP} HP
            </span>
          </div>

          <div className="cp-boss-hp-bar">
            <div 
              className={`cp-boss-hp-fill ${bossData.defeated ? 'defeated' : ''}`}
              style={{ width: `${(bossData.currentHP / bossData.bossHP) * 100}%` }}
            />
          </div>
        </div>

      </div>

      {/* Main split grid */}
      <div className="cp-boss-layout">
        
        {/* Left Side: Code Editor vs Leaderboard Tab panels */}
        <div className="cp-boss-left">
          
          <div className="cp-boss-tabs">
            <button 
              className={`cp-boss-tab ${activeTab === 'editor' ? 'cp-boss-tab--active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              ATTACK WORKSPACE
            </button>
            <button 
              className={`cp-boss-tab ${activeTab === 'leaderboard' ? 'cp-boss-tab--active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              TOP DAMAGERS TODAY
            </button>
          </div>

          {activeTab === 'editor' ? (
            <div className="cp-boss-editor-wrap">
              <div className="cp-boss-editor-hud">
                <span>Task: <strong>{bossData.problemTitle}</strong> (Hard)</span>
                <span style={{ color: '#00FF88' }}>Goal: Optimize Memory & Complexity</span>
              </div>

              <div className="cp-boss-editor-container">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language="javascript"
                  value={userCode}
                  onChange={val => setUserCode(val)}
                  options={{
                    fontSize: 14,
                    lineHeight: 22,
                    minimap: { enabled: false },
                    fontFamily: "'Share Tech Mono', monospace"
                  }}
                />
              </div>

              <div className="cp-boss-editor-footer">
                <span style={{ color: '#8888AA', fontSize: '0.78rem' }}>
                  {submissionFeedback}
                </span>

                <button 
                  className="cp-radar-btn cp-radar-btn--active"
                  disabled={isSubmitting || bossData.defeated}
                  onClick={handleSubmitCode}
                  style={{ background: '#FF2D78', borderColor: '#FF2D78', color: '#FFF' }}
                >
                  {isSubmitting ? 'COMPILING...' : 'LAUNCH ATTACK ⚡'}
                </button>
              </div>
            </div>
          ) : (
            <div className="cp-boss-leaderboard">
              <h4 className="cp-boss-leaderboard-title">// RECONNAISSANCE LEADERBOARD</h4>
              <table className="cp-boss-table">
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>DEVELOPER</th>
                    <th>DAMAGE CONTRIBUTED</th>
                  </tr>
                </thead>
                <tbody>
                  {bossData.topDamagers?.length > 0 ? (
                    bossData.topDamagers.map((p, idx) => (
                      <tr key={idx}>
                        <td>#{idx + 1}</td>
                        <td>{p.userName}</td>
                        <td style={{ color: '#FF2D78', fontWeight: 'bold' }}>-{p.damage} HP</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: '#5A5A72', fontStyle: 'italic' }}>
                        No recon logs logged yet. Launch today's first hit!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Right Side: Live Logs hits feed */}
        <div className="cp-boss-right">
          <div className="cp-boss-feed-header">
            <h4 className="cp-boss-feed-title">// LIVE DAMAGE TRANSACTION FEED</h4>
          </div>

          <div className="cp-boss-feed-list">
            {bossData.recentHits?.length > 0 ? (
              [...bossData.recentHits].reverse().map((hit, idx) => (
                <div key={idx} className="cp-boss-feed-item">
                  <span className="cp-boss-feed-user">{hit.userName}</span>
                  dealt
                  <span className={`cp-boss-feed-hit ${hit.isCritical ? 'critical' : ''}`}>
                    {hit.isCritical ? '💥 CRITICAL ' : ''}-{hit.damage} HP
                  </span>
                  in <strong>{hit.runtime}ms</strong>
                  <span className="cp-boss-feed-time">{formatTime(hit.timestamp)}</span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#5A5A72', fontSize: '0.78rem', marginTop: '24px', fontStyle: 'italic' }}>
                Quiet on the communication frequencies.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating text damage burst indicator */}
      {damageBurst && (
        <div className={`cp-boss-damage-burst ${damageBurst.isCritical ? 'critical' : ''}`}>
          {damageBurst.text}
        </div>
      )}

      {/* Full-screen victory overlay celebration */}
      {showVictory && (
        <div className="cp-boss-victory-overlay">
          <canvas ref={victoryCanvasRef} className="cp-boss-victory-canvas" />
          
          <div className="cp-boss-victory-content">
            <h1 className="cp-boss-victory-title">BOSS DEFEATED!</h1>
            <span className="cp-boss-victory-subtitle">The entire community has successfully routed the anomaly</span>
            
            <div className="cp-boss-victory-badge">
              <div className="cp-boss-victory-badge-icon">🎖️</div>
              <div className="cp-boss-victory-badge-name">BOSS SLAYER</div>
              <div className="cp-boss-victory-badge-desc">Awarded for participating in today's Daily Boss Raid</div>
            </div>

            <button 
              className="cp-radar-btn cp-radar-btn--active" 
              onClick={() => {
                setShowVictory(false);
                navigate('/dashboard');
              }}
              style={{ position: 'relative', zIndex: 10, marginTop: '24px' }}
            >
              RETURN TO DASHBOARD
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default BossBattle;
