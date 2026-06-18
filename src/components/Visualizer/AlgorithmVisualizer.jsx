import React, { useState, useEffect, useRef } from 'react';
import { getAutoVisualization } from '../../services/visualizerService';

// Pseudocode templates for every visualizer type
const PSEUDOCODE_TEMPLATES = {
  array: [
    "def search_array(arr, target):",
    "    left, right = 0, len(arr) - 1",
    "    while left <= right:",
    "        if arr[left] == target: return left",
    "        if arr[right] == target: return right",
    "        left += 1; right -= 1"
  ],
  tree: [
    "def dfs_inorder(node):",
    "    if not node: return",
    "    dfs_inorder(node.left)",
    "    visit(node.val)",
    "    dfs_inorder(node.right)"
  ],
  graph: [
    "def bfs_graph(graph, start):",
    "    queue = [start]",
    "    visited = {start}",
    "    while queue:",
    "        curr = queue.pop(0)",
    "        for neighbor in graph[curr]:",
    "            if neighbor not in visited:",
    "                visited.add(neighbor)",
    "                queue.append(neighbor)"
  ],
  dp: [
    "def fibonacci_dp(n):",
    "    dp = [0] * (n + 1)",
    "    dp[1] = 1",
    "    for i in range(2, n + 1):",
    "        dp[i] = dp[i-1] + dp[i-2]",
    "    return dp[n]"
  ],
  hash: [
    "def hash_insert(key, val):",
    "    idx = hash_fn(key) % size",
    "    while slots[idx] is not None:",
    "        idx = (idx + 1) % size  # Collision Probing",
    "    slots[idx] = (key, val)"
  ],
  sort: [
    "def bubble_sort(arr):",
    "    for i in range(len(arr)):",
    "        for j in range(len(arr)-i-1):",
    "            if arr[j] > arr[j+1]:",
    "                swap(arr, j, j+1)"
  ],
  linked_list: [
    "def traverse_list(head):",
    "    curr = head",
    "    while curr is not None:",
    "        process(curr.val)",
    "        curr = curr.next"
  ],
  binary_search: [
    "def binary_search(arr, target):",
    "    lo, hi = 0, len(arr) - 1",
    "    while lo <= hi:",
    "        mid = (lo + hi) // 2",
    "        if arr[mid] == target: return mid",
    "        elif arr[mid] < target: lo = mid + 1",
    "        else: hi = mid - 1"
  ]
};

// Generates step data for Array Visualizer
const generateArraySteps = () => {
  const arr = [4, 1, 8, 2, 6, 9, 3];
  const target = 8;
  return [
    { line: 1, desc: "Init left = 0, right = 6", active: 1, done: [], state: { arr, left: 0, right: 6, target, visited: [] } },
    { line: 2, desc: "Check loop condition: 0 <= 6 (True)", active: 2, done: [1], state: { arr, left: 0, right: 6, target, visited: [] } },
    { line: 3, desc: "Compare arr[left] (4) == 8 (False)", active: 3, done: [1, 2], state: { arr, left: 0, right: 6, target, visited: [0] } },
    { line: 4, desc: "Compare arr[right] (3) == 8 (False)", active: 4, done: [1, 2, 3], state: { arr, left: 0, right: 6, target, visited: [0, 6] } },
    { line: 5, desc: "Increment left to 1, Decrement right to 5", active: 5, done: [1, 2, 3, 4], state: { arr, left: 1, right: 5, target, visited: [0, 6] } },
    { line: 2, desc: "Check loop condition: 1 <= 5 (True)", active: 2, done: [1, 5], state: { arr, left: 1, right: 5, target, visited: [0, 6] } },
    { line: 3, desc: "Compare arr[left] (1) == 8 (False)", active: 3, done: [1, 2], state: { arr, left: 1, right: 5, target, visited: [0, 6, 1] } },
    { line: 4, desc: "Compare arr[right] (9) == 8 (False)", active: 4, done: [1, 2, 3], state: { arr, left: 1, right: 5, target, visited: [0, 6, 1, 5] } },
    { line: 5, desc: "Increment left to 2, Decrement right to 4", active: 5, done: [1, 2, 3, 4], state: { arr, left: 2, right: 4, target, visited: [0, 6, 1, 5] } },
    { line: 2, desc: "Check loop condition: 2 <= 4 (True)", active: 2, done: [1, 5], state: { arr, left: 2, right: 4, target, visited: [0, 6, 1, 5] } },
    { line: 3, desc: "Compare arr[left] (8) == 8 (MATCH FOUND!)", active: 3, done: [1, 2], state: { arr, left: 2, right: 4, target, visited: [0, 6, 1, 5, 2] } },
    { line: 3, desc: "Return index 2. Target 8 found.", active: 3, done: [1, 2, 3], state: { arr, left: 2, right: 4, target, visited: [0, 6, 1, 5, 2], found: true } }
  ];
};

// Generates step data for Tree Visualizer
const generateTreeSteps = () => {
  return [
    { line: 1, desc: "Start Inorder Traversal at Root (10)", active: 1, done: [], state: { curr: 1, stack: [1], visited: [] } },
    { line: 2, desc: "Traverse left child: Node 5", active: 2, done: [1], state: { curr: 2, stack: [1, 2], visited: [] } },
    { line: 2, desc: "Traverse left child: Node 3", active: 2, done: [1, 2], state: { curr: 4, stack: [1, 2, 4], visited: [] } },
    { line: 1, desc: "Node 3 left is Null, backtrack", active: 1, done: [1, 2], state: { curr: 4, stack: [1, 2, 4], visited: [] } },
    { line: 3, desc: "Visit Node 3", active: 3, done: [1, 2], state: { curr: 4, stack: [1, 2], visited: [3] } },
    { line: 4, desc: "Traverse right child: Node 3 right is Null", active: 4, done: [1, 2, 3], state: { curr: null, stack: [1, 2], visited: [3] } },
    { line: 3, desc: "Visit Node 5", active: 3, done: [1, 2, 4], state: { curr: 2, stack: [1], visited: [3, 5] } },
    { line: 4, desc: "Traverse right child: Node 7", active: 4, done: [1, 2, 3], state: { curr: 5, stack: [1, 5], visited: [3, 5] } },
    { line: 3, desc: "Visit Node 7", active: 3, done: [1, 2, 4], state: { curr: 5, stack: [1], visited: [3, 5, 7] } },
    { line: 3, desc: "Visit Root Node 10", active: 3, done: [1, 2, 4], state: { curr: 1, stack: [], visited: [3, 5, 7, 10] } },
    { line: 4, desc: "Traverse right child: Node 15", active: 4, done: [1, 2, 3], state: { curr: 3, stack: [3], visited: [3, 5, 7, 10] } },
    { line: 3, desc: "Visit Node 15", active: 3, done: [1, 2, 4], state: { curr: 3, stack: [], visited: [3, 5, 7, 10, 15] } }
  ];
};

// Generates step data for Graph Visualizer
const generateGraphSteps = () => {
  return [
    { line: 1, desc: "Initialize BFS. Push start node A to Queue", active: 1, done: [], state: { queue: ['A'], visited: ['A'], curr: null } },
    { line: 3, desc: "Queue is not empty. Continue BFS loop", active: 3, done: [1], state: { queue: ['A'], visited: ['A'], curr: null } },
    { line: 4, desc: "Dequeue node: A", active: 4, done: [1, 3], state: { queue: [], visited: ['A'], curr: 'A' } },
    { line: 5, desc: "Check neighbors of A: B, C", active: 5, done: [1, 3, 4], state: { queue: [], visited: ['A'], curr: 'A', edge: 'A-B' } },
    { line: 7, desc: "B is not visited. Mark visited and enqueue B", active: 7, done: [1, 3, 4, 5], state: { queue: ['B'], visited: ['A', 'B'], curr: 'A', edge: 'A-B' } },
    { line: 7, desc: "C is not visited. Mark visited and enqueue C", active: 7, done: [1, 3, 4, 5], state: { queue: ['B', 'C'], visited: ['A', 'B', 'C'], curr: 'A', edge: 'A-C' } },
    { line: 3, desc: "Queue is not empty. Continue loop", active: 3, done: [1, 7], state: { queue: ['B', 'C'], visited: ['A', 'B', 'C'], curr: null } },
    { line: 4, desc: "Dequeue node: B", active: 4, done: [1, 3], state: { queue: ['C'], visited: ['A', 'B', 'C'], curr: 'B' } },
    { line: 5, desc: "Check neighbors of B: A, D", active: 5, done: [1, 3, 4], state: { queue: ['C'], visited: ['A', 'B', 'C'], curr: 'B', edge: 'B-D' } },
    { line: 7, desc: "D is not visited. Mark visited and enqueue D", active: 7, done: [1, 3, 4, 5], state: { queue: ['C', 'D'], visited: ['A', 'B', 'C', 'D'], curr: 'B', edge: 'B-D' } },
    { line: 4, desc: "Dequeue node: C", active: 4, done: [1, 3], state: { queue: ['D'], visited: ['A', 'B', 'C', 'D'], curr: 'C' } },
    { line: 4, desc: "Dequeue node: D", active: 4, done: [1, 3], state: { queue: [], visited: ['A', 'B', 'C', 'D'], curr: 'D' } },
    { line: 3, desc: "Queue is empty. BFS completed", active: 3, done: [1, 4], state: { queue: [], visited: ['A', 'B', 'C', 'D'], curr: null } }
  ];
};

// Generates step data for DP Visualizer
const generateDPSteps = () => {
  return [
    { line: 1, desc: "Create DP table of size 8 filled with 0", active: 1, done: [], state: { dp: [0, 0, 0, 0, 0, 0, 0, 0], active: null } },
    { line: 2, desc: "Base case: dp[1] = 1", active: 2, done: [1], state: { dp: [0, 1, 0, 0, 0, 0, 0, 0], active: 1 } },
    { line: 3, desc: "Loop i from 2 to 7", active: 3, done: [1, 2], state: { dp: [0, 1, 0, 0, 0, 0, 0, 0], active: null, loopI: 2 } },
    { line: 4, desc: "Calculate dp[2] = dp[1] (1) + dp[0] (0) = 1", active: 4, done: [1, 2, 3], state: { dp: [0, 1, 1, 0, 0, 0, 0, 0], active: 2, dependencies: [0, 1] } },
    { line: 4, desc: "Calculate dp[3] = dp[2] (1) + dp[1] (1) = 2", active: 4, done: [1, 2, 3], state: { dp: [0, 1, 1, 2, 0, 0, 0, 0], active: 3, dependencies: [1, 2] } },
    { line: 4, desc: "Calculate dp[4] = dp[3] (2) + dp[2] (1) = 3", active: 4, done: [1, 2, 3], state: { dp: [0, 1, 1, 2, 3, 0, 0, 0], active: 4, dependencies: [2, 3] } },
    { line: 4, desc: "Calculate dp[5] = dp[4] (3) + dp[3] (2) = 5", active: 4, done: [1, 2, 3], state: { dp: [0, 1, 1, 2, 3, 5, 0, 0], active: 5, dependencies: [3, 4] } },
    { line: 4, desc: "Calculate dp[6] = dp[5] (5) + dp[4] (3) = 8", active: 4, done: [1, 2, 3], state: { dp: [0, 1, 1, 2, 3, 5, 8, 0], active: 6, dependencies: [4, 5] } },
    { line: 4, desc: "Calculate dp[7] = dp[6] (8) + dp[5] (5) = 13", active: 4, done: [1, 2, 3], state: { dp: [0, 1, 1, 2, 3, 5, 8, 13], active: 7, dependencies: [5, 6] } },
    { line: 5, desc: "Return dp[7] = 13", active: 5, done: [1, 2, 3, 4], state: { dp: [0, 1, 1, 2, 3, 5, 8, 13], active: 7 } }
  ];
};

// Generates step data for Hash Map Visualizer
const generateHashSteps = () => {
  return [
    { line: 1, desc: "Start inserting key: 'apple' with value 12. Hash index = 3", active: 1, done: [], state: { buckets: Array(8).fill(null), val: 12, hash: 3, probing: 3, step: 'hash' } },
    { line: 2, desc: "Bucket 3 is empty. No collision", active: 2, done: [1], state: { buckets: Array(8).fill(null), val: 12, hash: 3, probing: 3, step: 'empty' } },
    { line: 4, desc: "Insert 'apple' at bucket 3", active: 4, done: [1, 2], state: { buckets: [null, null, null, { k: 'apple', v: 12 }, null, null, null, null], val: null, hash: null, probing: null, step: 'inserted' } },
    { line: 1, desc: "Start inserting key: 'banana' with value 88. Hash index = 3", active: 1, done: [4], state: { buckets: [null, null, null, { k: 'apple', v: 12 }, null, null, null, null], val: 88, hash: 3, probing: 3, step: 'hash' } },
    { line: 2, desc: "Bucket 3 is occupied! Collision detected", active: 2, done: [1], state: { buckets: [null, null, null, { k: 'apple', v: 12 }, null, null, null, null], val: 88, hash: 3, probing: 3, step: 'collision' } },
    { line: 3, desc: "Linear probing: probe slot (3 + 1) % 8 = 4", active: 3, done: [1, 2], state: { buckets: [null, null, null, { k: 'apple', v: 12 }, null, null, null, null], val: 88, hash: 3, probing: 4, step: 'probe' } },
    { line: 2, desc: "Bucket 4 is empty. No collision", active: 2, done: [1, 3], state: { buckets: [null, null, null, { k: 'apple', v: 12 }, null, null, null, null], val: 88, hash: 3, probing: 4, step: 'empty' } },
    { line: 4, desc: "Insert 'banana' at bucket 4", active: 4, done: [1, 2, 3], state: { buckets: [null, null, null, { k: 'apple', v: 12 }, { k: 'banana', v: 88 }, null, null, null], val: null, hash: null, probing: null, step: 'inserted' } }
  ];
};

// Generates step data for Sorting Visualizer
const generateSortSteps = () => {
  return [
    { line: 1, desc: "Start bubble sort on array [5, 2, 8, 1, 9]", active: 1, done: [], state: { arr: [5, 2, 8, 1, 9], comparisons: 0, swaps: 0, comparing: [], sorted: [] } },
    { line: 2, desc: "Loop i = 0", active: 2, done: [1], state: { arr: [5, 2, 8, 1, 9], comparisons: 0, swaps: 0, comparing: [], sorted: [] } },
    { line: 3, desc: "Loop j = 0. Compare arr[0] (5) and arr[1] (2)", active: 3, done: [1, 2], state: { arr: [5, 2, 8, 1, 9], comparisons: 1, swaps: 0, comparing: [0, 1], sorted: [] } },
    { line: 4, desc: "5 > 2 is true. Swap arr[0] and arr[1]", active: 4, done: [1, 2, 3], state: { arr: [2, 5, 8, 1, 9], comparisons: 1, swaps: 1, comparing: [0, 1], sorted: [] } },
    { line: 3, desc: "Loop j = 1. Compare arr[1] (5) and arr[2] (8)", active: 3, done: [1, 2, 4], state: { arr: [2, 5, 8, 1, 9], comparisons: 2, swaps: 1, comparing: [1, 2], sorted: [] } },
    { line: 3, desc: "Loop j = 2. Compare arr[2] (8) and arr[3] (1)", active: 3, done: [1, 2, 4], state: { arr: [2, 5, 8, 1, 9], comparisons: 3, swaps: 1, comparing: [2, 3], sorted: [] } },
    { line: 4, desc: "8 > 1 is true. Swap arr[2] and arr[3]", active: 4, done: [1, 2, 3], state: { arr: [2, 5, 1, 8, 9], comparisons: 3, swaps: 2, comparing: [2, 3], sorted: [] } },
    { line: 3, desc: "Loop j = 3. Compare arr[3] (8) and arr[4] (9)", active: 3, done: [1, 2, 4], state: { arr: [2, 5, 1, 8, 9], comparisons: 4, swaps: 2, comparing: [3, 4], sorted: [] } },
    { line: 2, desc: "Pass completed. arr[4] (9) is sorted", active: 2, done: [1, 3], state: { arr: [2, 5, 1, 8, 9], comparisons: 4, swaps: 2, comparing: [], sorted: [4] } }
  ];
};

// Generates step data for Linked List Visualizer
const generateLinkedListSteps = () => {
  return [
    { line: 1, desc: "Set curr pointer to head node (val: 12)", active: 1, done: [], state: { curr: 0, list: [12, 99, 37], visited: [] } },
    { line: 2, desc: "Check if curr is not Null: True", active: 2, done: [1], state: { curr: 0, list: [12, 99, 37], visited: [] } },
    { line: 3, desc: "Process current node value: 12", active: 3, done: [1, 2], state: { curr: 0, list: [12, 99, 37], visited: [0] } },
    { line: 4, desc: "Move pointer: curr = curr.next (val: 99)", active: 4, done: [1, 2, 3], state: { curr: 1, list: [12, 99, 37], visited: [0] } },
    { line: 2, desc: "Check if curr is not Null: True", active: 2, done: [1, 4], state: { curr: 1, list: [12, 99, 37], visited: [0] } },
    { line: 3, desc: "Process current node value: 99", active: 3, done: [1, 2], state: { curr: 1, list: [12, 99, 37], visited: [0, 1] } },
    { line: 4, desc: "Move pointer: curr = curr.next (val: 37)", active: 4, done: [1, 2, 3], state: { curr: 2, list: [12, 99, 37], visited: [0, 1] } },
    { line: 2, desc: "Check if curr is not Null: True", active: 2, done: [1, 4], state: { curr: 2, list: [12, 99, 37], visited: [0, 1] } },
    { line: 3, desc: "Process current node value: 37", active: 3, done: [1, 2], state: { curr: 2, list: [12, 99, 37], visited: [0, 1, 2] } },
    { line: 4, desc: "Move pointer: curr = curr.next (Null)", active: 4, done: [1, 2, 3], state: { curr: null, list: [12, 99, 37], visited: [0, 1, 2] } },
    { line: 2, desc: "Check if curr is not Null: False. Traversal complete", active: 2, done: [1, 4], state: { curr: null, list: [12, 99, 37], visited: [0, 1, 2] } }
  ];
};

// Generates step data for Binary Search Visualizer
const generateBinarySearchSteps = () => {
  const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
  const target = 23;
  return [
    { line: 1, desc: "Init bounds: lo = 0, hi = 9", active: 1, done: [], state: { arr, target, lo: 0, hi: 9, mid: null } },
    { line: 2, desc: "Check condition: lo <= hi (0 <= 9) is True", active: 2, done: [1], state: { arr, target, lo: 0, hi: 9, mid: null } },
    { line: 3, desc: "Calculate mid: (0 + 9) // 2 = 4 (value: 16)", active: 3, done: [1, 2], state: { arr, target, lo: 0, hi: 9, mid: 4 } },
    { line: 4, desc: "Compare arr[mid] (16) == 23: False", active: 4, done: [1, 2, 3], state: { arr, target, lo: 0, hi: 9, mid: 4 } },
    { line: 5, desc: "arr[mid] < target (16 < 23) is True. Shrink left: lo = mid + 1 = 5", active: 5, done: [1, 2, 3, 4], state: { arr, target, lo: 5, hi: 9, mid: 4 } },
    { line: 2, desc: "Check condition: lo <= hi (5 <= 9) is True", active: 2, done: [1, 5], state: { arr, target, lo: 5, hi: 9, mid: null } },
    { line: 3, desc: "Calculate mid: (5 + 9) // 2 = 7 (value: 56)", active: 3, done: [1, 2], state: { arr, target, lo: 5, hi: 9, mid: 7 } },
    { line: 4, desc: "Compare arr[mid] (56) == 23: False", active: 4, done: [1, 2, 3], state: { arr, target, lo: 5, hi: 9, mid: 7 } },
    { line: 6, desc: "arr[mid] > target (56 > 23) is True. Shrink right: hi = mid - 1 = 6", active: 6, done: [1, 2, 3, 4, 5], state: { arr, target, lo: 5, hi: 6, mid: 7 } },
    { line: 2, desc: "Check condition: lo <= hi (5 <= 6) is True", active: 2, done: [1, 6], state: { arr, target, lo: 5, hi: 6, mid: null } },
    { line: 3, desc: "Calculate mid: (5 + 6) // 2 = 5 (value: 23)", active: 3, done: [1, 2], state: { arr, target, lo: 5, hi: 6, mid: 5 } },
    { line: 4, desc: "Compare arr[mid] (23) == 23: MATCH FOUND! Return index 5", active: 4, done: [1, 2, 3], state: { arr, target, lo: 5, hi: 6, mid: 5, found: true } }
  ];
};

const VISUALIZERS = {
  array: generateArraySteps,
  tree: generateTreeSteps,
  graph: generateGraphSteps,
  dp: generateDPSteps,
  hash: generateHashSteps,
  sort: generateSortSteps,
  linked_list: generateLinkedListSteps,
  binary_search: generateBinarySearchSteps
};

export default function AlgorithmVisualizer({ problem }) {
  const type = problem?.visualizerType;
  const isTypeValid = type && VISUALIZERS[type];

  const [autoVisualData, setAutoVisualData] = useState(null);
  const [loadingAutoVisual, setLoadingAutoVisual] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // 1x to 5x
  const [stepLogs, setStepLogs] = useState([]);
  
  const timerRef = useRef(null);

  // Load auto-visualizer if type is invalid/unmapped
  useEffect(() => {
    if (!problem) return;
    const t = problem.visualizerType;
    const isValid = t && VISUALIZERS[t];

    if (!isValid) {
      setLoadingAutoVisual(true);
      getAutoVisualization(problem).then(data => {
        if (data) {
          setAutoVisualData(data);
        } else {
          // No Gemini key or no cached data — fall back to array visualizer
          setAutoVisualData({ type: 'array', steps: generateArraySteps(), initialData: null });
        }
        setLoadingAutoVisual(false);
      }).catch(err => {
        console.error("Auto-visualizer generation error:", err);
        // Fallback to default array visualizer
        setAutoVisualData({ type: 'array', steps: generateArraySteps(), initialData: null });
        setLoadingAutoVisual(false);
      });
    } else {
      setAutoVisualData(null);
    }
  }, [problem]);

  const steps = isTypeValid ? VISUALIZERS[type]() : (autoVisualData?.steps || []);
  const activeType = isTypeValid ? type : (autoVisualData?.type || 'none');
  const currentStep = steps[currentStepIndex] || steps[0] || { line: 0, done: [], state: {} };

  // Sync log array when stepping
  useEffect(() => {
    if (steps.length === 0) return;
    const newLogs = steps
      .slice(0, currentStepIndex + 1)
      .map((s, idx) => ({ id: idx, text: s.desc || s.action, active: idx === currentStepIndex }));
    setStepLogs(newLogs.reverse());
  }, [currentStepIndex, steps]);

  // Autoplay handler with speed intervals
  useEffect(() => {
    if (steps.length === 0) return;
    if (isPlaying) {
      const duration = 2200 / speed;
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, duration);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, steps.length, steps]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Render loading state or fallback conditionally
  if (loadingAutoVisual) {
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '350px',
          background: '#07070F',
          color: '#00FF88',
          fontFamily: 'Orbitron',
          gap: '12px',
          padding: '24px'
        }}
      >
        <span className="cp-pd-judging" style={{ fontSize: '0.8rem', letterSpacing: '2px' }}>🤖 DYNAMIC AI VISUALIZER ACTIVE</span>
        <span style={{ fontSize: '0.62rem', color: '#8888AA', textAlign: 'center' }}>
          Gemini is classifying problem type and generating interactive step state...
        </span>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '350px',
          background: '#07070F',
          border: '1px solid rgba(255, 45, 120, 0.1)',
          borderRadius: '6px',
          color: '#8888AA',
          fontFamily: 'Orbitron',
          fontSize: '0.85rem',
          letterSpacing: '1px',
          padding: '24px'
        }}
      >
        <span>❌ AI VISUALIZER UNAVAILABLE</span>
        <span style={{ fontSize: '0.62rem', color: '#555577', marginTop: '8px', fontFamily: 'Share Tech Mono' }}>
          Ensure Gemini API Key is configured in your environments.
        </span>
      </div>
    );
  }

  // Rendering individual dynamic visual styles
  const renderVisuals = () => {
    const { state } = currentStep;

    switch (activeType) {
      case 'array':
        return (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
            {state.arr.map((val, idx) => {
              const isLeft = state.left === idx;
              const isRight = state.right === idx;
              const isVisited = state.visited.includes(idx);
              const isFound = state.found && state.left === idx;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div 
                    style={{
                      width: '42px',
                      height: '42px',
                      background: isFound ? 'rgba(0, 255, 168, 0.2)' : isLeft ? 'rgba(255, 45, 158, 0.2)' : isVisited ? 'rgba(0, 255, 168, 0.1)' : '#0C0C14',
                      border: `1px solid ${isFound ? '#00FFA8' : isLeft ? '#FF2D9E' : isVisited ? '#00FFA8' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isFound ? '#00FFA8' : isLeft ? '#FF2D9E' : '#FFF',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      boxShadow: isLeft ? '0 0 10px rgba(255,45,158,0.2)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {val}
                  </div>
                  <div style={{ minHeight: '18px', display: 'flex', gap: '4px', fontSize: '0.62rem' }}>
                    {isLeft && <span style={{ color: '#FF2D9E' }}>L</span>}
                    {isRight && <span style={{ color: '#00FFA8' }}>R</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'tree':
        // Tree coordinates setup
        const nodes = [
          { id: 1, val: 10, x: 150, y: 30, left: 2, right: 3 },
          { id: 2, val: 5, x: 80, y: 90, left: 4, right: 5 },
          { id: 3, val: 15, x: 220, y: 90 },
          { id: 4, val: 3, x: 45, y: 150 },
          { id: 5, val: 7, x: 115, y: 150 }
        ];
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
            <svg width="300" height="180" style={{ background: 'transparent' }}>
              {/* Draw Edges */}
              <line x1="150" y1="30" x2="80" y2="90" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              <line x1="150" y1="30" x2="220" y2="90" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              <line x1="80" y1="90" x2="45" y2="150" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              <line x1="80" y1="90" x2="115" y2="150" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />

              {/* Draw Nodes */}
              {nodes.map(n => {
                const isCurrent = state.curr === n.id;
                const isVisited = state.visited.includes(n.val);
                return (
                  <g key={n.id}>
                    <circle 
                      cx={n.x} 
                      cy={n.y} 
                      r="16" 
                      fill={isCurrent ? 'rgba(255, 45, 158, 0.25)' : isVisited ? 'rgba(0, 255, 168, 0.15)' : '#0C0C14'}
                      stroke={isCurrent ? '#FF2D9E' : isVisited ? '#00FFA8' : 'rgba(255,255,255,0.1)'}
                      strokeWidth="2"
                    />
                    <text 
                      x={n.x} 
                      y={n.y + 4} 
                      textAnchor="middle" 
                      fill="#FFF" 
                      fontSize="9" 
                      fontFamily="Orbitron"
                      fontWeight="bold"
                    >
                      {n.val}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', fontFamily: 'Share Tech Mono' }}>
              <div>STACK: <span style={{ color: '#FF2D9E' }}>[{state.stack.join(', ')}]</span></div>
              <div>VISITED: <span style={{ color: '#00FFA8' }}>[{state.visited.join(', ')}]</span></div>
            </div>
          </div>
        );

      case 'graph':
        // Directed Graph Nodes coord
        const graphNodes = [
          { id: 'A', x: 150, y: 30 },
          { id: 'B', x: 60, y: 100 },
          { id: 'C', x: 240, y: 100 },
          { id: 'D', x: 150, y: 170 }
        ];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
            <svg width="300" height="200" style={{ background: 'transparent' }}>
              {/* Draw Edges */}
              {[
                { from: 'A', to: 'B', id: 'A-B' },
                { from: 'A', to: 'C', id: 'A-C' },
                { from: 'B', to: 'D', id: 'B-D' },
                { from: 'C', to: 'D', id: 'C-D' }
              ].map(e => {
                const fromNode = graphNodes.find(n => n.id === e.from);
                const toNode = graphNodes.find(n => n.id === e.to);
                const isActive = state.edge === e.id;
                return (
                  <line 
                    key={e.id}
                    x1={fromNode.x} y1={fromNode.y}
                    x2={toNode.x} y2={toNode.y}
                    stroke={isActive ? '#FF2D9E' : 'rgba(255,255,255,0.08)'}
                    strokeWidth={isActive ? '3' : '2'}
                  />
                );
              })}

              {/* Draw Nodes */}
              {graphNodes.map(n => {
                const isCurrent = state.curr === n.id;
                const isVisited = state.visited.includes(n.id);
                return (
                  <g key={n.id}>
                    <circle 
                      cx={n.x} 
                      cy={n.y} 
                      r="15" 
                      fill={isCurrent ? 'rgba(255, 45, 158, 0.25)' : isVisited ? 'rgba(0, 255, 168, 0.15)' : '#0C0C14'}
                      stroke={isCurrent ? '#FF2D9E' : isVisited ? '#00FFA8' : 'rgba(255,255,255,0.1)'}
                      strokeWidth="2"
                    />
                    <text 
                      x={n.x} 
                      y={n.y + 4} 
                      textAnchor="middle" 
                      fill="#FFF" 
                      fontSize="9" 
                      fontFamily="Orbitron"
                      fontWeight="bold"
                    >
                      {n.id}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', fontFamily: 'Share Tech Mono' }}>
              <div>QUEUE: <span style={{ color: '#FF2D9E' }}>[{state.queue.join(', ')}]</span></div>
              <div>VISITED: <span style={{ color: '#00FFA8' }}>[{state.visited.join(', ')}]</span></div>
            </div>
          </div>
        );

      case 'dp':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
            <div style={{ fontSize: '0.8rem', color: '#00FFA8', fontFamily: 'Share Tech Mono', letterSpacing: '1px' }}>
              FORMULA: <span style={{ color: '#FF2D9E' }}>dp[i] = dp[i-1] + dp[i-2]</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {state.dp.map((val, idx) => {
                const isActive = state.active === idx;
                const isDep = state.dependencies?.includes(idx);
                // Heatmap logic for filling background
                const intensity = Math.min(255, val * 15);
                const bg = isActive 
                  ? 'rgba(255, 45, 158, 0.3)' 
                  : isDep 
                  ? 'rgba(0, 255, 168, 0.2)' 
                  : `rgba(28, 28, ${50 + intensity}, 0.5)`;

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div 
                      style={{
                        width: '32px',
                        height: '32px',
                        background: bg,
                        border: `1px solid ${isActive ? '#FF2D9E' : isDep ? '#00FFA8' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontSize: '0.75rem',
                        fontFamily: 'Orbitron',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                    >
                      {val}
                    </div>
                    <span style={{ fontSize: '0.58rem', color: '#555' }}>i={idx}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'hash':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
            <div style={{ fontSize: '0.72rem', color: '#8888AA', display: 'flex', gap: '16px' }}>
              {state.val && <div>INSERT VALUE: {state.val}</div>}
              {state.hash !== null && <div>HASH INDEX: {state.hash}</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', width: '100%', maxWidth: '380px' }}>
              {state.buckets.map((val, idx) => {
                const isProbing = state.probing === idx;
                const isFilled = val !== null;
                const isColl = state.step === 'collision' && state.probing === idx;
                
                return (
                  <div 
                    key={idx}
                    style={{
                      background: isColl ? 'rgba(255, 45, 158, 0.15)' : isProbing ? 'rgba(0, 255, 168, 0.1)' : '#0C0C14',
                      border: `1px solid ${isColl ? '#FF2D9E' : isProbing ? '#00FFA8' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '4px',
                      padding: '8px',
                      textAlign: 'center',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ fontSize: '0.55rem', color: '#555' }}>bucket {idx}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isFilled ? '#00FFA8' : '#888', marginTop: '4px' }}>
                      {isFilled ? `${val.k}:${val.v}` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'sort':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
            <div style={{ display: 'flex', gap: '20px', fontSize: '0.72rem', color: '#8888AA' }}>
              <div>COMPARISONS: <span style={{ color: '#FF2D9E' }}>{state.comparisons}</span></div>
              <div>SWAPS: <span style={{ color: '#00FFA8' }}>{state.swaps}</span></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '110px' }}>
              {state.arr.map((val, idx) => {
                const isComparing = state.comparing.includes(idx);
                const isSorted = state.sorted.includes(idx);
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div 
                      style={{
                        width: '24px',
                        height: `${val * 10}px`,
                        background: isComparing ? '#FF2D9E' : isSorted ? '#00FFA8' : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'height 0.2s, background-color 0.2s'
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#FFF' }}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'linked_list':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            {state.list.map((val, idx) => {
              const isCurrent = state.curr === idx;
              const isVisited = state.visited.includes(idx);
              return (
                <React.Fragment key={idx}>
                  <div 
                    style={{
                      background: isCurrent ? 'rgba(255, 45, 158, 0.2)' : isVisited ? 'rgba(0, 255, 168, 0.1)' : '#0C0C14',
                      border: `1px solid ${isCurrent ? '#FF2D9E' : isVisited ? '#00FFA8' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '4px',
                      width: '45px',
                      height: '35px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCurrent ? '#FF2D9E' : '#FFF',
                      fontSize: '0.85rem',
                      fontFamily: 'Orbitron',
                      fontWeight: 'bold',
                      transition: 'all 0.3s'
                    }}
                  >
                    {val}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '1rem' }}>➔</span>
                </React.Fragment>
              );
            })}
            <div 
              style={{
                background: state.curr === null ? 'rgba(255, 45, 158, 0.2)' : '#0C0C14',
                border: `1px solid ${state.curr === null ? '#FF2D9E' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '4px',
                width: '50px',
                height: '35px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF5555',
                fontSize: '0.72rem',
                fontFamily: 'Orbitron',
                fontWeight: 'bold'
              }}
            >
              NULL
            </div>
          </div>
        );

      case 'binary_search':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: '0.75rem', color: '#00FFA8', fontFamily: 'Share Tech Mono' }}>
              TARGET: 23
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {state.arr.map((val, idx) => {
                const isLo = state.lo === idx;
                const isHi = state.hi === idx;
                const isMid = state.mid === idx;
                const isEliminated = idx < state.lo || idx > state.hi;
                const isFound = state.found && idx === state.mid;

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div 
                      style={{
                        width: '28px',
                        height: '28px',
                        background: isFound ? 'rgba(0, 255, 168, 0.2)' : isMid ? 'rgba(255, 45, 158, 0.2)' : '#0C0C14',
                        border: `1px solid ${isFound ? '#00FFA8' : isMid ? '#FF2D9E' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isFound ? '#00FFA8' : isMid ? '#FF2D9E' : '#FFF',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        opacity: isEliminated ? 0.25 : 1,
                        transition: 'all 0.3s'
                      }}
                    >
                      {val}
                    </div>
                    <div style={{ minHeight: '12px', display: 'flex', gap: '2px', fontSize: '0.48rem', fontFamily: 'Orbitron', color: '#AAA' }}>
                      {isLo && <span style={{ color: '#00FFA8' }}>L</span>}
                      {isMid && <span style={{ color: '#FF2D9E' }}>M</span>}
                      {isHi && <span style={{ color: '#FFF' }}>H</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'none':
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', width: '100%', minHeight: '220px' }}>
            <div style={{ fontSize: '0.62rem', fontFamily: 'Orbitron', color: '#FF2D9E', border: '1px solid #FF2D9E', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', marginBottom: '16px' }}>
              {activeType} Visualizer
            </div>
            <span style={{ fontSize: '1.05rem', fontFamily: 'Share Tech Mono', color: '#FFF', textAlign: 'center', marginBottom: '8px' }}>
              {currentStep.action}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#8888AA', textAlign: 'center', maxWidth: '450px', lineHeight: '1.4' }}>
              {currentStep.desc || currentStep.description}
            </span>
            
            {currentStep.state && Object.keys(currentStep.state).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '20px', background: '#07070C', padding: '12px 16px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {Object.entries(currentStep.state).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontFamily: 'Share Tech Mono' }}>
                    <span style={{ color: '#00FF88' }}>{key}:</span>
                    <span style={{ color: '#FFF' }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div 
      className="cp-visualizer" 
      style={{
        background: '#07070F',
        border: '1px solid rgba(255, 45, 120, 0.15)',
        borderRadius: '6px',
        overflow: 'hidden',
        fontFamily: 'Share Tech Mono, monospace',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Visualizer header */}
      <div 
        style={{
          background: '#0B0B13',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span style={{ fontFamily: 'Orbitron', color: '#00FFA8', fontSize: '0.78rem', letterSpacing: '1px' }}>
          SYSTEM_VIZ // {activeType.toUpperCase()}
        </span>
      </div>

      {/* Control bar */}
      <div 
        style={{
          background: '#09090F',
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={handleStepBack} 
            disabled={currentStepIndex === 0} 
            style={ctrlBtnStyle(currentStepIndex === 0)}
          >
            ◀ BACK
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            style={{
              background: 'transparent',
              border: `1px solid ${isPlaying ? '#FF2D9E' : '#00FFA8'}`,
              color: isPlaying ? '#FF2D9E' : '#00FFA8',
              borderRadius: '3px',
              padding: '4px 10px',
              fontSize: '0.66rem',
              fontFamily: 'Orbitron',
              cursor: 'pointer'
            }}
          >
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </button>
          <button 
            onClick={handleStepForward} 
            disabled={currentStepIndex === steps.length - 1} 
            style={ctrlBtnStyle(currentStepIndex === steps.length - 1)}
          >
            NEXT ▶
          </button>
          <button 
            onClick={handleReset} 
            style={ctrlBtnStyle(false)}
          >
            ⟳ RESET
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: '#888' }}>
          <span>SPEED:</span>
          <input 
            type="range" 
            min="1" 
            max="5" 
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ height: '3px', accentColor: '#00FFA8', background: '#222', border: 'none', width: '80px' }}
          />
          <span style={{ color: '#00FFA8', fontFamily: 'Orbitron' }}>{speed}x</span>
        </div>
      </div>

      {/* Main panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', minHeight: '260px' }}>
        {/* Left pane: Visual presentation & Step log */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'radial-gradient(circle, #0F0F1A 0%, #07070F 100%)' }}>
            {renderVisuals()}
          </div>
          
          <div 
            style={{
              height: '65px',
              background: '#040409',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '8px 12px',
              overflowY: 'auto',
              fontSize: '0.72rem',
              color: '#8888AA',
              lineHeight: '1.4'
            }}
          >
            {stepLogs.map((log) => (
              <div key={log.id} style={{ color: log.active ? '#00FFA8' : '#555', marginBottom: '2px' }}>
                &gt; {log.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right pane: Pseudocode Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#09090F' }}>
          <div 
            style={{
              padding: '6px 12px',
              borderBottom: '1px solid rgba(255, 45, 120, 0.1)',
              fontFamily: 'Orbitron',
              fontSize: '0.55rem',
              color: '#FF2D9E',
              letterSpacing: '1.5px',
              background: 'rgba(255, 45, 120, 0.03)'
            }}
          >
            PSEUDOCODE //
          </div>
          <div 
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '0.72rem',
              lineHeight: '1.4',
              color: '#8888AA',
              overflowY: 'auto',
              whiteSpace: 'pre'
            }}
          >
            {(PSEUDOCODE_TEMPLATES[activeType] || [
              "// Dynamic AI Walkthrough",
              ...steps.map((s, i) => `${i + 1}. ${s.action}`)
            ]).map((line, idx) => {
              const isActive = currentStep.active === idx || currentStepIndex === idx;
              const isCompleted = currentStep.done?.includes(idx) || idx < currentStepIndex;
              return (
                <div 
                  key={idx}
                  style={{
                    padding: '2px 6px',
                    borderLeft: `2px solid ${isActive ? '#FF2D9E' : isCompleted ? '#00FFA8' : 'transparent'}`,
                    background: isActive ? 'rgba(255, 45, 158, 0.08)' : isCompleted ? 'rgba(0, 255, 168, 0.03)' : 'transparent',
                    color: isActive ? '#FF2D9E' : isCompleted ? '#00FFA8' : '#888',
                    transition: 'all 0.2s'
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const ctrlBtnStyle = (disabled) => ({
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '3px',
  color: disabled ? '#444' : '#FFF',
  padding: '4px 10px',
  fontSize: '0.66rem',
  fontFamily: 'Orbitron',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.15s ease'
});
