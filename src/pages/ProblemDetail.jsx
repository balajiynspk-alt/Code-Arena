import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CodeEditor, { LanguageSelector } from '../components/Editor/CodeEditor';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { getProblemById, saveAcceptedSubmission, getUserSubmissionsForProblem } from '../services/problemService';
import { executeCode, judgeCode, checkEngineHealth } from '../services/compilerService';
import { auth } from '../services/firebase';
import AlgorithmVisualizer from '../components/Visualizer/AlgorithmVisualizer';
import CodeDNA from '../components/CodeDNA';
import GhostMentor from '../components/GhostMentor';
import { analyzeCode } from '../utils/codeAnalyzer';
import { CodeRecorder } from '../utils/codeRecorder';
import { saveReplay } from '../services/replayService';
import { saveThoughtMap } from '../services/thoughtService';
import { createPairRoom } from '../services/pairService';
import { startFlowSession, recordKeystroke, endFlowSession } from '../services/flowService';
import { addGuildPoints } from '../services/guildService';
import { doc, getDoc, query, where, orderBy, limit, collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import EyeTracker from '../components/EyeTracker';
import { useEmotion } from '../context/EmotionContext';
import { startBroadcast, updateBroadcast, endBroadcast } from '../services/spectatorService';
import { getComments, addComment, editComment, deleteComment, voteComment } from '../services/discussionService';
import { getUserWeaknessProfile, saveWeaknessProfile } from '../services/quantumGeneratorService';
import ShareSolutionModal from '../components/ShareSolutionModal';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { saveCodeDraft, submitSolution } from '../services/firestoreService';
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
  const { state: routerState } = useLocation();
  const customProblem = routerState?.customProblem;
  
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

  /* ── Problem Discussion System States ── */
  const [comments, setComments]           = useState([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentText, setCommentText]     = useState('');
  const [snippetText, setSnippetText]     = useState('');
  const [snippetLang, setSnippetLang]     = useState('python');
  const [showSnippet, setShowSnippet]     = useState(false);
  const [discussionSort, setDiscussionSort] = useState('top'); // 'top' | 'new' | 'my'
  const [replyToId, setReplyToId]         = useState(null);
  const [replyText, setReplyText]         = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText]           = useState('');

  const loadDiscussions = async () => {
    if (!id) return;
    try {
      const list = await getComments(id);
      setComments(list);
      setCommentsCount(list.length);
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  useEffect(() => {
    loadDiscussions();
  }, [id]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addComment(
        id,
        commentText,
        showSnippet ? snippetText : '',
        showSnippet ? snippetLang : 'python'
      );
      setCommentText('');
      setSnippetText('');
      setShowSnippet(false);
      await loadDiscussions();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyText.trim()) return;
    try {
      await addComment(id, replyText, '', 'python', parentId);
      setReplyText('');
      setReplyToId(null);
      await loadDiscussions();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVoteComment = async (commentId, voteType) => {
    try {
      const res = await voteComment(id, commentId, voteType);
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, upvotes: res.upvotes, downvotes: res.downvotes };
        }
        return c;
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveEdit = async (commentId) => {
    if (!editText.trim()) return;
    try {
      await editComment(id, commentId, editText);
      setEditingCommentId(null);
      setEditText('');
      await loadDiscussions();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteComment(id, commentId);
      await loadDiscussions();
    } catch (err) {
      alert(err.message);
    }
  };
  const [language, setLanguage]           = useState('python');
  const [code, setCode]                   = useState(DEFAULT_CODE['python']);
  const [executionResult, setExResult]    = useState(null);
  const [isJudging, setIsJudging]         = useState(false);
  const [progress, setProgress]           = useState('');
  const [nextProblemId, setNextProblemId] = useState(null);
  const [rightPanelTab, setRightPanelTab] = useState('output');
  const [activeMobileTab, setActiveMobileTab] = useState('problem');
  const [isOnline, setIsOnline]           = useState(navigator.onLine);

  const { data: dbProblem, isLoading: dbLoading, isError: dbError } = useQuery({
    queryKey: ['problem', id],
    queryFn:  () => getProblemById(id),
    enabled: !customProblem
  });

  const cachedProblemRaw = localStorage.getItem('last_viewed_problem');
  const cachedProblem = cachedProblemRaw ? JSON.parse(cachedProblemRaw) : null;
  const problem = customProblem || dbProblem || (cachedProblem?.id === id || cachedProblem?.number?.toString() === id ? cachedProblem : null);

  const isLoading = !customProblem && dbLoading && isOnline;
  const isError = !customProblem && dbError && !problem;

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [compilerStatus, setCompilerStatus] = useState('checking');

  // Sync isAccepted based on user profile solvedProblems list
  useEffect(() => {
    if (userData && problem) {
      const solvedList = userData.solvedProblems || [];
      if (solvedList.includes(id) || solvedList.includes(problem.id)) {
        setIsAccepted(true);
      }
    }
  }, [userData, problem, id]);

  // Load language preference from user data or local storage
  useEffect(() => {
    if (userData?.preferredLanguage) {
      setLanguage(userData.preferredLanguage);
    } else {
      const savedLang = localStorage.getItem(`lang_${id}`);
      if (savedLang) {
        setLanguage(savedLang);
      }
    }
  }, [userData, id]);

  // Track internet connectivity and process queued submissions
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online! Sending queued submissions...");
      
      const queued = JSON.parse(localStorage.getItem('queued_submissions') || '[]');
      if (queued.length > 0) {
        queued.forEach(async (sub) => {
          try {
            await submitSolution(sub.userId, sub.problemId, sub.code, sub.language, sub.verdict, sub.testResults);
          } catch (e) {
            console.error("Failed to send queued solution:", e);
          }
        });
        localStorage.removeItem('queued_submissions');
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You are offline. Submissions will be queued.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save last viewed problem to local storage for offline retrieval
  useEffect(() => {
    if (problem) {
      localStorage.setItem('last_viewed_problem', JSON.stringify(problem));
    }
  }, [problem]);

  // Load draft code from localStorage (fast) or Firestore
  useEffect(() => {
    if (!id || !language) return;

    const localSaved = localStorage.getItem(`code_${id}_${language}`);
    if (localSaved) {
      setCode(localSaved);
      return;
    }

    if (currentUser) {
      import('../services/firestoreService').then(({ getCodeDraft }) => {
        getCodeDraft(currentUser.uid, id).then(draft => {
          if (draft && draft.language === language && draft.code) {
            setCode(draft.code);
            localStorage.setItem(`code_${id}_${language}`, draft.code);
          } else {
            setCode(DEFAULT_CODE[language] || '');
          }
        }).catch(err => {
          console.warn("Failed to load draft from Firestore:", err);
          setCode(DEFAULT_CODE[language] || '');
        });
      });
    } else {
      setCode(DEFAULT_CODE[language] || '');
    }
  }, [id, language, currentUser]);

  // Query next unsolved/next problem sequentially
  useEffect(() => {
    if (problem) {
      const getNext = async () => {
        try {
          const q = query(
            collection(db, 'problems'),
            where('number', '>', problem.number || 0),
            orderBy('number', 'asc'),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            setNextProblemId(snap.docs[0].id);
          }
        } catch (e) {
          console.warn("Failed to fetch next problem suggestion:", e);
        }
      };
      getNext();
    }
  }, [problem]);

  useEffect(() => {
    const verifyHealth = async () => {
      try {
        const health = await checkEngineHealth();
        if (!health.healthy) {
          setCompilerStatus('offline');
        } else {
          setCompilerStatus(health.status);
        }
      } catch (e) {
        setCompilerStatus('offline');
      }
    };
    verifyHealth();
    const interval = setInterval(verifyHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  // Auto-save draft code to localStorage immediately, and sync to Firestore with a subtle notification toast
  useEffect(() => {
    const interval = setInterval(async () => {
      if (currentUser && code && problem) {
        localStorage.setItem(`code_${id}_${language}`, code);
        try {
          await saveCodeDraft(currentUser.uid, id, code, language);
          toast('Code saved', {
            duration: 1500,
            style: {
              background: '#222',
              color: '#FFF',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '0.72rem',
              padding: '6px 12px',
              fontFamily: 'Share Tech Mono'
            }
          });
        } catch (e) {
          console.warn("Failed to sync code draft to Firestore. Saved locally.", e);
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [code, language, currentUser, problem, id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        run();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [code, language, problem]);

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

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  const handleCodeChange = (val) => {
    const value = val || '';
    setCode(value);
    recorderRef.current.recordEdit(value);
    recordKeystroke();
  };

  const run = async () => {
    setIsJudging(true);
    setProgress('');
    setRightPanelTab('output');
    setExResult(null);
    try {
      const sampleInput = problem.sampleTestCase || (problem.testCases && problem.testCases[0]?.input) || (problem.examples && problem.examples[0]?.input) || '';
      const result = await executeCode({
        language,
        code,
        stdin: sampleInput
      });

      const isOk = result.exitCode === 0 && !result.stderr && !result.compileOutput;
      const verdict = isOk ? 'Accepted' : result.compileOutput ? 'Compilation Error' : 'Runtime Error';

      setExResult({
        verdict,
        executionTime: result.time ? Math.round(result.time * 1000) : 0,
        results: [{
          testCase: 1,
          status: isOk ? 'Accepted' : 'Error',
          output: result.stdout || result.stderr || result.compileOutput || '',
          expected: (problem.testCases && problem.testCases[0]?.expectedOutput) || (problem.examples && problem.examples[0]?.output) || ''
        }]
      });

      if (verdict === 'Accepted') {
        toast.success('Sample test case passed!');
      } else if (verdict === 'Compilation Error') {
        setErrorCount(prev => prev + 1);
        toast.error('Compilation Error — check your code syntax');
      } else {
        setErrorCount(prev => prev + 1);
        toast.error('Execution returned runtime errors');
      }
    } catch (err) {
      setExResult({
        verdict: 'Error',
        executionTime: 0,
        results: [{ testCase: 1, status: 'Error', output: err.message }]
      });
      setErrorCount(prev => prev + 1);
      toast.error('Compilation service unavailable, try again');
    } finally {
      setIsJudging(false);
    }
  };

  const submit = async () => {
    if (!currentUser) {
      toast.error('Please login to submit');
      return;
    }
    const testSuite = problem.hiddenTestCases || problem.testCases || [];
    if (testSuite.length === 0) {
      toast.error('No test cases available for this challenge');
      return;
    }

    // Queue submission if user is offline
    if (!isOnline) {
      toast('Offline. Submission queued to local database.', {
        icon: '💾',
        style: {
          background: '#151525',
          color: '#00FF88',
          border: '1px solid #00FF88',
          fontFamily: 'Orbitron',
          fontSize: '0.75rem'
        }
      });
      const queued = JSON.parse(localStorage.getItem('queued_submissions') || '[]');
      queued.push({
        userId: currentUser.uid,
        problemId: id || problem.id || problem.number.toString(),
        code,
        language,
        verdict: 'Accepted',
        testResults: []
      });
      localStorage.setItem('queued_submissions', JSON.stringify(queued));
      return;
    }
    
    setIsJudging(true);
    setProgress('0/' + testSuite.length);
    setRightPanelTab('output');
    setExResult(null);
    registerSubmitAttempt();
    
    try {
      const judgement = await judgeCode({
        language,
        code,
        testCases: testSuite.map(tc => ({
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || tc.output || ''
        })),
        onProgress: (i, total) => setProgress(`${i}/${total}`)
      });

      const resultsMapped = judgement.results.map((r, idx) => ({
        testCase: idx + 1,
        status: r.passed ? 'Accepted' : r.verdict === 'Compilation Error' || r.verdict === 'Runtime Error' ? 'Error' : 'Wrong',
        output: r.actual || r.stderr || r.compileOutput || '',
        expected: r.expected,
        executionTime: r.time ? Math.round(r.time * 1000) : 0
      }));

      setExResult({
        verdict: judgement.verdict,
        executionTime: judgement.totalTime,
        results: resultsMapped
      });

      // Save submission stats to Firestore
      await submitSolution(
        currentUser.uid,
        id || problem.id || problem.number.toString(),
        code,
        language,
        judgement.verdict,
        judgement.results
      );

      if (judgement.verdict === 'Accepted') {
        setIsAccepted(true);
        setShowMoodSelector(true);
        recorderRef.current.recordMarker('accepted', 'Passed production tests');
        confetti({ particleCount: 120, spread: 80, colors: ['#00FFA8','#FF2D9E','#FFD23F'] });
        
        // Premium Green Toast at Bottom Right
        toast.success('+10 coins earned 🎉', {
          position: 'bottom-right',
          style: {
            background: '#0B1A12',
            color: '#00FF88',
            border: '1px solid #00FF88',
            fontFamily: 'Orbitron',
            fontSize: '0.8rem'
          }
        });

        // Award badge notification: amber themed
        toast('New badge: Week Warrior! 🏆', {
          duration: 4500,
          icon: '🏆',
          style: {
            background: '#1A150B',
            color: '#FFAA00',
            border: '1px solid #FFAA00',
            fontFamily: 'Orbitron',
            fontSize: '0.75rem'
          }
        });

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
            judgement.totalTime || 120
          ).then(() => {
            setThoughtMapSaved(true);
          });
        }

        submitMutation.mutate({ verdict: judgement.verdict, executionTime: judgement.totalTime });

        if (customProblem && currentUser) {
          getUserWeaknessProfile(currentUser.uid).then(async (profile) => {
            const topic = problem.targetedWeakness || "";
            const updatedWeak = profile.weakTopics.map(t => {
              if (topic.toLowerCase().includes(t.topic.toLowerCase()) || problem.title.toLowerCase().includes(t.topic.toLowerCase())) {
                const newWin = Math.min(t.winRate + 8, 95);
                return { ...t, winRate: newWin };
              }
              return t;
            });
            await saveWeaknessProfile(currentUser.uid, {
              ...profile,
              weakTopics: updatedWeak
            });
            
            const bankRaw = localStorage.getItem(`mock_quantum_bank_${currentUser.uid}`) || '[]';
            const bank = JSON.parse(bankRaw);
            const updatedBank = bank.map(p => {
              if (p.title === problem.title) return { ...p, isSolved: true };
              return p;
            });
            localStorage.setItem(`mock_quantum_bank_${currentUser.uid}`, JSON.stringify(updatedBank));
          });
        }
      } else if (judgement.verdict === 'Compilation Error') {
        setErrorCount(prev => prev + 1);
        recorderRef.current.recordMarker('run', 'Production compile failure');
        toast.error('Submission failed: check your code', {
          duration: 5000,
          style: {
            background: '#1A0B12',
            color: '#FF2D78',
            border: '1px solid #FF2D78',
            fontFamily: 'Share Tech Mono',
            fontSize: '0.75rem'
          }
        });
      } else {
        setWrongAnswers(prev => prev + 1);
        recorderRef.current.recordMarker('run', 'Production wrong answer verdict');
        toast.error('Submission failed: check your code', {
          duration: 5000,
          style: {
            background: '#1A0B12',
            color: '#FF2D78',
            border: '1px solid #FF2D78',
            fontFamily: 'Share Tech Mono',
            fontSize: '0.75rem'
          }
        });
      }
    } catch (err) {
      setExResult({
        verdict: 'Error',
        executionTime: 0,
        results: [{ testCase: 1, status: 'Error', output: err.message }]
      });
      setErrorCount(prev => prev + 1);
      recorderRef.current.recordMarker('run', 'Production system exception');
      toast.error('Compilation service unavailable, try again');
    } finally {
      setIsJudging(false);
      setProgress('');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0A0A0F', padding: '24px', gap: '16px' }}>
        <div style={{ height: '40px', background: '#151525', borderRadius: '4px', animation: 'cp-blink 1.5s infinite' }} />
        <div style={{ display: 'flex', flex: 1, gap: '20px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ height: '20px', width: '80%', background: '#151525', borderRadius: '4px', animation: 'cp-blink 1.5s infinite' }} />
            <div style={{ height: '120px', background: '#151525', borderRadius: '4px', animation: 'cp-blink 1.5s infinite' }} />
            <div style={{ height: '200px', background: '#151525', borderRadius: '4px', animation: 'cp-blink 1.5s infinite' }} />
          </div>
          <div style={{ width: '45%', background: '#080810', borderRadius: '4px', animation: 'cp-blink 1.5s infinite' }} />
        </div>
      </div>
    );
  }
  
  if (isError || !problem) return <div className="cp-pd-state cp-pd-state--err">// PROBLEM NOT FOUND</div>;

  const verdictClass =
    executionResult?.verdict === 'Accepted' ? 'accepted' :
    executionResult?.verdict === 'Error'    ? 'error'    : 'wrong';

  return (
    <div className={`cp-pd-container ${isMinimalMode ? 'cp-flow-active' : ''} cp-mobile-view--${activeMobileTab}`}>
      {!isOnline && (
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            background: '#FF2D78', 
            color: '#FFF', 
            fontSize: '0.62rem', 
            fontFamily: 'Orbitron', 
            padding: '4px 10px', 
            textAlign: 'center', 
            fontWeight: 'bold', 
            letterSpacing: '1px',
            zIndex: 1002
          }}
        >
          ⚠️ OFFLINE WORKSPACE — SOLVING FROM CACHED DATABASE
        </div>
      )}

      {/* ═══════════════ LEFT PANE ═══════════════ */}
      <div className="cp-pd-left">

        {/* Tabs */}
        <div className="cp-pd-tabs">
          {['description', 'hints', 'dna', 'discussion'].map(tab => (
            <button
              key={tab}
              className={`cp-pd-tab ${activeTab === tab ? 'cp-pd-tab--active' : ''}`}
              style={activeTab === tab ? { borderColor: themeColor, color: themeColor } : {}}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'discussion' ? `DISCUSSION (${commentsCount})` : tab === 'dna' ? 'CODE DNA' : tab.toUpperCase()}
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

          {activeTab === 'discussion' && (
            <div className="cp-pd-discussion" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Filter Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', color: 'var(--cyber-pink)', letterSpacing: '1px' }}>
                  // RECONSTRUCTING TELEMETRY FORUM
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { key: 'top', label: 'Top Voted' },
                    { key: 'new', label: 'Newest' },
                    { key: 'my', label: 'My Posts' }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setDiscussionSort(opt.key)}
                      style={{
                        background: discussionSort === opt.key ? 'rgba(255, 45, 120, 0.1)' : 'transparent',
                        border: `1px solid ${discussionSort === opt.key ? 'var(--cyber-pink)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: '2px',
                        padding: '4px 10px',
                        fontSize: '0.62rem',
                        color: discussionSort === opt.key ? '#FFF' : '#8888AA',
                        cursor: 'pointer',
                        fontFamily: 'Orbitron',
                        letterSpacing: '1px'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment submit form */}
              <form onSubmit={handleSubmitComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#0F0F1A', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Post comments in Markdown format..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    background: '#07070C',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '4px',
                    color: '#FFF',
                    padding: '12px',
                    fontSize: '0.78rem',
                    fontFamily: 'Share Tech Mono',
                    resize: 'vertical'
                  }}
                  required
                />

                {/* Monaco Toggle and Selection */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowSnippet(!showSnippet)}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${showSnippet ? 'var(--cyber-green)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '0.65rem',
                      color: showSnippet ? 'var(--cyber-green)' : '#8888AA',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontFamily: 'Orbitron'
                    }}
                  >
                    <span>💻</span>
                    <span>{showSnippet ? 'REMOVE SNIPPET' : 'ATTACH CODE SNIPPET'}</span>
                  </button>

                  {showSnippet && (
                    <select
                      value={snippetLang}
                      onChange={(e) => setSnippetLang(e.target.value)}
                      style={{
                        background: '#07070C',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        color: '#FFF',
                        fontSize: '0.65rem',
                        padding: '4px 8px',
                        fontFamily: 'Orbitron'
                      }}
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="go">Go</option>
                    </select>
                  )}
                </div>

                {/* Mini Monaco Code Sandbox (5 lines high) */}
                {showSnippet && (
                  <div style={{ height: '120px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <Editor
                      height="100%"
                      language={snippetLang === 'cpp' ? 'cpp' : snippetLang}
                      theme="vs-dark"
                      value={snippetText}
                      onChange={(val) => setSnippetText(val || '')}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        fontFamily: "'Share Tech Mono', monospace",
                        lineHeight: 18,
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        folding: false
                      }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="cp-pd-submit-btn"
                  style={{ alignSelf: 'flex-end', background: 'var(--cyber-pink)', borderColor: 'var(--cyber-pink)', color: '#FFF', padding: '6px 16px', fontSize: '0.68rem' }}
                >
                  TRANSMIT COMMENT ⚡
                </button>
              </form>

              {/* Comments Render Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(() => {
                  const getRankColor = (rank) => {
                    switch (rank?.toLowerCase()) {
                      case 'master': return '#FF2D78';
                      case 'expert': return '#00FF88';
                      case 'beginner': return '#00A2FF';
                      default: return '#FFAA00';
                    }
                  };

                  const sortedComments = [...comments].filter(c => {
                    if (discussionSort === 'my') {
                      return c.uid === currentUser?.uid || c.displayName === currentUser?.displayName;
                    }
                    return true;
                  }).sort((a, b) => {
                    if (discussionSort === 'top') {
                      return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
                    }
                    return b.createdAt - a.createdAt;
                  });

                  const parents = sortedComments.filter(c => !c.parentId);
                  const getReplies = (pId) => sortedComments.filter(c => c.parentId === pId);

                  const renderCard = (c, isReply = false) => {
                    const color = getRankColor(c.userRank);
                    const isOwner = currentUser && (c.uid === currentUser.uid || c.displayName === currentUser.displayName);
                    const timeString = new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={c.id}
                        className="cp-comment-card"
                        style={{
                          background: '#0B0B12',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          borderLeft: isReply ? `2px solid var(--cyber-green)` : `3px solid ${color}`,
                          borderRadius: '4px',
                          padding: '16px',
                          marginLeft: isReply ? '20px' : '0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                        }}
                      >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: color + '15',
                                border: `1px solid ${color}`,
                                color: color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.62rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {c.displayName?.substring(0, 2).toUpperCase() || 'OP'}
                            </div>
                            <span style={{ fontFamily: 'Orbitron', fontSize: '0.74rem', color: '#FFF', fontWeight: 'bold' }}>
                              {c.displayName}
                            </span>
                            <span
                              style={{
                                fontSize: '0.52rem',
                                border: `1px solid ${color}`,
                                color: color,
                                borderRadius: '2px',
                                padding: '1px 5px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                fontFamily: 'Orbitron',
                                letterSpacing: '0.5px'
                              }}
                            >
                              {c.userRank}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.62rem', color: '#555577', fontFamily: 'Share Tech Mono' }}>
                            ⏳ {timeString}
                          </span>
                        </div>

                        {/* Text Rendered inside ReactMarkdown or Editing form */}
                        {editingCommentId === c.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              style={{
                                width: '100%',
                                background: '#07070C',
                                border: '1px solid var(--cyber-pink)',
                                borderRadius: '4px',
                                color: '#FFF',
                                padding: '8px',
                                fontSize: '0.76rem',
                                fontFamily: 'Share Tech Mono'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '6px', alignSelf: 'flex-end' }}>
                              <button onClick={() => setEditingCommentId(null)} className="cp-pd-run-btn" style={{ padding: '3px 8px', fontSize: '0.58rem', background: 'transparent' }}>
                                CANCEL
                              </button>
                              <button onClick={() => handleSaveEdit(c.id)} className="cp-pd-submit-btn" style={{ padding: '3px 8px', fontSize: '0.58rem', background: 'var(--cyber-pink)', borderColor: 'var(--cyber-pink)' }}>
                                SAVE
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: '#A8A8C0', lineHeight: '1.4' }}>
                            <ReactMarkdown>{c.text}</ReactMarkdown>
                          </div>
                        )}

                        {/* Code snippet block if attached */}
                        {c.codeSnippet && (
                          <div style={{ position: 'relative' }}>
                            <pre
                              style={{
                                background: '#050508',
                                border: '1px solid rgba(255,255,255,0.03)',
                                borderRadius: '4px',
                                padding: '12px',
                                color: '#00FF88',
                                fontFamily: 'Share Tech Mono',
                                fontSize: '0.7rem',
                                overflowX: 'auto',
                                margin: '0'
                              }}
                            >
                              <code>{c.codeSnippet}</code>
                            </pre>
                            <span style={{ position: 'absolute', right: '10px', top: '6px', fontSize: '0.52rem', color: '#555577', textTransform: 'uppercase', fontFamily: 'Orbitron' }}>
                              {c.language}
                            </span>
                          </div>
                        )}

                        {/* Actions bar (Votes + edit/delete + reply) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            {/* Upvote button */}
                            <button
                              onClick={() => handleVoteComment(c.id, 'upvote')}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: '#8888AA', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>▲</span>
                              <span style={{ fontFamily: 'Share Tech Mono' }}>{c.upvotes || 0}</span>
                            </button>
                            {/* Downvote button */}
                            <button
                              onClick={() => handleVoteComment(c.id, 'downvote')}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: '#8888AA', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>▼</span>
                              <span style={{ fontFamily: 'Share Tech Mono' }}>{c.downvotes || 0}</span>
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {/* Reply button */}
                            {!isReply && (
                              <button
                                onClick={() => {
                                  setReplyToId(replyToId === c.id ? null : c.id);
                                  setReplyText('');
                                }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--cyber-green)', fontSize: '0.62rem', fontFamily: 'Orbitron', cursor: 'pointer', letterSpacing: '0.5px' }}
                              >
                                {replyToId === c.id ? 'CANCEL REPLY' : 'REPLY 💬'}
                              </button>
                            )}

                            {/* Owner controls */}
                            {isOwner && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingCommentId(c.id);
                                    setEditText(c.text);
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: '#FFAA00', fontSize: '0.62rem', fontFamily: 'Orbitron', cursor: 'pointer' }}
                                >
                                  EDIT
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--cyber-pink)', fontSize: '0.62rem', fontFamily: 'Orbitron', cursor: 'pointer' }}
                                >
                                  DELETE
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Inline Reply input field */}
                        {replyToId === c.id && (
                          <div style={{ display: 'flex', gap: '8px', background: '#05050A', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0, 255, 136, 0.2)', marginTop: '8px' }}>
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type a responsive reply..."
                              style={{
                                flex: 1,
                                background: '#020205',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '2px',
                                color: '#FFF',
                                padding: '6px 10px',
                                fontSize: '0.74rem',
                                fontFamily: 'Share Tech Mono'
                              }}
                            />
                            <button
                              onClick={() => handleSubmitReply(c.id)}
                              className="cp-pd-submit-btn"
                              style={{ background: 'var(--cyber-green)', borderColor: 'var(--cyber-green)', color: '#000', padding: '4px 12px', fontSize: '0.62rem', fontWeight: 'bold' }}
                            >
                              SUBMIT
                            </button>
                          </div>
                        )}

                        {/* Render Nested Replies */}
                        {getReplies(c.id).map(r => renderCard(r, true))}
                      </div>
                    );
                  };

                  if (parents.length === 0) {
                    return (
                      <p style={{ textAlign: 'center', color: '#666688', fontSize: '0.72rem', padding: '20px' }}>
                        // NO COMMENTS RECORDED FOR THIS PROBLEM NODE.
                      </p>
                    );
                  }

                  return parents.map(p => renderCard(p, false));
                })()}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ RIGHT PANE ══════════════ */}
      <div className="cp-pd-right">

        {/* Editor toolbar */}
        <div className="cp-pd-toolbar">
          <LanguageSelector language={language} onLanguageChange={handleLanguageChange} />

          <div className="cp-compiler-status-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', fontSize: '0.68rem', fontFamily: 'Orbitron', color: '#8888AA' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: compilerStatus === 'healthy' ? '#00FF88' : compilerStatus === 'slow' ? '#FFAA00' : compilerStatus === 'offline' ? '#FF5555' : '#888888',
              boxShadow: compilerStatus === 'healthy' ? '0 0 8px #00FF88' : compilerStatus === 'slow' ? '0 0 8px #FFAA00' : compilerStatus === 'offline' ? '0 0 8px #FF5555' : 'none',
              display: 'inline-block'
            }} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {compilerStatus === 'healthy' ? 'Compiler Online' : 
               compilerStatus === 'slow' ? 'Slow response' : 
               compilerStatus === 'offline' ? 'Compiler Offline — submissions paused' : 'Checking compiler...'}
            </span>
          </div>

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

            <button className="cp-pd-run-btn" onClick={run} style={{ border: `1px solid ${themeColor}`, color: themeColor }} disabled={isJudging || compilerStatus === 'offline'}>
              {isJudging ? '⟳ RUNNING...' : '▶ RUN'}
            </button>
            <button className="cp-pd-submit-btn" onClick={submit} style={{ background: themeColor, borderColor: themeColor }} disabled={isJudging || compilerStatus === 'offline'}>
              {isJudging ? 'SUBMITTING...' : 'SUBMIT'}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="cp-pd-editor">
          <CodeEditor
            problemId={id}
            userId={currentUser?.uid}
            problem={problem}
            code={code}
            onChange={handleCodeChange}
            language={language}
            onLanguageChange={handleLanguageChange}
            onMount={handleEditorDidMount}
            onDraftLoaded={(loadedCode) => recorderRef.current.start(loadedCode)}
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

                {isAccepted && (
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
                      <h4 style={{ margin: '0 0 4px 0', color: '#00FF88', fontFamily: 'Orbitron', fontSize: '0.8rem', letterSpacing: '1px' }}>🌐 SHARE YOUR SOLUTION CORE!</h4>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#8888AA' }}>Publish your code schematic with approach tags and reactions to the public feed timeline.</p>
                    </div>
                    <button
                      className="cp-radar-btn"
                      onClick={() => setShowShareModal(true)}
                      style={{ border: '1px solid #00FF88', color: '#00FF88', fontSize: '0.65rem', background: 'transparent', cursor: 'pointer', fontFamily: 'Orbitron' }}
                    >
                      SHARE SOLUTION 🌐
                    </button>
                  </div>
                )}

                {!executionResult && !isJudging && (
                  <span className="cp-pd-placeholder">// RUN YOUR CODE TO SEE OUTPUT</span>
                )}
                {isJudging && (
                  <div style={{ padding: '16px 0' }}>
                    {progress ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#FF2D78', fontFamily: 'Orbitron', fontSize: '0.75rem' }}>
                        <span>🛸 RUNNING PRODUCTION TEST SUITE...</span>
                        <div style={{ height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              background: '#FF2D78', 
                              width: `${(parseInt(progress.split('/')[0]) / (parseInt(progress.split('/')[1]) || 1)) * 100}%`,
                              transition: 'width 0.2s ease-in-out'
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: '0.62rem', color: '#8888AA', fontFamily: 'Share Tech Mono' }}>
                          Running test {progress.split('/')[0]} of {progress.split('/')[1]}
                        </span>
                      </div>
                    ) : (
                      <div className="cp-pd-judging" style={{ color: '#00FF88', fontSize: '0.8rem', fontFamily: 'Share Tech Mono' }}>
                        ⚡ EXECUTING CODE AGAINST PRODUCTION TARGET... <span style={{ animation: 'cp-blink 0.5s step-end infinite' }}>▋</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. RESULTS DISPLAY */}
                {executionResult && (
                  <div 
                    className={`cp-verdict-summary cp-verdict-summary--${verdictClass}`}
                    style={{
                      background: 'rgba(20, 20, 35, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '4px',
                      padding: '16px',
                      marginBottom: '16px',
                      fontFamily: 'Share Tech Mono'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', marginBottom: '8px' }}>
                      {executionResult.verdict === 'Accepted' && <span style={{ color: '#00FF88' }}>🟢 ACCEPTED</span>}
                      {executionResult.verdict === 'Wrong Answer' && <span style={{ color: '#FF2D78' }}>❌ WRONG ANSWER</span>}
                      {executionResult.verdict === 'Time Limit Exceeded' && <span style={{ color: '#FFB300' }}>⏰ TIME LIMIT EXCEEDED</span>}
                      {executionResult.verdict === 'Runtime Error' && <span style={{ color: '#FF5555' }}>⚠️ RUNTIME ERROR</span>}
                      {executionResult.verdict === 'Compilation Error' && <span style={{ color: '#FF7700' }}>⚠️ COMPILATION ERROR</span>}
                      
                      <span style={{ fontSize: '0.75rem', color: '#8888AA', marginLeft: 'auto' }}>
                        Time: {executionResult.executionTime}ms
                      </span>
                    </div>

                    {executionResult.verdict === 'Time Limit Exceeded' && (
                      <p style={{ color: '#FFB300', margin: '0 0 10px 0', fontSize: '0.78rem' }}>
                        ⏱️ Your solution was too slow. Optimize your algorithm's time complexity.
                      </p>
                    )}
                    {executionResult.verdict === 'Runtime Error' && (
                      <p style={{ color: '#FF5555', margin: '0 0 10px 0', fontSize: '0.78rem' }}>
                        💥 A runtime exception occurred during execution. Check array bounds or division by zero.
                      </p>
                    )}
                    {executionResult.verdict === 'Compilation Error' && (
                      <p style={{ color: '#FF7700', margin: '0 0 10px 0', fontSize: '0.78rem' }}>
                        🛠️ Code compilation failed. Verify syntax errors in compiler logs.
                      </p>
                    )}

                    {executionResult.results && executionResult.results.map((res, i) => (
                      <div key={i} className="cp-pd-result" style={{ borderLeft: `3px solid ${res.status === 'Accepted' ? '#00FF88' : '#FF2D78'}`, paddingLeft: '12px', marginTop: '12px' }}>
                        <div className={`cp-pd-result-title ${res.status === 'Accepted' ? 'ok' : 'fail'}`} style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>
                          TEST CASE {res.testCase}: {res.status.toUpperCase()}
                        </div>
                        
                        {res.output && (
                          <>
                            <div className="cp-pd-result-label" style={{ fontSize: '0.7rem', color: '#8888AA', marginTop: '4px' }}>OUTPUT:</div>
                            <pre className="cp-pd-pre" style={{ background: '#090912', padding: '8px', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '3px', fontSize: '0.76rem', color: '#FFF' }}>{res.output}</pre>
                          </>
                        )}
                        
                        {res.status !== 'Accepted' && res.expected && (
                          <>
                            <div className="cp-pd-result-label" style={{ fontSize: '0.7rem', color: '#8888AA', marginTop: '4px' }}>EXPECTED OUTPUT:</div>
                            <pre className="cp-pd-pre cp-pd-pre--expected" style={{ background: '#091A12', padding: '8px', border: '1px solid rgba(0,255,136,0.1)', borderRadius: '3px', fontSize: '0.76rem', color: '#00FF88' }}>{res.expected}</pre>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 7. AFTER ACCEPTED ACTIONS */}
                {isAccepted && (
                  <div 
                    className="cp-accepted-extra-actions" 
                    style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      marginTop: '16px', 
                      background: 'rgba(0, 255, 136, 0.02)', 
                      padding: '16px', 
                      borderRadius: '4px', 
                      border: '1px dashed rgba(0, 255, 136, 0.15)',
                      flexWrap: 'wrap'
                    }}
                  >
                    <button 
                      className="cp-pd-run-btn" 
                      onClick={() => {
                        toast.success("Select another language from the dropdown menu above.");
                      }}
                      style={{ border: '1px solid var(--cyber-pink)', color: 'var(--cyber-pink)', fontSize: '0.7rem', flex: 1, minWidth: '150px' }}
                    >
                      🔀 TRY ANOTHER LANGUAGE
                    </button>
                    
                    {nextProblemId && (
                      <button 
                        className="cp-pd-submit-btn" 
                        onClick={() => navigate(`/problem/${nextProblemId}`)}
                        style={{ background: 'var(--cyber-green)', borderColor: 'var(--cyber-green)', color: '#000', fontWeight: 'bold', fontSize: '0.7rem', flex: 1, minWidth: '150px' }}
                      >
                        NEXT PROBLEM ➔
                      </button>
                    )}
                    
                    <button 
                      className="cp-pd-run-btn" 
                      onClick={() => navigate('/skills')}
                      style={{ border: '1px solid #00E5FF', color: '#00E5FF', fontSize: '0.7rem', flex: 1, minWidth: '150px' }}
                    >
                      🔓 VIEW SKILL TREE NODES
                    </button>
                  </div>
                )}
              </>
            ) : (
              <AlgorithmVisualizer problem={problem} />
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

      {showShareModal && (
        <ShareSolutionModal
          problemId={id}
          problemTitle={problem?.title || 'Algorithm Challenge'}
          difficulty={problem?.difficulty || 'Medium'}
          code={code}
          language={language}
          runtime_ms={executionResult?.executionTime || 24}
          memory_kb={1240}
          onClose={() => setShowShareModal(false)}
          onSuccess={() => {
            alert("Solution successfully shared to the grid!");
            setShowShareModal(false);
          }}
        />
      )}
      <Toaster position="top-right" toastOptions={{ style: { background: '#0F0F1A', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)' } }} />

      {/* Mobile Sticky Navigation Panel */}
      <div className="cp-mobile-tabs-nav">
        <button 
          className={`cp-mobile-nav-btn ${activeMobileTab === 'problem' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('problem')}
        >
          <span style={{ fontSize: '1.2rem' }}>📄</span>
          <span>PROBLEM</span>
        </button>
        <button 
          className={`cp-mobile-nav-btn ${activeMobileTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('code')}
        >
          <span style={{ fontSize: '1.2rem' }}>💻</span>
          <span>CODE</span>
        </button>
        <button 
          className={`cp-mobile-nav-btn ${activeMobileTab === 'output' ? 'active' : ''}`}
          onClick={() => {
            setActiveMobileTab('output');
            setRightPanelTab('output');
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🖥️</span>
          <span>OUTPUT</span>
        </button>
      </div>
    </div>
  );
};

export default ProblemDetail;
