import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auth } from '../services/firebase';
import { getFlowSessions, computeFlowMetrics } from '../services/flowService';
import './FlowTracker.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FlowTracker = () => {
  const currentUser = auth.currentUser;

  // Active Tooltip States
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showReport, setShowReport] = useState(false);

  // Fetch all passive flow sessions for the current developer
  const { data: sessions = [] } = useQuery({
    queryKey: ['flowSessions', currentUser?.uid],
    queryFn: () => getFlowSessions(currentUser?.uid || 'demo_user'),
    enabled: !!currentUser
  });

  // Calculate matrices
  const { matrix, insights } = computeFlowMetrics(sessions);

  const handleCellHover = (e, d, h, cell) => {
    const rect = e.target.getBoundingClientRect();
    const parentRect = e.target.offsetParent.getBoundingClientRect();
    
    setTooltipPos({
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top - 85
    });

    setHoveredCell({
      day: DAYS[d],
      hour: h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`,
      sessionsCount: cell.sessionsCount,
      solveRate: cell.solveRate,
      averageKpm: cell.averageKpm,
      score: cell.score
    });
  };

  return (
    <div className="cp-flow-section">
      
      {/* Heatmap header */}
      <div className="cp-flow-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="cp-flow-section-title">⚡ CODING FLOW STATE SCANNER</h2>
        
        <button 
          className="cp-radar-btn cp-radar-btn--active"
          onClick={() => setShowReport(true)}
          style={{ background: '#FFAA00', borderColor: '#FFAA00', color: '#0A0A0F', fontWeight: 'bold' }}
        >
          TRANSMIT WEEKLY EMAIL REPORT 📨
        </button>
      </div>

      <div className="cp-flow-layout-grid">
        
        {/* $7 \times 24$ Heatmap Matrix */}
        <div className="cp-flow-heatmap-wrap">
          <div className="cp-flow-grid-container">
            
            {matrix.map((row, d) => (
              <div key={d} className="cp-flow-row">
                <span className="cp-flow-row-label">{DAYS[d]}</span>
                
                <div className="cp-flow-cells">
                  {row.map((cell, h) => {
                    // Buckets 0 to 5 color shade weight
                    const scoreBucket = cell.score === 0 ? 0 : Math.min(5, Math.floor(cell.score / 20) + 1);
                    const hasSubmissions = cell.sessionsCount > 0;

                    return (
                      <div
                        key={h}
                        className="cp-flow-cell"
                        data-score={scoreBucket}
                        onMouseEnter={(e) => handleCellHover(e, d, h, cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {/* Interactive overlay submission dot */}
                        {hasSubmissions && <div className="cp-flow-sub-dot" />}
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}

            {/* Hours labels axis */}
            <div className="cp-flow-hours-axis">
              {Array.from({ length: 24 }).map((_, h) => (
                <span key={h} className="cp-flow-hour-label">
                  {h === 0 ? '12a' : h === 12 ? '12p' : h % 6 === 0 ? `${h > 12 ? h - 12 : h}${h >= 12 ? 'p' : 'a'}` : ''}
                </span>
              ))}
            </div>

          </div>

          {/* Absolute Tooltip Overlay */}
          {hoveredCell && (
            <div 
              className="cp-flow-tooltip"
              style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
            >
              <h4 className="cp-flow-tooltip-title">{hoveredCell.day} {hoveredCell.hour}</h4>
              <p className="cp-flow-tooltip-detail">
                Sessions: <strong>{hoveredCell.sessionsCount}</strong><br />
                Solve Rate: <strong>{hoveredCell.solveRate}%</strong><br />
                Avg Typing: <strong>{hoveredCell.averageKpm} KPM</strong><br />
                Flow index: <strong>{hoveredCell.score}%</strong>
              </p>
            </div>
          )}

        </div>

        {/* Dynamic Pattern Insights Sidebar */}
        <div className="cp-flow-insights">
          <h3 className="cp-flow-insight-title">COGNITIVE FLOW INSIGHTS</h3>
          <ul className="cp-flow-insight-list">
            {insights.map((ins, i) => (
              <li key={i} className="cp-flow-insight-item">{ins}</li>
            ))}
          </ul>
        </div>

      </div>

      {/* Weekly report overlay popups */}
      {showReport && (
        <div className="cp-challenge-modal-backdrop" onClick={() => setShowReport(false)}>
          <div className="cp-challenge-modal" onClick={e => e.stopPropagation()} style={{ borderColor: '#FFAA00', maxWidth: '420px' }}>
            <button className="cp-challenge-modal-close" onClick={() => setShowReport(false)}>✕</button>
            <h3 className="cp-challenge-modal-title" style={{ color: '#FFAA00' }}>// TRANSMITTING WEEKLY FLOW REPORT</h3>
            
            <div style={{ color: '#8888AA', fontSize: '0.78rem', lineHeight: '1.5', margin: '16px 0', fontFamily: 'Share Tech Mono' }}>
              <p style={{ color: '#00FF88', fontWeight: 'bold' }}>✓ REPORT SENT SUCCESSFULLY TO CATCHER QUEUES!</p>
              
              <div style={{ background: '#14131C', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '4px', marginTop: '12px' }}>
                <span style={{ color: '#FFAA00' }}>[WEEKLY SUMMARY SCAN]</span><br />
                • Flow State Active: <strong>4.2 Hours</strong><br />
                • Best Session: <strong>Wednesday (Solved 3 problems in 1hr)</strong><br />
                • Suggestion: <strong>Attempt Hard categories on Tuesday mornings!</strong>
              </div>
            </div>

            <button className="cp-challenge-modal-submit-btn" onClick={() => setShowReport(false)} style={{ background: '#FFAA00' }}>
              DISMISS DISPATCH
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FlowTracker;
