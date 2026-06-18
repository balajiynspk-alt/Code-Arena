import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTopGuilds } from '../services/guildService';
import './Leaderboard.css';

const Leaderboard = () => {
  // Fetch top guilds rankings
  const { data: guilds = [], isLoading } = useQuery({
    queryKey: ['topGuilds'],
    queryFn: getTopGuilds
  });

  return (
    <div className="cp-leader-page">
      <div className="cp-battle-lobby-glow" style={{ background: 'rgba(255, 170, 0, 0.02)' }} />

      <div className="cp-leader-container">
        
        {/* Page header */}
        <div className="cp-leader-header">
          <h1 className="cp-leader-title">
            <span className="cp-t-orange">COLLEGE GUILD</span>{' '}
            <span className="cp-t-green">SEASON STANDINGS</span>
          </h1>
          <p className="cp-leader-sub">
            // SEASON 04 ACTIVE • MONTHLY NATIONAL STANDINGS
          </p>
        </div>

        {/* Highlighted Top 3 podium items */}
        {isLoading ? (
          <div className="cp-podium-grid">
            <div className="cp-podium-card cp-podium-card--second" style={{ animation: 'cp-blink 1.5s infinite', background: '#151525', border: '1px solid #222' }}>
              <div style={{ height: '30px', width: '60px', background: '#222', margin: '0 auto 10px auto' }} />
              <div style={{ height: '20px', width: '100px', background: '#222', margin: '0 auto 10px auto' }} />
            </div>
            <div className="cp-podium-card cp-podium-card--first" style={{ animation: 'cp-blink 1.5s infinite', background: '#18182E', border: '1px solid #333' }}>
              <div style={{ height: '30px', width: '60px', background: '#333', margin: '0 auto 10px auto' }} />
              <div style={{ height: '20px', width: '100px', background: '#333', margin: '0 auto 10px auto' }} />
            </div>
            <div className="cp-podium-card cp-podium-card--third" style={{ animation: 'cp-blink 1.5s infinite', background: '#151525', border: '1px solid #222' }}>
              <div style={{ height: '30px', width: '60px', background: '#222', margin: '0 auto 10px auto' }} />
              <div style={{ height: '20px', width: '100px', background: '#222', margin: '0 auto 10px auto' }} />
            </div>
          </div>
        ) : guilds.length >= 3 && (
          <div className="cp-podium-grid">
            
            {/* Rank 2 */}
            <div className="cp-podium-card cp-podium-card--second">
              <span className="cp-podium-rank">#2</span>
              <span className="cp-podium-emblem">{guilds[1].emblem}</span>
              <h3 className="cp-podium-name">{guilds[1].name}</h3>
              <span className="cp-podium-pts">{guilds[1].totalPoints} PTS</span>
              <span className="cp-podium-members">{guilds[1].memberCount} Coder Units</span>
            </div>

            {/* Rank 1 */}
            <div className="cp-podium-card cp-podium-card--first">
              <div className="cp-podium-champion-badge">🏆 CURRENT LEADER</div>
              <span className="cp-podium-rank">#1</span>
              <span className="cp-podium-emblem">{guilds[0].emblem}</span>
              <h3 className="cp-podium-name">{guilds[0].name}</h3>
              <span className="cp-podium-pts">{guilds[0].totalPoints} PTS</span>
              <span className="cp-podium-members">{guilds[0].memberCount} Coder Units</span>
            </div>

            {/* Rank 3 */}
            <div className="cp-podium-card cp-podium-card--third">
              <span className="cp-podium-rank">#3</span>
              <span className="cp-podium-emblem">{guilds[2].emblem}</span>
              <h3 className="cp-podium-name">{guilds[2].name}</h3>
              <span className="cp-podium-pts">{guilds[2].totalPoints} PTS</span>
              <span className="cp-podium-members">{guilds[2].memberCount} Coder Units</span>
            </div>

          </div>
        )}

        {/* Global leaderboards table list */}
        <div className="cp-leader-section">
          <div className="cp-leader-section-header">
            <h2 className="cp-leader-section-title">NATIONAL LEADERBOARD (TOP 10)</h2>
          </div>

          {isLoading ? (
            <div className="cp-leader-table-wrap" style={{ animation: 'cp-blink 1.5s infinite' }}>
              <table className="cp-leader-table">
                <thead>
                  <tr>
                    <th className="cp-th">RANK</th>
                    <th className="cp-th">GUILD NAME</th>
                    <th className="cp-th" style={{ textAlign: 'center' }}>MEMBERS</th>
                    <th className="cp-th" style={{ textAlign: 'right' }}>ACCUMULATED RATING</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={item} className="cp-tr">
                      <td className="cp-td"><div style={{ height: '16px', width: '30px', background: '#151525' }} /></td>
                      <td className="cp-td"><div style={{ height: '16px', width: '120px', background: '#151525' }} /></td>
                      <td className="cp-td" style={{ display: 'flex', justifyContent: 'center' }}><div style={{ height: '16px', width: '60px', background: '#151525' }} /></td>
                      <td className="cp-td" style={{ textAlign: 'right' }}><div style={{ height: '16px', width: '80px', background: '#151525', float: 'right' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cp-leader-table-wrap">
              <table className="cp-leader-table">
                <thead>
                  <tr>
                    <th className="cp-th">RANK</th>
                    <th className="cp-th">GUILD NAME</th>
                    <th className="cp-th" style={{ textAlign: 'center' }}>MEMBERS</th>
                    <th className="cp-th" style={{ textAlign: 'right' }}>ACCUMULATED RATING</th>
                  </tr>
                </thead>
                <tbody>
                  {guilds.map((g, idx) => (
                    <tr key={g.id} className="cp-tr">
                      <td className="cp-td cp-td--rank">
                        <span className={`cp-leader-rank-badge ${idx < 3 ? 'top' : ''}`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="cp-td cp-td--name-cell">
                        <span className="cp-leader-emblem-inline">{g.emblem}</span>
                        <span className="cp-leader-guild-name">{g.name}</span>
                      </td>
                      <td className="cp-td" style={{ textAlign: 'center', color: '#8888AA' }}>
                        {g.memberCount} Units
                      </td>
                      <td className="cp-td cp-td--points-cell" style={{ textAlign: 'right', color: '#00FF88', fontWeight: 'bold' }}>
                        {g.totalPoints} PTS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Seasonal reward summary card */}
        <div className="cp-leader-reward-card">
          <div className="cp-leader-reward-accent" />
          <h3 className="cp-leader-reward-title">👑 SEASON CHAMPION GOLDEN EMBLEMS</h3>
          <p className="cp-leader-reward-desc">
            The winning college guild of Season 04 will earn the prestigious **"Season Champion"** digital badge overlays displayed across all profile screens. All active members of the winning war teams receive exclusive weekly champion badges!
          </p>
        </div>

      </div>
    </div>
  );
};

export default Leaderboard;
