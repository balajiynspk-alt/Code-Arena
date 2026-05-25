import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ref, onValue, off, limitToLast, query } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { 
  joinBroadcastRoom, 
  leaveBroadcastRoom, 
  sendReaction, 
  subscribeLiveBroadcasters, 
  getAICommentary 
} from '../services/spectatorService';
import './WatchStream.css';

const MOOD_EMOJIS = {
  'fire': '🔥',
  'mind-blown': '🤯',
  'clap': '👏',
  'confused': '😕'
};

const WatchStream = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  // Active broadcaster selection state
  const [streamData, setStreamData] = useState(null);
  const [broadcasters, setBroadcasters] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [moodCounts, setMoodCounts] = useState({ fire: 0, 'mind-blown': 0, clap: 0, confused: 0 });

  // AI Commentator States
  const [commentary, setCommentary] = useState("WELCOME STREAM VIEWERS! We are analyzing active compilers. Dynamic logic logs appear here!");
  const [isTalking, setIsTalking] = useState(false);
  const [typedCommentary, setTypedCommentary] = useState("");
  
  const lastCodeRef = useRef("");
  const isQueryingRef = useRef(false);

  // ── Fallback Broadcasters for fully interactive testing ──
  const mockBroadcasters = [
    { userId: 'pro_coder_99', userName: 'AlgorithmGod', rating: 2150, problemId: '1', viewerCount: 84, code: 'def solve(nums, target):\n    # Optimized Hash Map Approach\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []', cursorLine: 6 },
    { userId: 'dsa_expert_42', userName: 'RecursionQueen', rating: 1980, problemId: '3', viewerCount: 51, code: 'class Solution {\npublic:\n    int climbStairs(int n) {\n        if (n <= 2) return n;\n        int first = 1, second = 2;\n        for (int i = 3; i <= n; i++) {\n            int temp = first + second;\n            first = second;\n            second = temp;\n        }\n        return second;\n    }\n};', cursorLine: 8 },
    { userId: 'faang_vet', userName: 'SystemArch', rating: 1890, problemId: '2', viewerCount: 37, code: 'function reverseString(s) {\n    let left = 0, right = s.length - 1;\n    while (left < right) {\n        let tmp = s[left];\n        s[left] = s[right];\n        s[right] = tmp;\n        left++;\n        right--;\n    }\n}', cursorLine: 5 }
  ];

  // ── Step 1: Subscribe active streams list ──
  useEffect(() => {
    const unsubList = subscribeLiveBroadcasters((list) => {
      // Append fallbacks if RTDB is completely empty
      if (list.length === 0) {
        setBroadcasters(mockBroadcasters);
      } else {
        setBroadcasters(list);
      }
    });

    return () => unsubList();
  }, []);

  // ── Step 2: Bind selected stream ──
  useEffect(() => {
    const targetUserId = userId || broadcasters[0]?.userId || 'pro_coder_99';
    
    // Check if target is a mock broadcaster
    const mockMatch = mockBroadcasters.find(b => b.userId === targetUserId);
    if (mockMatch) {
      setStreamData(mockMatch);
      lastCodeRef.current = mockMatch.code;
      return;
    }

    // Subscribe to RTDB stream details
    const streamRef = ref(rtdb, `broadcasts/${targetUserId}`);
    joinBroadcastRoom(targetUserId);

    const unsubStream = onValue(streamRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStreamData(data);
      }
    });

    // Subscribe to reaction ticks
    const reactionQuery = query(ref(rtdb, `broadcasts/${targetUserId}/reactions`), limitToLast(20));
    const unsubReactions = onValue(reactionQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(k => data[k]);
        setReactions(list.reverse());

        // Process mood counts & launch floating canvas animations
        const counts = { fire: 0, 'mind-blown': 0, clap: 0, confused: 0 };
        list.forEach(item => {
          if (counts[item.emoji] !== undefined) {
            counts[item.emoji]++;
          }
        });
        setMoodCounts(counts);

        // Spawn a burst emoji
        const latest = list[0];
        if (latest) {
          triggerFloatingEmoji(latest.emoji);
        }
      }
    });

    return () => {
      unsubStream();
      unsubReactions();
      leaveBroadcastRoom(targetUserId);
    };
  }, [userId, broadcasters]);

  // ── Step 3: AI Commentator Loop (15 seconds) ──
  useEffect(() => {
    const commentaryInterval = setInterval(async () => {
      if (!streamData?.code || isQueryingRef.current) return;
      
      const currentCode = streamData.code;
      const prevCode = lastCodeRef.current;
      
      if (currentCode.trim() === prevCode.trim()) return; // No key updates

      isQueryingRef.current = true;
      try {
        const comm = await getAICommentary(currentCode, prevCode);
        setCommentary(comm);
        lastCodeRef.current = currentCode;
      } catch (e) {
        console.error(e);
      } finally {
        isQueryingRef.current = false;
      }
    }, 15000);

    return () => clearInterval(commentaryInterval);
  }, [streamData]);

  // ── Step 4: Typewriter commentary reveal & animated avatar mouth ──
  useEffect(() => {
    let index = 0;
    setTypedCommentary("");
    setIsTalking(true);

    const typewriter = setInterval(() => {
      if (index < commentary.length) {
        setTypedCommentary(prev => prev + commentary.charAt(index));
        index++;
      } else {
        setIsTalking(false);
        clearInterval(typewriter);
      }
    }, 30);

    return () => clearInterval(typewriter);
  }, [commentary]);

  // ── Trigger floating emojis ──
  const triggerFloatingEmoji = (emojiKey) => {
    const emojiMap = MOOD_EMOJIS[emojiKey] || '🔥';
    const newFloat = {
      id: Date.now() + Math.random(),
      emoji: emojiMap,
      left: Math.random() * 60 + 10, // random screen percentage
      bottom: 0
    };
    setFloatingEmojis(prev => [...prev, newFloat]);

    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(f => f.id !== newFloat.id));
    }, 2000);
  };

  const handleSendEmoji = async (emojiKey) => {
    const targetUserId = userId || streamData?.userId || 'pro_coder_99';
    // If testing mocks, trigger local floating animations directly
    const isMock = mockBroadcasters.some(b => b.userId === targetUserId);
    if (isMock) {
      triggerFloatingEmoji(emojiKey);
      setMoodCounts(prev => ({
        ...prev,
        [emojiKey]: prev[emojiKey] + 1
      }));
      setReactions(prev => [
        { emoji: emojiKey, timestamp: Date.now() },
        ...prev
      ]);
    } else {
      await sendReaction(targetUserId, emojiKey);
    }
  };

  // Determine top mood emoji
  const getCrowdMood = () => {
    let maxKey = 'fire';
    let maxVal = -1;
    Object.keys(moodCounts).forEach(k => {
      if (moodCounts[k] > maxVal) {
        maxVal = moodCounts[k];
        maxKey = k;
      }
    });
    return MOOD_EMOJIS[maxKey] || '🔥';
  };

  const currentStream = streamData || mockBroadcasters[0];

  return (
    <div className="cp-watch-page">
      
      {/* Dynamic Floating Emojis explosion container */}
      <div className="cp-floating-emojis-container">
        {floatingEmojis.map(f => (
          <span 
            key={f.id} 
            className="cp-floating-emoji"
            style={{ left: `${f.left}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Main Grid: Sidebar Broadcasters Left | Stream Central Right */}
      <div className="cp-watch-grid">
        
        {/* SIDEBAR: Broadcasters */}
        <div className="cp-watch-sidebar">
          <h2 className="cp-sidebar-h">🌌 LIVE CODE arenas</h2>
          <div className="cp-sidebar-list">
            {broadcasters.map((b) => (
              <div 
                key={b.userId} 
                onClick={() => navigate(`/watch/${b.userId}`)}
                className={`cp-sidebar-item ${currentStream.userId === b.userId ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="cp-live-dot"></span>
                  <div>
                    <div className="cp-side-name">{b.userName}</div>
                    <div className="cp-side-rating">🛡 {b.rating} Rating</div>
                  </div>
                </div>
                <div className="cp-side-viewers">👤 {b.viewerCount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 70% Left: live editor */}
        <div className="cp-watch-main">
          
          {/* Header */}
          <div className="cp-stream-header">
            <div>
              <h1 className="cp-stream-title">
                📡 WATCHING: <span className="cp-t-pink">{currentStream.userName}</span>
              </h1>
              <p className="cp-stream-sub">// Active on Problem #{currentStream.problemId || '1'}</p>
            </div>
            
            <div className="cp-stream-stats">
              <span className="cp-watch-badge watch-pulse">🔴 LIVE</span>
              <span className="cp-viewer-pill">👤 {currentStream.viewerCount} SPECTATORS</span>
            </div>
          </div>

          {/* Monaco read-only Live code view */}
          <div className="cp-stream-editor">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={currentStream.code}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineHeight: 22,
                fontFamily: "'Share Tech Mono', monospace",
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {/* 🎙 AI SPORTS COMMENTATOR BAR 🎙 */}
          <div className="cp-commentator-panel">
            <div className="cp-avatar-box">
              {/* Pixel Art SVG avatar with animated talking mouth */}
              <svg className="cp-avatar-svg" viewBox="0 0 100 100">
                <rect x="10" y="10" width="80" height="80" rx="6" fill="#0F0F1A" stroke="#FF2D78" strokeWidth="2" />
                {/* Hair */}
                <rect x="20" y="15" width="60" height="15" fill="#FF2D78" />
                {/* Neon Eyes */}
                <circle cx="35" cy="45" r="4" fill="#00FF88" className="eye-pulse" />
                <circle cx="65" cy="45" r="4" fill="#00FF88" className="eye-pulse" />
                {/* Animated mouth */}
                <path 
                  d={isTalking ? "M 35 70 Q 50 85 65 70 Z" : "M 35 70 Q 50 72 65 70"} 
                  stroke="#FF2D78" 
                  strokeWidth="3" 
                  fill="none" 
                  className={isTalking ? 'mouth-chatting' : ''}
                />
                {/* Esports Microphone */}
                <circle cx="80" cy="70" r="5" fill="#FFAA00" />
                <line x1="75" y1="70" x2="80" y2="90" stroke="#888" strokeWidth="3" />
              </svg>
              <div className="cp-avatar-label">GEMINI PRO ESPORTS</div>
            </div>

            <div className="cp-commentary-text">
              <span className="cp-ticker">// ANALYZING ALGO CONTEXT...</span>
              <p className="cp-typed-p">{typedCommentary}</p>
            </div>
          </div>

        </div>

        {/* 30% Right Sidebar: card profiles, reaction feeds, and bursts */}
        <div className="cp-watch-right">
          
          {/* Card profile */}
          <div className="cp-profile-card-widget">
            <h3 className="cp-card-widget-h">// STREAMER DOSSIER</h3>
            <div className="cp-profile-dossier">
              <div className="cp-dossier-row">
                <span className="cp-d-lbl">NAME:</span>
                <span className="cp-d-val" style={{ color: '#FF2D78' }}>{currentStream.userName}</span>
              </div>
              <div className="cp-dossier-row">
                <span className="cp-d-lbl">ELO RATING:</span>
                <span className="cp-d-val" style={{ color: '#00FF88' }}>⚔ {currentStream.rating}</span>
              </div>
              <div className="cp-dossier-row">
                <span className="cp-d-lbl">RANK LIMIT:</span>
                <span className="cp-d-val">Expert Coder</span>
              </div>
            </div>
          </div>

          {/* Crowd mood indicator */}
          <div className="cp-mood-widget">
            <h3 className="cp-card-widget-h">// CROWD STADIUM MOOD</h3>
            <div className="cp-mood-bubble">
              <span className="cp-mood-emoji">{getCrowdMood()}</span>
              <div className="cp-mood-desc">CROWD IS HYPED!</div>
            </div>
          </div>

          {/* Crowd Reaction Scrolling Feed */}
          <div className="cp-reaction-widget">
            <h3 className="cp-card-widget-h">// SPECTATOR STADIUM FEED</h3>
            <div className="cp-reactions-list">
              {reactions.map((react, i) => (
                <div key={i} className="cp-reaction-row">
                  <span className="cp-react-time">{new Date(react.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span className="cp-react-emoji-bubble">{MOOD_EMOJIS[react.emoji] || '🔥'}</span>
                  <span className="cp-react-text">Sent reaction to streamer!</span>
                </div>
              ))}
              {reactions.length === 0 && (
                <p className="cp-react-none">// BE THE FIRST TO EMIT EMOJI MOODS</p>
              )}
            </div>
          </div>

          {/* Interactivity emoji emitters */}
          <div className="cp-emitters-panel">
            <h3 className="cp-card-widget-h" style={{ marginBottom: '8px' }}>// TRIGGER CROWD CHEERS</h3>
            <div className="cp-emitters-grid">
              <button onClick={() => handleSendEmoji('fire')} className="cp-emitter-btn">🔥 FIRE</button>
              <button onClick={() => handleSendEmoji('mind-blown')} className="cp-emitter-btn">🤯 WOW</button>
              <button onClick={() => handleSendEmoji('clap')} className="cp-emitter-btn">👏 CLAP</button>
              <button onClick={() => handleSendEmoji('confused')} className="cp-emitter-btn">😕 HUH</button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default WatchStream;
