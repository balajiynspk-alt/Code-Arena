import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FlowWave from '../components/Background/FlowWave';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedProblem, setSelectedProblem] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleStart = () => {
    if (currentUser) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleExplore = () => {
    navigate('/problems');
  };

  // ── PROBLEMS DATA FOR MOCK EDITOR ──
  const problems = [
    {
      num: '001',
      name: 'Two Sum',
      diff: 'Easy',
      diffClass: 'd-easy',
      checked: true,
      verdict: { runtime: '48ms', memory: '14.2 MB', beats: '96%' },
      code: [
        { ln: 1, text: <><span className="cm"># Hash map — O(n) time</span></> },
        { ln: 2, text: <><span className="kw">class </span><span className="fn">Solution</span>:</> },
        { ln: 3, text: <>&nbsp;&nbsp;<span className="kw">def </span><span className="fn">twoSum</span>(self, nums, target):</> },
        { ln: 4, text: <>&nbsp;&nbsp;&nbsp;&nbsp;seen = {"{}"}</> },
        { ln: 5, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">for</span> i, n <span className="kw">in</span> <span className="fn">enumerate</span>(nums):</> },
        { ln: 6, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;diff = target - n</> },
        { ln: 7, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> diff <span className="kw">in</span> seen:</> },
        { ln: 8, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">return</span> [seen[diff], i]</> },
        { ln: 9, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;seen[n] = i</> }
      ]
    },
    {
      num: '003',
      name: 'Longest Substring Without Repeating',
      diff: 'Medium',
      diffClass: 'd-med',
      checked: false,
      verdict: { runtime: '56ms', memory: '14.4 MB', beats: '92%' },
      code: [
        { ln: 1, text: <><span className="cm"># Sliding Window - O(n)</span></> },
        { ln: 2, text: <><span className="kw">class </span><span className="fn">Solution</span>:</> },
        { ln: 3, text: <>&nbsp;&nbsp;<span className="kw">def </span><span className="fn">lengthOfLongestSubstring</span>(self, s: <span className="kw">str</span>) -&gt; <span className="kw">int</span>:</> },
        { ln: 4, text: <>&nbsp;&nbsp;&nbsp;&nbsp;char_map = {"{}"}</> },
        { ln: 5, text: <>&nbsp;&nbsp;&nbsp;&nbsp;left = max_len = <span className="num">0</span></> },
        { ln: 6, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">for</span> right, char <span className="kw">in</span> <span className="fn">enumerate</span>(s):</> },
        { ln: 7, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> char <span className="kw">in</span> char_map <span className="kw">and</span> char_map[char] &gt;= left:</> },
        { ln: 8, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;left = char_map[char] + <span className="num">1</span></> },
        { ln: 9, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;char_map[char] = right</> },
        { ln: 10, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;max_len = <span className="fn">max</span>(max_len, right - left + <span className="num">1</span>)</> },
        { ln: 11, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">return</span> max_len</> }
      ]
    },
    {
      num: '023',
      name: 'Merge K Sorted Lists',
      diff: 'Hard',
      diffClass: 'd-hard',
      checked: true,
      verdict: { runtime: '72ms', memory: '17.8 MB', beats: '98%' },
      code: [
        { ln: 1, text: <><span className="cm"># Min Heap - O(N log k)</span></> },
        { ln: 2, text: <><span className="kw">import</span> heapq</> },
        { ln: 3, text: <><span className="kw">class </span><span className="fn">Solution</span>:</> },
        { ln: 4, text: <>&nbsp;&nbsp;<span className="kw">def </span><span className="fn">mergeKLists</span>(self, lists):</> },
        { ln: 5, text: <>&nbsp;&nbsp;&nbsp;&nbsp;heap = []</> },
        { ln: 6, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">for</span> i, lst <span className="kw">in</span> <span className="fn">enumerate</span>(lists):</> },
        { ln: 7, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> lst: heapq.heappush(heap, (lst.val, i, lst))</> },
        { ln: 8, text: <>&nbsp;&nbsp;&nbsp;&nbsp;dummy = ListNode(<span className="num">0</span>)</> },
        { ln: 9, text: <>&nbsp;&nbsp;&nbsp;&nbsp;curr = dummy</> },
        { ln: 10, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">while</span> heap:</> },
        { ln: 11, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;val, i, node = heapq.heappop(heap)</> },
        { ln: 12, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;curr.next = node</> },
        { ln: 13, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;curr = curr.next</> },
        { ln: 14, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> node.next: heapq.heappush(heap, (node.next.val, i, node.next))</> },
        { ln: 15, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">return</span> dummy.next</> }
      ]
    },
    {
      num: '042',
      name: 'Trapping Rain Water',
      diff: 'Hard',
      diffClass: 'd-hard',
      checked: false,
      verdict: { runtime: '64ms', memory: '15.6 MB', beats: '95%' },
      code: [
        { ln: 1, text: <><span className="cm"># Two Pointers - O(n)</span></> },
        { ln: 2, text: <><span className="kw">class </span><span className="fn">Solution</span>:</> },
        { ln: 3, text: <>&nbsp;&nbsp;<span className="kw">def </span><span className="fn">trap</span>(self, height):</> },
        { ln: 4, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> <span className="kw">not</span> height: <span className="kw">return</span> <span className="num">0</span></> },
        { ln: 5, text: <>&nbsp;&nbsp;&nbsp;&nbsp;l, r = <span className="num">0</span>, <span className="fn">len</span>(height) - <span className="num">1</span></> },
        { ln: 6, text: <>&nbsp;&nbsp;&nbsp;&nbsp;l_max, r_max = height[l], height[r]</> },
        { ln: 7, text: <>&nbsp;&nbsp;&nbsp;&nbsp;res = <span className="num">0</span></> },
        { ln: 8, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">while</span> l &lt; r:</> },
        { ln: 9, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> l_max &lt; r_max:</> },
        { ln: 10, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;l += <span className="num">1</span>; l_max = <span className="fn">max</span>(l_max, height[l])</> },
        { ln: 11, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;res += l_max - height[l]</> },
        { ln: 12, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">else</span>:</> },
        { ln: 13, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;r -= <span className="num">1</span>; r_max = <span className="fn">max</span>(r_max, height[r])</> },
        { ln: 14, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;res += r_max - height[r]</> },
        { ln: 15, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">return</span> res</> }
      ]
    },
    {
      num: '146',
      name: 'LRU Cache',
      diff: 'Medium',
      diffClass: 'd-med',
      checked: true,
      verdict: { runtime: '112ms', memory: '23.4 MB', beats: '97%' },
      code: [
        { ln: 1, text: <><span className="cm"># Ordered Map - O(1)</span></> },
        { ln: 2, text: <><span className="kw">from</span> collections <span className="kw">import</span> OrderedDict</> },
        { ln: 3, text: <><span className="kw">class </span><span className="fn">LRUCache</span>:</> },
        { ln: 4, text: <>&nbsp;&nbsp;<span className="kw">def </span><span className="fn">__init__</span>(self, capacity: <span className="kw">int</span>):</> },
        { ln: 5, text: <>&nbsp;&nbsp;&nbsp;&nbsp;self.cap = capacity</> },
        { ln: 6, text: <>&nbsp;&nbsp;&nbsp;&nbsp;self.cache = OrderedDict()</> },
        { ln: 7, text: <>&nbsp;&nbsp;<span className="kw">def </span><span className="fn">get</span>(self, key: <span className="kw">int</span>) -&gt; <span className="kw">int</span>:</> },
        { ln: 8, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> key <span className="kw">not in</span> self.cache: <span className="kw">return</span> -<span className="num">1</span></> },
        { ln: 9, text: <>&nbsp;&nbsp;&nbsp;&nbsp;self.cache.move_to_end(key)</> },
        { ln: 10, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">return</span> self.cache[key]</> },
        { ln: 11, text: <>&nbsp;&nbsp;<span className="kw">def </span><span className="fn">put</span>(self, key: <span className="kw">int</span>, val: <span className="kw">int</span>) -&gt; <span className="kw">None</span>:</> },
        { ln: 12, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> key <span className="kw">in</span> self.cache: self.cache.move_to_end(key)</> },
        { ln: 13, text: <>&nbsp;&nbsp;&nbsp;&nbsp;self.cache[key] = val</> },
        { ln: 14, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> <span className="fn">len</span>(self.cache) &gt; self.cap: self.cache.popitem(last=<span className="kw">False</span>)</> }
      ]
    },
    {
      num: '200',
      name: 'Number of Islands',
      diff: 'Medium',
      diffClass: 'd-med',
      checked: false,
      verdict: { runtime: '68ms', memory: '16.2 MB', beats: '94%' },
      code: [
        { ln: 1, text: <><span className="cm"># DFS - Grid Traversal</span></> },
        { ln: 2, text: <><span className="kw">class </span><span className="fn">Solution</span>:</> },
        { ln: 3, text: <>&nbsp;&nbsp;<span className="kw">def </span><span className="fn">numIslands</span>(self, grid):</> },
        { ln: 4, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> <span className="kw">not</span> grid: <span className="kw">return</span> <span className="num">0</span></> },
        { ln: 5, text: <>&nbsp;&nbsp;&nbsp;&nbsp;count = <span className="num">0</span></> },
        { ln: 6, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">for</span> r <span className="kw">in</span> <span className="fn">range</span>(<span className="fn">len</span>(grid)):</> },
        { ln: 7, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">for</span> c <span className="kw">in</span> <span className="fn">range</span>(<span className="fn">len</span>(grid[<span className="num">0</span>])):</> },
        { ln: 8, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> grid[r][c] == <span className="str">'1'</span>:</> },
        { ln: 9, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;self.dfs(grid, r, c)</> },
        { ln: 10, text: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;count += <span className="num">1</span></> },
        { ln: 11, text: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">return</span> count</> }
      ]
    }
  ];

  // FlowWave handles Three.js wireframe background with postprocessing

  // ── SCROLL REVEAL OBSERVER ──
  useEffect(() => {
    const reveals = document.querySelectorAll('.landing-page-root .reveal');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ── LIVE DYNAMIC COUNTERS FOR BILLION-DOLLAR STARTUP FEEL ──
  const [liveStats, setLiveStats] = useState({
    problemsAvailable: 2400,
    activeStudents: 18400,
    submissionsToday: 94200,
    battlesFought: 31700
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveStats(prev => ({
        problemsAvailable: prev.problemsAvailable + (Math.random() > 0.95 ? 1 : 0),
        activeStudents: Math.max(18000, prev.activeStudents + Math.floor(Math.random() * 5) - 2),
        submissionsToday: prev.submissionsToday + Math.floor(Math.random() * 3) + 1,
        battlesFought: prev.battlesFought + (Math.random() > 0.7 ? 1 : 0)
      }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const currentProb = problems[selectedProblem];

  return (
    <div className="landing-page-root" style={{ background: 'transparent' }}>
      <FlowWave />

      {/* Scroll hint */}
      <div style={{
        position:'fixed', bottom:'24px', left:'50%',
        transform:'translateX(-50%)',
        fontSize:'11px', letterSpacing:'2px',
        color:'rgba(0,255,168,0.4)',
        textTransform:'uppercase', zIndex:3,
        fontFamily:'Share Tech Mono, monospace',
        pointerEvents:'none',
      }}>
        scroll ↓
      </div>

      {/* NAVBAR */}
      <nav>
        <a href="#" className="nav-logo" onClick={(e) => e.preventDefault()}>
          <div className="nav-logo-icon">CA</div>
          CODE<span>ARENA</span>
        </a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#problems">Problems</a></li>
          <li><a href="#courses">Courses</a></li>
          <li><a href="#community">Community</a></li>
        </ul>
        <button className="nav-cta" onClick={handleStart}>
          {currentUser ? 'Dashboard →' : 'Start Free →'}
        </button>

        <button 
          className={`landing-menu-toggle ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </nav>

      {/* Mobile Drawer */}
      <div className={`landing-mobile-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <span className="drawer-logo">// CODEARENA</span>
          <button className="drawer-close" onClick={() => setMenuOpen(false)}>×</button>
        </div>
        <ul className="drawer-links">
          <li><a href="#features" onClick={() => setMenuOpen(false)}>Features</a></li>
          <li><a href="#problems" onClick={() => setMenuOpen(false)}>Problems</a></li>
          <li><a href="#courses" onClick={() => setMenuOpen(false)}>Courses</a></li>
          <li><a href="#community" onClick={() => setMenuOpen(false)}>Community</a></li>
        </ul>
        <button className="drawer-cta" onClick={() => { setMenuOpen(false); handleStart(); }}>
          {currentUser ? 'Dashboard →' : 'Start Free →'}
        </button>
      </div>

      {/* HERO */}
      <section className="hero" style={{ maxWidth: '100%', paddingTop: '100px', position: 'relative', zIndex: 2, background: 'transparent' }}>
        <div className="hero-pill">
          <div className="hero-pill-dot"></div>
          Now with AI Ghost Mentor &amp; Live 1v1 Battles
        </div>

        <h1 className="hero-title">
          <span className="line1">Compete. Learn.</span>
          <span className="line2">Dominate Coding</span>
          <span className="line3">Interviews.</span>
        </h1>

        <p className="hero-sub">
          Practice 2,400+ DSA problems, fight live 1v1 battles, take structured courses, and crush every placement test — all in one cyberpunk arena built for serious coders.
        </p>

        <div className="hero-btns">
          <button className="btn-primary" onClick={handleStart}>
            {currentUser ? 'Go to Dashboard' : 'Start Competing'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <button className="btn-secondary" onClick={handleExplore}>View Problems</button>
        </div>

        <div className="hero-stats">
          <div className="stat-pill" onClick={handleExplore}>
            <span className="stat-pill-icon">&lt;/&gt;</span>
            <span><strong>2,400+</strong> DSA Problems</span>
          </div>
          <div className="stat-pill" onClick={handleStart}>
            <span className="stat-pill-icon">⚔</span>
            <span><strong>Live</strong> 1v1 Battles</span>
          </div>
          <div className="stat-pill" onClick={handleStart}>
            <span className="stat-pill-icon">▲</span>
            <span><strong>AI</strong> Ghost Mentor</span>
          </div>
          <div className="stat-pill" onClick={handleStart}>
            <span className="stat-pill-icon">◉</span>
            <span><strong>GATE</strong> &amp; Placement Prep</span>
          </div>
        </div>

        <div className="scroll-ind">
          <div className="scroll-line"></div>
          SCROLL
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap" style={{ position: 'relative', zIndex: 2, background: 'transparent' }}>
        <div className="ticker-track">
          <span>Two Sum</span> · Arrays · <span>Merge Intervals</span> · Graphs · <span>Coin Change</span> · DP · <span>LRU Cache</span> · Design · <span>Binary Search</span> · Trees · <span>Trapping Rain Water</span> · Stack · <span>Dijkstra</span> · Shortest Path · <span>N-Queens</span> · Backtracking · <span>KMP Algorithm</span> · Strings ·&nbsp;
          <span>Two Sum</span> · Arrays · <span>Merge Intervals</span> · Graphs · <span>Coin Change</span> · DP · <span>LRU Cache</span> · Design · <span>Binary Search</span> · Trees · <span>Trapping Rain Water</span> · Stack · <span>Dijkstra</span> · Shortest Path · <span>N-Queens</span> · Backtracking · <span>KMP Algorithm</span> · Strings ·
        </div>
      </div>

      {/* STATS */}
      <div className="stats-section" style={{ position: 'relative', zIndex: 2, background: 'transparent' }}>
        <div className="stats-row">
          <div className="reveal visible">
            <div className="stat-item-num" id="stat1">{liveStats.problemsAvailable.toLocaleString()}+</div>
            <div className="stat-item-lbl">Problems Available</div>
          </div>
          <div className="reveal visible" style={{ transitionDelay: '0.1s' }}>
            <div className="stat-item-num" id="stat2">{liveStats.activeStudents.toLocaleString()}+</div>
            <div className="stat-item-lbl">Active Students</div>
          </div>
          <div className="reveal visible" style={{ transitionDelay: '0.2s' }}>
            <div className="stat-item-num" id="stat3">{liveStats.submissionsToday.toLocaleString()}</div>
            <div className="stat-item-lbl">Submissions Today</div>
          </div>
          <div className="reveal visible" style={{ transitionDelay: '0.3s' }}>
            <div className="stat-item-num" id="stat4">{liveStats.battlesFought.toLocaleString()}+</div>
            <div className="stat-item-lbl">Battles Fought</div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" style={{ position: 'relative', zIndex: 2, background: 'transparent' }}>
        <div className="section-eyebrow">Platform Features</div>
        <h2 className="section-title reveal">Everything you need to<br /><span style={{ color: 'var(--pk)' }}>crack any coding interview</span></h2>
        <p className="section-sub reveal">From your first Easy problem to beating a Google interviewer — CodeArena has the tools, the community, and the AI to get you there.</p>

        <div className="feat-grid">
          <div className="feat-card reveal">
            <div className="feat-icon">&lt;/&gt;</div>
            <div className="feat-title">Problem Arena</div>
            <div className="feat-desc">2,400+ LeetCode problems + aptitude + GATE questions. Filter by topic, difficulty, and company. Monaco editor with Python, Java, C++, JS support.</div>
          </div>
          <div className="feat-card green reveal" style={{ transitionDelay: '0.1s' }}>
            <div className="feat-icon">⚔</div>
            <div className="feat-title">Live 1v1 Battles</div>
            <div className="feat-desc">Challenge any online user to a real-time coding duel. Same problem, live progress visible, first to Accepted wins. Rating updated instantly with Elo.</div>
          </div>
          <div className="feat-card amber reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="feat-icon">▲</div>
            <div className="feat-title">AI Ghost Mentor</div>
            <div className="feat-desc">Gemini AI silently watches you code. Detects when you're stuck before you ask. Whispers contextual hints without giving away the answer.</div>
          </div>
          <div className="feat-card cyan reveal" style={{ transitionDelay: '0.3s' }}>
            <div className="feat-icon">◉</div>
            <div className="feat-title">Algorithm Visualizer</div>
            <div className="feat-desc">Watch Bubble Sort, Binary Search, BFS, and DP animate step-by-step in your browser. See the code highlight in sync with the animation.</div>
          </div>
          <div className="feat-card green reveal" style={{ transitionDelay: '0.4s' }}>
            <div className="feat-icon">★</div>
            <div className="feat-title">RPG Skill Tree</div>
            <div className="feat-desc">Unlock DSA topics like an RPG — solve problems to gain XP, level up, and unlock harder concepts. Hexagonal node tree with animated flows.</div>
          </div>
          <div className="feat-card reveal" style={{ transitionDelay: '0.5s' }}>
            <div className="feat-icon">♦</div>
            <div className="feat-title">Interview Simulator</div>
            <div className="feat-desc">Gemini AI acts as a FAANG interviewer. Asks follow-ups, gives hints, scores your communication, and gives a post-interview report card.</div>
          </div>
        </div>
      </section>

      {/* PROBLEM PREVIEW */}
      <section id="problems" style={{ paddingTop: '3rem', position: 'relative', zIndex: 2, background: 'transparent' }}>
        <div className="section-eyebrow reveal">Problem Library</div>
        <h2 className="section-title reveal">2,400+ problems.<br /><span style={{ color: 'var(--gn)' }}>Zero excuses.</span></h2>

        <div className="problem-showcase">
          <div className="problem-list reveal">
            {problems.map((prob, index) => (
              <div
                key={prob.num}
                className={`prob-item ${selectedProblem === index ? 'active' : ''}`}
                onClick={() => setSelectedProblem(index)}
              >
                <span className="prob-num">{prob.num}</span>
                {prob.checked ? (
                  <span className="prob-check">✓</span>
                ) : (
                  <span style={{ width: '12px', display: 'inline-block' }}></span>
                )}
                <span className="prob-name">{prob.name}</span>
                <span className={`prob-diff ${prob.diffClass}`}>{prob.diff}</span>
              </div>
            ))}
          </div>

          <div className="reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="editor-mock">
              <div className="editor-topbar">
                <div className="editor-dot" style={{ backgroundColor: '#FF5F57' }}></div>
                <div className="editor-dot" style={{ backgroundColor: '#FEBC2E' }}></div>
                <div className="editor-dot" style={{ backgroundColor: '#28C840' }}></div>
                <span className="editor-tab">Python 3</span>
                <span className="editor-langsel">{currentProb.name} · {currentProb.diff}</span>
              </div>
              <div className="editor-body">
                {currentProb.code.map((line) => (
                  <div className="code-line" key={line.ln}>
                    <span className="ln">{line.ln}</span>
                    {line.text}
                  </div>
                ))}
              </div>
              <div className="editor-verdict">
                <span className="verdict-badge">✓ ACCEPTED</span>
                <span className="verdict-meta">
                  Runtime: <span>{currentProb.verdict.runtime}</span> · Memory: <span>{currentProb.verdict.memory}</span> · Beats: <span>{currentProb.verdict.beats}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UNIQUE NUMBERS */}
      <section style={{ paddingTop: '2rem', paddingBottom: '2rem', position: 'relative', zIndex: 2, background: 'transparent' }}>
        <div className="section-eyebrow reveal">Why CodeArena</div>
        <h2 className="section-title reveal" style={{ marginBottom: '2rem' }}>Numbers that<br /><span style={{ color: 'var(--pk)' }}>speak for themselves</span></h2>
        <div className="unique-strip reveal">
          <div className="uniq-card"><div className="uniq-num">2.4K+</div><div className="uniq-label">DSA &amp; Placement Problems</div></div>
          <div className="uniq-card"><div className="uniq-num">15+</div><div className="uniq-label">Unique AI-Powered Features</div></div>
          <div className="uniq-card"><div className="uniq-num">7</div><div className="uniq-label">Languages Supported</div></div>
          <div className="uniq-card"><div className="uniq-num">∞</div><div className="uniq-label">AI-Generated Problem Remixes</div></div>
          <div className="uniq-card"><div className="uniq-num">24/7</div><div className="uniq-label">AI Ghost Mentor Always On</div></div>
          <div className="uniq-card"><div className="uniq-num">0₹</div><div className="uniq-label">Free Forever for Students</div></div>
        </div>
      </section>

      {/* COURSES */}
      <section id="courses" style={{ position: 'relative', zIndex: 2, background: 'transparent' }}>
        <div className="section-eyebrow reveal">Learning Tracks</div>
        <h2 className="section-title reveal">Structured courses.<br /><span style={{ color: 'var(--gn)' }}>Real results.</span></h2>
        <p className="section-sub reveal">From DSA zero to placement hero — each course is a guided path with videos, quizzes, and practice problems built in.</p>

        <div className="course-grid">
          <div className="course-card reveal" onClick={() => navigate('/courses')}>
            <div className="course-thumb" style={{ borderColor: 'rgba(255,45,120,.2)' }}>⚡</div>
            <div className="course-track" style={{ color: 'var(--pk)' }}>DSA Track</div>
            <div className="course-name">Arrays &amp; Strings Mastery</div>
            <div className="course-meta"><span>48 lessons</span><span style={{ color: 'var(--gn)' }}>72% complete</span></div>
            <div className="course-bar"><div className="course-bar-fill" style={{ width: '72%', background: 'var(--gn)' }}></div></div>
          </div>
          <div className="course-card reveal" style={{ transitionDelay: '0.1s' }} onClick={() => navigate('/courses')}>
            <div className="course-thumb" style={{ borderColor: 'rgba(0,255,136,.2)' }}>🌲</div>
            <div className="course-track" style={{ color: 'var(--gn)' }}>DSA Track</div>
            <div className="course-name">Trees, Graphs &amp; BFS/DFS</div>
            <div className="course-meta"><span>36 lessons</span><span style={{ color: 'var(--txd)' }}>Not started</span></div>
            <div className="course-bar"><div className="course-bar-fill" style={{ width: '0%', background: 'var(--gn)' }}></div></div>
          </div>
          <div className="course-card reveal" style={{ transitionDelay: '0.2s' }} onClick={() => navigate('/courses')}>
            <div className="course-thumb" style={{ borderColor: 'rgba(255,170,0,.2)' }}>🎯</div>
            <div className="course-track" style={{ color: 'var(--am)' }}>Interview Prep</div>
            <div className="course-name">System Design Fundamentals</div>
            <div className="course-meta"><span>32 lessons</span><span style={{ color: 'var(--pk)' }}>30% complete</span></div>
            <div className="course-bar"><div className="course-bar-fill" style={{ width: '30%', background: 'var(--pk)' }}></div></div>
          </div>
          <div className="course-card reveal" style={{ transitionDelay: '0.3s' }} onClick={() => navigate('/courses')}>
            <div className="course-thumb" style={{ borderColor: 'rgba(0,204,255,.2)' }}>📐</div>
            <div className="course-track" style={{ color: 'var(--cy)' }}>GATE Prep</div>
            <div className="course-name">OS, Networks &amp; DBMS</div>
            <div className="course-meta"><span>40 lessons</span><span style={{ color: 'var(--txd)' }}>Not started</span></div>
            <div className="course-bar"><div className="course-bar-fill" style={{ width: '0%', background: 'var(--cy)' }}></div></div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <div className="social-section" id="community" style={{ position: 'relative', zIndex: 2, background: 'transparent' }}>
        <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '1px', background: 'var(--pk)' }}></div>
          Student Reviews
          <div style={{ width: '32px', height: '1px', background: 'var(--pk)' }}></div>
        </div>
        <h2 className="section-title reveal">Used by students at<br /><span style={{ color: 'var(--pk)' }}>top colleges across India</span></h2>

        <div className="testimonials">
          <div className="testi-card reveal">
            <div className="testi-quote">The 1v1 battle mode is addictive. I solved more problems in one week than in the previous month. The AI hint system actually teaches you to think, not just copy solutions.</div>
            <div className="testi-user">
              <div className="testi-avatar" style={{ background: 'rgba(255,45,120,.15)', color: 'var(--pk)' }}>AK</div>
              <div>
                <div className="testi-name">Arjun Kumar</div>
                <div className="testi-role">IIT Bombay · Placed at Google</div>
              </div>
            </div>
          </div>
          <div className="testi-card reveal" style={{ transitionDelay: '0.1s' }}>
            <div className="testi-quote">The Algorithm Visualizer changed how I understand recursion and DP. I'd been struggling for weeks. Watching the animation made everything click in 10 minutes.</div>
            <div className="testi-user">
              <div className="testi-avatar" style={{ background: 'rgba(0,255,136,.1)', color: 'var(--gn)' }}>PS</div>
              <div>
                <div className="testi-name">Priya Sharma</div>
                <div className="testi-role">NIT Warangal · Placed at Amazon</div>
              </div>
            </div>
          </div>
          <div className="testi-card reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="testi-quote">College Guild Wars made my entire batch start practicing. There's a healthy competition now. We all push each other to solve more. Nothing else motivates a group like this.</div>
            <div className="testi-user">
              <div className="testi-avatar" style={{ background: 'rgba(255,170,0,.1)', color: 'var(--am)' }}>RV</div>
              <div>
                <div className="testi-name">Ravi Varma</div>
                <div className="testi-role">BITS Pilani · Placed at Microsoft</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="cta-section" style={{ position: 'relative', zIndex: 2, background: 'rgba(7, 7, 16, 0.4)' }}>
        <div className="cta-glow"></div>
        <div className="section-eyebrow" style={{ justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{ width: '32px', height: '1px', background: 'var(--pk)' }}></div>
          Get Started Free
          <div style={{ width: '32px', height: '1px', background: 'var(--pk)' }}></div>
        </div>
        <h2 className="cta-title reveal">Ready to enter<br />the <span>Arena</span>?</h2>
        <p className="cta-sub reveal">Join thousands of students already training for FAANG, GATE, and placement season. Free forever for students.</p>
        <div className="cta-btns reveal">
          <button className="btn-primary" onClick={handleStart}>
            {currentUser ? 'Go to Dashboard' : 'Create Free Account'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <button className="btn-secondary" onClick={handleExplore}>Explore Problems</button>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 2, background: 'transparent' }}>
        <div className="footer-logo">CODE<span>ARENA</span></div>
        <ul className="footer-links">
          <li><a href="#problems">Problems</a></li>
          <li><a href="#courses">Courses</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#community">Community</a></li>
        </ul>
        <div className="footer-copy">© 2025 CodeArena · Built for students, by students</div>
      </footer>
    </div>
  );
};

export default Landing;
