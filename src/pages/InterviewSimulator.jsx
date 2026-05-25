import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { auth } from '../services/firebase';
import { startInterviewSession, askInterviewer, evaluateInterview } from '../services/interviewService';
import './InterviewSimulator.css';

const InterviewSimulator = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // Flow State
  const [phase, setPhase] = useState('setup'); // 'setup' | 'active' | 'report'
  const [company, setCompany] = useState('Google');
  const [difficulty, setDifficulty] = useState('Medium');
  const [duration, setDuration] = useState(45);

  // Active Session states
  const [problem, setProblem] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [candidateInput, setCandidateInput] = useState('');
  const [userCode, setUserCode] = useState('// Write your coding solution here during the interview...\n');
  const [isThinking, setIsThinking] = useState(false);

  // Evaluation states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [reportCard, setReportCard] = useState(null);

  // Chat scroll anchor
  const chatEndRef = useRef(null);

  // 1. Timer Countdown ticking
  useEffect(() => {
    if (phase !== 'active' || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  // 2. Autoscroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  // ── Start Interview Session ──
  const handleStartSession = () => {
    const selectedProblem = startInterviewSession(difficulty);
    setProblem(selectedProblem);
    setTimeLeft(duration * 60);

    // Initial greeting message
    const greeting = `Hi! I'm your interviewer today representing ${company}. Here is your problem: "${selectedProblem.title}". Take a moment to read the description on the right panel, share your initial thoughts, and feel free to start typing your approach!`;
    
    setChatMessages([
      { sender: 'interviewer', text: greeting, timestamp: Date.now() }
    ]);
    setPhase('active');
  };

  // ── Send message response to Interviewer ──
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!candidateInput.trim() || isThinking) return;

    const messageText = candidateInput.trim();
    setCandidateInput('');

    // Append candidate message
    const updatedLogs = [
      ...chatMessages,
      { sender: 'candidate', text: messageText, timestamp: Date.now() }
    ];
    setChatMessages(updatedLogs);

    // Trigger interviewer generative thinking process
    setIsThinking(true);
    try {
      const reply = await askInterviewer(
        company,
        difficulty,
        problem,
        updatedLogs,
        userCode,
        messageText
      );
      setChatMessages(prev => [
        ...prev,
        { sender: 'interviewer', text: reply, timestamp: Date.now() }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  };

  // ── Finish & Evaluate interview ──
  const handleFinishInterview = async () => {
    setPhase('report');
    setIsEvaluating(true);
    try {
      const evaluation = await evaluateInterview(
        company,
        difficulty,
        problem,
        chatMessages,
        userCode,
        currentUser?.uid || 'anonymous'
      );
      setReportCard(evaluation);
    } catch (err) {
      console.error("Evaluation error:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Time Formatter
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
  };

  // Pressure ratio calculations
  const totalSeconds = duration * 60;
  const timeRatio = timeLeft / totalSeconds;
  const pressureClass = timeRatio > 0.5 ? 'low' : timeRatio > 0.2 ? 'medium' : 'high';

  // ── Render Company Setup Screen ──
  if (phase === 'setup') {
    return (
      <div className="cp-int-page">
        <div className="cp-battle-lobby-glow" style={{ background: 'rgba(0, 255, 136, 0.04)' }} />
        
        <div className="cp-int-setup-box">
          <h2 className="cp-int-setup-title">// INTERVIEW PARAMETERS</h2>
          
          <div className="cp-int-field">
            <label>FAANG SPONSOR COMPANY</label>
            <select className="cp-int-select" value={company} onChange={e => setCompany(e.target.value)}>
              <option value="Google">Google</option>
              <option value="Amazon">Amazon</option>
              <option value="Meta">Meta</option>
              <option value="Microsoft">Microsoft</option>
            </select>
          </div>

          <div className="cp-int-field">
            <label>COMPLEXITY THRESHOLD</label>
            <select className="cp-int-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="cp-int-field">
            <label>DURATION LOCK</label>
            <select className="cp-int-select" value={duration} onChange={e => setDuration(Number(e.target.value))}>
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes</option>
            </select>
          </div>

          <button 
            className="cp-radar-btn cp-radar-btn--active" 
            onClick={handleStartSession}
            style={{ background: '#00FF88', borderColor: '#00FF88', color: '#000', marginTop: '12px' }}
          >
            ENGAGE SIMULATOR ⚡
          </button>
        </div>
      </div>
    );
  }

  // ── Render Report Card Overlay ──
  if (phase === 'report') {
    return (
      <div className="cp-int-page">
        <div className="cp-int-report-overlay">
          <div className="cp-int-report-card">
            <h2 className="cp-int-report-title">FAANG INTERVIEW EVALUATION</h2>

            {isEvaluating ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#00FF88' }}>
                <div className="cp-int-avatar-wrap" style={{ margin: '0 auto 16px auto', width: '60px', height: '60px' }}>
                  <svg className="cp-int-avatar-svg thinking" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#00FF88" strokeWidth="2" />
                    <circle cx="9" cy="10" r="1.5" fill="#00FF88" />
                    <circle cx="15" cy="10" r="1.5" fill="#00FF88" />
                    <path d="M8 15C10 17 14 17 16 15" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <span>Compiling AI evaluation metrics... Please wait.</span>
              </div>
            ) : reportCard ? (
              <>
                {/* Hero scores */}
                <div className="cp-int-report-hero">
                  <div className="cp-int-report-score-box">
                    <div className="cp-int-report-score-val">{reportCard.score}</div>
                    <div className="cp-int-report-score-label">OVERALL MATCH SCORE</div>
                  </div>
                  <div className="cp-int-report-rating-box">
                    <div className="cp-int-report-rating-val">{reportCard.rating}</div>
                    <div className="cp-int-report-rating-label">COMPANY BENCHMARK</div>
                  </div>
                </div>

                {/* Metric grid */}
                <div className="cp-int-report-metrics">
                  <div className="cp-int-metric-row">
                    <span className="cp-int-metric-name">Problem Solving:</span>
                    <span className="cp-int-metric-val" style={{ color: '#00FF88' }}>{reportCard.breakdown?.problemSolving}/100</span>
                  </div>
                  <div className="cp-int-metric-row">
                    <span className="cp-int-metric-name">Communication:</span>
                    <span className="cp-int-metric-val" style={{ color: '#FFAA00' }}>{reportCard.breakdown?.communication}/100</span>
                  </div>
                  <div className="cp-int-metric-row">
                    <span className="cp-int-metric-name">Code Quality:</span>
                    <span className="cp-int-metric-val" style={{ color: '#FF2D78' }}>{reportCard.breakdown?.codeQuality}/100</span>
                  </div>
                  <div className="cp-int-metric-row">
                    <span className="cp-int-metric-name">Complexity Analysis:</span>
                    <span className="cp-int-metric-val" style={{ color: '#00FF88' }}>{reportCard.breakdown?.complexityAnalysis}/100</span>
                  </div>
                </div>

                {/* Specific feedback */}
                <div className="cp-int-report-feedback">
                  <strong>Interviewer Notes:</strong>
                  <p style={{ margin: '8px 0 0 0', color: '#8888AA', fontStyle: 'italic' }}>
                    "{reportCard.feedback}"
                  </p>
                </div>

                <button 
                  className="cp-radar-btn cp-radar-btn--active"
                  onClick={() => navigate('/dashboard')}
                  style={{ background: '#00FF88', borderColor: '#00FF88', color: '#000', marginTop: '12px' }}
                >
                  RETURN TO DASHBOARD
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#FF2D78' }}>
                <span>Failed to retrieve evaluation. Please check your network context.</span>
                <button className="cp-radar-btn" onClick={() => navigate('/dashboard')} style={{ marginTop: '24px' }}>
                  RETURN
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render Active Interview Split Panel ──
  return (
    <div className="cp-int-page">
      
      {/* Top dashboard bar */}
      <div className="cp-int-topbar">
        <span className="cp-int-title-meta">
          {company.toUpperCase()} RAIDS // DIFFICULTY: {difficulty.toUpperCase()}
        </span>

        <div className="cp-int-timer-box">
          {/* Pressure indicator meter */}
          <div className="cp-int-pressure-container">
            <span>PRESSURE:</span>
            <div className="cp-int-pressure-bar">
              <div 
                className={`cp-int-pressure-fill ${pressureClass}`} 
                style={{ width: `${timeRatio * 100}%` }}
              />
            </div>
          </div>
          <span className="cp-int-countdown">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Aligned split grid */}
      <div className="cp-int-layout">
        
        {/* Left Side: Live chat panels (40%) */}
        <div className="cp-int-chat-panel">
          
          <div className="cp-int-interviewer-card">
            <div className="cp-int-avatar-wrap">
              <svg 
                className={`cp-int-avatar-svg ${isThinking ? 'thinking' : ''}`} 
                viewBox="0 0 24 24" 
                fill="none"
              >
                <circle cx="12" cy="12" r="10" stroke="#00FF88" strokeWidth="2" />
                <circle cx="9" cy="10" r="1.5" fill="#00FF88" />
                <circle cx="15" cy="10" r="1.5" fill="#00FF88" />
                <path d="M8 15C10 17 14 17 16 15" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            
            <div className="cp-int-interviewer-info">
              <span className="cp-int-interviewer-name">FAANG Interviewer ({company})</span>
              <span className="cp-int-interviewer-status">
                {isThinking ? 'Thinking...' : 'Active Monitoring'}
              </span>
            </div>
          </div>

          <div className="cp-int-chat-history">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`cp-int-bubble-row ${msg.sender}`}>
                <div className={`cp-int-bubble ${msg.sender}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {/* Thinking simulated message indicator bubble */}
            {isThinking && (
              <div className="cp-int-bubble-row interviewer">
                <div className="cp-int-bubble interviewer" style={{ opacity: 0.6 }}>
                  Generating approach follow-up details...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat text box input */}
          <form className="cp-int-chat-input-bar" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Explain your algorithmic approach here..."
              className="cp-int-chat-input"
              value={candidateInput}
              onChange={e => setCandidateInput(e.target.value)}
              disabled={isThinking}
            />
            <button type="submit" className="cp-int-send-btn" disabled={isThinking}>
              SEND
            </button>
          </form>

        </div>

        {/* Right Side: Monaco Code Editor + Problem (60%) */}
        <div className="cp-int-editor-panel">
          
          {/* Problem Statement Card */}
          <div className="cp-int-statement-card">
            <h3 className="cp-int-statement-title">{problem?.title}</h3>
            <p className="cp-int-statement-body">{problem?.description}</p>
          </div>

          <div className="cp-int-editor-container">
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

          <div className="cp-int-editor-footer">
            <button 
              className="cp-radar-btn cp-radar-btn--active" 
              onClick={handleFinishInterview}
              style={{ background: '#00FF88', borderColor: '#00FF88', color: '#000' }}
            >
              FINISH & SUBMIT SOLUTIONS
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default InterviewSimulator;
