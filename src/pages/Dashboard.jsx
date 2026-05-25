import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auth, db } from '../services/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { getProblems } from '../services/problemService';
import FlowTracker from '../components/FlowTracker';
import './Dashboard.css';

const StatCard = ({ label, value, color, icon }) => (
  <div className={`cp-stat-card cp-stat-card--${color}`}>
    <div className="cp-stat-accent" />
    <div className="cp-stat-icon">{icon}</div>
    <div className={`cp-stat-value cp-stat-value--${color}`}>{value ?? '—'}</div>
    <div className="cp-stat-label">{label}</div>
  </div>
);

const DifficultyBadge = ({ difficulty }) => {
  const map = {
    Easy:   'easy',
    Medium: 'medium',
    Hard:   'hard',
  };
  return (
    <span className={`cp-diff-badge cp-diff-badge--${map[difficulty] ?? 'easy'}`}>
      {difficulty}
    </span>
  );
};

const Dashboard = () => {
  const currentUser = auth.currentUser;

  /* ── User doc ─────────────────────────────────────────── */
  const { data: userData } = useQuery({
    queryKey: ['dashUser', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return null;
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      return snap.exists() ? snap.data() : {};
    },
    enabled: !!currentUser,
  });

  /* ── Problems list ────────────────────────────────────── */
  const { data: problemsData, isLoading: problemsLoading } = useQuery({
    queryKey: ['dashProblems'],
    queryFn: () => getProblems({}, null),
  });

  /* ── Recent submissions ───────────────────────────────── */
  const { data: recentSubs = [] } = useQuery({
    queryKey: ['dashSubs', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return [];
      try {
        const q = query(
          collection(db, 'submissions'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch { return []; }
    },
    enabled: !!currentUser,
  });

  const solvedSet = new Set(userData?.solvedProblems ?? []);
  const problems  = problemsData?.problems ?? [];

  return (
    <div className="cp-dashboard">

      {/* ── Page heading ────────────────────────────────── */}
      <div className="cp-dash-header">
        <h1 className="cp-dash-title">
          <span className="cp-t-pink">OPERATOR</span>{' '}
          <span className="cp-t-green">DASHBOARD</span>
        </h1>
        <p className="cp-dash-sub">
          // SYSTEM STATUS: <span className="cp-t-green">ONLINE</span>
        </p>
      </div>

      {/* ── Stat grid ───────────────────────────────────── */}
      <div className="cp-stats-grid">
        <StatCard
          label="PROBLEMS SOLVED"
          value={userData?.solvedProblems?.length ?? 0}
          color="pink"
          icon="⚡"
        />
        <StatCard
          label="RATING"
          value={userData?.rating ?? 1200}
          color="pink"
          icon="📊"
        />
        <StatCard
          label="STREAK"
          value={`${userData?.streak ?? 0} DAYS`}
          color="green"
          icon="🔥"
        />
        <StatCard
          label="COINS"
          value={userData?.coinsBalance ?? 0}
          color="green"
          icon="🪙"
        />
      </div>

      <FlowTracker />

      {/* ── Main grid: table + sidebar ───────────────────── */}
      <div className="cp-dash-main">

        {/* Problems table */}
        <section className="cp-section">
          <div className="cp-section-header">
            <h2 className="cp-section-title">PROBLEM SET</h2>
            <Link to="/problems" className="cp-view-all">VIEW ALL →</Link>
          </div>

          {problemsLoading ? (
            <p className="cp-loading-text">FETCHING DATA...</p>
          ) : (
            <div className="cp-table-wrap">
              <table className="cp-table">
                <thead>
                  <tr>
                    <th className="cp-th">#</th>
                    <th className="cp-th">TITLE</th>
                    <th className="cp-th">DIFFICULTY</th>
                    <th className="cp-th">TOPICS</th>
                    <th className="cp-th">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {problems.slice(0, 10).map(prob => {
                    const solved = solvedSet.has(prob.id);
                    return (
                      <tr key={prob.id} className="cp-tr">
                        <td className="cp-td cp-td--num">{prob.number}</td>
                        <td className="cp-td">
                          <Link to={`/problems/${prob.id}`} className="cp-prob-link">
                            {prob.title}
                          </Link>
                        </td>
                        <td className="cp-td">
                          <DifficultyBadge difficulty={prob.difficulty} />
                        </td>
                        <td className="cp-td">
                          <div className="cp-topics">
                            {prob.topics?.slice(0, 2).map(t => (
                              <span key={t} className="cp-topic-chip">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="cp-td">
                          <span className={`cp-status-dot ${solved ? 'cp-status-dot--solved' : ''}`} title={solved ? 'Solved' : 'Unsolved'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="cp-sidebar">

          {/* Recent submissions */}
          <section className="cp-section cp-section--sidebar">
            <div className="cp-section-header">
              <h2 className="cp-section-title">RECENT ACTIVITY</h2>
            </div>
            {recentSubs.length === 0 ? (
              <p className="cp-empty">NO SUBMISSIONS YET</p>
            ) : (
              <ul className="cp-activity-list">
                {recentSubs.map(sub => (
                  <li key={sub.id} className="cp-activity-item">
                    <span className={`cp-activity-verdict cp-activity-verdict--${sub.verdict === 'Accepted' ? 'ok' : 'fail'}`}>
                      {sub.verdict === 'Accepted' ? 'AC' : 'WA'}
                    </span>
                    <span className="cp-activity-prob">{sub.problemId}</span>
                    <span className="cp-activity-lang">{sub.language}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quick links */}
          <section className="cp-section cp-section--sidebar">
            <h2 className="cp-section-title">QUICK ACCESS</h2>
            <div className="cp-quick-links">
              <Link to="/problems" className="cp-quick-btn cp-quick-btn--pink">⚡ PROBLEMS</Link>
              <Link to="/courses"  className="cp-quick-btn cp-quick-btn--green">📚 COURSES</Link>
              {currentUser && (
                <Link to={`/profile/${currentUser.uid}`} className="cp-quick-btn cp-quick-btn--pink">👤 PROFILE</Link>
              )}
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
