import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isMockMode, auth } from '../services/firebase';
import { MOCK_PROBLEMS } from '../services/mockData';
import './Contest.css';

const Contest = () => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState(0);
  const [matchFound, setMatchFound] = useState(false);
  const [matchedOpponent, setMatchedOpponent] = useState(null);

  // Active mock battles in the lobby
  const activeBattles = [
    { id: 'b_demo_1', challengerName: 'binary_phantom', opponentName: 'FAANG_Slayer', difficulty: 'Hard', problemTitle: 'Longest Valid Parentheses', status: 'active', spectators: 5 },
    { id: 'b_demo_2', challengerName: 'neon_ninja', opponentName: 'cyber_bot', difficulty: 'Easy', problemTitle: 'Valid Anagram', status: 'active', spectators: 2 }
  ];

  useEffect(() => {
    let interval;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTimer(t => {
          if (t >= 3) { // Match found after 3 seconds!
            clearInterval(interval);
            triggerMatchFound();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const triggerMatchFound = () => {
    const opponents = ['FAANG_Slayer_99', 'CodeGhost_404', 'binary_phantom', 'NeonOperator', 'DP_Ninja'];
    const opp = opponents[Math.floor(Math.random() * opponents.length)];
    setMatchedOpponent(opp);
    setMatchFound(true);

    setTimeout(() => {
      // Initialize battle!
      const battleId = `mock_battle_${Date.now()}`;
      
      // Select a random problem of the selected difficulty
      const problems = MOCK_PROBLEMS.filter(p => p.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());
      const randomProblem = problems.length > 0 ? problems[Math.floor(Math.random() * problems.length)] : MOCK_PROBLEMS[0];

      // Save initial battle details to localStorage
      const startTime = Date.now();
      const endTime = startTime + 600000; // 10 mins
      const battleData = {
        battleId,
        challenger: currentUser?.uid || 'local_user',
        challengerName: currentUser?.displayName || 'AlphaCoder',
        challengerRating: 1200,
        opponent: 'opp_id_simulated',
        opponentName: opp,
        opponentRating: 1230,
        difficulty: selectedDifficulty,
        status: 'active',
        timestamp: Date.now(),
        startTime,
        endTime,
        problemId: randomProblem.id,
        problemTitle: randomProblem.title,
        winnerId: '',
        tieBreakerReason: '',
        durationMs: 600000,
        challengerProgress: {
          linesWritten: 0,
          testsPassed: 0,
          totalTests: 5,
          status: 'Typing...',
          submitted: false,
          codeText: '// Enter your solution here...\n\nfunction solve() {\n  \n}'
        },
        opponentProgress: {
          linesWritten: 0,
          testsPassed: 0,
          totalTests: 5,
          status: 'Typing...',
          submitted: false,
          codeText: ''
        }
      };

      localStorage.setItem(`mock_battle_${battleId}`, JSON.stringify(battleData));

      setIsSearching(false);
      setMatchFound(false);
      navigate(`/battle/${battleId}`);
    }, 2500);
  };

  const handleStartSearch = () => {
    setIsSearching(true);
    setSearchTimer(0);
    setMatchFound(false);
  };

  const handleSpectate = (battle) => {
    navigate(`/watch/${battle.challengerName}`);
  };

  return (
    <div className="cp-contest-page">
      <div className="cp-battle-lobby-glow" />
      
      <div className="cp-contest-container">
        
        {/* Banner */}
        <div className="cp-contest-banner">
          <div className="cp-contest-banner-accent" />
          <div className="cp-contest-banner-content">
            <span className="cp-contest-banner-emblem">⚔️</span>
            <div>
              <h1 className="cp-contest-banner-title">1V1 ARENA MATCHMAKING</h1>
              <p className="cp-contest-banner-sub">// CLIMB THE LEADERBOARD IN HIGH-STAKES LIVE BENCHMARK SPEED CODING</p>
            </div>
          </div>
        </div>

        {/* Searching Overlay */}
        {isSearching && (
          <div className="cp-searching-overlay">
            <div className="cp-searching-scanner" />
            <div className="cp-searching-card">
              <div className="cp-searching-pulse" />
              <h3>SCANNING ARENA FOR COMPATIBLE THREATS...</h3>
              <p>Difficulty: <strong className={selectedDifficulty.toLowerCase()}>{selectedDifficulty.toUpperCase()}</strong></p>
              <div className="cp-searching-timer">{searchTimer}s</div>
              <button className="cp-toolbar-btn" onClick={() => setIsSearching(false)} style={{ marginTop: '20px' }}>
                ABORT CHANNEL
              </button>
            </div>
          </div>
        )}

        {/* Match Found Overlay */}
        {matchFound && (
          <div className="cp-searching-overlay">
            <div className="cp-searching-card cp-match-found-card">
              <div className="cp-match-found-accent" />
              <h2>MATCH CONCLUDED!</h2>
              <div className="cp-match-vs">
                <div className="cp-match-side">
                  <div className="cp-match-avatar">YOU</div>
                  <span>{currentUser?.displayName || 'AlphaCoder'}</span>
                </div>
                <div className="cp-match-vs-divider">VS</div>
                <div className="cp-match-side">
                  <div className="cp-match-avatar opp">OPP</div>
                  <span style={{ color: '#FF2D78' }}>{matchedOpponent}</span>
                </div>
              </div>
              <p className="cp-match-loading">// DEPLOYING DESTRUCTIVE SANDBOX ENVIRONMENT...</p>
            </div>
          </div>
        )}

        {/* Grid split view */}
        <div className="cp-contest-grid">
          
          <div className="cp-contest-main">
            {/* Matchmaking Station */}
            <div className="cp-contest-card">
              <h3 className="cp-contest-card-title">LOBBY MATCHMAKING STATION</h3>
              <p style={{ color: '#8888AA', fontSize: '0.82rem', marginBottom: '20px', lineHeight: '1.5' }}>
                Queue into competitive 1v1 speed rounds. You will be matched with an opponent of similar Elo rating and given a random algorithms problem. The faster correct submission wins.
              </p>

              <div className="cp-difficulty-selector">
                <span className="cp-difficulty-label">SELECT COMBAT DIFFICULTY:</span>
                <div className="cp-difficulty-options">
                  {['Easy', 'Medium', 'Hard'].map(diff => (
                    <button
                      key={diff}
                      className={`cp-difficulty-btn ${diff.toLowerCase()} ${selectedDifficulty === diff ? 'active' : ''}`}
                      onClick={() => setSelectedDifficulty(diff)}
                    >
                      {diff.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="cp-radar-btn cp-radar-btn--active cp-matchmake-btn"
                onClick={handleStartSearch}
              >
                JOIN THE MATCHMAKING QUEUE ⚔
              </button>
            </div>

            {/* Regulation Deck */}
            <div className="cp-contest-card">
              <h3 className="cp-contest-card-title">1V1 ARENA REGULATION DECK</h3>
              <div className="cp-rules-list">
                <div className="cp-rule-item">
                  <span className="cp-rule-num">01</span>
                  <div>
                    <h4>SPEED & ACCURACY</h4>
                    <p>The first player to pass all 5 production unit test cases instantly wins the match.</p>
                  </div>
                </div>
                <div className="cp-rule-item">
                  <span className="cp-rule-num">02</span>
                  <div>
                    <h4>TIMER EXPIRED TIEBREAKERS</h4>
                    <p>If neither solves it before the 10-minute timer runs out, the player with the higher number of passed test cases wins. If equal, the player with shorter code size (character footprint) is awarded victory.</p>
                  </div>
                </div>
                <div className="cp-rule-item">
                  <span className="cp-rule-num">03</span>
                  <div>
                    <h4>ELO SCORE CONVERSIONS</h4>
                    <p>Winning matches grants +15 to +35 Elo points. Defeats deduct Elo points. Maintain your rank to earn Gold and Diamond badges.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="cp-contest-sidebar">
            {/* Live Battles */}
            <div className="cp-contest-card">
              <h3 className="cp-contest-card-title">LIVE RUNNING SPECTACLE BATTLES</h3>
              <p style={{ color: '#666688', fontSize: '0.72rem', margin: '0 0 16px 0' }}>
                // WATCH ACTIVE CODE WARRIORS AND LEARN FROM THEIR REPLAYS
              </p>

              <div className="cp-lobbies-list">
                {activeBattles.map(lobby => (
                  <div key={lobby.id} className="cp-lobby-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="cp-lobby-opponents">
                        {lobby.challengerName} <span style={{ color: '#FF2D78' }}>vs</span> {lobby.opponentName}
                      </span>
                      <span className={`cp-difficulty-badge ${lobby.difficulty.toLowerCase()}`}>
                        {lobby.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="cp-lobby-problem">
                        Topic: {lobby.problemTitle}
                      </span>
                      <button className="cp-toolbar-btn" onClick={() => handleSpectate(lobby)} style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                        SPECTATE 👁 ({lobby.spectators})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard Top Fighters */}
            <div className="cp-contest-card">
              <h3 className="cp-contest-card-title">TOP ARENA COMBATANTS</h3>
              <div className="cp-fighters-leaderboard">
                {[
                  { rank: 1, name: 'DP_Demon_Master', rating: 2840, winrate: '88%' },
                  { rank: 2, name: 'stack_overflow_spectre', rating: 2710, winrate: '82%' },
                  { rank: 3, name: 'binary_beast_reaper', rating: 2650, winrate: '80%' },
                  { rank: 4, name: 'NeonPathfinder', rating: 2540, winrate: '78%' }
                ].map(fighter => (
                  <div key={fighter.rank} className="cp-fighter-row">
                    <span className="cp-fighter-rank">#{fighter.rank}</span>
                    <span className="cp-fighter-name">{fighter.name}</span>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
                      <span style={{ color: '#00FF88' }}>{fighter.rating} ELO</span>
                      <span style={{ color: '#8888AA' }}>{fighter.winrate} WR</span>
                    </div>
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

export default Contest;
