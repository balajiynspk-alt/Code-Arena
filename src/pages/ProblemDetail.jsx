import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { getProblemById, saveAcceptedSubmission, getUserSubmissionsForProblem } from '../services/problemService';
import { judgeSubmission } from '../services/pistonService';
import { auth } from '../services/firebase';
import AlgorithmVisualizer from '../components/AlgorithmVisualizer';
import CodeDNA from '../components/CodeDNA';
import GhostMentor from '../components/GhostMentor';
import { analyzeCode } from '../utils/codeAnalyzer';
import { CodeRecorder } from '../utils/codeRecorder';
import { saveReplay } from '../services/replayService';
import { saveThoughtMap } from '../services/thoughtService';
import { createPairRoom } from '../services/pairService';
import { startFlowSession, recordKeystroke, endFlowSession } from '../services/flowService';
import { addGuildPoints } from '../services/guildService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import EyeTracker from '../components/EyeTracker';
import { useEmotion } from '../context/EmotionContext';
import { startBroadcast, updateBroadcast, endBroadcast } from '../services/spectatorService';
import './ProblemDetail.css';

const DEFAULT_CODE = {
  python:     'def solve():\n    # Write your code here\n    pass\n',
  javascript: 'function solve() {\n    // Write your code here\n}\n',
  java:       'class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n',
  cpp:        '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
  go:         'package main\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n}\n'
};

const DIFF_CLASS = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

const ProblemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = auth.currentUser;

  const { 
    activeState, 
    themeColor, 
    isMinimalMode, 
    cognitiveTrigger, 
    registerSubmitAttempt 
  } = useEmotion();

  const [lofiOn, setLofiOn] = useState(false);
  const audioCtxRef = useRef(null);
  const synthNodeRef = useRef(null);

  const startAmbientLofi = () => {
    if (audioCtxRef.current) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(110, ctx.currentTime); 
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(165, ctx.currentTime); 

      gainNode.gain.setValueAtTime(0.03, ctx.currentTime); 
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime); 

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(filter);
      filter.connect(ctx.destination);

      osc1.start();
      osc2.start();

      synthNodeRef.current = { osc1, osc2, gainNode };
    } catch (e) {
      console.warn("Audio Context support failure:", e);
    }
  };

  const stopAmbientLofi = () => {
    if (audioCtxRef.current) {
      try {
        synthNodeRef.current?.osc1.stop();
        synthNodeRef.current?.osc2.stop();
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
      synthNodeRef.current = null;
    }
  };

  useEffect(() => {
    if (activeState === 'FLOW STATE' && lofiOn) {
      startAmbientLofi();
    } else {
      stopAmbientLofi();
    }
    return () => stopAmbientLofi();
  }, [activeState, lofiOn]);

  const handlePairProgramming = async () => {
    try {
      const roomId = await createPairRoom(
        id, 
        currentUser?.uid || `host_${Date.now()}`, 
        currentUser?.displayName || 'Host Coder', 
        code, 
        language
      );
      navigate(`/pair/${roomId}`);
    } catch (err) {
      console.error("Error initiating pair room:", err);
    }
  };

  const [activeTab, setActiveTab]         = useState('description');
  const [language, setLanguage]           = useState('python');
  const [code, setCode]                   = useState(DEFAULT_CODE['python']);
  const [executionResult, setExResult]    = useState(null);
  const [isJudging, setIsJudging]         = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('output');

  // Tracking states for AI Ghost Mentor
  const { data: userData } = useQuery({
    queryKey: ['userProfile', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return null;
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!currentUser
  });

  const [wrongAnswers, setWrongAnswers]   = useState(0);
  const [errorCount, setErrorCount]       = useState(0);
  const [isAccepted, setIsAccepted]       = useState(false);
  const [thoughtMapSaved, setThoughtMapSaved] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Sync editor keystrokes to spectators live
  useEffect(() => {
    if (isBroadcasting && currentUser) {
      updateBroadcast(currentUser.uid, { code }).catch(() => {});
    }
  }, [code, isBroadcasting, currentUser]);

  // Clean stream up on unmount
  useEffect(() => {
    return () => {
      if (currentUser) {
        endBroadcast(currentUser.uid).catch(() => {});
      }
    };
  }, [currentUser]);

  // Monaco Replay Recorder
  const recorderRef = useRef(new CodeRecorder());
  const editorRef = useRef(null);
  
  // Voice Thought Debugger Recording states
  const [isRecordingThoughts, setIsRecordingThoughts] = useState(false);
  const [recordedThoughts, setRecordedThoughts] = useState([]);
  const recognitionRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleToggleVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API recognition is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    if (!isRecordingThoughts) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        const lastResultIdx = event.results.length - 1;
        const text = event.results[lastResultIdx][0].transcript.trim();

        let currentLine = 1;
        if (editorRef.current) {
          currentLine = editorRef.current.getPosition()?.lineNumber || 1;
        }

        setRecordedThoughts(prev => [
          ...prev,
          {
            text,
            line: currentLine,
            timestamp: Date.now()
          }
        ]);
      };

      rec.onerror = (err) => {
        console.warn("Speech recognition error event:", err);
      };

      rec.onend = () => {
        if (isRecordingThoughts) {
          try { rec.start(); } catch (e) {}
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setIsRecordingThoughts(true);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
      setIsRecordingThoughts(false);
    }
  };

  // DNA analysis state variables
  const [submissionsHistory, setSubmissionsHistory] = useState([]);
  const [lastDNA, setLastDNA] = useState(null);
  const [currentDNA, setCurrentDNA] = useState(null);

  // Helper to fetch genomic submission history from Firestore
  const fetchSubmissionsHistory = async () => {
    if (!currentUser || !id) return;
    try {
      const history = await getUserSubmissionsForProblem(currentUser.uid, id);
      setSubmissionsHistory(history);
      if (history.length > 0) {
        // Last submission is the most recent accepted one
        const lastSub = history[history.length - 1];
        if (lastSub && lastSub.codeDNA) {
          setLastDNA(lastSub.codeDNA);
        } else {
          setLastDNA(null);
        }
      } else {
        setLastDNA(null);
      }
    } catch (err) {
      console.error("Error loading submissions history:", err);
    }
  };

  // Load history on mount or when user/problem changes
  useEffect(() => {
    fetchSubmissionsHistory();
    if (problem) {
      recorderRef.current.start(code || DEFAULT_CODE[language]);
    }
  }, [currentUser, id, problem]);

  // ── Coding Flow Tracker Passive Session Mount ──
  useEffect(() => {
    if (currentUser && id && problem) {
      startFlowSession(currentUser.uid, id, problem.difficulty);
    }
  }, [id, currentUser, problem]);

  // Live DNA parsing of current editor content
  useEffect(() => {
    if (code) {
      const dna = analyzeCode(code, language);
      setCurrentDNA(dna);
    }
  }, [code, language]);

  const { data: problem, isLoading, isError } = useQuery({
    queryKey: ['problem', id],
    queryFn:  () => getProblemById(id)
  });

  const submitMutation = useMutation({
    mutationFn: async ({ verdict, executionTime }) => {
      if (!currentUser) throw new Error('Must be logged in to submit');
      if (verdict === 'Accepted') {
        const dna = analyzeCode(code, language);
        await saveAcceptedSubmission(currentUser.uid, id, code, language, executionTime, dna);

        // Incremental College Guild points calculator
        try {
          const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (uData.collegeId) {
              const pts = problem.difficulty === 'Hard' ? 50 : problem.difficulty === 'Medium' ? 25 : 10;
              await addGuildPoints(
                uData.collegeId, 
                pts, 
                currentUser.uid, 
                currentUser.displayName || 'Developer'
              );
            }
          }
        } catch (e) {
          console.error("Failed to update college guild points:", e);
        }
      }
    },
    onSuccess: () => {
      if (currentUser) queryClient.invalidateQueries({ queryKey: ['solvedProblems', currentUser.uid] });
      fetchSubmissionsHistory();
    }
  });

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    const defaultCodeText = DEFAULT_CODE[lang];
    setCode(defaultCodeText);
    recorderRef.current.start(defaultCodeText);
  };

  const handleCodeChange = (val) => {
    const value = val || '';
    setCode(value);
    recorderRef.current.recordEdit(value);
    recordKeystroke();
  };

  const run = async () => {
    if (!problem?.testCases) return;
    setIsJudging(true);
    setExResult(null);
    try {
      const result = await judgeSubmission(language, code, problem.testCases.slice(0, 1));
      setExResult(result);
      if (result.verdict === 'Error') {
        setErrorCount(prev => prev + 1);
        recorderRef.current.recordMarker('run', 'Failed compile checks');
      } else if (result.verdict === 'Wrong Answer') {
        setWrongAnswers(prev => prev + 1);
        recorderRef.current.recordMarker('run', 'Failed test case bounds');
      } else if (result.verdict === 'Accepted') {
        setIsAccepted(true);
        recorderRef.current.recordMarker('run', 'Passed test suite');
      }
    } catch (err) {
      setExResult({ verdict: 'Error', executionTime: 0, results: [{ status: 'Error', output: err.message }] });
      setErrorCount(prev => prev + 1);
      recorderRef.current.recordMarker('run', 'Exception error encountered');
    } finally { setIsJudging(false); }
  };

  const submit = async () => {
    if (!problem?.testCases) return;
    setIsJudging(true);
    setExResult(null);
    registerSubmitAttempt();
    try {
      const result = await judgeSubmission(language, code, problem.testCases);
      setExResult(result);
      if (result.verdict === 'Accepted') {
        setIsAccepted(true);
        setShowMoodSelector(true);
        recorderRef.current.recordMarker('accepted', 'Passed production tests');
        
        // Save Replay payload to Firestore
        const payload = recorderRef.current.getPayload();
        saveReplay(
          currentUser?.uid || 'anonymous',
          currentUser?.displayName || 'Anonymous Coder',
          id,
          problem.title,
          payload
        );

        // Save Spoken Thought Map if thoughts are logged
        if (recordedThoughts.length > 0) {
          saveThoughtMap(
            currentUser?.uid || 'anonymous',
            currentUser?.displayName || 'Anonymous Coder',
            id,
            problem.title,
            recordedThoughts,
            code,
            result.executionTime || 120
          ).then(() => {
            setThoughtMapSaved(true);
          });
        }

        submitMutation.mutate({ verdict: result.verdict, executionTime: result.executionTime });
      } else if (result.verdict === 'Error') {
        setErrorCount(prev => prev + 1);
        recorderRef.current.recordMarker('run', 'Production compile failure');
      } else {
        setWrongAnswers(prev => prev + 1);
        recorderRef.current.recordMarker('run', 'Production wrong answer verdict');
      }
    } catch (err) {
      setExResult({ verdict: 'Error', executionTime: 0, results: [{ status: 'Error', output: err.message }] });
      setErrorCount(prev => prev + 1);
      recorderRef.current.recordMarker('run', 'Production system exception');
    } finally { setIsJudging(false); }
  };

  if (isLoading) return <div className="cp-pd-state">// LOADING PROBLEM...</div>;
  if (isError || !problem) return <div className="cp-pd-state cp-pd-state--err">// PROBLEM NOT FOUND</div>;

  const verdictClass =
    executionResult?.verdict === 'Accepted' ? 'accepted' :
    executionResult?.verdict === 'Error'    ? 'error'    : 'wrong';

  return (
    <div className={`cp-pd-container ${isMinimalMode ? 'cp-flow-active' : ''}`}>

      {/* ═══════════════ LEFT PANE ═══════════════ */}
      <div className="cp-pd-left">

        {/* Tabs */}
        <div className="cp-pd-tabs">
          {['description', 'hints', 'dna'].map(tab => (
            <button
              key={tab}
              className={`cp-pd-tab ${activeTab === tab ? 'cp-pd-tab--active' : ''}`}
              style={activeTab === tab ? { borderColor: themeColor, color: themeColor } : {}}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'dna' ? 'CODE DNA' : tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="cp-pd-content">
          {activeTab === 'description' && (
            <>
              <h1 className="cp-pd-title">
                <span className="cp-pd-num">{problem.number}.</span> {problem.title}
              </h1>

              {/* Meta */}
              <div className="cp-pd-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className={`cp-pd-diff cp-pd-diff--${DIFF_CLASS[problem.difficulty] ?? 'easy'}`}>
                    {problem.difficulty}
                  </span>
                  {problem.topics?.map(t => (
                    <span key={t} className="cp-pd-topic">{t}</span>
                  ))}
                </div>

                <button
                  onClick={() => navigate(`/multiverse/${id}`)}
                  className="cp-pd-run-btn"
                  style={{
                    fontSize: '0.62rem',
                    padding: '4px 10px',
                    borderColor: '#FFAA00',
                    color: '#FFAA00',
                    background: 'transparent',
                    fontFamily: 'Orbitron',
                    letterSpacing: '1px'
                  }}
                >
                  🌌 SEE ALL APPROACHES
                </button>
              </div>

              {/* Description */}
              <div className="cp-pd-desc">
                <ReactMarkdown>{problem.description || ''}</ReactMarkdown>
              </div>

              {/* Webcam Eye-Tracking Heatmap Overlay */}
              <EyeTracker 
                problemDescription={problem.description}
                problemId={id}
                isAccepted={isAccepted}
              />

              {/* Examples */}
              {problem.examples?.length > 0 && (
                <div className="cp-pd-examples">
                  <h3 className="cp-pd-ex-heading">// EXAMPLES</h3>
                  {problem.examples.map((ex, i) => (
                    <div key={i} className="cp-pd-ex-block">
                      <div className="cp-pd-ex-row"><span className="cp-pd-ex-label">Input:</span>  <code>{ex.input}</code></div>
                      <div className="cp-pd-ex-row"><span className="cp-pd-ex-label">Output:</span> <code>{ex.output}</code></div>
                      {ex.explanation && <div className="cp-pd-ex-row"><span className="cp-pd-ex-label">Note:</span> {ex.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'hints' && (
            <div className="cp-pd-hints">
              {problem.hints?.length > 0 ? problem.hints.map((hint, i) => (
                <div key={i} className="cp-pd-hint-card">
                  <span className="cp-pd-hint-num">HINT {i + 1}</span>
                  <p>{hint}</p>
                </div>
              )) : <p className="cp-pd-empty">// NO HINTS AVAILABLE</p>}
            </div>
          )}

          {activeTab === 'dna' && (
            <CodeDNA 
              currentDNA={currentDNA} 
              lastDNA={lastDNA} 
              submissionsHistory={submissionsHistory} 
              language={language}
            />
          )}
        </div>
      </div>

      {/* ═══════════════ RIGHT PANE ══════════════ */}
      <div className="cp-pd-right">

        {/* Editor toolbar */}
        <div className="cp-pd-toolbar">
          <select className="cp-pd-lang-sel" value={language} onChange={handleLanguageChange}>
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
          </select>

          <div className="cp-pd-actions">
            {!isMinimalMode && (
              <>
                <button 
                  className={`cp-pd-run-btn ${isRecordingThoughts ? 'recording' : ''}`}
                  onClick={handleToggleVoiceRecording}
                  style={{
                    fontSize: '0.68rem',
                    padding: '6px 12px',
                    marginRight: '12px',
                    border: `1px solid ${themeColor}`,
                    color: isRecordingThoughts ? '#0A0A0F' : themeColor,
                    background: isRecordingThoughts ? themeColor : 'transparent',
                    fontWeight: 'bold',
                    fontFamily: 'Orbitron',
                    letterSpacing: '1px'
                  }}
                >
                  🎤 {isRecordingThoughts ? 'RECORDING...' : 'RECORD THOUGHTS'}
                </button>

                <button 
                  className="cp-pd-run-btn"
                  onClick={handlePairProgramming}
                  style={{
                    fontSize: '0.68rem',
                    padding: '6px 12px',
                    marginRight: '12px',
                    border: '1px solid #FFAA00',
                    color: '#FFAA00',
                    background: 'transparent',
                    fontWeight: 'bold',
                    fontFamily: 'Orbitron',
                    letterSpacing: '1px'
                  }}
                >
                  🤝 PAIR CODE
                </button>

                <button 
                  className={`cp-pd-run-btn ${isBroadcasting ? 'recording' : ''}`}
                  onClick={async () => {
                    if (isBroadcasting) {
                      await endBroadcast(currentUser?.uid);
                      setIsBroadcasting(false);
                    } else {
                      await startBroadcast(
                        currentUser?.uid || 'anonymous',
                        currentUser?.displayName || 'Host Coder',
                        userData?.rating || 1850,
                        id,
                        code,
                        1
                      );
                      setIsBroadcasting(true);
                    }
                  }}
                  style={{
                    fontSize: '0.68rem',
                    padding: '6px 12px',
                    marginRight: '12px',
                    border: '1px solid #FF5555',
                    color: isBroadcasting ? '#0A0A0F' : '#FF5555',
                    background: isBroadcasting ? '#FF5555' : 'transparent',
                    fontWeight: 'bold',
                    fontFamily: 'Orbitron',
                    letterSpacing: '1px',
                    boxShadow: isBroadcasting ? '0 0 10px rgba(255, 85, 85, 0.4)' : 'none'
                  }}
                >
                  📡 {isBroadcasting ? 'STOP STREAM' : 'GO LIVE'}
                </button>
              </>
            )}

            {isMinimalMode && (
              <div className="cp-flow-banner" style={{ borderLeft: `3px solid ${themeColor}` }}>
                <span>🧠 HYPER-FLOW ACTIVE</span>
                <label className="cp-flow-lofi-toggle">
                  <input 
                    type="checkbox" 
                    checked={lofiOn} 
                    onChange={(e) => setLofiOn(e.target.checked)} 
                  />
                  🎧 SYNTH LO-FI
                </label>
              </div>
            )}

            <button className="cp-pd-run-btn" onClick={run} style={{ border: `1px solid ${themeColor}`, color: themeColor }} disabled={isJudging}>
              {isJudging ? '⟳ RUNNING...' : '▶ RUN'}
            </button>
            <button className="cp-pd-submit-btn" onClick={submit} style={{ background: themeColor, borderColor: themeColor }} disabled={isJudging}>
              {isJudging ? 'SUBMITTING...' : 'SUBMIT'}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="cp-pd-editor">
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language}
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            options={{
              minimap:            { enabled: false },
              fontSize:           13,
              fontFamily:         "'Share Tech Mono', monospace",
              lineHeight:         22,
              padding:            { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              renderLineHighlight: 'line',
              cursorBlinking:     'phase',
              cursorStyle:        'block',
            }}
          />
        </div>

        {/* Cognitive Biometric Adaptation Alerts */}
        {cognitiveTrigger === 'break-reminder' && (
          <div className="cp-emotion-alert-card cp-em-alert--frustrated" style={{ borderLeft: `4px solid ${themeColor}` }}>
            <span className="cp-em-alert-icon">☕</span>
            <div className="cp-em-alert-body">
              <h4 style={{ color: themeColor, margin: '0 0 4px 0', fontFamily: 'Orbitron', fontSize: '0.78rem' }}>EVERY EXPERT WAS ONCE HERE</h4>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#8888AA', lineHeight: '1.4' }}>You've deleted several code lines in rapid succession. Take a steady deep breath. Let's take a 5-minute break to refresh your bounds!</p>
              <button onClick={() => navigate('/problems')} className="cp-pd-run-btn" style={{ marginTop: '8px', padding: '4px 8px', fontSize: '0.62rem', border: `1px solid ${themeColor}`, color: themeColor, background: 'transparent' }}>
                🚶 WALK AWAY (5m Break)
              </button>
            </div>
          </div>
        )}

        {cognitiveTrigger === 'refresher-tip' && (
          <div className="cp-emotion-alert-card cp-em-alert--confused" style={{ borderLeft: `4px solid ${themeColor}` }}>
            <span className="cp-em-alert-icon">💡</span>
            <div className="cp-em-alert-body">
              <h4 style={{ color: themeColor, margin: '0 0 4px 0', fontFamily: 'Orbitron', fontSize: '0.78rem' }}>CONCEPT REFRESHER ACTIVE</h4>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#8888AA', lineHeight: '1.4' }}>Stuck on constraints or logic bounds? We suggest opening the flowchart whiteboard to visualize your variables map.</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={() => navigate(`/whiteboard/${id}`)} className="cp-pd-submit-btn" style={{ padding: '4px 8px', fontSize: '0.62rem', background: themeColor, borderColor: themeColor, color: '#000', fontWeight: 'bold' }}>
                  📐 OPEN ALGO WHITEBOARD
                </button>
                <button onClick={() => navigate('/problems')} className="cp-pd-run-btn" style={{ padding: '4px 8px', fontSize: '0.62rem', border: `1px solid ${themeColor}`, color: themeColor, background: 'transparent' }}>
                  📚 VIEW SIMILAR PROBLEMS
                </button>
              </div>
            </div>
          </div>
        )}

        {cognitiveTrigger === 'combat-challenge' && (
          <div className="cp-emotion-alert-card cp-em-alert--bored" style={{ borderLeft: `4px solid ${themeColor}` }}>
            <span className="cp-em-alert-icon">🌋</span>
            <div className="cp-em-alert-body">
              <h4 style={{ color: themeColor, margin: '0 0 4px 0', fontFamily: 'Orbitron', fontSize: '0.78rem' }}>COGNITIVE APATHY DETECTED!</h4>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#8888AA', lineHeight: '1.4' }}>Algorithmic pacing is extremely slow. We challenge you to conquer the Daily Boss Raid event or fight in 1v1 arenas!</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={() => navigate('/boss')} className="cp-pd-submit-btn" style={{ padding: '4px 8px', fontSize: '0.62rem', background: themeColor, borderColor: themeColor, color: '#000', fontWeight: 'bold' }}>
                  👹 DAILY BOSS RAID
                </button>
                <button onClick={() => navigate('/skills')} className="cp-pd-run-btn" style={{ padding: '4px 8px', fontSize: '0.62rem', border: `1px solid ${themeColor}`, color: themeColor, background: 'transparent' }}>
                  ⚔️ SKILLS TREE MASTER
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Output & Visualizer panel */}
        <div className={`cp-pd-output ${rightPanelTab === 'visualize' ? 'cp-pd-output--visualize' : ''} ${executionResult && rightPanelTab === 'output' ? `cp-pd-output--${verdictClass}` : ''}`}>
          <div className="cp-pd-output-header">
            <div style={{ display: 'flex', gap: '20px' }}>
              <button
                className={`cp-pd-output-tab ${rightPanelTab === 'output' ? 'active' : ''}`}
                onClick={() => setRightPanelTab('output')}
              >
                // EXECUTION OUTPUT
              </button>
              <button
                className={`cp-pd-output-tab ${rightPanelTab === 'visualize' ? 'active' : ''}`}
                onClick={() => setRightPanelTab('visualize')}
              >
                // VISUALIZE
              </button>
            </div>
            {executionResult && rightPanelTab === 'output' && (
              <div className="cp-pd-output-meta">
                <span className="cp-pd-exec-time">{executionResult.executionTime}ms</span>
                <span className={`cp-pd-verdict cp-pd-verdict--${verdictClass}`}>
                  {executionResult.verdict.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="cp-pd-output-body">
            {rightPanelTab === 'output' ? (
              <>
                {showMoodSelector && (
                  <div 
                    style={{
                      background: 'rgba(0, 255, 136, 0.05)',
                      border: '1px solid #00FF88',
                      borderRadius: '4px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 0 10px rgba(0, 255, 136, 0.2)'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#00FF88', fontFamily: 'Orbitron', fontSize: '0.8rem', letterSpacing: '1px' }}>⚡ RATE YOUR FOCUS FLOW MOOD!</h4>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#8888AA' }}>How focused or energised did you feel during this session?</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { emoji: '😠', value: 1, label: 'Frustrated' },
                        { emoji: '🥱', value: 2, label: 'Drained' },
                        { emoji: '😐', value: 3, label: 'Neutral' },
                        { emoji: '🙂', value: 4, label: 'Engaged' },
                        { emoji: '🚀', value: 5, label: 'Flow State!' }
                      ].map(item => (
                        <button
                          key={item.value}
                          onClick={() => {
                            endFlowSession(true, errorCount, problem.hints?.length || 0, item.value);
                            setShowMoodSelector(false);
                          }}
                          style={{
                            fontSize: '1.25rem',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.15s'
                          }}
                          title={item.label}
                        >
                          {item.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {thoughtMapSaved && (
                  <div 
                    style={{
                      background: 'rgba(255, 45, 120, 0.05)',
                      border: '1px solid #FF2D78',
                      borderRadius: '4px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 0 10px rgba(255, 45, 120, 0.2)'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#FF2D78', fontFamily: 'Orbitron', fontSize: '0.8rem', letterSpacing: '1px' }}>🎤 VOICE THOUGHT MAP GENERATED!</h4>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#8888AA' }}>Your spoken debugging thought streams were successfully transcribed and saved.</p>
                    </div>
                    <button
                      className="cp-radar-btn"
                      onClick={() => navigate(`/thoughts/${currentUser?.uid || 'anonymous'}/${id}`)}
                      style={{ border: '1px solid #FF2D78', color: '#FF2D78', fontSize: '0.65rem', background: 'transparent', cursor: 'pointer', fontFamily: 'Orbitron' }}
                    >
                      VIEW THOUGHT MAP
                    </button>
                  </div>
                )}

                {isAccepted && (
                  <div 
                    style={{
                      background: 'rgba(255, 170, 0, 0.05)',
                      border: '1px solid #FFAA00',
                      borderRadius: '4px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 0 10px rgba(255, 170, 0, 0.2)'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#FFAA00', fontFamily: 'Orbitron', fontSize: '0.8rem', letterSpacing: '1px' }}>🌌 ENTER CODE MULTIVERSE!</h4>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#8888AA' }}>Explore 5 different solution dimensions (Brute-Force, Space-Optimized, One-Liner) and run a speed race!</p>
                    </div>
                    <button
                      className="cp-radar-btn"
                      onClick={() => navigate(`/multiverse/${id}`)}
                      style={{ border: '1px solid #FFAA00', color: '#FFAA00', fontSize: '0.65rem', background: 'transparent', cursor: 'pointer', fontFamily: 'Orbitron' }}
                    >
                      OPEN MULTIVERSE 🌌
                    </button>
                  </div>
                )}

                {!executionResult && !isJudging && (
                  <span className="cp-pd-placeholder">// RUN YOUR CODE TO SEE OUTPUT</span>
                )}
                {isJudging && (
                  <span className="cp-pd-judging">JUDGING IN PROGRESS...</span>
                )}
                {executionResult?.results.map((res, i) => (
                  <div key={i} className="cp-pd-result">
                    <div className={`cp-pd-result-title ${res.status === 'Accepted' ? 'ok' : 'fail'}`}>
                      TEST CASE {res.testCase}: {res.status.toUpperCase()}
                    </div>
                    <div className="cp-pd-result-label">OUTPUT:</div>
                    <pre className="cp-pd-pre">{res.output || '<empty>'}</pre>
                    {res.status !== 'Accepted' && res.status !== 'Error' && (
                      <>
                        <div className="cp-pd-result-label">EXPECTED:</div>
                        <pre className="cp-pd-pre cp-pd-pre--expected">{res.expected}</pre>
                      </>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <AlgorithmVisualizer />
            )}
          </div>
        </div>
      </div>

      {/* AI Ghost Mentor floating container */}
      <GhostMentor 
        code={code} 
        problemTitle={problem?.title} 
        errorCount={errorCount} 
        wrongAnswers={wrongAnswers} 
        isAccepted={isAccepted} 
      />
    </div>
  );
};

export default ProblemDetail;
