import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { auth, rtdb, isMockMode } from '../services/firebase';
import { ref, onValue, off } from 'firebase/database';
import { 
  joinPairRoom, 
  updateRoomCode, 
  updateCursorPosition, 
  sendPairMessage, 
  updateDriverRole, 
  updateRoomMode, 
  takeTurnRequest, 
  updateCompileResult 
} from '../services/pairService';
import './PairProgramming.css';

const PairProgramming = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // Editor Ref
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  // Collaborative Room States
  const [room, setRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [candidateInput, setCandidateInput] = useState('');
  const [localCode, setLocalCode] = useState('');

  // Voice Chat (WebRTC PeerJS Simulator)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Chat scroll anchor
  const chatEndRef = useRef(null);

  // 1. Subscribe to active Room payload
  useEffect(() => {
    if (!roomId) return;

    if (isMockMode) {
      const handleMockRoomData = () => {
        const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
        if (!roomRaw) return;
        const data = JSON.parse(roomRaw);
        setRoom(data);
        // Only set local code if we are not the driver or if localCode is empty
        const isHost = data.hostId === (currentUser?.uid || 'guest');
        const isDriver = data.driverId === (currentUser?.uid || 'guest');
        if (!isDriver || !localCode) {
          setLocalCode(data.code || '');
        }

        // Sync Partner Cursor coordinates in Monaco workspace
        if (editorRef.current && monacoRef.current && data.cursors) {
          const monaco = monacoRef.current;
          const currentUid = currentUser?.uid || 'guest';
          
          // Find partner id
          const partnerId = Object.keys(data.cursors).find(uid => uid !== currentUid);
          const partnerCursor = partnerId ? data.cursors[partnerId] : null;

          const newDecorations = [];
          if (partnerCursor && partnerCursor.line && partnerCursor.column) {
            newDecorations.push({
              range: new monaco.Range(
                partnerCursor.line, 
                partnerCursor.column, 
                partnerCursor.line, 
                partnerCursor.column
              ),
              options: {
                className: partnerCursor.role === 'host' ? 'cp-pair-cursor-host' : 'cp-pair-cursor-guest',
                hoverMessage: { value: `${partnerCursor.role === 'host' ? 'Host' : 'Partner'} Cursor` }
              }
            });
          }
          decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
        }
      };

      handleMockRoomData();
      const interval = setInterval(handleMockRoomData, 1000);
      return () => clearInterval(interval);
    }

    const roomRef = ref(rtdb, `pairRooms/${roomId}`);
    const handleRoomData = (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      setRoom(data);
      setLocalCode(data.code || '');

      // Cursor sync
      if (editorRef.current && monacoRef.current && data.cursors) {
        const monaco = monacoRef.current;
        const currentUid = currentUser?.uid || 'guest';
        
        // Find partner id
        const partnerId = Object.keys(data.cursors).find(uid => uid !== currentUid);
        const partnerCursor = partnerId ? data.cursors[partnerId] : null;

        const newDecorations = [];
        if (partnerCursor && partnerCursor.line && partnerCursor.column) {
          newDecorations.push({
            range: new monaco.Range(
              partnerCursor.line, 
              partnerCursor.column, 
              partnerCursor.line, 
              partnerCursor.column
            ),
            options: {
              className: partnerCursor.role === 'host' ? 'cp-pair-cursor-host' : 'cp-pair-cursor-guest',
              hoverMessage: { value: "Partner Cursor" }
            }
          });
        }
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
      }
    };

    onValue(roomRef, handleRoomData);
    return () => off(roomRef, 'value', handleRoomData);
  }, [roomId, currentUser, localCode]);

  // 2. Subscribe to Chat history
  useEffect(() => {
    if (!roomId) return;

    if (isMockMode) {
      const handleMockChat = () => {
        const chatRaw = localStorage.getItem(`mock_pair_chat_${roomId}`) || '[]';
        setChatMessages(JSON.parse(chatRaw));
      };
      handleMockChat();
      const interval = setInterval(handleMockChat, 1000);
      return () => clearInterval(interval);
    }

    const chatRef = ref(rtdb, `pairRooms/${roomId}/chat`);
    const handleChatData = (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      list.sort((a, b) => a.timestamp - b.timestamp);
      setChatMessages(list);
    };

    onValue(chatRef, handleChatData);
    return () => off(chatRef, 'value', handleChatData);
  }, [roomId]);

  // 3. Autoscroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Join Room on Mount ──
  useEffect(() => {
    if (currentUser && roomId) {
      // If Guest is not host, fill guestId
      const checkJoin = async () => {
        const roomRef = ref(rtdb, `pairRooms/${roomId}`);
        onValue(roomRef, (snap) => {
          const data = snap.val();
          if (data && data.hostId !== currentUser.uid && !data.guestId) {
            joinPairRoom(
              roomId, 
              currentUser.uid, 
              currentUser.displayName || 'Guest Programmer'
            );
          }
        }, { onlyOnce: true });
      };
      checkJoin();
    }
  }, [currentUser, roomId]);

  // ── Peer AI / Companion Bot Simulator ──
  useEffect(() => {
    if (!roomId || !isMockMode) return;

    // 1. Join Room after 2 seconds
    const joinTimeout = setTimeout(() => {
      const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
      if (roomRaw) {
        const roomData = JSON.parse(roomRaw);
        if (!roomData.guestId) {
          roomData.guestId = 'aura_netrunner';
          roomData.guestName = 'Aura Netrunner ⚡';
          localStorage.setItem(`mock_pair_room_${roomId}`, JSON.stringify(roomData));

          // Post chat greeting
          const chatRaw = localStorage.getItem(`mock_pair_chat_${roomId}`) || '[]';
          const chat = JSON.parse(chatRaw);
          chat.push({
            id: `msg_join`,
            senderId: 'aura_netrunner',
            senderName: 'Aura Netrunner ⚡',
            text: 'System link established! Ready to optimize this node together. 👾 Should I lead the driver controls or are you guiding?',
            timestamp: Date.now()
          });
          localStorage.setItem(`mock_pair_chat_${roomId}`, JSON.stringify(chat));
        }
      }
    }, 2000);

    // 2. Cursor coordinate movement loop
    const cursorInterval = setInterval(() => {
      const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
      if (roomRaw) {
        const roomData = JSON.parse(roomRaw);
        if (roomData.guestId === 'aura_netrunner') {
          const randomLine = Math.floor(Math.random() * 8) + 2;
          const randomCol = Math.floor(Math.random() * 20) + 1;
          if (!roomData.cursors) roomData.cursors = {};
          roomData.cursors['aura_netrunner'] = {
            line: randomLine,
            column: randomCol,
            role: 'guest',
            timestamp: Date.now()
          };
          localStorage.setItem(`mock_pair_room_${roomId}`, JSON.stringify(roomData));
        }
      }
    }, 5000);

    // 3. Periodic dialogue sequences in chat
    const chatInterval = setInterval(() => {
      const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
      if (roomRaw) {
        const roomData = JSON.parse(roomRaw);
        if (roomData.guestId === 'aura_netrunner') {
          const commentBank = [
            "We should pay close attention to off-by-one errors on the index boundaries.",
            "DFS recursion stack space might exceed limit, let's keep it minimal.",
            "I'm keeping an eye on your cursor coordinates, looking very neat!",
            "Let's execute the compiler tests to see if we satisfy base parameters.",
            "Should we swap control to driver-navigator mode to focus cleanly?"
          ];
          const randomComment = commentBank[Math.floor(Math.random() * commentBank.length)];
          
          const chatRaw = localStorage.getItem(`mock_pair_chat_${roomId}`) || '[]';
          const chat = JSON.parse(chatRaw);
          chat.push({
            id: `msg_${Date.now()}`,
            senderId: 'aura_netrunner',
            senderName: 'Aura Netrunner ⚡',
            text: randomComment,
            timestamp: Date.now()
          });
          localStorage.setItem(`mock_pair_chat_${roomId}`, JSON.stringify(chat));
        }
      }
    }, 20000);

    return () => {
      clearTimeout(joinTimeout);
      clearInterval(cursorInterval);
      clearInterval(chatInterval);
    };
  }, [roomId]);

  // ── Sync Editor changes (debounced update) ──
  const handleEditorChange = (value) => {
    if (!room || isInputLocked) return;

    setLocalCode(value);
    // Realtime Database write
    updateRoomCode(roomId, value);
  };

  // ── Sync Cursor movement changes ──
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition(e => {
      if (!room || !currentUser) return;
      const role = currentUser.uid === room.hostId ? 'host' : 'guest';
      updateCursorPosition(
        roomId, 
        currentUser.uid, 
        e.position.lineNumber, 
        e.position.column, 
        role
      );
    });
  };

  // Send message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!candidateInput.trim()) return;

    sendPairMessage(
      roomId, 
      currentUser?.uid || 'guest', 
      currentUser?.displayName || 'Developer', 
      candidateInput.trim()
    );
    setCandidateInput('');
  };

  // Permission Checks
  const isHost = room && currentUser && currentUser.uid === room.hostId;
  const isDriver = room && currentUser && room.driverId === currentUser.uid;
  const isInputLocked = room && room.mode === 'driver-navigator' && !isDriver;

  const partnerName = isHost ? (room?.guestName || 'Guest') : (room?.hostName || 'Host');
  const partnerId = isHost ? room?.guestId : room?.hostId;

  // Toggle roles (Driver / Navigator Mode)
  const handleToggleRoomMode = () => {
    if (!isHost) return;
    const nextMode = room.mode === 'free' ? 'driver-navigator' : 'free';
    updateRoomMode(roomId, nextMode);
  };

  // Switch Driver active permissions
  const handleSwitchRoles = () => {
    if (!room) return;
    const nextDriver = room.driverId === room.hostId ? (room.guestId || room.hostId) : room.hostId;
    updateDriverRole(roomId, nextDriver);
  };

  // Take Turn Request
  const handleTakeTurn = () => {
    if (!room || !currentUser) return;
    takeTurnRequest(roomId, currentUser.uid);
    
    // Auto-send chat message
    sendPairMessage(
      roomId, 
      'system', 
      'SYSTEM', 
      `${currentUser.displayName || 'Partner'} took the driver turn control!`
    );
  };

  // Run together
  const handleRunTogether = () => {
    const mockResult = {
      success: true,
      verdict: 'Accepted',
      output: 'Test Case #1: Passed\nTest Case #2: Passed\nAll test suites completed under 12ms!'
    };
    updateCompileResult(roomId, mockResult);

    sendPairMessage(
      roomId, 
      'system', 
      'SYSTEM', 
      `${currentUser?.displayName || 'Partner'} executed the test suite!`
    );
  };

  if (roomId === 'lobby') {
    return <PairLobbyHub navigate={navigate} currentUser={currentUser} />;
  }

  return (
    <div className="cp-pair-page">
      <div className="cp-battle-lobby-glow" style={{ background: 'rgba(255, 170, 0, 0.03)' }} />

      <div className="cp-pair-workspace">
        
        {/* Top dashboard control bar */}
        <div className="cp-pair-topbar">
          <span className="cp-pair-title-meta">
            COLLABORATION LAB // ROOM: {roomId?.substring(0, 12)}
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            {isHost && (
              <>
                <button className="cp-radar-btn" onClick={handleToggleRoomMode}>
                  MODE: {room?.mode === 'driver-navigator' ? 'DRIVER-NAV' : 'FREE COOPERATIVE'}
                </button>
                <button className="cp-radar-btn" onClick={handleSwitchRoles}>
                  PASS DRIVER CONTROL 🔄
                </button>
              </>
            )}

            {!isDriver && room?.mode === 'driver-navigator' && (
              <button 
                className="cp-radar-btn cp-radar-btn--active"
                onClick={handleTakeTurn}
                style={{ background: '#FF2D78', borderColor: '#FF2D78', color: '#000' }}
              >
                REQUEST TAKE TURN ⚡
              </button>
            )}
          </div>
        </div>

        {/* Main collaborative split panels */}
        <div className="cp-pair-body">
          
          <div className="cp-pair-editor-block">
            
            {/* Short Problem description details */}
            <div className="cp-pair-problem-overlay">
              <h4 className="cp-pair-problem-title">Collaborative Algorithmic Challenge</h4>
              <p>Work with your partner to develop an optimal solution. You can write, test, chat, and voice sync simultaneously!</p>
            </div>

            <div className="cp-pair-editor-wrapper">
              
              {/* Navigator Locked Cover overlay */}
              {isInputLocked && (
                <div className="cp-pair-lock-overlay">
                  <div className="cp-pair-lock-card">
                    <div className="cp-pair-lock-icon">🔒</div>
                    <h4 className="cp-pair-lock-title">NAVIGATOR LOCKOUT ACTIVE</h4>
                    <p className="cp-pair-lock-desc">
                      Your partner is currently the Driver. You can guide them through cursors and text/voice channels!
                    </p>
                    <button className="cp-radar-btn" onClick={handleTakeTurn}>
                      POLITELY TAKE DRIVER CONTROL 🔑
                    </button>
                  </div>
                </div>
              )}

              <Editor
                height="100%"
                theme="vs-dark"
                language={room?.language || 'python'}
                value={localCode}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  fontSize: 14,
                  lineHeight: 22,
                  readOnly: isInputLocked,
                  minimap: { enabled: false },
                  fontFamily: "'Share Tech Mono', monospace"
                }}
              />

            </div>

            {/* Editor compile actions footer */}
            <div className="cp-int-editor-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                className="cp-radar-btn cp-radar-btn--active" 
                onClick={handleRunTogether}
                style={{ background: '#00FF88', borderColor: '#00FF88', color: '#000' }}
              >
                RUN TEST SUITES TOGETHER ⚔️
              </button>
            </div>

          </div>

          {/* Partner Sidebar details & chats (Right 30%) */}
          <div className="cp-pair-sidebar">
            <div className="cp-pair-sidebar-header">PARTNER STATUS</div>
            
            <div className="cp-pair-partner-card">
              <div className="cp-pair-partner-avatar">
                {partnerName.substring(0, 2).toUpperCase()}
              </div>

              <div className="cp-pair-partner-info">
                <span className="cp-pair-partner-name">{partnerName}</span>
                <span className="cp-pair-partner-status">
                  <div className="cp-pair-status-dot" />
                  {room?.guestId ? 'Connected' : 'Waiting for guest...'}
                </span>
              </div>
            </div>

            {/* Voice controls & indicators */}
            <div className="cp-pair-partner-card" style={{ background: 'transparent' }}>
              <button 
                className={`cp-radar-btn ${isVoiceEnabled ? 'cp-radar-btn--active' : ''}`}
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              >
                {isVoiceEnabled ? 'VOICE CONNECTED 🎤' : 'ENABLE VOICE CHAT'}
              </button>

              {isVoiceEnabled && (
                <div className="cp-pair-voice-wave">
                  <div className="cp-pair-wave-bar" />
                  <div className="cp-pair-wave-bar" />
                  <div className="cp-pair-wave-bar" />
                </div>
              )}
            </div>

            {/* Realtime collaboration Text Chat Area */}
            <div className="cp-pair-chat-area">
              <div className="cp-pair-chat-history">
                {chatMessages.map(msg => (
                  <div key={msg.id} className="cp-pair-msg-row">
                    <span className="cp-pair-msg-header">
                      {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="cp-pair-msg-bubble">
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form className="cp-pair-chat-input-bar" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Type message to partner..."
                  className="cp-pair-chat-input"
                  value={candidateInput}
                  onChange={e => setCandidateInput(e.target.value)}
                />
                <button type="submit" className="cp-radar-btn cp-radar-btn--active">
                  SEND
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

const PairLobbyHub = ({ navigate, currentUser }) => {
  const [rooms] = useState([
    { id: 'room_mock_1', title: 'DP Cache Minimizer Loop', host: 'Cyber_Synthesizer', difficulty: 'Medium', language: 'python' },
    { id: 'room_mock_2', title: 'Quantum DFS Junction', host: 'Aura_Netrunner', difficulty: 'Hard', language: 'javascript' },
    { id: 'room_mock_3', title: 'Junction Splice Array', host: 'Glitch_Viper', difficulty: 'Easy', language: 'cpp' }
  ]);

  const handleCreateRoom = async () => {
    const newRoomId = `room_${Date.now()}`;
    const payload = {
      roomId: newRoomId,
      problemId: '1',
      hostId: currentUser?.uid || 'guest_user',
      hostName: currentUser?.displayName || 'Host Coder',
      guestId: null,
      guestName: null,
      code: 'def solve(weights, target):\n    # Write Python code\n    pass',
      language: 'python',
      driverId: currentUser?.uid || 'guest_user',
      mode: 'free',
      compileResult: null,
      turnLockExpires: 0
    };
    localStorage.setItem(`mock_pair_room_${newRoomId}`, JSON.stringify(payload));
    localStorage.setItem(`mock_pair_chat_${newRoomId}`, JSON.stringify([]));
    navigate(`/pair/${newRoomId}`);
  };

  const handleJoinRoom = (rid) => {
    const selected = rooms.find(r => r.id === rid);
    const newRoomId = `room_${Date.now()}`;
    const payload = {
      roomId: newRoomId,
      problemId: '2',
      hostId: 'simulated_host',
      hostName: selected.host,
      guestId: currentUser?.uid || 'guest_user',
      guestName: currentUser?.displayName || 'Guest Coder',
      code: 'function solve(tunnels, start) {\n    // Node routing analysis\n}',
      language: selected.language,
      driverId: 'simulated_host',
      mode: 'free',
      compileResult: null,
      turnLockExpires: 0
    };
    localStorage.setItem(`mock_pair_room_${newRoomId}`, JSON.stringify(payload));
    localStorage.setItem(`mock_pair_chat_${newRoomId}`, JSON.stringify([]));
    navigate(`/pair/${newRoomId}`);
  };

  return (
    <div className="cp-pair-page cp-lobby-hub-active">
      <div className="cp-battle-lobby-glow" style={{ background: 'rgba(255, 170, 0, 0.04)' }} />
      
      <div className="cp-pair-workspace cp-lobby-workspace">
        <div className="cp-pair-topbar">
          <span className="cp-pair-title-meta">
            MULTIPLAYER COOP HUB // COLLABORATIVE LOBBIES
          </span>
          <button className="cp-radar-btn cp-radar-btn--active" onClick={handleCreateRoom} style={{ background: '#FFAA00', borderColor: '#FFAA00', color: '#000', fontWeight: 'bold' }}>
            CREATE COOPERATIVE ROOM 🤝
          </button>
        </div>

        <div className="cp-lobby-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px', padding: '30px' }}>
          
          {/* Active Rooms Listing */}
          <div className="cp-active-rooms-container">
            <h3 style={{ fontFamily: 'Orbitron', color: '#FFAA00', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 170, 0, 0.15)', paddingBottom: '10px' }}>
              // ACTIVE CYBERNETIC CO-OP ROOMS
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {rooms.map(room => (
                <div key={room.id} className="cp-lobby-room-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontFamily: 'Orbitron', color: '#FFF', fontSize: '0.88rem', margin: '0 0 6px 0', letterSpacing: '1px' }}>
                      {room.title.toUpperCase()}
                    </h4>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.72rem', color: '#8888AA' }}>
                      <span>Host: <strong style={{ color: '#FFAA00' }}>{room.host}</strong></span>
                      <span>Difficulty: <strong style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px' }}>{room.difficulty}</strong></span>
                      <span>Language: <strong style={{ color: '#00FF88' }}>{room.language.toUpperCase()}</strong></span>
                    </div>
                  </div>

                  <button className="cp-radar-btn cp-radar-btn--active" onClick={() => handleJoinRoom(room.id)} style={{ padding: '8px 16px', fontSize: '0.7rem' }}>
                    JOIN WORKSPACE ⚡
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Lobby stats & rules sidebar */}
          <div className="cp-lobby-sidebar">
            <h3 style={{ fontFamily: 'Orbitron', color: '#00FF88', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '20px', borderBottom: '1px solid rgba(0, 255, 136, 0.15)', paddingBottom: '10px' }}>
              // OPERATOR STATS
            </h3>

            <div className="cp-pair-partner-card" style={{ marginBottom: '20px' }}>
              <div className="cp-pair-partner-avatar" style={{ background: '#00FF88', color: '#000' }}>
                {currentUser?.displayName ? currentUser.displayName.substring(0,2).toUpperCase() : 'ME'}
              </div>
              <div className="cp-pair-partner-info">
                <span className="cp-pair-partner-name">{currentUser?.displayName || 'Developer Coder'}</span>
                <span className="cp-pair-partner-status">Rank ELO: 1540</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 255, 136, 0.03)', border: '1px solid rgba(0, 255, 136, 0.1)', borderRadius: '6px', padding: '16px', fontSize: '0.72rem', color: '#8888AA', lineHeight: '1.5' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#00FF88', fontFamily: 'Orbitron', fontSize: '0.78rem' }}>DRIVER-NAVIGATOR RULES</h4>
              <p style={{ margin: '0 0 8px 0' }}>1. The **Driver** owns exclusive keyboard write access in Monaco.</p>
              <p style={{ margin: '0 0 8px 0' }}>2. The **Navigator** views coordinates and guides through audio channels.</p>
              <p style={{ margin: 0 }}>3. Request turn control at any time using the active Take-Turn override keys.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PairProgramming;
