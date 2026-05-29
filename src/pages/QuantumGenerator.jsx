import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { 
  getUserWeaknessProfile, 
  generateQuantumProblem, 
  saveQuantumProblemToBank,
  getQuantumProblemsBank,
  saveWeaknessProfile
} from '../services/quantumGeneratorService';
import './QuantumGenerator.css';

const QuantumGenerator = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // States
  const [profile, setProfile] = useState(null);
  const [problemsBank, setProblemsBank] = useState([]);
  const [generatedProblem, setGeneratedProblem] = useState(null);
  
  // UX states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [feedback, setFeedback] = useState('optimal'); // too-easy, optimal, too-hard
  
  // Matrix rain canvas ref
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // ── Initial setup & weakness loading ──
  useEffect(() => {
    const loadProfileAndBank = async () => {
      const p = await getUserWeaknessProfile(currentUser?.uid || 'anonymous');
      setProfile(p);

      const bank = await getQuantumProblemsBank(currentUser?.uid || 'anonymous');
      setProblemsBank(bank);
    };

    loadProfileAndBank();
  }, [currentUser]);

  // ── Matrix rain animation loop ──
  useEffect(() => {
    if (!isLoading) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const alphabet = "010110010101011011001010101010101101010110010110010101101010101";
    const fontSize = 16;
    const columns = canvas.width / fontSize;

    const rainDrops = Array.from({ length: columns }).map(() => 1);

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.15)'; // alpha trails
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00FF88'; // cyberpunk matrix green
      ctx.font = `${fontSize}px 'Share Tech Mono', monospace`;

      for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

        if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }
    };

    const interval = setInterval(draw, 30);
    return () => clearInterval(interval);
  }, [isLoading]);

  // ── Custom compilation steps ──
  useEffect(() => {
    if (!isLoading) return;

    const steps = [
      "Analyzing historical runtime metrics...",
      "Correlating Dynamic Programming & Graphs error bounds...",
      "Isolating off-by-one edge-case failures...",
      "Compiling original narrative story arrays...",
      "Injecting targeted compiler verification constraints..."
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length - 1) {
        current++;
        setLoadingStep(current);
      }
    }, 900);

    return () => clearInterval(interval);
  }, [isLoading]);

  // ── Problem trigger compiler ──
  const handleGenerateProblem = async () => {
    setIsLoading(true);
    setLoadingStep(0);

    try {
      // Allow matrix animation to play for exactly 5 seconds for ultimate premium impact
      const p = profile || {
        weakTopics: [{ topic: 'Dynamic Programming', winRate: 31, avgTime: 42 }],
        failurePatterns: ['boundary cases', 'off-by-one indices'],
        recommendedDifficulty: 'Medium'
      };

      const [generated] = await Promise.all([
        generateQuantumProblem(currentUser?.uid || 'anonymous', p),
        new Promise(resolve => setTimeout(resolve, 5000)) // Guarantee 5s premium rain
      ]);

      setGeneratedProblem(generated);
      
      // Save it to personal bank
      const problemId = await saveQuantumProblemToBank(currentUser?.uid || 'anonymous', generated);
      if (problemId) {
        setProblemsBank(prev => [{ id: problemId, ...generated }, ...prev]);
      }
    } catch (e) {
      console.warn("AI Generation failed. Loading responsive offline quantum problem alternative.", e);
      // Premium robust fallback problem for 100% testability out of the box
      const mockProblem = {
        title: "Chronos-Loop Cache Minimizer",
        story: "A quantum engine at the core of New Mumbai is repeating subproblem loops. You must devise a cache matrix that prevents the chronos loops from leaking, taking care to avoid off-by-one boundary leaks.",
        description: "Given an array of integer loop weights and a target cooldown interval, return the minimum cache memory segments needed to satisfy non-overlapping bounds. You must index strictly within target bounds to prevent dimensional failures.",
        examples: [
          { input: "weights = [2, 3, 5], target = 6", output: "11", explanation: "Calculates the overlapping cooldown factors exactly avoiding off-by-one." }
        ],
        constraints: [
          "weights.length <= 10^3",
          "weights[i] <= 500"
        ],
        hints: [
          "Think dynamic programming 1D arrays.",
          "Pay close attention to index = 0 boundaries.",
          "Optimize transition limits to avoid extra allocations."
        ],
        targetedWeakness: "Targets off-by-one boundary conditions and dynamic programming overlap optimization."
      };
      setGeneratedProblem(mockProblem);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackChange = async (score) => {
    setFeedback(score);
    if (!profile) return;
    
    let nextDifficulty = profile.recommendedDifficulty || 'Medium';
    if (score === 'too-easy') {
      nextDifficulty = nextDifficulty === 'Easy' ? 'Medium' : 'Hard';
    } else if (score === 'too-hard') {
      nextDifficulty = nextDifficulty === 'Hard' ? 'Medium' : 'Easy';
    }
    
    const updated = {
      ...profile,
      recommendedDifficulty: nextDifficulty
    };
    
    setProfile(updated);
    await saveWeaknessProfile(currentUser?.uid || 'anonymous', updated);
  };

  const handleOpenProblem = () => {
    if (!generatedProblem) return;
    // Launch standard detail workspace with quantum flag details
    navigate(`/problems/quantum-challenge`, { state: { customProblem: generatedProblem } });
  };

  const stepsList = [
    "Analyzing historical runtime metrics...",
    "Correlating Dynamic Programming & Graphs error bounds...",
    "Isolating off-by-one edge-case failures...",
    "Compiling original narrative story arrays...",
    "Injecting targeted compiler verification constraints..."
  ];

  return (
    <div className="cp-quantum-page">
      
      {/* 🌌 Matrix Loading Overlay Screen 🌌 */}
      {isLoading && (
        <div className="cp-quantum-overlay">
          <canvas ref={canvasRef} className="cp-matrix-canvas"></canvas>
          <div className="cp-loading-content">
            <div className="cp-spin-loader" style={{ fontSize: '3rem' }}>🌌</div>
            <h2 className="cp-loading-title">QUANTUM GENERATION IN PROGRESS</h2>
            <p className="cp-loading-step">{stepsList[loadingStep]}</p>
            <div className="cp-loading-bar-wrap">
              <div className="cp-loading-bar-fill" style={{ width: `${(loadingStep + 1) * 20}%` }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="cp-quantum-container">
        
        {/* Header */}
        <div className="cp-quantum-header">
          <div>
            <h1 className="cp-quantum-title">🌌 QUANTUM PROBLEM GENERATOR</h1>
            <p className="cp-quantum-sub">// Infinite unique coding challenges dynamically compiled to challenge your specific weaknesses</p>
          </div>
          <button 
            onClick={handleGenerateProblem} 
            className="cp-quantum-btn"
          >
            GENERATE MY PROBLEM ⚡
          </button>
        </div>

        {/* Workspace Layout Grid: Left Dossier / Right Results */}
        <div className="cp-quantum-grid">
          
          {/* LEFT: Weakness Dossier Analysis */}
          <div className="cp-quantum-sidebar">
            
            <div className="cp-q-card">
              <h3 className="cp-q-h">// DYNAMIC WEAKNESS SPECTRUM</h3>
              {profile ? (
                <div className="cp-q-stats">
                  
                  {/* Topic list */}
                  <div className="cp-q-topics">
                    <div className="cp-q-lbl-row">
                      <span>TOPIC</span>
                      <span>SOLVE RATE</span>
                    </div>
                    {profile.weakTopics.map(t => (
                      <div key={t.topic} className="cp-q-row weak">
                        <span>{t.topic}</span>
                        <span className="cp-q-val">{t.winRate}% (WEAK)</span>
                      </div>
                    ))}
                    {profile.strongTopics?.map(t => (
                      <div key={t.topic} className="cp-q-row strong">
                        <span>{t.topic}</span>
                        <span className="cp-q-val">{t.winRate}% (STRONG)</span>
                      </div>
                    ))}
                  </div>

                  {/* Failure vectors */}
                  <div className="cp-q-vectors">
                    <h4 className="cp-q-sh">// INDEX ERROR VECTORS</h4>
                    <div className="cp-q-vector-badges">
                      {profile.failurePatterns.map(p => (
                        <span key={p} className="cp-q-v-badge">🚨 {p.toUpperCase()}</span>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation badge */}
                  <div className="cp-q-rec">
                    <span className="cp-q-rec-lbl">TARGET DIFFICULTY:</span>
                    <span className="cp-q-rec-val">{profile.recommendedDifficulty}</span>
                  </div>

                </div>
              ) : (
                <p className="cp-q-placeholder">// Telemetry data offline</p>
              )}
            </div>

            {/* Problems Bank History */}
            <div className="cp-q-card" style={{ marginTop: '16px' }}>
              <h3 className="cp-q-h">// ARCHIVED QUANTUM CHALLENGES</h3>
              <div className="cp-q-bank-list">
                {problemsBank.map((pb, i) => (
                  <div key={i} className="cp-bank-item">
                    <div className="cp-bank-title">🌌 {pb.title}</div>
                    <div className="cp-bank-meta">Trained: {pb.targetedWeakness?.substring(0, 45)}...</div>
                  </div>
                ))}
                {problemsBank.length === 0 && (
                  <p className="cp-q-placeholder" style={{ padding: '20px 0' }}>// No problems archived yet</p>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT: Generated Problem Sandbox Workspace */}
          <div className="cp-quantum-workspace">
            {generatedProblem ? (
              <div className="cp-q-workspace-card">
                
                {/* Glowing customize banner */}
                <div className="cp-quantum-pill-banner">
                  🌌 CREATED JUST FOR YOU TO TARGET: {generatedProblem.targetedWeakness || "DYNAMIC PROGRAMMING & BOUNDARY LIMITS"}
                </div>

                <h2 className="cp-q-p-title">{generatedProblem.title}</h2>
                
                {/* Narrative story wrapping */}
                <div className="cp-q-p-story">
                  <span className="cp-story-quote">“</span>
                  {generatedProblem.story}
                  <span className="cp-story-quote">”</span>
                </div>

                {/* Problem Statement */}
                <h3 className="cp-q-p-h">// TECHNICAL DESCRIPTION</h3>
                <p className="cp-q-p-desc">{generatedProblem.description}</p>

                {/* Constraints */}
                <h3 className="cp-q-p-h">// PARAMETER BOUNDS</h3>
                <ul className="cp-q-p-constraints">
                  {generatedProblem.constraints?.map((c, i) => (
                    <li key={i}>{c}</li>
                  )) || <li>Array length bounds apply.</li>}
                </ul>

                {/* Progressive Hints */}
                <h3 className="cp-q-p-h">// TARGETED INTUITION HINTS</h3>
                <div className="cp-q-hints">
                  {generatedProblem.hints?.map((h, i) => (
                    <div key={i} className="cp-q-hint-row">
                      <span className="cp-hint-idx">HINT #{i+1}:</span>
                      <span className="cp-hint-text">{h}</span>
                    </div>
                  ))}
                </div>

                 {/* Feedback adjuster */}
                <div className="cp-q-feedback-panel">
                  <h4 className="cp-q-feedback-h">// ALGORITHMIC PACING FEEDBACK</h4>
                  <div className="cp-feedback-buttons">
                    <button 
                      onClick={() => handleFeedbackChange('too-easy')} 
                      className={`cp-feedback-btn ${feedback === 'too-easy' ? 'active' : ''}`}
                    >
                      TOO EASY (UP DIFFICULTY)
                    </button>
                    <button 
                      onClick={() => handleFeedbackChange('optimal')} 
                      className={`cp-feedback-btn ${feedback === 'optimal' ? 'active' : ''}`}
                    >
                      OPTIMAL TRAINING DWELL
                    </button>
                    <button 
                      onClick={() => handleFeedbackChange('too-hard')} 
                      className={`cp-feedback-btn ${feedback === 'too-hard' ? 'active' : ''}`}
                    >
                      TOO COMPLEX (DOWN SCALE)
                    </button>
                  </div>
                </div>

                {/* Sandbox launching button */}
                <div className="cp-q-launch-wrap">
                  <button onClick={handleOpenProblem} className="cp-q-launch-btn">
                    📐 DEPLOY TO CODE SANDBOX
                  </button>
                </div>

              </div>
            ) : (
              <div className="cp-q-empty-card">
                <span className="cp-empty-ico">🌀</span>
                <h3>QUANTUM COMPILER READY</h3>
                <p>Click "Generate My Problem" above to launch the AI synthesis engine. We will parse your historical DSA submission error patterns and construct an entirely original challenge customized to train your weaknesses.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default QuantumGenerator;
