import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canvasRef = useRef(null);
  const [selectedProblem, setSelectedProblem] = useState(0);

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

  // ── CANVAS ANIMATED GRID ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0;
    const COLS = 28, ROWS = 16;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function drawGrid() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.width, H = canvas.height;
      const cw = W / COLS, ch = H / ROWS;

      ctx.strokeStyle = 'rgba(0,255,136,0.18)';
      ctx.lineWidth = 0.6;

      // Vertical lines
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        for (let r = 0; r <= ROWS; r++) {
          const bx = c * cw;
          const by = r * ch;
          const waveStrength = Math.sin(r / ROWS * Math.PI) * 60;
          const wave = Math.sin(c * 0.3 + r * 0.2 + time) * waveStrength * 0.25;
          const wave2 = Math.cos(c * 0.15 + time * 0.7) * waveStrength * 0.15;
          const x = bx + wave;
          const y = by + wave2;
          if (r === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Horizontal lines
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        for (let c = 0; c <= COLS; c++) {
          const bx = c * cw;
          const by = r * ch;
          const waveStrength = Math.sin(r / ROWS * Math.PI) * 60;
          const wave = Math.sin(c * 0.3 + r * 0.2 + time) * waveStrength * 0.25;
          const wave2 = Math.cos(c * 0.15 + time * 0.7) * waveStrength * 0.15;
          const x = bx + wave;
          const y = by + wave2;
          if (c === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Subtle glow nodes at intersections
      for (let c = 0; c <= COLS; c += 4) {
        for (let r = 0; r <= ROWS; r += 4) {
          const bx = c * cw;
          const by = r * ch;
          const waveStrength = Math.sin(r / ROWS * Math.PI) * 60;
          const wave = Math.sin(c * 0.3 + r * 0.2 + time) * waveStrength * 0.25;
          const wave2 = Math.cos(c * 0.15 + time * 0.7) * waveStrength * 0.15;
          const x = bx + wave;
          const y = by + wave2;
          const glow = (Math.sin(c + r + time * 2) + 1) / 2;
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,45,120,${glow * 0.5})`;
          ctx.fill();
        }
      }

      time += 0.008;
      animationId = requestAnimationFrame(drawGrid);
    }

    drawGrid();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

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

  // ── COUNT UP STATS ON SCROLL ──
  useEffect(() => {
    const statsData = [
      { id: 'stat1', target: 2400, suffix: '+' },
      { id: 'stat2', target: 18400, suffix: '+' },
      { id: 'stat3', target: 94200, suffix: '+' },
      { id: 'stat4', target: 31700, suffix: '+' },
    ];

    function countUp(el, target, suffix, duration = 1800) {
      const start = performance.now();
      let animId;
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const val = Math.floor(ease * target);
        el.textContent = val.toLocaleString() + suffix;
        if (t < 1) {
          animId = requestAnimationFrame(tick);
        }
      }
      animId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animId);
    }

    const statsSection = document.querySelector('.landing-page-root .stats-section');
    let counted = false;
    const cleanups = [];
    const statsObs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !counted) {
        counted = true;
        statsData.forEach(s => {
          const el = document.getElementById(s.id);
          if (el) {
            const cleanup = countUp(el, s.target, s.suffix);
            cleanups.push(cleanup);
          }
        });
      }
    }, { threshold: 0.3 });

    if (statsSection) {
      statsObs.observe(statsSection);
    }

    return () => {
      statsObs.disconnect();
      cleanups.forEach(c => c());
    };
  }, []);

  const currentProb = problems[selectedProblem];

  return (
    <div className="landing-page-root">
      <canvas id="grid-canvas" ref={canvasRef}></canvas>

      {/* NAVBAR */}
      <nav>
        <a href="#" className="nav-logo" onClick={(e) => e.preventDefault()}>
          <div className="nav-logo-icon">CA</div>
          CODE<span>ARENA</span>
        </a>
        <ul class="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#problems">Problems</a></li>
          <li><a href="#courses">Courses</a></li>
          <li><a href="#community">Community</a></li>
        </ul>
        <button className="nav-cta" onClick={handleStart}>
          {currentUser ? 'Dashboard →' : 'Start Free →'}
        </button>
      </nav>

      {/* HERO */}
      <section className="hero" style={{ maxWidth: '100%', paddingTop: '100px' }}>
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
            <span className="stat-pill-icon">⟨/⟩</span>
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
      <div className="ticker-wrap">
        <div className="ticker-track">
          <span>Two Sum</span> · Arrays · <span>Merge Intervals</span> · Graphs · <span>Coin Change</span> · DP · <span>LRU Cache</span> · Design · <span>Binary Search</span> · Trees · <span>Trapping Rain Water</span> · Stack · <span>Dijkstra</span> · Shortest Path · <span>N-Queens</span> · Backtracking · <span>KMP Algorithm</span> · Strings ·&nbsp;
          <span>Two Sum</span> · Arrays · <span>Merge Intervals</span> · Graphs · <span>Coin Change</span> · DP · <span>LRU Cache</span> · Design · <span>Binary Search</span> · Trees · <span>Trapping Rain Water</span> · Stack · <span>Dijkstra</span> · Shortest Path · <span>N-Queens</span> · Backtracking · <span>KMP Algorithm</span> · Strings ·
        </div>
      </div>

      {/* STATS */}
      <div className="stats-section">
        <div className="stats-row">
          <div className="reveal">
            <div className="stat-item-num" id="stat1">0</div>
            <div className="stat-item-lbl">Problems Available</div>
          </div>
          <div className="reveal" style={{ transitionDelay: '0.1s' }}>
            <div className="stat-item-num" id="stat2">0</div>
            <div className="stat-item-lbl">Active Students</div>
          </div>
          <div className="reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="stat-item-num" id="stat3">0</div>
            <div className="stat-item-lbl">Submissions Today</div>
          </div>
          <div className="reveal" style={{ transitionDelay: '0.3s' }}>
            <div className="stat-item-num" id="stat4">0</div>
            <div className="stat-item-lbl">Battles Fought</div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features">
        <div className="section-eyebrow">Platform Features</div>
        <h2 className="section-title reveal">Everything you need to<br /><span style={{ color: 'var(--pk)' }}>crack any coding interview</span></h2>
        <p className="section-sub reveal">From your first Easy problem to beating a Google interviewer — CodeArena has the tools, the community, and the AI to get you there.</p>

        <div className="feat-grid">
          <div className="feat-card reveal">
            <div className="feat-icon">⟨/⟩</div>
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
      <section id="problems" style={{ paddingTop: '3rem' }}>
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
      <section style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="section-eyebrow reveal">Why CodeArena</div>
        <h2 className="section-title reveal" style={{ marginBottom: '2rem' }}>Numbers that<br /><span style={{ color: 'var(--pk)' }}>speak for themselves</span></h2>
        <div className="unique-strip reveal">
          <div className="uniq-card"><div className="uniq-num">2.4K+</div><div class="uniq-label">DSA &amp; Placement Problems</div></div>
          <div className="uniq-card"><div className="uniq-num">15+</div><div class="uniq-label">Unique AI-Powered Features</div></div>
          <div className="uniq-card"><div className="uniq-num">7</div><div class="uniq-label">Languages Supported</div></div>
          <div className="uniq-card"><div className="uniq-num">∞</div><div class="uniq-label">AI-Generated Problem Remixes</div></div>
          <div className="uniq-card"><div className="uniq-num">24/7</div><div class="uniq-label">AI Ghost Mentor Always On</div></div>
          <div className="uniq-card"><div className="uniq-num">0₹</div><div class="uniq-label">Free Forever for Students</div></div>
        </div>
      </section>

      {/* COURSES */}
      <section id="courses">
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
      <div className="social-section" id="community">
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
      <div className="cta-section">
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
      <footer>
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
