import React, { useState, useEffect, useRef } from 'react';
import './AlgorithmVisualizer.css';

const ALGORITHMS = [
  { id: 'twosum', name: 'Two Sum' },
  { id: 'bubblesort', name: 'Bubble Sort' },
  { id: 'linkedlist', name: 'Linked List' },
  { id: 'hashmap', name: 'Hash Map' },
  { id: 'binarysearch', name: 'Binary Search' }
];

const PSEUDOCODE = {
  twosum: [
    "def twoSum(nums, target):",
    "    seen = {}",
    "    for i, num in enumerate(nums):",
    "        diff = target - num",
    "        if diff in seen:",
    "            return [seen[diff], i]",
    "        seen[num] = i"
  ],
  bubblesort: [
    "def bubbleSort(arr):",
    "    for i in range(len(arr)):",
    "        for j in range(0, len(arr) - i - 1):",
    "            if arr[j] > arr[j+1]:",
    "                arr[j], arr[j+1] = arr[j+1], arr[j]"
  ],
  linkedlist: [
    "curr = head",
    "while curr is not None:",
    "    if curr.val == target:",
    "        return curr",
    "    curr = curr.next"
  ],
  hashmap: [
    "idx = hash(key) % size",
    "while slots[idx] is not None:",
    "    idx = (idx + 1) % size  # Collision Probing",
    "slots[idx] = key"
  ],
  binarysearch: [
    "low, high = 0, len(arr) - 1",
    "while low <= high:",
    "    mid = (low + high) // 2",
    "    if arr[mid] == target:",
    "        return mid",
    "    elif arr[mid] < target:",
    "        low = mid + 1",
    "    else:",
    "        high = mid - 1"
  ]
};

// Generates steps for Bubble Sort
const getBubbleSortSteps = () => {
  const arr = [5, 1, 4, 2, 8];
  const steps = [];
  steps.push({ line: 0, desc: "Start Bubble Sort", state: { arr: [...arr], i: 0, j: null, comparing: [], sorted: [] } });

  const n = arr.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      steps.push({
        line: 2,
        desc: `Loop j = ${j}. Compare arr[${j}] (${arr[j]}) and arr[${j+1}] (${arr[j+1]})`,
        state: { arr: [...arr], i, j, comparing: [j, j + 1], sorted: Array.from({ length: i }, (_, k) => n - 1 - k) }
      });
      if (arr[j] > arr[j+1]) {
        steps.push({
          line: 3,
          desc: `${arr[j]} > ${arr[j+1]}. Swap required.`,
          state: { arr: [...arr], i, j, comparing: [j, j + 1], sorted: Array.from({ length: i }, (_, k) => n - 1 - k) }
        });
        const temp = arr[j];
        arr[j] = arr[j+1];
        arr[j+1] = temp;
        steps.push({
          line: 4,
          desc: `Swapped elements to: [${arr.join(', ')}]`,
          state: { arr: [...arr], i, j, comparing: [j, j + 1], sorted: Array.from({ length: i }, (_, k) => n - 1 - k) }
        });
      } else {
        steps.push({
          line: 3,
          desc: `${arr[j]} <= ${arr[j+1]}. No swap required.`,
          state: { arr: [...arr], i, j, comparing: [j, j + 1], sorted: Array.from({ length: i }, (_, k) => n - 1 - k) }
        });
      }
    }
    steps.push({
      line: 1,
      desc: `Pass completed. arr[${n - 1 - i}] (${arr[n - 1 - i]}) is now in sorted position.`,
      state: { arr: [...arr], i: i + 1, j: null, comparing: [], sorted: Array.from({ length: i + 1 }, (_, k) => n - 1 - k) }
    });
  }
  steps.push({
    line: 1,
    desc: "Bubble Sort completed! Array is fully sorted.",
    state: { arr: [...arr], i: n, j: null, comparing: [], sorted: [0, 1, 2, 3, 4] }
  });
  return steps;
};

// Generates steps for Two Sum
const getTwoSumSteps = () => {
  return [
    { line: 1, desc: "Initialize empty Hash Map seen = {}", state: { map: {}, i: null, found: false } },
    { line: 2, desc: "Loop i = 0, current value = 2", state: { map: {}, i: 0, currentVal: 2, complement: 7, found: false } },
    { line: 3, desc: "Calculate complement = 9 - 2 = 7", state: { map: {}, i: 0, currentVal: 2, complement: 7, found: false } },
    { line: 4, desc: "Check if complement 7 is in seen map: NOT found.", state: { map: {}, i: 0, currentVal: 2, complement: 7, found: false } },
    { line: 6, desc: "Add 2 to seen map: seen[2] = 0", state: { map: { 2: 0 }, i: 0, currentVal: 2, complement: 7, found: false } },
    { line: 2, desc: "Loop i = 1, current value = 7", state: { map: { 2: 0 }, i: 1, currentVal: 7, complement: 2, found: false } },
    { line: 3, desc: "Calculate complement = 9 - 7 = 2", state: { map: { 2: 0 }, i: 1, currentVal: 7, complement: 2, found: false } },
    { line: 4, desc: "Check if complement 2 is in seen map: FOUND at index 0!", state: { map: { 2: 0 }, i: 1, currentVal: 7, complement: 2, found: true } },
    { line: 5, desc: "Return indices: [seen[2], 1] = [0, 1]. Success!", state: { map: { 2: 0 }, i: 1, currentVal: 7, complement: 2, found: true, result: [0, 1] } }
  ];
};

// Generates steps for Linked List Traversal
const getLinkedListSteps = () => {
  return [
    { line: 0, desc: "Set curr pointer to Head node (A)", state: { current: 'A', visited: [], found: false } },
    { line: 1, desc: "Verify if curr is not NULL: True.", state: { current: 'A', visited: [], found: false } },
    { line: 2, desc: "Compare Node A value with target 'D': Match failed.", state: { current: 'A', visited: [], found: false } },
    { line: 4, desc: "Move pointer to next node: curr = A.next (B)", state: { current: 'B', visited: ['A'], found: false } },
    { line: 1, desc: "Verify if curr is not NULL: True.", state: { current: 'B', visited: ['A'], found: false } },
    { line: 2, desc: "Compare Node B value with target 'D': Match failed.", state: { current: 'B', visited: ['A'], found: false } },
    { line: 4, desc: "Move pointer to next node: curr = B.next (C)", state: { current: 'C', visited: ['A', 'B'], found: false } },
    { line: 1, desc: "Verify if curr is not NULL: True.", state: { current: 'C', visited: ['A', 'B'], found: false } },
    { line: 2, desc: "Compare Node C value with target 'D': Match failed.", state: { current: 'C', visited: ['A', 'B'], found: false } },
    { line: 4, desc: "Move pointer to next node: curr = C.next (D)", state: { current: 'D', visited: ['A', 'B', 'C'], found: false } },
    { line: 1, desc: "Verify if curr is not NULL: True.", state: { current: 'D', visited: ['A', 'B', 'C'], found: false } },
    { line: 2, desc: "Compare Node D value with target 'D': Target MATCHED!", state: { current: 'D', visited: ['A', 'B', 'C'], found: true } },
    { line: 3, desc: "Return Node D. Traversal completed.", state: { current: 'D', visited: ['A', 'B', 'C'], found: true, result: 'D' } }
  ];
};

// Generates steps for Hash Map insertion with Linear Probing
const getHashMapSteps = () => {
  return [
    { line: 0, desc: "Initialize empty slots grid of size 8", state: { slots: Array(8).fill(null), currentKey: null, step: 'init' } },
    { line: 0, desc: "Begin inserting key: 'alice' (hashes to index 3)", state: { slots: Array(8).fill(null), currentKey: 'alice', step: 'hash', computedIdx: 3, currentProbe: 3 } },
    { line: 1, desc: "Check if slot 3 is empty: Empty.", state: { slots: Array(8).fill(null), currentKey: 'alice', step: 'check', computedIdx: 3, currentProbe: 3 } },
    { line: 3, desc: "Inserted 'alice' successfully at slot 3.", state: { slots: [null, null, null, 'alice', null, null, null, null], currentKey: null, step: 'inserted' } },
    { line: 0, desc: "Begin inserting key: 'bob' (hashes to index 3)", state: { slots: [null, null, null, 'alice', null, null, null, null], currentKey: 'bob', step: 'hash', computedIdx: 3, currentProbe: 3 } },
    { line: 1, desc: "Check if slot 3 is empty: Occupied by 'alice'. COLLISION detected!", state: { slots: [null, null, null, 'alice', null, null, null, null], currentKey: 'bob', step: 'collision', computedIdx: 3, currentProbe: 3 } },
    { line: 2, desc: "Probe next slot: (3 + 1) % 8 = index 4", state: { slots: [null, null, null, 'alice', null, null, null, null], currentKey: 'bob', step: 'probe', computedIdx: 3, currentProbe: 4 } },
    { line: 1, desc: "Check if slot 4 is empty: Empty.", state: { slots: [null, null, null, 'alice', null, null, null, null], currentKey: 'bob', step: 'check', computedIdx: 3, currentProbe: 4 } },
    { line: 3, desc: "Inserted 'bob' successfully at slot 4.", state: { slots: [null, null, null, 'alice', 'bob', null, null, null], currentKey: null, step: 'inserted' } },
    { line: 0, desc: "Begin inserting key: 'charlie' (hashes to index 3)", state: { slots: [null, null, null, 'alice', 'bob', null, null, null], currentKey: 'charlie', step: 'hash', computedIdx: 3, currentProbe: 3 } },
    { line: 1, desc: "Check if slot 3 is empty: Occupied by 'alice'. COLLISION detected!", state: { slots: [null, null, null, 'alice', 'bob', null, null, null], currentKey: 'charlie', step: 'collision', computedIdx: 3, currentProbe: 3 } },
    { line: 2, desc: "Probe next slot: (3 + 1) % 8 = index 4", state: { slots: [null, null, null, 'alice', 'bob', null, null, null], currentKey: 'charlie', step: 'probe', computedIdx: 3, currentProbe: 4 } },
    { line: 1, desc: "Check if slot 4 is empty: Occupied by 'bob'. COLLISION detected!", state: { slots: [null, null, null, 'alice', 'bob', null, null, null], currentKey: 'charlie', step: 'collision', computedIdx: 3, currentProbe: 4 } },
    { line: 2, desc: "Probe next slot: (4 + 1) % 8 = index 5", state: { slots: [null, null, null, 'alice', 'bob', null, null, null], currentKey: 'charlie', step: 'probe', computedIdx: 3, currentProbe: 5 } },
    { line: 1, desc: "Check if slot 5 is empty: Empty.", state: { slots: [null, null, null, 'alice', 'bob', null, null, null], currentKey: 'charlie', step: 'check', computedIdx: 3, currentProbe: 5 } },
    { line: 3, desc: "Inserted 'charlie' successfully at slot 5.", state: { slots: [null, null, null, 'alice', 'bob', 'charlie', null, null], currentKey: null, step: 'inserted' } }
  ];
};

// Generates steps for Binary Search
const getBinarySearchSteps = () => {
  return [
    { line: 0, desc: "Initialize pointers: low = 0, high = 9", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 0, high: 9, mid: null, status: 'init' } },
    { line: 1, desc: "Verify loop condition: low <= high (0 <= 9)", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 0, high: 9, mid: null, status: 'loop' } },
    { line: 2, desc: "Calculate mid index = (0 + 9) // 2 = 4", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 0, high: 9, mid: 4, status: 'mid' } },
    { line: 3, desc: "Compare arr[mid] (9) with target (7)", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 0, high: 9, mid: 4, status: 'compare' } },
    { line: 7, desc: "Since 9 > 7, search left half: high = mid - 1 = 3", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 0, high: 3, mid: 4, status: 'adjust' } },
    { line: 1, desc: "Verify loop condition: low <= high (0 <= 3)", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 0, high: 3, mid: null, status: 'loop' } },
    { line: 2, desc: "Calculate mid index = (0 + 3) // 2 = 1", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 0, high: 3, mid: 1, status: 'mid' } },
    { line: 3, desc: "Compare arr[mid] (3) with target (7)", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 0, high: 3, mid: 1, status: 'compare' } },
    { line: 5, desc: "Since 3 < 7, search right half: low = mid + 1 = 2", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 2, high: 3, mid: 1, status: 'adjust' } },
    { line: 1, desc: "Verify loop condition: low <= high (2 <= 3)", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 2, high: 3, mid: null, status: 'loop' } },
    { line: 2, desc: "Calculate mid index = (2 + 3) // 2 = 2", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 2, high: 3, mid: 2, status: 'mid' } },
    { line: 3, desc: "Compare arr[mid] (5) with target (7)", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 2, high: 3, mid: 2, status: 'compare' } },
    { line: 5, desc: "Since 5 < 7, search right half: low = mid + 1 = 3", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 3, high: 3, mid: 2, status: 'adjust' } },
    { line: 1, desc: "Verify loop condition: low <= high (3 <= 3)", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 3, high: 3, mid: null, status: 'loop' } },
    { line: 2, desc: "Calculate mid index = (3 + 3) // 2 = 3", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 3, high: 3, mid: 3, status: 'mid' } },
    { line: 3, desc: "Compare arr[mid] (7) with target (7)", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 3, high: 3, mid: 3, status: 'compare' } },
    { line: 4, desc: "Target 7 found at index 3! Success.", state: { arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], low: 3, high: 3, mid: 3, status: 'found' } }
  ];
};

const STEPS_GENERATORS = {
  twosum: getTwoSumSteps,
  bubblesort: getBubbleSortSteps,
  linkedlist: getLinkedListSteps,
  hashmap: getHashMapSteps,
  binarysearch: getBinarySearchSteps
};

const AlgorithmVisualizer = () => {
  const [selectedAlgo, setSelectedAlgo] = useState('bubblesort');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [speed, setSpeed] = useState(2); // 1x to 5x
  const [logs, setLogs] = useState([]);

  const matrixCanvasRef = useRef(null);
  const graphCanvasRef = useRef(null);
  const timerRef = useRef(null);

  const steps = STEPS_GENERATORS[selectedAlgo]();
  const currentStep = steps[currentStepIndex] || steps[0];

  // Matrix Rain Header Animation Effect
  useEffect(() => {
    const canvas = matrixCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const cols = Math.floor(width / 14) + 1;
    const ypos = Array(cols).fill(0);

    const renderRain = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#00FF88';
      ctx.font = '8pt monospace';

      ypos.forEach((y, ind) => {
        const text = String.fromCharCode(Math.random() * 128);
        const x = ind * 14;
        ctx.fillText(text, x, y);

        if (y > 100 + Math.random() * 10000) {
          ypos[ind] = 0;
        } else {
          ypos[ind] = y + 14;
        }
      });
    };

    const interval = setInterval(renderRain, 50);
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Update step logs when step changes
  useEffect(() => {
    const newLogs = steps
      .slice(0, currentStepIndex + 1)
      .map((s, idx) => ({ id: idx, text: s.desc, active: idx === currentStepIndex }));
    setLogs(newLogs.reverse());
  }, [currentStepIndex, selectedAlgo]);

  // Handle Autoplay Speed
  useEffect(() => {
    if (isPlaying) {
      const intervalDuration = 2000 / speed;
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalDuration);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, steps.length]);

  // Render State Graph
  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const width = (canvas.width = canvas.offsetWidth);
    const height = (canvas.height = canvas.offsetHeight);

    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines
    ctx.strokeStyle = '#FFFFFF05';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Dynamic state line representation
    ctx.strokeStyle = '#FF2D78';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#FF2D78';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const total = steps.length;
    const stepX = width / (total - 1 || 1);
    
    steps.forEach((s, idx) => {
      const x = idx * stepX;
      // Map highlighted line to height
      const y = height - ((s.line + 1) / (PSEUDOCODE[selectedAlgo].length + 1)) * height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Reset shadow blur
    ctx.shadowBlur = 0;

    // Draw Current step point indicator
    const currentX = currentStepIndex * stepX;
    const currentY = height - ((currentStep.line + 1) / (PSEUDOCODE[selectedAlgo].length + 1)) * height;

    ctx.fillStyle = '#00FF88';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
    ctx.fill();

  }, [currentStepIndex, selectedAlgo, steps]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleStep = () => {
    setIsPlaying(false);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleAlgoChange = (id) => {
    setIsPlaying(false);
    setSelectedAlgo(id);
    setCurrentStepIndex(0);
  };

  // Rendering algorithm visual boards
  const renderVisualBoard = () => {
    const { state } = currentStep;

    if (selectedAlgo === 'bubblesort') {
      return (
        <div className="cp-viz-array">
          {state.arr.map((val, idx) => {
            const isComparing = state.comparing.includes(idx);
            const isSorted = state.sorted.includes(idx);
            return (
              <div key={idx} className="cp-viz-bar-container">
                <div
                  className={`cp-viz-bar ${isComparing ? 'comparing' : ''} ${isSorted ? 'sorted' : ''}`}
                  style={{ height: `${val * 30}px` }}
                >
                  <span className="cp-viz-bar-value" style={{ position: 'absolute', top: '-20px', left: '8px' }}>
                    {val}
                  </span>
                </div>
                {state.j === idx && <span className="cp-viz-pointer-label">j</span>}
                {state.j + 1 === idx && <span className="cp-viz-pointer-label">j+1</span>}
              </div>
            );
          })}
        </div>
      );
    }

    if (selectedAlgo === 'twosum') {
      const arr = [2, 7, 11, 15];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center', width: '100%' }}>
          {/* Target Element */}
          <div style={{ fontFamily: 'Orbitron', color: '#00FF88', fontSize: '0.9rem', letterSpacing: '2px' }}>
            TARGET = 9
          </div>

          {/* Input Array */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {arr.map((val, idx) => {
              const isActive = state.i === idx;
              const isComplement = state.found && state.map[state.complement] === idx;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '45px',
                      height: '45px',
                      border: `1px solid ${isActive ? '#FF2D78' : isComplement ? '#00FF88' : '#8888AA44'}`,
                      background: isActive ? 'rgba(255, 45, 120, 0.1)' : isComplement ? 'rgba(0, 255, 136, 0.1)' : '#0F0F1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#FF2D78' : isComplement ? '#00FF88' : '#E8E8FF',
                      fontSize: '0.95rem',
                      fontWeight: 'bold',
                      boxShadow: isActive ? '0 0 10px rgba(255,45,120,0.3)' : isComplement ? '0 0 10px rgba(0,255,136,0.3)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {val}
                  </div>
                  {isActive && <span className="cp-viz-pointer-label">i</span>}
                </div>
              );
            })}
          </div>

          {/* Seen Map */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '280px', background: '#0F0F1A', border: '1px solid #FF2D7833', padding: '14px' }}>
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.62rem', letterSpacing: '2px', color: '#FF2D78', marginBottom: '10px' }}>SEEN HASHMAP</span>
            {Object.keys(state.map).length === 0 ? (
              <span style={{ color: '#8888AA', fontSize: '0.75rem' }}>&#123; &#125;</span>
            ) : (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(state.map).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '2px 8px', borderBottom: '1px solid #FFFFFF05' }}>
                    <span style={{ color: '#00FF88' }}>Key (Value): {key}</span>
                    <span style={{ color: '#FF2D78' }}>Idx: {val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (selectedAlgo === 'linkedlist') {
      const nodes = ['A', 'B', 'C', 'D', 'E'];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <div style={{ fontFamily: 'Orbitron', color: '#00FF88', fontSize: '0.9rem', letterSpacing: '2px' }}>
            SEARCH TARGET = 'D'
          </div>
          <div className="cp-viz-list">
            {nodes.map((node, idx) => {
              const isActive = state.current === node;
              const isVisited = state.visited.includes(node);
              const isTarget = state.found && node === 'D';

              return (
                <React.Fragment key={node}>
                  <div
                    className={`cp-viz-node ${isActive ? 'active' : ''} ${isVisited ? 'visited' : ''} ${isTarget ? 'target' : ''}`}
                  >
                    {node}
                    {isActive && (
                      <span className="cp-viz-pointer-label" style={{ position: 'absolute', bottom: '-22px' }}>
                        curr
                      </span>
                    )}
                  </div>
                  {idx < nodes.length - 1 && (
                    <span className="cp-viz-node-arrow">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      );
    }

    if (selectedAlgo === 'hashmap') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
          {state.currentKey && (
            <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#00FF88' }}>
              <div>KEY: "{state.currentKey}"</div>
              <div>HASH INDEX: {state.computedIdx}</div>
              {state.step === 'collision' && <div style={{ color: '#FF2D78' }}>COLLISION AT SLOT {state.currentProbe}!</div>}
              {state.step === 'probe' && <div style={{ color: '#FF2D78' }}>PROBING SLOT {state.currentProbe}...</div>}
            </div>
          )}
          <div className="cp-viz-hash-grid">
            {state.slots.map((val, idx) => {
              const isProbing = state.currentProbe === idx;
              const isFilled = val !== null;
              return (
                <div key={idx} className={`cp-viz-hash-slot ${isProbing ? 'active' : ''} ${isFilled ? 'filled' : ''}`}>
                  <div className="cp-viz-hash-slot-num">{idx}</div>
                  <div className="cp-viz-hash-slot-val">{val || '—'}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (selectedAlgo === 'binarysearch') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center', width: '100%' }}>
          <div style={{ fontFamily: 'Orbitron', color: '#00FF88', fontSize: '0.9rem', letterSpacing: '2px' }}>
            SEARCH TARGET = 7
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {state.arr.map((val, idx) => {
              const isLow = state.low === idx;
              const isHigh = state.high === idx;
              const isMid = state.mid === idx;
              const isEliminated = idx < state.low || idx > state.high;
              const isFound = state.status === 'found' && idx === state.mid;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      border: `1px solid ${isFound ? '#00FF88' : isMid ? '#FF2D78' : (isLow || isHigh) ? '#E8E8FF' : '#8888AA44'}`,
                      background: isFound ? 'rgba(0, 255, 136, 0.15)' : isMid ? 'rgba(255, 45, 120, 0.1)' : '#0F0F1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isFound ? '#00FF88' : isMid ? '#FF2D78' : '#E8E8FF',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      opacity: isEliminated ? 0.25 : 1,
                      boxShadow: isFound ? '0 0 10px rgba(0,255,136,0.3)' : isMid ? '0 0 10px rgba(255,45,120,0.3)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {val}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', height: '30px' }}>
                    {isLow && <span className="cp-viz-pointer-label" style={{ color: '#00FF88' }}>L</span>}
                    {isHigh && <span className="cp-viz-pointer-label" style={{ color: '#FF2D78' }}>H</span>}
                    {isMid && <span className="cp-viz-pointer-label" style={{ color: '#E8E8FF' }}>M</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="cp-visualizer">
      {/* ── Matrix Rain Header ── */}
      <header className="cp-viz-header">
        <canvas ref={matrixCanvasRef} className="cp-viz-matrix-canvas" />
        <span className="cp-viz-header-title">ALGORITHM_VISUALIZER //</span>
      </header>

      {/* ── Selector chips ── */}
      <div className="cp-viz-selector">
        {ALGORITHMS.map(algo => (
          <button
            key={algo.id}
            className={`cp-viz-chip ${selectedAlgo === algo.id ? 'active' : ''}`}
            onClick={() => handleAlgoChange(algo.id)}
          >
            {algo.name.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Control Panel ── */}
      <div className="cp-viz-controls">
        <div className="cp-viz-btn-group">
          <button className="cp-viz-ctrl-btn" onClick={handlePrev} disabled={currentStepIndex === 0}>
            ◀ PREV
          </button>
          <button
            className={`cp-viz-ctrl-btn ${isPlaying ? 'active-pink' : 'active-green'}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </button>
          <button className="cp-viz-ctrl-btn" onClick={handleStep} disabled={currentStepIndex === steps.length - 1}>
            STEP ▶
          </button>
          <button className="cp-viz-ctrl-btn" onClick={handleReset}>
            ⟳ RESET
          </button>
        </div>

        <div className="cp-viz-slider-group">
          <span>SPEED:</span>
          <input
            type="range"
            min="1"
            max="5"
            className="cp-viz-slider"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
          <span>{speed}x</span>
        </div>
      </div>

      {/* ── Main Layout Body ── */}
      <div className="cp-viz-body">
        {/* Left column */}
        <div className="cp-viz-left">
          {/* Main Visualizer Board */}
          <div className="cp-viz-board">
            {renderVisualBoard()}
          </div>

          {/* Live Step logs */}
          <div className="cp-viz-logs">
            {logs.map((log) => (
              <div key={log.id} className={`cp-viz-log-item ${log.active ? 'active' : ''}`}>
                &gt; {log.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="cp-viz-right">
          {/* Pseudocode */}
          <div className="cp-viz-panel-header">PSEUDOCODE //</div>
          <div className="cp-viz-pseudocode">
            {PSEUDOCODE[selectedAlgo].map((line, idx) => (
              <div
                key={idx}
                className={`cp-viz-code-line ${currentStep.line === idx ? 'highlight' : ''}`}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Live State Graph */}
          <div className="cp-viz-panel-header">STATE GRAPH //</div>
          <div className="cp-viz-graph-panel">
            <canvas ref={graphCanvasRef} className="cp-viz-graph-canvas" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmVisualizer;
