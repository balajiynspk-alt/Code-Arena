import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  subscribeConversations, 
  subscribeMessages, 
  sendDirectMessage, 
  markAsRead, 
  blockUser, 
  isUserBlocked,
  startConversation
} from '../services/dmService';
import { auth } from '../services/firebase';
import ChallengeModal from '../components/ChallengeModal';
import './Messages.css';

const Messages = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // Conversations states
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConv, setSelectedConv] = useState(null);

  // Messages states
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // New Message Modal
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetUid, setNewTargetUid] = useState('');

  // Battle Challenge States & Handlers
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challengeTargetName, setChallengeTargetName] = useState('');

  const triggerChallenge = (opponentUsername) => {
    setChallengeTargetName(opponentUsername);
    setIsChallengeModalOpen(true);
  };

  const handleInitiateChallenge = async ({ difficulty, timeLimit }) => {
    if (!currentUser || !challengeTargetName) return;
    try {
      const { createBattleInvite } = await import('../services/battleService');
      await createBattleInvite(
        currentUser.uid,
        currentUser.displayName || 'Operator',
        challengeTargetName,
        challengeTargetName,
        difficulty,
        timeLimit
      );
      alert(`⚔️ DUEL TRANSMISSION PROTOCOL: Challenge sent successfully to @${challengeTargetName}!`);
      setIsChallengeModalOpen(false);
    } catch (err) {
      console.error("Challenge launch failure:", err);
      alert("Failed to send challenge invite: " + err.message);
    }
  };

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Subscribe to DM conversations list
    const unsubConvs = subscribeConversations((list) => {
      setConversations(list);
    });

    return () => unsubConvs();
  }, [currentUser]);

  // Subscribe to messages when active conversation shifts
  useEffect(() => {
    if (!selectedConv) return;

    // Mark as read
    markAsRead(selectedConv.id);

    const unsubMsgs = subscribeMessages(selectedConv.id, (list) => {
      setMessages(list);
    });

    return () => unsubMsgs();
  }, [selectedConv]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConv) return;

    if (inputText.trim().startsWith('/battle')) {
      const commandParts = inputText.trim().split(' ');
      let opponentUsername = '';
      if (commandParts[1]) {
        opponentUsername = commandParts[1].replace('@', '');
      } else {
        const otherUid = selectedConv.participants.find(id => id !== currentUser.uid);
        opponentUsername = selectedConv.participantNames?.[otherUid] || 'Operator';
      }

      setInputText('');
      triggerChallenge(opponentUsername);
      return;
    }

    try {
      await sendDirectMessage(selectedConv.id, inputText.trim(), 'text');
      setInputText('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAcceptBattle = (battleId) => {
    navigate(`/battle/${battleId || 'rtdb_mock_123'}`);
  };

  const handleDeclineBattle = (e) => {
    e.stopPropagation();
    alert("Battle Invitation Declined.");
  };

  const handleBlock = () => {
    if (!selectedConv) return;
    const otherUid = selectedConv.participants.find(id => id !== currentUser.uid);
    blockUser(otherUid);
    alert(`Operator blocked successfully.`);
  };

  const handleNewConversationSubmit = async (e) => {
    e.preventDefault();
    if (!newTargetUid.trim() || !newTargetName.trim()) return;

    try {
      const convId = await startConversation(newTargetUid.trim(), newTargetName.trim());
      const allConvs = conversations;
      const resolved = allConvs.find(c => c.id === convId);
      if (resolved) {
        setSelectedConv(resolved);
      } else {
        setSelectedConv({
          id: convId,
          participants: [currentUser.uid, newTargetUid.trim()],
          participantNames: {
            [currentUser.uid]: currentUser.displayName || 'Operator',
            [newTargetUid.trim()]: newTargetName.trim()
          }
        });
      }
      setShowSearchModal(false);
      setNewTargetName('');
      setNewTargetUid('');
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter conversations matching query username
  const filteredConvs = conversations.filter(c => {
    const otherName = Object.values(c.participantNames || {}).find(n => n !== currentUser.displayName) || 'Operator';
    return otherName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="cp-dm-container">
      
      {/* ── LEFT PANEL: DIRECT MESSAGES INBOX LIST ── */}
      <div className="cp-dm-sidebar">
        <div className="cp-dm-sidebar-header">
          <h2 className="cp-sidebar-title">// PRIVATE SECURE LINES</h2>
          <button
            onClick={() => setShowSearchModal(true)}
            className="cp-dm-new-btn"
          >
            + NEW LINE
          </button>
        </div>

        <input
          type="text"
          placeholder="SEARCH OPERATOR ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="cp-dm-search"
        />

        <div className="cp-dm-inbox-list">
          {filteredConvs.map(c => {
            const otherUid = c.participants.find(id => id !== currentUser.uid);
            const otherName = c.participantNames?.[otherUid] || 'Operator';
            const unread = c.unreadCount?.[currentUser.uid] || 0;
            const isSelected = selectedConv?.id === c.id;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedConv(c)}
                className={`cp-inbox-card ${isSelected ? 'active' : ''} ${unread > 0 ? 'unread' : ''}`}
              >
                <div className="cp-inbox-avatar-fallback">
                  {otherName.substring(0, 2).toUpperCase()}
                </div>
                <div className="cp-inbox-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="cp-inbox-name">@{otherName}</span>
                    {unread > 0 && <span className="cp-inbox-unread-badge">{unread}</span>}
                  </div>
                  <p className="cp-inbox-last-msg">{c.lastMessage}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL: CONVERSATION VIEW ── */}
      <div className="cp-dm-chat-arena">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="cp-dm-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="cp-inbox-avatar-fallback" style={{ borderColors: '#FF2D78' }}>
                  {(() => {
                    const otherUid = selectedConv.participants.find(id => id !== currentUser.uid);
                    return (selectedConv.participantNames?.[otherUid] || 'OP').substring(0, 2).toUpperCase();
                  })()}
                </div>
                <div>
                  <h3 className="cp-dm-chat-name">
                    @{(() => {
                      const otherUid = selectedConv.participants.find(id => id !== currentUser.uid);
                      return selectedConv.participantNames?.[otherUid] || 'Operator';
                    })()}
                  </h3>
                  <span className="cp-dm-chat-telemetry">// SECURE CONNECTION ACTIVE</span>
                </div>
              </div>

              <button onClick={handleBlock} className="cp-block-operator-btn">
                BLOCK OPERATOR
              </button>
            </div>

            {/* Message scroller area */}
            <div className="cp-dm-messages-scroller">
              {messages.length === 0 ? (
                <div className="cp-dm-empty-chat">// NO TRANSMISSIONS LOGGED ON THIS SIGNAL</div>
              ) : (
                messages.map(m => {
                  const isMe = m.senderId === currentUser.uid;
                  const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={m.id || m.timestamp}
                      className={`cp-dm-row ${isMe ? 'cp-dm-row--me' : 'cp-dm-row--other'}`}
                    >
                      <div className="cp-dm-bubble-wrapper">
                        {/* Text Message */}
                        {m.type === 'text' && (
                          <div className={`cp-dm-bubble ${isMe ? 'me' : 'other'}`}>
                            {m.text}
                          </div>
                        )}

                        {/* Battle Challenge card */}
                        {m.type === 'battle_invite' && (
                          <div className="cp-dm-challenge-card">
                            <span className="cp-challenge-card-badge">⚔️ ARENA CHALLENGE DECK</span>
                            <h4 className="cp-challenge-card-title">{m.text}</h4>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.72rem', color: '#8888AA' }}>
                              Difficulty Level: <strong style={{ color: '#FFAA00' }}>{m.metadata?.difficulty?.toUpperCase()}</strong>
                            </p>
                            {!isMe ? (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleAcceptBattle(m.metadata?.battleId)}
                                  className="cp-challenge-btn-accept"
                                >
                                  ACCEPT ⚔️
                                </button>
                                <button
                                  onClick={handleDeclineBattle}
                                  className="cp-challenge-btn-decline"
                                >
                                  DECLINE
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.65rem', color: '#555577', fontStyle: 'italic' }}>Waiting for opponent response...</span>
                            )}
                          </div>
                        )}

                        {/* Solution share card */}
                        {m.type === 'solution_share' && (
                          <div className="cp-dm-solution-card">
                            <span className="cp-sol-badge">✅ ALGO SOLUTION PREVIEW</span>
                            <h4 className="cp-sol-title">{m.metadata?.problemTitle}</h4>
                            <pre className="cp-sol-code">{m.metadata?.code}</pre>
                            <span className="cp-sol-stats">{m.metadata?.stats}</span>
                          </div>
                        )}

                        {/* Read Receipts */}
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.62rem', color: '#555577', marginTop: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                          <span>{timeStr}</span>
                          {isMe && (
                            <span style={{ color: m.read ? '#00FF88' : '#555577' }}>
                              {m.read ? '✓✓ READ' : '✓ DELIVERED'}
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer panel */}
            <form onSubmit={handleSendMessage} className="cp-dm-input-form">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Compose secure signal..."
                className="cp-dm-text-input"
                required
              />
              <button type="submit" className="cp-dm-submit-btn">
                TRANSMIT
              </button>
            </form>
          </>
        ) : (
          <div className="cp-dm-no-selected">
            <h3 className="cp-dm-unselected-title">// DM INBOX CHANNELS DETACHED</h3>
            <p className="cp-dm-unselected-p">Select a secure signal card on the left list, or connect a new operator node to begin transmissions.</p>
          </div>
        )}
      </div>

      {/* ── NEW MESSAGE SEARCH MODAL ── */}
      {showSearchModal && (
        <div className="cp-dm-modal-overlay">
          <div className="cp-dm-modal">
            <h3 className="cp-modal-title">// CONNECT DIRECT SIGNAL</h3>
            <form onSubmit={handleNewConversationSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="OPERATOR USERNAME..."
                  value={newTargetName}
                  onChange={(e) => setNewTargetName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="OPERATOR UID / ID..."
                  value={newTargetUid}
                  onChange={(e) => setNewTargetUid(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  className="cp-modal-cancel"
                >
                  CANCEL
                </button>
                <button type="submit" className="cp-modal-connect">
                  CONNECT NODE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        opponentName={challengeTargetName}
        onSubmit={handleInitiateChallenge}
      />

    </div>
  );
};

export default Messages;
