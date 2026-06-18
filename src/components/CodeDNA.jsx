import React, { useRef, useEffect, useState } from 'react';
import './CodeDNA.css';

const TRAIT_MAP = {
  loops: {
    label: 'Loops (for/while)',
    color: '#FF2D78',
    index: 0,
    desc: 'Represents repetitive execution blocks. Count of for/while statements.'
  },
  recursion: {
    label: 'Recursion Calls',
    color: '#00FF88',
    index: 1,
    desc: 'Self-referencing function execution. Direct recursion calls.'
  },
  comprehensions: {
    label: 'Comprehensions / Chains',
    color: '#FFA040',
    index: 2,
    desc: 'Python list/dict comprehensions, or JavaScript array map/filter chains.'
  },
  builtins: {
    label: 'Built-in Functions',
    color: '#9D4EDD',
    index: 3,
    desc: 'Usage of standard language built-in library utilities.'
  },
  avgLineLength: {
    label: 'Average Line Length',
    color: '#00E5FF',
    index: 4,
    desc: 'Code compactness metric. Average characters per substantial line.'
  },
  commentRatio: {
    label: 'Comment Density',
    color: '#CCFF00',
    index: 5,
    desc: 'Ratio of comments containing lines vs total code body.'
  },
  namingStyle: {
    label: 'Naming Convention',
    color: '#FF6D00',
    index: 6,
    desc: 'Variables and function definitions casing style: snake_case vs camelCase.'
  }
};

const CodeDNA = ({ currentDNA, lastDNA, submissionsHistory, language }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const animationFrameId = useRef(null);

  // Check if a specific trait is mutated compared to last accepted submission
  const isMutated = (trait) => {
    if (!lastDNA) return false;
    return currentDNA[trait] !== lastDNA[trait];
  };

  // Check if there are any mutations at all between current and last
  const hasAnyMutation = () => {
    if (!lastDNA) return false;
    return Object.keys(TRAIT_MAP).some(trait => isMutated(trait));
  };

  // Convert traits into readable percentages/scores for the progress bars
  const getTraitPercentage = (trait, val) => {
    switch (trait) {
      case 'loops':
        return Math.min(100, val * 20); // 5 loops = 100%
      case 'recursion':
        return val > 0 ? Math.min(100, val * 50) : 0; // 2 recursive calls = 100%
      case 'comprehensions':
        return Math.min(100, val * 25); // 4 comprehensions = 100%
      case 'builtins':
        return Math.min(100, val * 10); // 10 built-ins = 100%
      case 'avgLineLength':
        return Math.min(100, (val / 80) * 100); // 80 chars per line standard = 100%
      case 'commentRatio':
        return Math.min(100, val * 100); // comment ratio percentage directly
      case 'namingStyle':
        return val === 'mixed' ? 50 : 100; // mixed is 50%, clean camel/snake is 100%
      default:
        return 0;
    }
  };

  // Render format for raw trait values
  const formatTraitValue = (trait, val) => {
    if (trait === 'commentRatio') {
      return `${Math.round(val * 100)}%`;
    }
    if (trait === 'avgLineLength') {
      return `${val} ch`;
    }
    if (trait === 'namingStyle') {
      return val;
    }
    return val;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Double Helix Canvas drawing configurations
    const width = 560;
    const height = 160;
    canvas.width = width;
    canvas.height = height;

    const yc = height / 2;
    const amplitude = 32;
    const helixLength = 480;
    const startX = 40;
    const numTurns = 2.5; // 2.5 full turns along the canvas

    let phase = 0;
    let currentSpeed = 0.015;

    const render = () => {
      // Clear canvas with a very soft grid backdrop
      ctx.fillStyle = '#0A0A0F';
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal reference center-line (dashed cyber grid)
      ctx.beginPath();
      ctx.setLineDash([5, 10]);
      ctx.moveTo(10, yc);
      ctx.lineTo(width - 10, yc);
      ctx.strokeStyle = '#1D1D2C';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // Smoothly transition speed on hover
      const targetSpeed = isHovered ? 0.045 : 0.015;
      currentSpeed += (targetSpeed - currentSpeed) * 0.1;
      phase += currentSpeed;

      // Draw background segments of Wave A and Wave B first (painter's 3D sort heuristic)
      // We draw in two passes: first background parts (z < 0), then vertical base pairs, then foreground parts (z >= 0)
      
      const drawHelixBackboneSegment = (isForegroundPass) => {
        // Wave A (Pink #FF2D78) and Wave B (Green #00FF88) backbones
        for (let x = startX; x < startX + helixLength; x += 2) {
          const t = ((x - startX) / helixLength) * Math.PI * 2 * numTurns;
          
          const zA = Math.cos(t + phase);
          const zB = -Math.cos(t + phase);

          // Skip if we are drawing the wrong depth pass
          if (isForegroundPass) {
            if (zA < 0 && zB < 0) continue;
          } else {
            if (zA >= 0 && zB >= 0) continue;
          }

          const yA = yc + amplitude * Math.sin(t + phase);
          const yB = yc - amplitude * Math.sin(t + phase);

          // Wave A (Pink)
          if ((isForegroundPass && zA >= 0) || (!isForegroundPass && zA < 0)) {
            const radA = 2 + (zA + 1) * 0.8;
            const alphaA = 0.2 + (zA + 1) * 0.4;
            ctx.beginPath();
            ctx.arc(x, yA, radA, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 45, 120, ${alphaA})`;
            ctx.fill();
          }

          // Wave B (Green)
          if ((isForegroundPass && zB >= 0) || (!isForegroundPass && zB < 0)) {
            const radB = 2 + (zB + 1) * 0.8;
            const alphaB = 0.2 + (zB + 1) * 0.4;
            ctx.beginPath();
            ctx.arc(x, yB, radB, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 136, ${alphaB})`;
            ctx.fill();
          }
        }
      };

      // Draw background backbone
      drawHelixBackboneSegment(false);

      // Draw the 7 Base Pairs representing the 7 traits
      const traits = Object.keys(TRAIT_MAP);
      traits.forEach((trait, i) => {
        const mapInfo = TRAIT_MAP[trait];
        
        // Position along helix
        const xVal = startX + (i / 6) * helixLength;
        const t = (i / 6) * Math.PI * 2 * numTurns;

        const yA = yc + amplitude * Math.sin(t + phase);
        const yB = yc - amplitude * Math.sin(t + phase);
        const zA = Math.cos(t + phase);
        const zB = -Math.cos(t + phase);

        const mutated = isMutated(trait);
        const pulse = mutated ? 1 + 0.3 * Math.sin(Date.now() / 120) : 1;

        // Draw Connector Line (representing the base-pair bonds)
        ctx.beginPath();
        ctx.moveTo(xVal, yA);
        ctx.lineTo(xVal, yB);

        // Gradient connector using trait color
        const grad = ctx.createLinearGradient(xVal, yA, xVal, yB);
        const hexColor = mapInfo.color;
        
        // Blend alpha depending on average depth of the pair
        const avgDepth = (zA + zB) / 2; // will be 0 theoretically, but we scale by depth
        const alphaLine = mutated ? 0.9 : 0.45 + zA * 0.15;
        
        grad.addColorStop(0, `rgba(255, 45, 120, ${alphaLine})`);
        grad.addColorStop(0.3, hexColor);
        grad.addColorStop(0.7, hexColor);
        grad.addColorStop(1, `rgba(0, 255, 136, ${alphaLine})`);
        
        ctx.strokeStyle = grad;
        ctx.lineWidth = (mutated ? 3.5 : 2) * pulse;

        // Apply mutation neon glow to base pairs
        if (mutated) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = hexColor;
        }

        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        // Draw Nodes
        // Node A on Pink Backbone (Wave A)
        const radA = (5 + zA * 1.5) * (mutated ? 1.25 : 1) * pulse;
        ctx.beginPath();
        ctx.arc(xVal, yA, radA, 0, Math.PI * 2);
        ctx.fillStyle = mutated ? '#FF2D78' : `rgba(255, 45, 120, ${0.6 + zA * 0.4})`;
        ctx.fill();

        // Node B on Green Backbone (Wave B)
        const radB = (5 + zB * 1.5) * (mutated ? 1.25 : 1) * pulse;
        ctx.beginPath();
        ctx.arc(xVal, yB, radB, 0, Math.PI * 2);
        ctx.fillStyle = mutated ? '#00FF88' : `rgba(0, 255, 136, ${0.6 + zB * 0.4})`;
        ctx.fill();

        // Additional pulsing neon containment ring if mutated
        if (mutated) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = hexColor;
          
          ctx.beginPath();
          ctx.arc(xVal, yA, radA * 1.8, 0, Math.PI * 2);
          ctx.strokeStyle = '#FF2D78';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(xVal, yB, radB * 1.8, 0, Math.PI * 2);
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.shadowBlur = 0; // Reset
        }
      });

      // Draw foreground backbone
      drawHelixBackboneSegment(true);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isHovered, currentDNA, lastDNA]);

  // Extract mutated traits for convenient listing
  const mutatedTraitsList = Object.keys(TRAIT_MAP).filter(trait => isMutated(trait));

  return (
    <div 
      className="cp-dna-container" 
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── HEADER ── */}
      <div className="cp-dna-header">
        <h2 className="cp-dna-title">// CODE DNA FINGERPRINT</h2>
        <span className="cp-dna-subtitle">ACTIVE GENOME SCANNER</span>
      </div>

      {/* ── CANVAS VISUALIZER ── */}
      <div className="cp-dna-canvas-wrapper">
        <canvas className="cp-dna-canvas" ref={canvasRef} />
        <span className="cp-dna-hover-hint">HOVER TO ACCELERATE TRANSCRIPTION</span>
      </div>

      {/* ── TRANSCRIBED COMPLEXITY METRICS ── */}
      <div style={{
        background: 'rgba(255, 45, 120, 0.03)',
        border: '1px solid rgba(255, 45, 120, 0.25)',
        borderRadius: '6px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 0 15px rgba(255, 45, 120, 0.05)'
      }}>
        <div style={{
          fontFamily: 'Orbitron',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          color: '#FF2D78',
          letterSpacing: '2px',
          borderBottom: '1px solid rgba(255, 45, 120, 0.15)',
          paddingBottom: '8px'
        }}>
          🧬 TRANSCRIBED COMPLEXITY METRICS
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px'
        }}>
          {[
            { label: 'RECURSION SCORE', value: 82, color: '#FF2D78' },
            { label: 'LOOP DENSITY', value: 74, color: '#00FF88' },
            { label: 'CODE QUALITY', value: 91, color: '#FFD700' },
            { label: 'COMPLEXITY RATING', value: 87, color: '#00E5FF' },
            { label: 'COMMENT COVERAGE', value: 76, color: '#CCFF00' }
          ].map(m => (
            <div key={m.label} style={{
              background: '#0F0F1A',
              border: '1px solid rgba(255, 255, 255, 0.03)',
              borderRadius: '4px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '0.62rem', color: '#8888AA', letterSpacing: '1px' }}>{m.label}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  fontFamily: 'Orbitron',
                  color: m.color,
                  textShadow: `0 0 8px ${m.color}44`
                }}>{m.value}%</span>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${m.value}%`, height: '100%', background: m.color, borderRadius: '2px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MUTATION ALERT STATUS ── */}
      {lastDNA ? (
        hasAnyMutation() ? (
          <div className="cp-dna-status-card cp-dna-status--mutated">
            <div className="status-title-row">
              <span className="status-indicator" />
              <h4 className="status-title">MUTATION DETECTED</h4>
            </div>
            <p className="status-desc">
              Your code structure has modified the genome sequence. {mutatedTraitsList.length} functional traits mutated.
            </p>
            <div className="mutation-list">
              {mutatedTraitsList.map(trait => {
                const diff = currentDNA[trait] - lastDNA[trait];
                const mapInfo = TRAIT_MAP[trait];
                return (
                  <span key={trait} className="mutation-badge active-badge">
                    {mapInfo.label.toUpperCase()}: {formatTraitValue(trait, lastDNA[trait])} ➔ {formatTraitValue(trait, currentDNA[trait])}
                    {typeof diff === 'number' && !isNaN(diff) && (
                      <span className="mutation-badge-delta">
                        ({diff >= 0 ? `+${formatTraitValue(trait, diff)}` : formatTraitValue(trait, diff)})
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="cp-dna-status-card cp-dna-status--aligned">
            <div className="status-title-row">
              <span className="status-indicator" />
              <h4 className="status-title">GENOMES ALIGNED</h4>
            </div>
            <p className="status-desc">
              Current submission code traits are identical to your last execution. No mutation detected.
            </p>
          </div>
        )
      ) : (
        <div className="cp-dna-status-card cp-dna-status--aligned" style={{ borderColor: '#00E5FF33', background: 'rgba(0, 229, 255, 0.02)' }}>
          <div className="status-title-row">
            <span className="status-indicator" style={{ background: '#00E5FF', boxShadow: '0 0 8px #00E5FF' }} />
            <h4 className="status-title" style={{ color: '#00E5FF', textShadow: '0 0 8px rgba(0, 229, 255, 0.4)' }}>INITIAL SEQUENCING</h4>
          </div>
          <p className="status-desc">
            No previous submissions recorded. Submit code to establish your code DNA baseline.
          </p>
        </div>
      )}

      {/* ── BAR CHART PROGRESS ── */}
      <div className="cp-dna-traits-grid">
        {Object.keys(TRAIT_MAP).map(trait => {
          const mapInfo = TRAIT_MAP[trait];
          const val = currentDNA[trait];
          const mutated = isMutated(trait);
          const percent = getTraitPercentage(trait, val);

          let deltaText = '';
          let deltaClass = '';
          if (lastDNA && mutated) {
            const lastVal = lastDNA[trait];
            if (typeof val === 'number' && typeof lastVal === 'number') {
              const diff = val - lastVal;
              if (diff > 0) {
                deltaText = `(+${formatTraitValue(trait, diff)})`;
                deltaClass = 'trait-delta--up';
              } else {
                deltaText = `(${formatTraitValue(trait, diff)})`;
                deltaClass = 'trait-delta--down';
              }
            } else if (trait === 'namingStyle') {
              deltaText = `(changed: ${lastVal} ➔ ${val})`;
              deltaClass = 'trait-delta--up';
            }
          }

          return (
            <div 
              key={trait} 
              className={`cp-dna-trait-card ${mutated ? 'trait-mutated' : ''}`}
              style={{ '--glow-color': mapInfo.color }}
            >
              <div className="trait-meta">
                <div className="trait-label-row">
                  <span className="trait-dot" style={{ background: mapInfo.color, boxShadow: `0 0 6px ${mapInfo.color}` }} />
                  <span className="trait-name">{mapInfo.label}</span>
                </div>
                <div className="trait-value-row">
                  <span className="trait-value">{formatTraitValue(trait, val)}</span>
                  {deltaText && <span className={`trait-delta ${deltaClass}`}>{deltaText}</span>}
                </div>
              </div>
              
              <div className="trait-bar-bg">
                <div 
                  className="trait-bar-fill" 
                  style={{ 
                    width: `${percent}%`, 
                    background: mapInfo.color,
                    boxShadow: `0 0 4px ${mapInfo.color}`
                  }} 
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DNA EVOLUTION TIMELINE ── */}
      <div className="cp-dna-evolution">
        <h4 className="cp-dna-evolution-heading">// CODENOMES EVOLUTION PATH</h4>
        <div className="evolution-timeline">
          {submissionsHistory && submissionsHistory.length > 0 ? (
            submissionsHistory.map((sub, i) => {
              const isLatest = i === submissionsHistory.length - 1;
              const dateStr = sub.timestamp?.toDate 
                ? sub.timestamp.toDate().toLocaleString() 
                : new Date(sub.timestamp).toLocaleString();
              const subDNA = sub.codeDNA;

              return (
                <div key={sub.id || i} className={`timeline-item ${isLatest ? 'timeline-item--latest' : 'timeline-item--previous'}`}>
                  <span className="timeline-node" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-version">GENOME SUBMISSION #{i + 1} {isLatest ? '[LATEST]' : ''}</span>
                      <span className="timeline-time">{dateStr}</span>
                    </div>
                    <div className="timeline-summary">
                      <span>VERDICT: <span style={{ color: '#00FF88', fontWeight: 'bold' }}>{sub.verdict}</span></span>
                      <span>LANGUAGE: <span className="timeline-lang">{sub.language}</span></span>
                      <span>EXECUTION TIME: <span style={{ color: '#00E5FF' }}>{sub.executionTime}ms</span></span>
                    </div>
                    {subDNA && (
                      <div className="timeline-traits">
                        <span className="timeline-trait-micro">
                          LOOPS: <span className="timeline-trait-micro--val">{subDNA.loops}</span>
                        </span>
                        <span className="timeline-trait-micro">
                          RECURSION: <span className="timeline-trait-micro--val">{subDNA.recursion}</span>
                        </span>
                        <span className="timeline-trait-micro">
                          COMP: <span className="timeline-trait-micro--val">{subDNA.comprehensions}</span>
                        </span>
                        <span className="timeline-trait-micro">
                          BUILTINS: <span className="timeline-trait-micro--val">{subDNA.builtins}</span>
                        </span>
                        <span className="timeline-trait-micro">
                          LINE: <span className="timeline-trait-micro--val">{subDNA.avgLineLength}ch</span>
                        </span>
                        <span className="timeline-trait-micro">
                          COMMENTS: <span className="timeline-trait-micro--val">{Math.round(subDNA.commentRatio * 100)}%</span>
                        </span>
                        <span className="timeline-trait-micro">
                          STYLE: <span className="timeline-trait-micro--val">{subDNA.namingStyle}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="timeline-empty">
              // NO GENOMIC EVOLUTION RECORDED YET. ACCEPTED SUBMISSIONS TRACK EVOLUTION OVER TIME.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeDNA;
