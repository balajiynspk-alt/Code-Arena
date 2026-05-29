import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  sendMessage, 
  subscribeMessages, 
  setTypingStatus, 
  subscribeTyping, 
  setOnlinePresence, 
  subscribeOnlineCount,
  pinMessage,
  subscribePinnedMessage
} from '../services/chatService';
import { getCommunities, getJoinedCommunityIds } from '../services/communityService';
import { getProblemById } from '../services/problemService';
import { auth } from '../services/firebase';
import { createBattleInvite } from '../services/battleService';
import ChallengeModal from '../components/ChallengeModal';
import './Chat.css';

// 20 cyberpunk/standard emoji list grid
const EMOJIS = [
  '🔥', '🎉', '💡', '👏', '🏆', 
  '🧠', '🐍', '🏗️', '📝', '🚀', 
  '💻', '🪐', '👾', '⚔️', '⚡', 
  '🛡️', '☣️', '☣️', '🤖', '💀'
];

const Chat = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  // Selected channel state
  const [channelType, setChannelType] = useState('global'); // 'global' | 'community' | 'problem'
  const [channelId, setChannelId] = useState('global');
  const [channelName, setChannelName] = useState('GLOBAL AREA');

  // Channel lists state
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [problemArenas, setProblemArenas] = useState([
    { id: '1', title: 'LRU Cache Routing' },
    { id: '2', title: 'Median of Array Sentinel' },
    { id: '3', title: 'Dynamic Knapsack Compress' }
  ]);

  // Real-time listener states
  const [messages, setMessages] = useState([]);
  const [typers, setTypers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [pinnedMsg, setPinnedMsg] = useState(null);

  // Input states
  const [inputText, setInputText] = useState('');
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const messagesEndRef = useRef(null);

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
      await createBattleInvite(
        currentUser.uid,
        currentUser.displayName || 'Operator',
        challengeTargetName,
        challengeTargetName,
        difficulty,
        timeLimit
      );

      // Broadcast system notice to chat channel
      await sendMessage(
        channelType,
        channelId,
        `⚔️ COMBAT INITIATED: @${currentUser.displayName || 'Operator'} issued a ${difficulty.toUpperCase()} challenge (${timeLimit} min) to @${challengeTargetName}!`,
        'Expert',
        'system'
      );

      alert(`⚔️ DUEL TRANSMISSION PROTOCOL: Challenge sent successfully to @${challengeTargetName}!`);
      setIsChallengeModalOpen(false);
    } catch (err) {
      console.error("Challenge launch failure:", err);
      alert("Failed to send challenge invite: " + err.message);
    }
  };

  // Load channels lists
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const comms = await getCommunities();
        if (currentUser) {
          const joined = await getJoinedCommunityIds();
          setJoinedCommunities(comms.filter(c => joined.includes(c.id)));
        } else {
          setJoinedCommunities(comms.slice(0, 3)); // show first 3 for visitors
        }
      } catch (err) {
        console.error("Failed to load chat channels:", err);
      }
    };
    fetchChannels();
  }, [currentUser]);

  // Handle switching channels
  const handleSelectChannel = (type, id, name) => {
    setChannelType(type);
    setChannelId(id);
    setChannelName(name);
    setMessages([]);
    setPinnedMsg(null);
    setShowEmojiGrid(false);
  };

  // Real-time sub/unsub listeners when channel details alter
  useEffect(() => {
    if (!currentUser) return;

    // Set online presence on mount
    setOnlinePresence(channelType, channelId, true);

    // Subscribe to messages
    const unsubMsgs = subscribeMessages(channelType, channelId, (list) => {
      setMessages(list);
    });

    // Subscribe to typers
    const unsubTyping = subscribeTyping(channelType, channelId, (list) => {
      // Filter out self
      setTypers(list.filter(n => n !== currentUser.displayName));
    });

    // Subscribe to online count
    const unsubOnline = subscribeOnlineCount(channelType, channelId, (count) => {
      setOnlineCount(count);
    });

    // Subscribe to pinned messages if community chat
    let unsubPinned = () => {};
    if (channelType === 'community') {
      unsubPinned = subscribePinnedMessage(channelId, (msg) => {
        setPinnedMsg(msg);
      });
    }

    return () => {
      setOnlinePresence(channelType, channelId, false);
      setTypingStatus(channelType, channelId, false);
      unsubMsgs();
      unsubTyping();
      unsubOnline();
      unsubPinned();
    };
  }, [channelType, channelId, currentUser]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing status triggers on change
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (val.trim().length > 0) {
      setTypingStatus(channelType, channelId, true);
    } else {
      setTypingStatus(channelType, channelId, false);
    }
  };

  const handleSelectEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiGrid(false);
  };

  // Submit messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const text = inputText.trim();
    setInputText('');
    setTypingStatus(channelType, channelId, false);

    // Command Parser
    if (text.startsWith('/battle ')) {
      const target = text.replace('/battle ', '').replace('@', '').trim();
      triggerChallenge(target);
      return;
    }

    if (text === '/share') {
      await sendMessage(
        channelType,
        channelId,
        `🚀 SHARED ALGO LOGS: ${currentUser.displayName} has just solved "${problemArenas[0].title}" in 14ms!`,
        'Expert',
        'system'
      );
      return;
    }

    // Default message
    try {
      await sendMessage(channelType, channelId, text, 'Expert');
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePin = async (msg) => {
    if (channelType !== 'community') return;
    try {
      await pinMessage(channelId, msg);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnpin = async () => {
    if (channelType !== 'community') return;
    try {
      await pinMessage(channelId, null);
    } catch (err) {
      alert(err.message);
    }
  };

  // Render code block snippets inside backticks
  const renderText = (str) => {
    if (!str) return '';
    const parts = str.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            style={{
              fontFamily: 'Share Tech Mono',
              background: '#05050A',
              color: '#00FF88',
              padding: '2px 6px',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              borderRadius: '2px',
              display: 'inline-block',
              margin: '2px 0'
            }}
          >
            {part.substring(1, part.length - 1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="cp-chat-container">
      
      {/* ── LEFT COLUMN: SECTORS CHANNELS SIDEBAR ── */}
      <div className="cp-chat-sidebar">
        <h3 className="cp-sidebar-title">// COMMUNICATIONS HUB</h3>
        
        {/* Global Tab */}
        <div className="cp-sidebar-section">
          <span className="cp-sidebar-sec-title">🌐 GLOBAL AREA</span>
          <button
            onClick={() => handleSelectChannel('global', 'global', 'GLOBAL AREA')}
            className={`cp-channel-btn ${channelType === 'global' ? 'active' : ''}`}
          >
            # GLOBAL_TELEMETRY
          </button>
        </div>

        {/* Community Chats */}
        <div className="cp-sidebar-section">
          <span className="cp-sidebar-sec-title">🏆 CONNECTED COMMUNITY NODES</span>
          {joinedCommunities.length === 0 ? (
            <p className="cp-empty-channels">// NO ACTIVE COMMUNITY LINKS. JOIN IN THE COMMUNITIES SECTOR!</p>
          ) : (
            joinedCommunities.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelectChannel('community', c.id, c.name)}
                className={`cp-channel-btn ${channelType === 'community' && channelId === c.id ? 'active' : ''}`}
              >
                {c.emoji} {c.name.toUpperCase()}
              </button>
            ))
          )}
        </div>

        {/* Problem Chats */}
        <div className="cp-sidebar-section">
          <span className="cp-sidebar-sec-title">🧠 ACTIVE PROBLEM ARENAS</span>
          {problemArenas.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectChannel('problem', p.id, p.title)}
              className={`cp-channel-btn ${channelType === 'problem' && channelId === p.id ? 'active' : ''}`}
            >
              🔥 PROBLEM #{p.id}
            </button>
          ))}
        </div>
      </div>

      {/* ── MIDDLE column: TIMELINE CONVERSATIONS CHAT DOCK ── */}
      <div className="cp-chat-main">
        
        {/* Channel details header */}
        <div className="cp-chat-header">
          <div>
            <h2 className="cp-chat-header-name"># {channelName.toUpperCase()}</h2>
            <span className="cp-chat-header-online">{onlineCount} OPERATORS ONLINE</span>
          </div>

          {/* Typing status readout */}
          {typers.length > 0 && (
            <div className="cp-chat-typing-readout">
              ⏳ {typers.join(', ')} {typers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
        </div>

        {/* Moderator Pin telemetry row */}
        {pinnedMsg && (
          <div className="cp-pinned-banner">
            <span className="cp-pinned-icon">📌 PINNED BY MODERATOR:</span>
            <div className="cp-pinned-text">
              <strong>@{pinnedMsg.displayName}</strong>: {pinnedMsg.text}
            </div>
            {channelType === 'community' && (
              <button onClick={handleUnpin} className="cp-unpin-btn">
                UNPIN
              </button>
            )}
          </div>
        )}

        {/* Message Scrolling Canvas */}
        <div className="cp-chat-scroller">
          {messages.length === 0 ? (
            <div className="cp-chat-empty">// TIMELINE EMPTY. INITIATE NETWORK TRANSMISSIONS.</div>
          ) : (
            messages.map(m => {
              const isMe = m.uid === currentUser?.uid;
              const isSystem = m.type === 'system';
              const timeString = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              if (isSystem) {
                return (
                  <div key={m.id || m.timestamp} className="cp-chat-row cp-chat-row--system">
                    <div className="cp-msg-bubble cp-msg-bubble--system">
                      {m.text}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={m.id || m.timestamp}
                  className={`cp-chat-row ${isMe ? 'cp-chat-row--me' : 'cp-chat-row--other'}`}
                >
                  <div className="cp-msg-wrapper">
                    {/* Header */}
                    <div className="cp-msg-meta">
                      <span className="cp-msg-sender">@{m.displayName}</span>
                      <span className="cp-msg-rank-badge">{m.rank?.toUpperCase()}</span>
                    </div>

                    {/* Bubble */}
                    <div
                      className={`cp-msg-bubble ${isMe ? 'me' : 'other'}`}
                      title={`Sent at: ${timeString}`}
                    >
                      {renderText(m.text)}
                    </div>

                    {/* Pin button (Tier 2 Community moderators helper) */}
                    {channelType === 'community' && (
                      <button
                        onClick={() => handlePin(m)}
                        className="cp-pin-action-btn"
                      >
                        📌 PIN
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input form and emoji bar */}
        <form onSubmit={handleSendMessage} className="cp-chat-input-form">
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowEmojiGrid(!showEmojiGrid)}
              className="cp-emoji-picker-toggle"
            >
              😊
            </button>

            {/* Emoji table Grid */}
            {showEmojiGrid && (
              <div className="cp-emoji-grid-modal">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => handleSelectEmoji(e)}
                    className="cp-emoji-grid-btn"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Transmit signal code... (/battle @user to duel, /share to reveal progress, use `code` to render blocks)"
              className="cp-chat-input-field"
              required
            />

            <button type="submit" className="cp-chat-submit-btn">
              SEND ⚡
            </button>
          </div>

        </form>

      </div>

      <ChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        opponentName={challengeTargetName}
        onSubmit={handleInitiateChallenge}
      />

    </div>
  );
};

export default Chat;
