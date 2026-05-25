import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auth } from '../services/firebase';
import { getAllProblems, getUserSolvedProblems } from '../services/problemService';
import './ConstellationMap.css';

// Constellation Cluster coordinates mapping
const TOPIC_CENTROIDS = {
  'Arrays': { x: 0, y: 0 },
  'Strings': { x: 300, y: -250 },
  'Hashing': { x: -350, y: -200 },
  'Two Pointers': { x: 250, y: 300 },
  'Binary Search': { x: -200, y: 350 },
  'Trees': { x: -500, y: 150 },
  'Graphs': { x: 500, y: 150 },
  'DP': { x: 0, y: -450 }
};

const TOPICS_LIST = Object.keys(TOPIC_CENTROIDS);

const ConstellationMap = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // Canvas Refs
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const containerRef = useRef(null);

  // Layout positions state
  const [stars, setStars] = useState([]);
  const [solvedList, setSolvedList] = useState([]);
  const [hoveredStar, setHoveredStar] = useState(null);
  const [selectedStar, setSelectedStar] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Pan & Zoom viewport controls
  const [scale, setScale] = useState(0.8);
  const [offsetX, setOffsetX] = useState(window.innerWidth / 2);
  const [offsetY, setOffsetY] = useState(window.innerHeight / 2);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Floating coordinates tooltips
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Shooting stars & fly-to animations
  const [shootingStar, setShootingStar] = useState(null);
  const cameraTarget = useRef(null); // { x, y, scale }

  // 1. Fetch raw problems data from Firestore
  const { data: problemsRaw } = useQuery({
    queryKey: ['constellationProblems'],
    queryFn: getAllProblems
  });

  // 2. Fetch solved problems catalog
  useEffect(() => {
    if (currentUser) {
      getUserSolvedProblems(currentUser.uid).then(list => setSolvedList(list));
    }
  }, [currentUser]);

  // 3. Coordinate forces layout on load
  useEffect(() => {
    if (!problemsRaw || problemsRaw.length === 0) return;

    // Map raw data to node parameters
    const nodes = problemsRaw.map((prob, idx) => {
      const primaryTopic = prob.topics && prob.topics.length > 0 ? prob.topics[0] : 'Arrays';
      const cluster = TOPIC_CENTROIDS[primaryTopic] || TOPIC_CENTROIDS.Arrays;
      
      // Load saved position or start with micro offsets around topic centroids
      const angle = (idx / problemsRaw.length) * Math.PI * 2;
      const initialX = prob.x !== undefined ? prob.x : cluster.x + Math.cos(angle) * (50 + Math.random() * 40);
      const initialY = prob.y !== undefined ? prob.y : cluster.y + Math.sin(angle) * (50 + Math.random() * 40);

      return {
        id: prob.id,
        title: prob.title,
        description: prob.description || 'Develop an optimal algorithmic approach.',
        difficulty: prob.difficulty || 'Medium',
        topic: primaryTopic,
        solvedCount: prob.solvedCount || 0,
        x: initialX,
        y: initialY,
        vx: 0,
        vy: 0,
        solved: solvedList.includes(prob.id)
      };
    });

    // Run active spring force simulation for 120 ticks in the background to settle groups nicely
    for (let tick = 0; tick < 120; tick++) {
      // Repel force
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          if (dist < 80) {
            const force = (80 - dist) * 0.15;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }
      }

      // Attract force toward respective topic centers
      nodes.forEach(node => {
        const centroid = TOPIC_CENTROIDS[node.topic] || TOPIC_CENTROIDS.Arrays;
        const dx = centroid.x - node.x;
        const dy = centroid.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = dist * 0.012;
        node.vx += (dx / dist) * force;
        node.vy += (dy / dist) * force;

        // Apply friction & update coords
        node.vx *= 0.8;
        node.vy *= 0.8;
        node.x += node.vx;
        node.y += node.vy;
      });
    }

    setStars(nodes);
  }, [problemsRaw, solvedList]);

  // ── Panning & Zoom listeners ──
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      setOffsetX(e.clientX - dragStart.current.x);
      setOffsetY(e.clientY - dragStart.current.y);
      cameraTarget.current = null; // Break fly-to tracking
    } else {
      // Coordinates conversion to world coordinates
      const worldX = (mouseX - offsetX) / scale;
      const worldY = (mouseY - offsetY) / scale;

      // Find closest star
      let nearest = null;
      let minDist = 20;

      stars.forEach(star => {
        const dx = star.x - worldX;
        const dy = star.y - worldY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = star;
        }
      });

      if (nearest) {
        setHoveredStar(nearest);
        setTooltipPos({ x: mouseX + 15, y: mouseY + 15 });
      } else {
        setHoveredStar(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = Math.max(0.15, Math.min(2.5, scale * zoomFactor));

    // Focus scale toward mouse cursor position
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - offsetX) / scale;
    const worldY = (mouseY - offsetY) / scale;

    setScale(nextScale);
    setOffsetX(mouseX - worldX * nextScale);
    setOffsetY(mouseY - worldY * nextScale);
    cameraTarget.current = null;
  };

  const handleCanvasClick = () => {
    if (hoveredStar) {
      setSelectedStar(hoveredStar);
      setIsDrawerOpen(true);
    }
  };

  // ── Jump view to Topic Center ──
  const jumpToTopic = (topic) => {
    const center = TOPIC_CENTROIDS[topic];
    if (!center) return;
    cameraTarget.current = {
      x: window.innerWidth / 2 - center.x * 0.8,
      y: window.innerHeight / 2 - center.y * 0.8,
      scale: 0.8
    };
  };

  // ── Fly Camera to random unsolved problem ──
  const discoverRandomStar = () => {
    const unsolved = stars.filter(s => !s.solved);
    if (unsolved.length === 0) return;
    const target = unsolved[Math.floor(Math.random() * unsolved.length)];
    
    cameraTarget.current = {
      x: window.innerWidth / 2 - target.x * 1.5,
      y: window.innerHeight / 2 - target.y * 1.5,
      scale: 1.5
    };
    setSelectedStar(target);
    setIsDrawerOpen(true);
  };

  // Shooting star triggers
  useEffect(() => {
    const triggerShootingStar = () => {
      const unsolved = stars.filter(s => !s.solved);
      if (unsolved.length === 0) return;
      const target = unsolved[Math.floor(Math.random() * unsolved.length)];

      setShootingStar({
        startX: target.x - 300,
        startY: target.y - 300,
        x: target.x - 300,
        y: target.y - 300,
        targetX: target.x,
        targetY: target.y,
        progress: 0
      });
    };

    const interval = setInterval(triggerShootingStar, 30000);
    return () => clearInterval(interval);
  }, [stars]);

  // ── Core Animation Rendering Loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationId;

    const render = () => {
      // Match canvas dimensions to actual parent bounding boxes
      if (canvas.width !== canvas.parentElement.clientWidth || canvas.height !== canvas.parentElement.clientHeight) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }

      ctx.fillStyle = '#0A0A0F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Perform Camera Target Fly Panning (Smooth Lerp interpolation)
      if (cameraTarget.current) {
        const target = cameraTarget.current;
        setOffsetX(prev => prev + (target.x - prev) * 0.08);
        setOffsetY(prev => prev + (target.y - prev) * 0.08);
        setScale(prev => prev + (target.scale - prev) * 0.08);

        // Terminate tracking when close
        const dist = Math.sqrt(Math.pow(target.x - offsetX, 2) + Math.pow(target.y - offsetY, 2));
        if (dist < 1 && Math.abs(target.scale - scale) < 0.01) {
          cameraTarget.current = null;
        }
      }

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw constellation boundary circles around centroids
      TOPICS_LIST.forEach(topic => {
        const centroid = TOPIC_CENTROIDS[topic];
        ctx.beginPath();
        ctx.arc(centroid.x, centroid.y, 160, 0, Math.PI * 2);
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Draw Topic labels centered
        ctx.font = "bold 13px 'Orbitron'";
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(topic.toUpperCase(), centroid.x, centroid.y - 180);
      });

      // Draw prerequisite linking vectors (Flowing animated dashes)
      const topicConnectors = [
        ['Arrays', 'Two Pointers'],
        ['Strings', 'Two Pointers'],
        ['Two Pointers', 'Binary Search'],
        ['Binary Search', 'Trees'],
        ['Trees', 'Graphs'],
        ['DP', 'Arrays']
      ];

      topicConnectors.forEach(([t1, t2]) => {
        const c1 = TOPIC_CENTROIDS[t1];
        const c2 = TOPIC_CENTROIDS[t2];
        
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Draw Journey trail linking solved problems
      const solvedStars = stars.filter(s => s.solved);
      if (solvedStars.length > 1) {
        ctx.beginPath();
        ctx.moveTo(solvedStars[0].x, solvedStars[0].y);
        for (let i = 1; i < solvedStars.length; i++) {
          ctx.lineTo(solvedStars[i].x, solvedStars[i].y);
        }
        ctx.strokeStyle = 'rgba(255, 45, 120, 0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Shooting star
      if (shootingStar) {
        const star = shootingStar;
        star.progress += 0.04;
        star.x = star.startX + (star.targetX - star.startX) * star.progress;
        star.y = star.startY + (star.targetY - star.startY) * star.progress;

        // Draw streak tail
        ctx.beginPath();
        ctx.moveTo(star.x - 40, star.y - 40);
        ctx.lineTo(star.x, star.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Target burst pulse on arrive
        if (star.progress >= 1.0) {
          ctx.beginPath();
          ctx.arc(star.targetX, star.targetY, 15, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fill();
          setShootingStar(null);
        }
      }

      // Draw all problem stars
      stars.forEach(star => {
        // Twinkling logic: slight random changes to transparency
        const twinkle = 0.7 + Math.random() * 0.3;
        
        ctx.beginPath();
        const starSize = star.difficulty === 'Easy' ? 4 : star.difficulty === 'Medium' ? 6 : 9;
        ctx.arc(star.x, star.y, starSize, 0, Math.PI * 2);

        // Highlight ring on hover
        if (hoveredStar && hoveredStar.id === star.id) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(star.x, star.y, starSize + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        ctx.fillStyle = star.solved 
          ? `rgba(255, 45, 120, ${twinkle})` 
          : `rgba(170, 102, 255, ${twinkle})`;

        // Extra outer glows for Hard Problems
        if (star.difficulty === 'Hard') {
          ctx.shadowBlur = 8;
          ctx.shadowColor = star.solved ? '#FF2D78' : '#AA66FF';
        }

        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadows
      });

      ctx.restore();

      // ── Redraw Minimap canvas viewport indicator ──
      const mCanvas = minimapRef.current;
      if (mCanvas) {
        const mCtx = mCanvas.getContext('2d');
        mCtx.fillStyle = '#0E0D15';
        mCtx.fillRect(0, 0, 140, 140);

        // Map global coordinate ranges to 140x140 boundary box
        const mapRange = 1200;
        const scaleCoords = (val) => ((val + mapRange / 2) / mapRange) * 140;

        // Render mini dots for topic hubs
        TOPICS_LIST.forEach(topic => {
          const centroid = TOPIC_CENTROIDS[topic];
          mCtx.beginPath();
          mCtx.arc(scaleCoords(centroid.x), scaleCoords(centroid.y), 2, 0, Math.PI * 2);
          mCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          mCtx.fill();
        });

        // Draw Viewport Boundary rect
        const viewW = (canvas.width / scale) * (140 / mapRange);
        const viewH = (canvas.height / scale) * (140 / mapRange);
        const viewX = scaleCoords(-offsetX / scale) - viewW / 2;
        const viewY = scaleCoords(-offsetY / scale) - viewH / 2;

        mCtx.strokeStyle = 'rgba(255, 45, 120, 0.4)';
        mCtx.lineWidth = 1;
        mCtx.strokeRect(viewX, viewY, Math.min(140, viewW), Math.min(140, viewH));
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [stars, scale, offsetX, offsetY, hoveredStar, shootingStar]);

  return (
    <div className="cp-const-container" ref={containerRef}>
      
      {/* Visual background star particles simulation */}
      <div className="cp-battle-lobby-glow" style={{ background: 'rgba(170, 102, 255, 0.03)' }} />

      {/* Floating interactive HUD controller */}
      <div className="cp-const-hud">
        <h2 className="cp-const-hud-title">PROBLEM CONSTELLATION GALAXY</h2>
        <span className="cp-const-hud-subtitle">Explore problem systems. Zoom (scroll), Pan (drag).</span>

        <div className="cp-const-controls">
          <select 
            className="cp-const-select" 
            defaultValue=""
            onChange={e => { if (e.target.value) jumpToTopic(e.target.value); }}
          >
            <option value="" disabled>JUMP TO SYSTEM...</option>
            {TOPICS_LIST.map(topic => (
              <option key={topic} value={topic}>{topic.toUpperCase()}</option>
            ))}
          </select>

          <button className="cp-radar-btn" onClick={discoverRandomStar}>
            DISCOVER STAR 🚀
          </button>
        </div>
      </div>

      {/* Main interactive Canvas */}
      <div 
        className="cp-const-canvas-wrap"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      >
        <canvas className="cp-const-canvas" ref={canvasRef} />
      </div>

      {/* Interactive mini radar canvas */}
      <div className="cp-const-minimap">
        <canvas className="cp-const-minimap-canvas" ref={minimapRef} width={140} height={140} />
      </div>

      {/* Slide-out detail drawer */}
      <div className={`cp-const-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <button className="cp-const-drawer-close" onClick={() => setIsDrawerOpen(false)}>×</button>
        
        {selectedStar && (
          <>
            <div className="cp-const-drawer-header">
              <h3 className="cp-const-drawer-title">{selectedStar.title}</h3>
              
              <div className="cp-const-drawer-tags">
                <span className="cp-const-tag topic">{selectedStar.topic}</span>
                <span className={`cp-const-tag ${selectedStar.difficulty.toLowerCase()}`}>
                  {selectedStar.difficulty.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="cp-const-drawer-body">
              <p>{selectedStar.description}</p>
              
              <div className="cp-const-stat-row">
                <span>Constellation coordinates:</span>
                <span>[{Math.round(selectedStar.x)}, {Math.round(selectedStar.y)}]</span>
              </div>
              <div className="cp-const-stat-row">
                <span>Completions by community:</span>
                <span>{selectedStar.solvedCount}</span>
              </div>
              <div className="cp-const-stat-row">
                <span>Status:</span>
                <span style={{ color: selectedStar.solved ? '#00FF88' : '#AA66FF' }}>
                  {selectedStar.solved ? '★ SOLVED' : '◌ UNEXPLORED'}
                </span>
              </div>
            </div>

            <button 
              className="cp-radar-btn cp-radar-btn--active"
              onClick={() => navigate(`/problems/${selectedStar.id}`)}
              style={{ background: '#FF2D78', borderColor: '#FF2D78', color: '#0A0A0F', fontWeight: 'bold' }}
            >
              WARP INTO PROBLEM ARENA ⚡
            </button>
          </>
        )}
      </div>

      {/* Hover Floating coordinates tooltip */}
      {hoveredStar && (
        <div 
          className="cp-const-tooltip"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <span className="cp-const-tooltip-title">{hoveredStar.title}</span>
          <span>Topic: {hoveredStar.topic}</span>
          <span>Difficulty: {hoveredStar.difficulty}</span>
          <span>Status: {hoveredStar.solved ? 'Solved' : 'Unsolved'}</span>
        </div>
      )}

    </div>
  );
};

export default ConstellationMap;
