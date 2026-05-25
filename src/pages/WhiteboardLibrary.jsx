import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWhiteboards, upvoteWhiteboard } from '../services/whiteboardService';
import './WhiteboardLibrary.css';

const WhiteboardLibrary = () => {
  const queryClient = useQueryClient();
  const [activePlayboard, setActivePlayboard] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const canvasRef = useRef(null);
  const playIntervalRef = useRef(null);

  // Fetch community diagram library
  const { data: whiteboards = [], isLoading } = useQuery({
    queryKey: ['whiteboards'],
    queryFn: () => getWhiteboards()
  });

  // Upvote mutation
  const upvoteMutation = useMutation({
    mutationFn: upvoteWhiteboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboards'] });
    }
  });

  // Re-draw step-through canvas whenever active playboard or step increments
  useEffect(() => {
    if (activePlayboard) {
      drawPlaybackCanvas();
    }
  }, [activePlayboard, currentStepIndex]);

  // Handle step autoplay timing loop
  useEffect(() => {
    if (isPlaying && activePlayboard) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStepIndex(curr => {
          const next = curr + 1;
          if (next >= activePlayboard.shapes.length) {
            setIsPlaying(false);
            clearInterval(playIntervalRef.current);
            return 0;
          }
          return next;
        });
      }, 1600);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }
    return () => clearInterval(playIntervalRef.current);
  }, [isPlaying, activePlayboard]);

  const drawPlaybackCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const shapes = activePlayboard.shapes || [];

    // Clear
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grids
    ctx.strokeStyle = 'rgba(0, 221, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Connections
    const activeFromId = shapes[currentStepIndex - 1]?.id;
    const activeToId = shapes[currentStepIndex]?.id;

    shapes.forEach((sh, idx) => {
      // Connect sequential nodes automatically for walkthrough
      if (idx > 0) {
        const prev = shapes[idx - 1];
        ctx.strokeStyle = (prev.id === activeFromId && sh.id === activeToId) ? '#FF2D78' : '#332244';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(prev.x + prev.w / 2, prev.y + prev.h / 2);
        ctx.lineTo(sh.x + sh.w / 2, sh.y + sh.h / 2);
        ctx.stroke();
      }
    });

    // Shapes
    shapes.forEach((sh, idx) => {
      const isActive = idx === currentStepIndex;
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.strokeStyle = isActive ? '#00FF88' : 'rgba(0, 221, 255, 0.2)';
      
      ctx.shadowColor = isActive ? '#00FF88' : 'transparent';
      ctx.shadowBlur = isActive ? 15 : 0;
      
      ctx.fillStyle = isActive ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255,255,255,0.01)';

      if (sh.type === 'box') {
        ctx.beginPath();
        ctx.rect(sh.x, sh.y, sh.w, sh.h);
        ctx.fill();
        ctx.stroke();
      } else if (sh.type === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(sh.x + sh.w / 2, sh.y);
        ctx.lineTo(sh.x + sh.w, sh.y + sh.h / 2);
        ctx.lineTo(sh.x + sh.w / 2, sh.y + sh.h);
        ctx.lineTo(sh.x, sh.y + sh.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (sh.type === 'loop') {
        ctx.beginPath();
        ctx.arc(sh.x + sh.w / 2, sh.y + sh.h / 2, Math.min(sh.w, sh.h) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = isActive ? '#FFF' : '#666688';
      ctx.font = '11px Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sh.label || 'Step', sh.x + sh.w / 2, sh.y + sh.h / 2);
    });
  };

  const handleOpenPlayer = (wb) => {
    setActivePlayboard(wb);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  return (
    <div className="cp-lib-page">
      <div className="cp-battle-lobby-glow" style={{ background: 'rgba(255, 45, 120, 0.02)' }} />

      <div className="cp-lib-container">
        
        {/* Title */}
        <div className="cp-lib-header">
          <h1 className="cp-lib-title">
            <span className="cp-t-pink">COMMUNITY DIAGRAMS</span>{' '}
            <span className="cp-t-cyan">LIBRARY</span>
          </h1>
          <p className="cp-lib-sub">// EXPLORE AND WALK THROUGH EXPERT ALGORITHM FLOWCHARTS</p>
        </div>

        {/* Gallery grid list */}
        {isLoading ? (
          <div className="cp-pd-state">// QUERYING FLOW DATA...</div>
        ) : (
          <div className="cp-lib-grid">
            {whiteboards.map(wb => (
              <div key={wb.id} className="cp-lib-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 className="cp-lib-card-title">{wb.title}</h3>
                  <button 
                    onClick={() => upvoteMutation.mutate(wb.id)} 
                    className="cp-lib-upvote-btn"
                  >
                    🔺 {wb.upvotes}
                  </button>
                </div>

                <p className="cp-lib-card-meta">
                  VISUALIZATION BY: <strong>{wb.displayName}</strong> • SHAPES: <strong>{wb.shapes?.length || 0}</strong>
                </p>

                <div className="cp-lib-card-actions">
                  <button onClick={() => handleOpenPlayer(wb)} className="cp-radar-btn cp-radar-btn--active" style={{ fontSize: '0.72rem' }}>
                    PLAY STEP-THROUGH ▶️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Visual player step-through overlay ── */}
        {activePlayboard && (
          <div className="cp-challenge-modal-backdrop" onClick={() => setActivePlayboard(null)}>
            <div 
              className="cp-challenge-modal cp-lib-player-modal" 
              onClick={e => e.stopPropagation()} 
              style={{ borderColor: '#00DDFF', maxWidth: '820px', width: '90%' }}
            >
              <button className="cp-challenge-modal-close" onClick={() => setActivePlayboard(null)}>✕</button>
              
              <h3 className="cp-challenge-modal-title" style={{ color: '#00DDFF', display: 'flex', justifyContent: 'space-between', paddingRight: '30px' }}>
                <span>{activePlayboard.title.toUpperCase()}</span>
                <span style={{ fontSize: '0.75rem', color: '#666688' }}>STEP {currentStepIndex + 1} OF {activePlayboard.shapes?.length || 0}</span>
              </h3>

              <div className="cp-lib-player-split">
                
                {/* Left side player canvas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <canvas ref={canvasRef} width={450} height={320} className="cp-lib-player-canvas" />
                  
                  {/* Player timeline controls */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      onClick={() => setCurrentStepIndex(curr => Math.max(0, curr - 1))}
                      className="cp-toolbar-btn"
                      disabled={currentStepIndex === 0}
                    >
                      ⏪ PREV
                    </button>
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="cp-radar-btn cp-radar-btn--active"
                      style={{ fontSize: '0.72rem', padding: '4px 16px' }}
                    >
                      {isPlaying ? 'PAUSE ⏸️' : 'AUTOPLAY ▶️'}
                    </button>
                    <button 
                      onClick={() => setCurrentStepIndex(curr => Math.min((activePlayboard.shapes?.length || 1) - 1, curr + 1))}
                      className="cp-toolbar-btn"
                      disabled={currentStepIndex >= (activePlayboard.shapes?.length || 1) - 1}
                    >
                      NEXT ⏩
                    </button>
                  </div>
                </div>

                {/* Right side matched code snippet summary card */}
                <div className="cp-lib-player-code-wrap">
                  <div className="cp-whiteboard-editor-header" style={{ padding: '8px 12px' }}>
                    <span className="cp-whiteboard-editor-title">STEP IMPLEMENTATION</span>
                  </div>

                  <div className="cp-lib-player-step-desc">
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#8888AA' }}>
                      Current active block: <strong style={{ color: '#00FF88' }}>"{activePlayboard.shapes[currentStepIndex]?.label}"</strong>
                    </p>
                    <pre className="cp-lib-player-pre">
                      {activePlayboard.code || '# Code listing not attached'}
                    </pre>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default WhiteboardLibrary;
