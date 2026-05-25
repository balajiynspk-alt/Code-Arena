import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  INDIAN_COLLEGES, 
  joinGuild, 
  getGuildWarMatchup, 
  sendGuildMessage, 
  subscribeGuildMessages 
} from '../services/guildService';
import './Guild.css';

const Guild = () => {
  const currentUser = auth.currentUser;
  const queryClient = useQueryClient();

  // Chat Feed States
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  // Selector Form States
  const [selectedCollegeId, setSelectedCollegeId] = useState(INDIAN_COLLEGES[0].id);
  const [isCopied, setIsCopied] = useState(false);

  // Fetch current user document
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['guildUser', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return null;
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      return snap.exists() ? snap.data() : {};
    },
    enabled: !!currentUser
  });

  const collegeId = userData?.collegeId;
  const hasJoinedGuild = !!collegeId;

  // Fetch active Guild payload
  const { data: guild, isLoading: guildLoading } = useQuery({
    queryKey: ['guildData', collegeId],
    queryFn: async () => {
      if (!collegeId) return null;
      const snap = await getDoc(doc(db, 'guilds', collegeId));
      return snap.exists() ? snap.data() : {
        name: userData.collegeName || 'My College Guild',
        emblem: '🏛️',
        memberCount: 24,
        totalPoints: 3450,
        weeklyPoints: 620,
        topMembers: [
          { displayName: currentUser?.displayName || 'AlphaCoder', points: 280 }
        ],
        rank: 12
      };
    },
    enabled: hasJoinedGuild
  });

  // ── Sync Chat Messages real-time ──
  useEffect(() => {
    if (!collegeId) return;
    const unsubscribe = subscribeGuildMessages(collegeId, (list) => {
      setMessages(list);
    });
    return () => unsubscribe();
  }, [collegeId]);

  // Autoscroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join College Guild Mutation
  const joinMutation = useMutation({
    mutationFn: async (cId) => {
      if (!currentUser) return;
      return joinGuild(currentUser.uid, currentUser.displayName || 'Developer', cId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guildUser', currentUser?.uid] });
    }
  });

  const handleJoinGuild = (e) => {
    e.preventDefault();
    joinMutation.mutate(selectedCollegeId);
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !collegeId) return;

    try {
      await sendGuildMessage(
        collegeId,
        currentUser?.uid || 'anon',
        currentUser?.displayName || 'Developer',
        chatInput.trim()
      );
      setChatInput('');
    } catch (err) {
      console.error("Failed to post message:", err);
    }
  };

  const handleCopyRecruit = () => {
    const inviteLink = `${window.location.origin}/signup?guild=${collegeId}`;
    navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  if (userLoading || guildLoading) {
    return <div className="cp-pd-state">// BOOTING GUILD ARSENAL...</div>;
  }

  // ── RENDER SELECTOR IF NOT JOINED ──
  if (!hasJoinedGuild) {
    return (
      <div className="cp-guild-page cp-guild-selector-page">
        <div className="cp-battle-lobby-glow" style={{ background: 'rgba(255, 45, 120, 0.03)' }} />
        
        <div className="cp-guild-selector-card">
          <div className="cp-guild-selector-emblem">⚔️</div>
          <h2 className="cp-guild-selector-title">SELECT YOUR COLLEGE GUILD</h2>
          <p className="cp-guild-selector-desc">
            Classmates unite! Select your college to automatically join their guild, combine points weekly, and fight in national wars for exclusive champion badges.
          </p>

          <form onSubmit={handleJoinGuild}>
            <select 
              value={selectedCollegeId}
              onChange={e => setSelectedCollegeId(e.target.value)}
              className="cp-guild-select"
            >
              {INDIAN_COLLEGES.map(col => (
                <option key={col.id} value={col.id}>
                  {col.emblem} {col.name}
                </option>
              ))}
            </select>

            <button 
              type="submit" 
              className="cp-radar-btn cp-radar-btn--active"
              style={{ width: '100%', marginTop: '16px', background: '#FF2D78', borderColor: '#FF2D78', color: '#0A0A0F', fontWeight: 'bold' }}
              disabled={joinMutation.isPending}
            >
              {joinMutation.isPending ? 'ENLISTING...' : 'ENLIST IN COLLEGE GUILD ⚔️'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculate user contribution levels
  const myContrib = guild?.topMembers?.find(m => m.uid === currentUser?.uid)?.points || 80;
  const totalWeekly = guild?.weeklyPoints || 450;
  const contribRatio = totalWeekly > 0 ? Math.min(100, Math.round((myContrib / totalWeekly) * 100)) : 0;

  // Active weekly war calculations
  const war = getGuildWarMatchup(collegeId);
  const pointDifference = Math.abs(war.myScore - war.oppScore);
  const leading = war.myScore >= war.oppScore;

  return (
    <div className="cp-guild-page">
      <div className="cp-battle-lobby-glow" style={{ background: 'rgba(0, 255, 136, 0.02)' }} />

      <div className="cp-guild-container">
        
        {/* Banner header */}
        <div className="cp-guild-banner">
          <div className="cp-guild-banner-accent" />
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span className="cp-guild-banner-emblem">{guild?.emblem || '🏛️'}</span>
            <div>
              <h1 className="cp-guild-banner-title">{guild?.name}</h1>
              <p className="cp-guild-banner-meta">
                GUILD MEMBERS: <strong>{guild?.memberCount || 1}</strong> • SEASON RANKING: <strong>#{guild?.rank || 45}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Point alert alerts */}
        <div className="cp-guild-alert-bar">
          <span className="cp-guild-alert-dot" />
          {leading ? (
            <span>🚀 Your guild just overtook {war.opponentName}! Keep pushing!</span>
          ) : (
            <span>⚠️ Only {pointDifference} points behind! Solve one Medium problem to take the lead!</span>
          )}
        </div>

        {/* ── Main Split View ── */}
        <div className="cp-guild-body">
          
          {/* Left panel: Stats & chats */}
          <div className="cp-guild-main">
            
            {/* User contribution card */}
            <div className="cp-guild-card">
              <h3 className="cp-guild-card-title">YOUR GUILD SERVICE Record</h3>
              <div className="cp-guild-progress-wrap">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8888AA', marginBottom: '8px' }}>
                  <span>Points Earned: <strong>{myContrib}</strong></span>
                  <span>Contribution: <strong>{contribRatio}%</strong></span>
                </div>
                <div className="cp-guild-progress-bar">
                  <div className="cp-guild-progress-fill" style={{ width: `${contribRatio}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <span style={{ fontSize: '0.72rem', color: '#666688' }}>
                  Recruit classmates to earn +200 guild bonus coins!
                </span>
                <button 
                  className="cp-radar-btn cp-radar-btn--active"
                  onClick={handleCopyRecruit}
                  style={{ background: '#00FF88', borderColor: '#00FF88', color: '#0A0A0F', fontWeight: 'bold' }}
                >
                  {isCopied ? 'LINK COPIED! ✓' : 'RECRUIT CLASSMATES 📢'}
                </button>
              </div>
            </div>

            {/* Scrolling Chat Board */}
            <div className="cp-guild-card" style={{ padding: 0 }}>
              <div className="cp-guild-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="cp-guild-card-title" style={{ margin: 0 }}>COLLEGE GUILD FORUM</h3>
              </div>

              <div className="cp-guild-chat-feed">
                {messages.length === 0 ? (
                  <div className="cp-guild-chat-placeholder">
                    // CHANNEL DEVOPS ONLINE. POST FIRST MESSAGE TO TEAM...
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className="cp-guild-chat-row">
                      <span className="cp-guild-chat-user">{msg.senderName}:</span>
                      <span className="cp-guild-chat-text">{msg.text}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form className="cp-guild-chat-input-bar" onSubmit={handleSendChat}>
                <input
                  type="text"
                  placeholder="Broadcast message to college guild forum..."
                  className="cp-guild-chat-input"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                />
                <button type="submit" className="cp-radar-btn cp-radar-btn--active">
                  BROADCAST
                </button>
              </form>
            </div>

          </div>

          {/* Right panel: Matchups & leaderboards */}
          <div className="cp-guild-sidebar">
            
            {/* Active weekly matchup */}
            <div className="cp-guild-card cp-guild-card--war">
              <div className="cp-guild-war-badge">ACTIVE WEEKLY GUILD WAR</div>

              <div className="cp-guild-war-matching">
                <div className="cp-guild-war-side">
                  <span className="cp-guild-war-emblem">{guild?.emblem}</span>
                  <span className="cp-guild-war-name">YOUR GUILD</span>
                  <span className="cp-guild-war-pts">{totalWeekly} PTS</span>
                </div>

                <div className="cp-guild-war-vs">VS</div>

                <div className="cp-guild-war-side">
                  <span className="cp-guild-war-emblem">{war.opponentEmblem}</span>
                  <span className="cp-guild-war-name">{war.opponentName}</span>
                  <span className="cp-guild-war-pts">{war.oppScore} PTS</span>
                </div>
              </div>

              {/* Point scale progress bar */}
              <div className="cp-guild-war-scale">
                <div 
                  className="cp-guild-war-fill cp-guild-war-fill--my" 
                  style={{ width: `${Math.round((totalWeekly / (totalWeekly + war.oppScore)) * 100)}%` }} 
                />
                <div 
                  className="cp-guild-war-fill cp-guild-war-fill--opp" 
                  style={{ width: `${Math.round((war.oppScore / (totalWeekly + war.oppScore)) * 100)}%` }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#8888AA', marginTop: '16px' }}>
                <span>War Remaining: <strong>{war.timeLeftHours} Hours</strong></span>
                <span style={{ color: leading ? '#00FF88' : '#FF2D78' }}>
                  {leading ? 'WE ARE LEADING! 🏆' : 'WE ARE BEHIND! ⚔️'}
                </span>
              </div>
            </div>

            {/* Members Leaderboard */}
            <div className="cp-guild-card">
              <h3 className="cp-guild-card-title">GUILD MEMBER TOP CONTRIBUTORS</h3>
              <div className="cp-guild-sidebar-leaderboard">
                {guild?.topMembers?.map((m, i) => (
                  <div key={i} className="cp-guild-member-row">
                    <span className="cp-guild-member-rank">#{i + 1}</span>
                    <span className="cp-guild-member-name">{m.displayName}</span>
                    <span className="cp-guild-member-points">{m.points} PTS</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Guild;
