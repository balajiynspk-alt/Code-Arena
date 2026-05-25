import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { auth, rtdb } from '../services/firebase';
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
  }, [roomId, currentUser]);

  // 2. Subscribe to Chat history
  useEffect(() => {
    if (!roomId) return;
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

export default PairProgramming;
