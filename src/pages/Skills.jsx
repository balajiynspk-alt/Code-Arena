import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getAllProblems, getUserSolvedProblems, saveMasteredSkill } from '../services/problemService';
import './Skills.css';

// ── TOPIC CONFIGURATIONS (X, Y Coords for RPG layout) ──
const TOPICS_CONFIG = {
  Arrays: {
    id: 'Arrays',
    label: 'Arrays',
    x: 350, y: 80,
    prereqs: [],
    desc: 'Sequence of elements stored in contiguous memory. Fundamentals of computer memory layouts.',
    icon: '📊'
  },
  Strings: {
    id: 'Strings',
    label: 'Strings',
    x: 600, y: 80,
    prereqs: [],
    desc: 'Sequence of characters. Fundamental datatype for textual scanning and parsing.',
    icon: '🔤'
  },
  Hashing: {
    id: 'Hashing',
    label: 'Hashing',
    x: 100, y: 80,
    prereqs: [],
    desc: 'Fast key-value mapping via hash functions. Achieve O(1) query speeds.',
    icon: '🔑'
  },
  'DP (1D)': {
    id: 'DP (1D)',
    label: 'DP (1D)',
    x: 850, y: 80,
    prereqs: [],
    desc: 'Dynamic Programming on 1D states. Optimize recursion with memoization.',
    icon: '⚡'
  },
  'Prefix Sum': {
    id: 'Prefix Sum',
    label: 'Prefix Sum',
    x: 220, y: 200,
    prereqs: ['Arrays'],
    desc: 'Precomputation technique to answer range sum queries in constant time.',
    icon: '➕'
  },
  'Sliding Window': {
    id: 'Sliding Window',
    label: 'Sliding Window',
    x: 350, y: 200,
    prereqs: ['Arrays'],
    desc: 'Maintain a sub-segment window over an array to achieve linear speedups.',
    icon: '🪟'
  },
  'Two Pointers': {
    id: 'Two Pointers',
    label: 'Two Pointers',
    x: 480, y: 200,
    prereqs: ['Arrays', 'Strings'],
    desc: 'Traverse data structures with multiple synchronized cursor pointers.',
    icon: '📍'
  },
  'Binary Search': {
    id: 'Binary Search',
    label: 'Binary Search',
    x: 480, y: 320,
    prereqs: ['Two Pointers'],
    desc: 'Divide-and-conquer search approach on sorted sequences. Logarithmic O(log N) time.',
    icon: '🔍'
  },
  Trees: {
    id: 'Trees',
    label: 'Trees',
    x: 480, y: 440,
    prereqs: ['Binary Search'],
    desc: 'Hierarchical node network with a single root. Traverse using recursion.',
    icon: '🌲'
  },
  Graphs: {
    id: 'Graphs',
    label: 'Graphs',
    x: 380, y: 560,
    prereqs: ['Trees'],
    desc: 'Interconnected nodes (vertices) and lines (edges). Models complex networks.',
    icon: '🕸️'
  },
  'DP on Trees': {
    id: 'DP on Trees',
    label: 'DP on Trees',
    x: 580, y: 560,
    prereqs: ['Trees'],
    desc: 'Dynamic Programming over tree structures. Solve subproblems on parent/child branches.',
    icon: '🌳'
  },
  'BFS/DFS': {
    id: 'BFS/DFS',
    label: 'BFS/DFS',
    x: 280, y: 680,
    prereqs: ['Graphs'],
    desc: 'Breadth-First and Depth-First searches. Core traversal algorithms.',
    icon: '🚀'
  },
  'Shortest Path': {
    id: 'Shortest Path',
    label: 'Shortest Path',
    x: 480, y: 680,
    prereqs: ['Graphs'],
    desc: 'Dijkstra and Bellman-Ford paths. Route optimized flows over weighted maps.',
    icon: '🛤️'
  },
  'DP (2D)': {
    id: 'DP (2D)',
    label: 'DP (2D)',
    x: 780, y: 200,
    prereqs: ['DP (1D)'],
    desc: 'Tabulation on multi-dimensional matrix grids. Classic grid paths and alignments.',
    icon: '🏁'
  },
  Knapsack: {
    id: 'Knapsack',
    label: 'Knapsack',
    x: 900, y: 200,
    prereqs: ['DP (1D)'],
    desc: 'Pack bounded weight items to maximize value. Classic optimization puzzle.',
    icon: '🎒'
  }
};

// RPG Level titles based on total XP
const getRankInfo = (xp) => {
  if (xp < 500) {
    return { title: 'Initiate', level: 1, base: 0, next: 500 };
  } else if (xp < 1500) {
    return { title: 'Apprentice', level: 2, base: 500, next: 1500 };
  } else if (xp < 3000) {
    return { title: 'Specialist', level: 3, base: 1500, next: 3000 };
  } else if (xp < 5000) {
    return { title: 'Expert', level: 4, base: 3000, next: 5000 };
  } else {
    return { title: 'Master Coder', level: 5, base: 5000, next: 10000 }; // Caps at 10000
  }
};

// Generates hexagonal corner points for SVG polygon rendering
const getHexPoints = (cx, cy, r) => {
  const points = [];
  for (let i = 0; i < 6; i++) {
    // Offset by 30 deg for pointy-topped hexagons
    const angle = (i * 60 + 30) * Math.PI / 180;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
};

const Skills = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = auth.currentUser;

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);

  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // 1. Fetch all problems in DB
  const { data: allProblems = [] } = useQuery({
    queryKey: ['allProblems'],
    queryFn: getAllProblems
  });

  // 2. Fetch solved problems list
  const { data: solvedIds = [] } = useQuery({
    queryKey: ['solvedProblems', currentUser?.uid],
    queryFn: () => getUserSolvedProblems(currentUser?.uid),
    enabled: !!currentUser
  });

  // 3. Fetch full User data document (to get masteredSkills)
  const { data: userData } = useQuery({
    queryKey: ['skillsUserData', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return null;
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!currentUser
  });

  const masteredSkills = useMemo(() => {
    return userData?.masteredSkills || [];
  }, [userData]);

  // Master skill mutation
  const masterMutation = useMutation({
    mutationFn: async (topicId) => {
      if (!currentUser) throw new Error('Must be logged in');
      await saveMasteredSkill(currentUser.uid, topicId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skillsUserData', currentUser?.uid] });
    }
  });

  // ── High Performance Canvas Particle Burst Animation ──
  const triggerUnlockBurst = (cx, cy) => {
    const newParticles = [];
    const colors = ['#FF2D78', '#00FF88', '#FFA040', '#9D4EDD', '#00E5FF'];
    
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6;
      newParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
        alpha: 1,
        decay: 0.012 + Math.random() * 0.015
      });
    }
    particlesRef.current.push(...newParticles);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    const renderLoop = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const activeParticles = [];
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.vx *= 0.98; // friction
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fill();

          activeParticles.push(p);
        }
      });

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      particlesRef.current = activeParticles;

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ── Compute Statistics and States for Each Topic ──
  const topicsStats = useMemo(() => {
    const stats = {};
    
    Object.keys(TOPICS_CONFIG).forEach(topicId => {
      const config = TOPICS_CONFIG[topicId];
      
      // Filter problems by topic
      const topicProblems = allProblems.filter(p => 
        p.topics?.some(t => t.toLowerCase() === topicId.toLowerCase())
      );

      const easyProblems = topicProblems.filter(p => p.difficulty === 'Easy');
      const mediumProblems = topicProblems.filter(p => p.difficulty === 'Medium');
      const hardProblems = topicProblems.filter(p => p.difficulty === 'Hard');

      const easySolved = easyProblems.filter(p => solvedIds.includes(p.id));
      const mediumSolved = mediumProblems.filter(p => solvedIds.includes(p.id));
      const hardSolved = hardProblems.filter(p => solvedIds.includes(p.id));

      const totalEasy = easyProblems.length;
      const totalMedium = mediumProblems.length;

      // Targets: 5 Easy, 3 Medium. Bounded by database availability to prevent dead-ends.
      const easyRequired = Math.min(5, totalEasy);
      const mediumRequired = Math.min(3, totalMedium);

      const easyCount = easySolved.length;
      const mediumCount = mediumSolved.length;
      const hardCount = hardSolved.length;

      // XP calculated from solves
      const xp = (easyCount * 50) + (mediumCount * 100) + (hardCount * 200);

      // Determine Eligibility (All prereqs must be Mastered)
      const eligible = config.prereqs.every(parent => masteredSkills.includes(parent));

      // Determine State
      let state = 'LOCKED';
      if (masteredSkills.includes(topicId)) {
        state = 'MASTERED';
      } else if (eligible) {
        if (easyCount >= easyRequired && mediumCount >= mediumRequired) {
          state = 'ACTIVE';
        } else {
          state = 'UNLOCKED';
        }
      }

      stats[topicId] = {
        easyCount,
        easyRequired,
        mediumCount,
        mediumRequired,
        hardCount,
        totalEasy,
        totalMedium,
        xp,
        state,
        problems: topicProblems,
        easyProblems,
        mediumProblems,
        hardProblems,
        easySolved,
        mediumSolved
      };
    });

    return stats;
  }, [allProblems, solvedIds, masteredSkills]);

  // Compute Total XP and Level Information
  const totalXp = useMemo(() => {
    return Object.keys(topicsStats).reduce((sum, key) => sum + topicsStats[key].xp, 0);
  }, [topicsStats]);

  const playerRank = useMemo(() => {
    return getRankInfo(totalXp);
  }, [totalXp]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return {
      ...TOPICS_CONFIG[selectedNodeId],
      stats: topicsStats[selectedNodeId]
    };
  }, [selectedNodeId, topicsStats]);

  // Find next 3 unsolved problems to recommend
  const recommendedProblems = useMemo(() => {
    if (!selectedNodeId) return [];
    const stats = topicsStats[selectedNodeId];
    if (!stats) return [];

    const unsolved = stats.problems.filter(p => !solvedIds.includes(p.id));
    
    // Sort unsolved: Easy -> Medium -> Hard
    unsolved.sort((a, b) => {
      const diffOrder = { Easy: 1, Medium: 2, Hard: 3 };
      return diffOrder[a.difficulty] - diffOrder[b.difficulty];
    });

    return unsolved.slice(0, 3);
  }, [selectedNodeId, topicsStats, solvedIds]);

  // Trigger skill mastering
  const handleMasterSkill = (topicId) => {
    const config = TOPICS_CONFIG[topicId];
    if (!config) return;

    // Run burst particles centered on the node
    triggerUnlockBurst(config.x, config.y);
    masterMutation.mutate(topicId);
  };

  const handleAttemptProblem = (problemId) => {
    navigate(`/problems/${problemId}`);
  };

  return (
    <div className="cp-skills-container">

      {/* ═══════════════ MAIN VIEW ═══════════════ */}
      <div className="cp-skills-main">
        
        {/* HUD Rank Tracker */}
        <div className="cp-skills-hud">
          <div className="hud-player">
            <h1 className="hud-title">// CORE TALENT ENCODING</h1>
            <div className="hud-rank-row">
              <span className="hud-level-badge">LVL {playerRank.level}</span>
              <span className="hud-rank-title">{playerRank.title.toUpperCase()}</span>
            </div>
          </div>

          <div className="hud-xp-container">
            <div className="hud-xp-meta">
              <span>SYSTEM EXPERIENCE</span>
              <span>{totalXp} / {playerRank.next} XP</span>
            </div>
            <div className="hud-xp-bar-bg">
              <div 
                className="hud-xp-bar-fill" 
                style={{ 
                  width: `${Math.min(100, ((totalXp - playerRank.base) / (playerRank.next - playerRank.base)) * 100)}%` 
                }} 
              />
            </div>
          </div>
        </div>

        {/* Talent Tree Scrollable Area */}
        <div className="cp-skills-tree-scroll">
          <div className="cp-skills-tree-wrapper">
            
            {/* Canvas burst overlay */}
            <canvas className="cp-skills-particle-canvas" ref={canvasRef} />

            <svg className="cp-skills-svg" viewBox="0 0 1000 760">
              
              {/* Define dynamic filters (glowing dropshadows) */}
              <defs>
                <filter id="green-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="pink-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* ── DRAW CONNECTIONS (Animated dash lines) ── */}
              {Object.keys(TOPICS_CONFIG).map(topicId => {
                const config = TOPICS_CONFIG[topicId];
                const stats = topicsStats[topicId];
                
                return config.prereqs.map(parentKey => {
                  const parentConfig = TOPICS_CONFIG[parentKey];
                  const parentStats = topicsStats[parentKey];

                  // Determine path animation class depending on states
                  let pathClass = 'cp-skill-path--locked';
                  if (parentStats?.state === 'MASTERED' && stats?.state === 'MASTERED') {
                    pathClass = 'cp-skill-path--mastered';
                  } else if (parentStats?.state === 'MASTERED') {
                    pathClass = 'cp-skill-path--unlocked';
                  }

                  return (
                    <path
                      key={`${parentKey}-${topicId}`}
                      className={`cp-skill-path ${pathClass}`}
                      d={`M ${parentConfig.x} ${parentConfig.y} L ${config.x} ${config.y}`}
                    />
                  );
                });
              })}

              {/* ── DRAW HEXAGON NODES ── */}
              {Object.keys(TOPICS_CONFIG).map(topicId => {
                const config = TOPICS_CONFIG[topicId];
                const stats = topicsStats[topicId];
                if (!stats) return null;

                const isSelected = selectedNodeId === topicId;
                const percent = Math.min(100, ((stats.easyCount + stats.mediumCount) / (stats.easyRequired + stats.mediumRequired || 1)) * 100);

                let stateClass = 'skill-hex-group--locked';
                if (stats.state === 'MASTERED') stateClass = 'skill-hex-group--mastered';
                else if (stats.state === 'ACTIVE') stateClass = 'skill-hex-group--active';
                else if (stats.state === 'UNLOCKED') stateClass = 'skill-hex-group--unlocked';

                const hexRadius = 38;

                return (
                  <g
                    key={topicId}
                    className={`skill-hex-group ${stateClass} ${isSelected ? 'skill-hex-group--selected' : ''}`}
                    onClick={() => setSelectedNodeId(topicId)}
                    transform={`translate(${config.x}, ${config.y})`}
                  >
                    {/* Glowing background polygon */}
                    <polygon
                      className="skill-hex-bg"
                      points={getHexPoints(0, 0, hexRadius)}
                    />
                    
                    {/* Node Border polygon */}
                    <polygon
                      className="skill-hex-border"
                      points={getHexPoints(0, 0, hexRadius)}
                      fill="none"
                    />

                    {/* Lock / Star icon overlay */}
                    {stats.state === 'LOCKED' && (
                      <text x="-6" y="-14" className="skill-node-icon" fill="#5A5A72">🔒</text>
                    )}
                    {stats.state === 'MASTERED' && (
                      <text x="-7" y="-14" className="skill-node-icon" fill="#0A0A0F">⭐</text>
                    )}

                    {/* Central Topic Label */}
                    <text
                      x="0"
                      y={stats.state === 'LOCKED' || stats.state === 'MASTERED' ? '6' : '0'}
                      textAnchor="middle"
                      className="skill-node-text"
                    >
                      {config.label.toUpperCase()}
                    </text>

                    {/* Micro XP count */}
                    {stats.state !== 'LOCKED' && (
                      <text
                        x="0"
                        y="14"
                        textAnchor="middle"
                        className="skill-node-text-sub"
                      >
                        {stats.xp} XP
                      </text>
                    )}

                    {/* Mini node progress bar beneath hexagon (if not mastered/locked) */}
                    {stats.state === 'UNLOCKED' && (
                      <g transform="translate(-20, 24)">
                        <rect x="0" y="0" width="40" height="3" className="node-xp-bg" rx="1.5" />
                        <rect 
                          x="0" y="0" 
                          width={(percent / 100) * 40} 
                          height="3" 
                          fill="#00FF88" 
                          className="node-xp-fill"
                          rx="1.5"
                          style={{ filter: 'drop-shadow(0 0 2px #00FF88)' }}
                        />
                      </g>
                    )}
                    
                    {stats.state === 'ACTIVE' && (
                      <g transform="translate(-20, 24)">
                        <rect x="0" y="0" width="40" height="3" className="node-xp-bg" rx="1.5" />
                        <rect 
                          x="0" y="0" 
                          width="40" 
                          height="3" 
                          fill="#FF2D78" 
                          className="node-xp-fill"
                          rx="1.5"
                          style={{ filter: 'drop-shadow(0 0 3px #FF2D78)' }}
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* ═══════════════ DETAILS PANEL (Floating Cyber Sidebar) ═══════════════ */}
      <div className={`cp-skills-sidebar ${!selectedNodeId ? 'cp-skills-sidebar--collapsed' : ''}`}>
        {selectedNode ? (
          <>
            <div className="sidebar-header">
              <h3 className="sidebar-title">// NODE ENCODING</h3>
              <button className="sidebar-close-btn" onClick={() => setSelectedNodeId(null)}>✕</button>
            </div>
            
            <div className="sidebar-body">
              {/* Topic header info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.8rem' }}>{selectedNode.icon}</span>
                  <h2 style={{ fontFamily: 'Orbitron', fontSize: '1.4rem', color: '#E8E8FF', margin: 0, letterSpacing: '1px' }}>
                    {selectedNode.label}
                  </h2>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#8888AA', margin: 0, lineHeight: 1.5 }}>
                  {selectedNode.desc}
                </p>
              </div>

              {/* Status info card */}
              <div className={`sidebar-status-card sidebar-status-card--${selectedNode.stats.state.toLowerCase()}`}>
                <span className={`sidebar-status-badge sidebar-status-badge--${selectedNode.stats.state.toLowerCase()}`}>
                  STATUS: {selectedNode.stats.state}
                </span>
                
                {selectedNode.stats.state === 'LOCKED' && (
                  <p className="sidebar-status-desc">
                    Requires mastering prerequisites: <strong style={{ color: '#FF2D78' }}>{selectedNode.prereqs.join(', ')}</strong>
                  </p>
                )}
                {selectedNode.stats.state === 'UNLOCKED' && (
                  <p className="sidebar-status-desc">
                    Collect data to unleash node: solve Easy & Medium problems in this topic.
                  </p>
                )}
                {selectedNode.stats.state === 'ACTIVE' && (
                  <p className="sidebar-status-desc">
                    Required datasets compiled. Ready to unleash node and establish skill mastery.
                  </p>
                )}
                {selectedNode.stats.state === 'MASTERED' && (
                  <p className="sidebar-status-desc">
                    Node fully integrated. Prerequisites unlocked for child algorithms.
                  </p>
                )}
              </div>

              {/* Stats & Solving requirements progress */}
              <div className="sidebar-stats-section">
                <h4 className="sidebar-section-heading">REQUISITIONS BLOCK</h4>
                
                <div className="sidebar-stat-row">
                  <span className="stat-label">Easy Problems Solved</span>
                  <span className={`stat-number ${selectedNode.stats.easyCount >= selectedNode.stats.easyRequired ? 'stat-ok' : 'stat-pending'}`}>
                    {selectedNode.stats.easyCount} / {selectedNode.stats.easyRequired}
                  </span>
                </div>
                
                <div className="sidebar-stat-row">
                  <span className="stat-label">Medium Problems Solved</span>
                  <span className={`stat-number ${selectedNode.stats.mediumCount >= selectedNode.stats.mediumRequired ? 'stat-ok' : 'stat-pending'}`}>
                    {selectedNode.stats.mediumCount} / {selectedNode.stats.mediumRequired}
                  </span>
                </div>

                <div className="sidebar-stat-row">
                  <span className="stat-label">Total Gained XP</span>
                  <span className="stat-number" style={{ color: '#00E5FF' }}>
                    +{selectedNode.stats.xp} XP
                  </span>
                </div>
              </div>

              {/* Unleash Skill Action Button */}
              {selectedNode.stats.state === 'ACTIVE' && (
                <button
                  className="sidebar-unleash-btn"
                  onClick={() => handleMasterSkill(selectedNode.id)}
                >
                  ⚡ UNLEASH TALENT NODE
                </button>
              )}

              {/* Problems section (next recommended) */}
              {selectedNode.stats.state !== 'MASTERED' && (
                <div className="sidebar-stats-section" style={{ marginTop: '10px' }}>
                  <h4 className="sidebar-section-heading">
                    {recommendedProblems.length > 0 ? 'RECOMMENDED DATASETS' : 'ALL DATASETS ALIGNED'}
                  </h4>

                  <div className="sidebar-problems-list">
                    {recommendedProblems.length > 0 ? (
                      recommendedProblems.map(p => (
                        <div key={p.id} className={`sidebar-problem-item diff-${p.difficulty.toLowerCase()}`}>
                          <div className="problem-item-info">
                            <span className="problem-item-title">{p.number}. {p.title}</span>
                            <div className="problem-item-meta">
                              <span className={`problem-item-diff ${p.difficulty.toLowerCase()}`}>{p.difficulty.toUpperCase()}</span>
                              <span className="problem-item-xp">+{p.difficulty === 'Easy' ? '50' : '100'} XP</span>
                            </div>
                          </div>
                          <button
                            className="sidebar-problem-action"
                            onClick={() => handleAttemptProblem(p.id)}
                          >
                            SOLVE
                          </button>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: '#8888AA', margin: 0 }}>
                        // There are no further unsolved problems in this topic. Solve problems in other sections to level up!
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="sidebar-placeholder">
            <span className="sidebar-placeholder-icon">🕸️</span>
            <p className="sidebar-placeholder-text">
              SELECT A SEGMENT IN THE GENOME TREE TO ANALYZE AND ACTIVATE CORRESPONDING ALGORITHM GENOMES.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Skills;
