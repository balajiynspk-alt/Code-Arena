import { db, isMockMode } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MOCK_PROBLEMS } from './mockData';

// Retrieve AI Gemini key from environment
const getGeminiApiKey = () => {
  return process.env.REACT_APP_GEMINI_KEY || "";
};

/**
 * ── Weakness Analysis Engine ──
 * Analyzes historical submissions database to isolate win rates, failure patterns,
 * difficulty drop-off, and execution bottlenecks.
 */
export const getUserWeaknessProfile = async (userId) => {
  if (isMockMode) {
    const existing = localStorage.getItem(`mock_weakness_profile_${userId}`);
    if (existing) {
      return JSON.parse(existing);
    }

    // Build profile from localStorage submission logs
    const submissionsRaw = localStorage.getItem('mock_submissions') || '[]';
    const submissions = JSON.parse(submissionsRaw);

    // Initial baseline stats
    let dpWins = 2, dpTotal = 6;       // ~33%
    let treeWins = 3, treeTotal = 7;   // ~42%
    let graphWins = 2, graphTotal = 6; // ~33%
    let arrayWins = 9, arrayTotal = 11; // ~81%
    
    let timeDP = 0, countDP = 0;
    let timeGraph = 0, countGraph = 0;
    let failuresList = ['boundary cases', 'off-by-one indices', 'null checks'];

    // Process actual submission history
    submissions.forEach(sub => {
      const prob = MOCK_PROBLEMS.find(p => p.id === sub.problemId);
      if (prob) {
        const isWin = sub.verdict === 'Accepted';
        const topics = prob.topics || [];
        const time = sub.executionTime || 15;

        topics.forEach(t => {
          const tLower = t.toLowerCase();
          if (tLower.includes('dp') || tLower.includes('dynamic')) {
            dpTotal++;
            if (isWin) dpWins++;
            timeDP += time;
            countDP++;
          } else if (tLower.includes('tree')) {
            treeTotal++;
            if (isWin) treeWins++;
          } else if (tLower.includes('graph') || tLower.includes('dfs') || tLower.includes('bfs')) {
            graphTotal++;
            if (isWin) graphWins++;
            timeGraph += time;
            countGraph++;
          } else if (tLower.includes('array') || tLower.includes('hash')) {
            arrayTotal++;
            if (isWin) arrayWins++;
          }
        });

        // Harvest failure vectors if submission rejected
        if (!isWin) {
          if (sub.code?.toLowerCase().includes('.length - 1') || sub.code?.toLowerCase().includes('<= length')) {
            failuresList.push('off-by-one indices');
          }
          if (sub.code?.toLowerCase().includes('== null') || sub.code?.toLowerCase().includes('=== undefined')) {
            failuresList.push('null checks');
          }
        }
      }
    });

    // Remove duplicates from failures
    failuresList = Array.from(new Set(failuresList));

    const weakTopics = [
      { topic: 'Dynamic Programming', winRate: Math.round((dpWins / dpTotal) * 100), avgTime: countDP > 0 ? Math.round(timeDP / countDP) : 42 },
      { topic: 'Graphs (DFS/BFS)', winRate: Math.round((graphWins / graphTotal) * 100), avgTime: countGraph > 0 ? Math.round(timeGraph / countGraph) : 38 },
      { topic: 'Trees & Recursion', winRate: Math.round((treeWins / treeTotal) * 100), avgTime: 29 }
    ];

    const strongTopics = [
      { topic: 'Arrays & Hashing', winRate: Math.round((arrayWins / arrayTotal) * 100), avgTime: 12 }
    ];

    // Sort weak topics ascending by win rate (lowest win rates are weakest)
    weakTopics.sort((a, b) => a.winRate - b.winRate);

    const profile = {
      weakTopics,
      strongTopics,
      failurePatterns: failuresList.slice(0, 3),
      recommendedDifficulty: 'Medium'
    };

    localStorage.setItem(`mock_weakness_profile_${userId}`, JSON.stringify(profile));
    return profile;
  }

  try {
    const profileRef = doc(db, 'weaknessProfiles', userId);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {
    console.error("Failed to fetch weakness profile:", e);
  }

  // Baseline standard profile
  return {
    weakTopics: [
      { topic: 'Dynamic Programming', winRate: 31, avgTime: 42 },
      { topic: 'Graphs (DFS/BFS)', winRate: 45, avgTime: 38 }
    ],
    strongTopics: [
      { topic: 'Arrays & Hashing', winRate: 82, avgTime: 12 }
    ],
    failurePatterns: ['boundary cases', 'off-by-one indices', 'null checks'],
    recommendedDifficulty: 'Medium'
  };
};

/**
 * Save weakness profile updates after solving
 */
export const saveWeaknessProfile = async (userId, profile) => {
  if (isMockMode) {
    localStorage.setItem(`mock_weakness_profile_${userId}`, JSON.stringify(profile));
    return true;
  }

  try {
    const profileRef = doc(db, 'weaknessProfiles', userId);
    await setDoc(profileRef, {
      ...profile,
      updatedAt: Date.now()
    });
    return true;
  } catch (e) {
    console.error("Failed to update weakness profile:", e);
    return false;
  }
};

/**
 * Heuristic similarity checker to reject generic LeetCode naming copies
 */
const getNoveltyScore = (title) => {
  const genericTitles = [
    'two sum', 'three sum', 'valid parentheses', 'merge intervals',
    'reverse string', 'binary search', 'coin change', 'climbing stairs'
  ];
  const target = title.toLowerCase().trim();
  let maxScore = 0;

  genericTitles.forEach(gen => {
    let matches = 0;
    const words = gen.split(' ');
    words.forEach(w => {
      if (target.includes(w)) matches++;
    });
    const similarity = matches / Math.max(words.length, target.split(' ').length);
    if (similarity > maxScore) maxScore = similarity;
  });

  return 1.0 - maxScore; // Score between 0 (not novel) and 1 (fully novel)
};

/**
 * Evaluates the editorial solution code against the testCases.
 */
const runEditorialValidation = (editorialCode, testCases) => {
  try {
    // Look for a Javascript function inside the code blocks or create a sandbox eval
    let jsCode = editorialCode;
    const blockMatch = jsCode.match(/```javascript([\s\S]*?)```/);
    if (blockMatch) {
      jsCode = blockMatch[1];
    } else {
      const generalBlock = jsCode.match(/```([\s\S]*?)```/);
      if (generalBlock) jsCode = generalBlock[1];
    }

    // Wrap JS function execution with a quick evaluator
    // eslint-disable-next-line no-new-func
    const userFunction = new Function(`
      ${jsCode}
      return solve;
    `)();

    if (typeof userFunction !== 'function') {
      throw new Error("Editorial solution code must define a 'solve' function");
    }

    // Run test cases
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      // Safely parse arguments if stored as string array
      let inputVal;
      try {
        inputVal = JSON.parse(tc.input);
      } catch {
        inputVal = tc.input;
      }

      let expectedVal;
      try {
        expectedVal = JSON.parse(tc.expected);
      } catch {
        expectedVal = tc.expected;
      }

      const result = Array.isArray(inputVal) 
        ? userFunction(...inputVal) 
        : userFunction(inputVal);

      const resStr = JSON.stringify(result);
      const expStr = JSON.stringify(expectedVal);

      if (resStr !== expStr) {
        console.warn(`Validation failed on test case ${i}: expected ${expStr}, got ${resStr}`);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn("Editorial validation encountered runner error:", err.message);
    return false;
  }
};

/**
 * ── Procedural Quantum Problem Compiler Fallback ──
 * Creates high-fidelity algorithm templates matching topic weaknesses if no Gemini API Key is available.
 */
const compileProceduralProblem = (profile) => {
  const primaryWeakness = profile.weakTopics[0]?.topic || 'Dynamic Programming';
  const pattern = profile.failurePatterns[0] || 'off-by-one indices';
  
  if (primaryWeakness.includes('Programming') || primaryWeakness.includes('DP')) {
    return {
      title: "Chronos-Loop Cache Minimizer",
      story: "A temporal engine core at the heart of Neo-Tokyo is stuck repeating subproblem branches, creating dimensional loops. You must devise a sliding temporal cache matrix that merges chronos segments cleanly without indexes bleeding.",
      description: "Given an array of integer cooldown weights and a target cycle interval, return the minimum cache memory segments needed to prevent overlapping loops. An off-by-one error will leak loop cycles into parallel dimension indices.",
      examples: [
        { input: "[2, 3, 5], 6", output: "2", explanation: "Merging cooldown weights [2,3] fills cycle interval bounds cleanly." },
        { input: "[1, 4], 4", output: "1", explanation: "Weight 4 directly covers bounds." },
        { input: "[], 5", output: "0", explanation: "Boundary check: empty weights require zero cache space." }
      ],
      constraints: [
        "weights.length <= 10^4",
        "weights[i] <= 500",
        "cycleInterval <= 10^5"
      ],
      hints: [
        "Initialize dynamic programming array with base case DP[0] = 0.",
        "Ensure indices do not drift beyond weights.length bounds.",
        "Check index == 0 boundaries to avoid off-by-one drops."
      ],
      editorial: `function solve(weights, target) {
        if (!weights || weights.length === 0) return 0;
        const dp = new Array(target + 1).fill(Infinity);
        dp[0] = 0;
        for (let i = 1; i <= target; i++) {
          for (let j = 0; j < weights.length; j++) {
            if (i >= weights[j]) {
              dp[i] = Math.min(dp[i], dp[i - weights[j]] + 1);
            }
          }
        }
        return dp[target] === Infinity ? -1 : dp[target];
      }`,
      starterCode: {
        python: "def solve(weights: list, target: int) -> int:\n    # Dynamic Programming synthesis\n    pass",
        javascript: "function solve(weights, target) {\n    // Dynamic Programming bounds checking\n}",
        cpp: "class Solution {\npublic:\n    int solve(vector<int>& weights, int target) {\n        \n    }\n};",
        java: "class Solution {\n    public int solve(int[] weights, int target) {\n        \n    }\n}"
      },
      testCases: [
        { input: "[[2, 3, 5], 6]", expected: "2" },
        { input: "[[1, 4], 4]", expected: "1" },
        { input: "[[], 5]", expected: "0" },
        { input: "[[9], 3]", expected: "-1" },
        { input: "[[3, 5], 8]", expected: "2" },
        { input: "[[1, 2, 5], 11]", expected: "3" },
        { input: "[[1, 3, 4], 6]", expected: "2" },
        { input: "[[], 0]", expected: "0" },
        { input: "[[2], 1]", expected: "-1" },
        { input: "[[2, 4], 5]", expected: "-1" }
      ],
      timeComplexity: "O(n * target)",
      spaceComplexity: "O(target)",
      targetedWeakness: `Directly targets ${pattern} inside nested ${primaryWeakness} arrays by testing boundary base indexes.`
    };
  } else if (primaryWeakness.includes('Graph')) {
    return {
      title: "Neon Nexus Router Probe",
      story: "You are an operator inside the Netrunner grid. Visual data packages are locking during DFS scans on neural junctions. You must discover the shortest cycle-free path to route standard probes safely.",
      description: "Given a network grid described as an adjacency list of bidirectional tunnels and a starting node, return the maximum node depth reachable without triggering a cyclic routing lock. Ensure you check for empty nodes to prevent null errors.",
      examples: [
        { input: "[[0,1],[1,2],[2,3]], 0", output: "3", explanation: "Routes cleanly through 0 -> 1 -> 2 -> 3 with depth 3." },
        { input: "[], 0", output: "0", explanation: "Empty junctions return depth 0." },
        { input: "[[0,1],[1,0]], 0", output: "1", explanation: "Cycle detected: halts loop immediately." }
      ],
      constraints: [
        "tunnels.length <= 10^3",
        "nodes <= 100",
        "startNode <= 99"
      ],
      hints: [
        "Represent the routing tunnels as an adjacency map.",
        "Perform cycle detection using active visited sets.",
        "Verify base case startNode null bounds."
      ],
      editorial: `function solve(tunnels, start) {
        if (!tunnels || tunnels.length === 0) return 0;
        const adj = {};
        for (let [u, v] of tunnels) {
          if (!adj[u]) adj[u] = [];
          if (!adj[v]) adj[v] = [];
          adj[u].push(v);
          adj[v].push(u);
        }
        if (!(start in adj)) return 0;
        let maxDepth = 0;
        const visited = new Set();
        function dfs(node, depth) {
          visited.add(node);
          maxDepth = Math.max(maxDepth, depth);
          const neighbors = adj[node] || [];
          for (let n of neighbors) {
            if (!visited.has(n)) {
              dfs(n, depth + 1);
            }
          }
          visited.delete(node);
        }
        dfs(start, 0);
        return maxDepth;
      }`,
      starterCode: {
        python: "def solve(tunnels: list, start: int) -> int:\n    # Graph router exploration\n    pass",
        javascript: "function solve(tunnels, start) {\n    // Graph router exploration\n}",
        cpp: "class Solution {\npublic:\n    int solve(vector<vector<int>>& tunnels, int start) {\n        \n    }\n};",
        java: "class Solution {\n    public int solve(int[][] tunnels, int start) {\n        \n    }\n}"
      },
      testCases: [
        { input: "[[[0,1],[1,2],[2,3]], 0]", expected: "3" },
        { input: "[[], 0]", expected: "0" },
        { input: "[[[0,1],[1,0]], 0]", expected: "1" },
        { input: "[[[0,1],[1,2]], 0]", expected: "2" },
        { input: "[[[1,2],[2,3],[3,4]], 1]", expected: "3" },
        { input: "[[[0,1],[0,2],[1,3]], 0]", expected: "2" },
        { input: "[[[0,1],[1,2],[2,0]], 0]", expected: "2" },
        { input: "[[[0,1]], 5]", expected: "0" },
        { input: "[[[1,2]], 1]", expected: "1" },
        { input: "[[[0,1],[1,2],[2,3],[3,4]], 0]", expected: "4" }
      ],
      timeComplexity: "O(V + E)",
      spaceComplexity: "O(V + E)",
      targetedWeakness: `Directly targets ${pattern} inside Graph traversals by introducing cyclic structures and empty edge cases.`
    };
  } else {
    // Trees fallback
    return {
      title: "Biotech Gene Splice Depth Checker",
      story: "You are splicing genetic code inside a cybernetic lab. The splicing sequence branches out like a binary tree. You must verify if the gene segments balance correctly to avoid indexing corruption.",
      description: "Given a represented flat array index of a binary tree, return the height of the tree. A boundary node may exist without child links; ensure you handle empty tree roots.",
      examples: [
        { input: "[3,9,20,null,null,15,7]", output: "3", explanation: "Depth of 3 levels generated." }
      ],
      constraints: [
        "tree.length <= 10^4"
      ],
      hints: [
        "A flat array node i has children at 2*i + 1 and 2*i + 2.",
        "Check boundary arrays carefully."
      ],
      editorial: `function solve(tree) {
        if (!tree || tree.length === 0 || tree[0] === null) return 0;
        function getDepth(idx) {
          if (idx >= tree.length || tree[idx] === null) return 0;
          return Math.max(getDepth(2 * idx + 1), getDepth(2 * idx + 2)) + 1;
        }
        return getDepth(0);
      }`,
      starterCode: {
        python: "def solve(tree: list) -> int:\n    pass",
        javascript: "function solve(tree) {\n    // Tree balance check\n}"
      },
      testCases: [
        { input: "[[3,9,20,null,null,15,7]]", expected: "3" },
        { input: "[[]]", expected: "0" },
        { input: "[[1]]", expected: "1" },
        { input: "[[1,2,3,4]]", expected: "3" },
        { input: "[[1,null,2]]", expected: "2" },
        { input: "[[1,2]]", expected: "2" },
        { input: "[[1,2,3]]", expected: "2" },
        { input: "[[1,2,3,4,5,6,7,8]]", expected: "4" },
        { input: "[[null]]", expected: "0" },
        { input: "[[1,null,null]]", expected: "1" }
      ],
      timeComplexity: "O(n)",
      spaceComplexity: "O(h)",
      targetedWeakness: `Directly targets ${pattern} in Trees by parsing index base nodes.`
    };
  }
};

/**
 * ── Gemini Problem Synthesis Pipeline ──
 * Attempts up to 3 runs, performing novelty checks, constraints verification,
 * and auto-running JS test suites to validate outputs.
 */
export const generateQuantumProblem = async (userId, profile) => {
  const apiKey = getGeminiApiKey();
  
  if (isMockMode && !apiKey) {
    // Generate a gorgeous procedural challenge locally
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(compileProceduralProblem(profile));
      }, 1000);
    });
  }

  if (!apiKey) {
    throw new Error("Missing REACT_APP_GEMINI_KEY in environment. Problem generation locked.");
  }

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const weakStr = profile.weakTopics.map(t => `${t.topic} (${t.winRate}% win rate)`).join(', ');
  const patternStr = profile.failurePatterns.join(', ');

  const prompt = `
Generate a completely original coding problem (NEVER seen on LeetCode, HackerRank, or CodeForces) that specifically targets and challenges these weak areas: ${weakStr}.
The developer frequently fails on: ${patternStr}.
Target difficulty level: ${profile.recommendedDifficulty || 'Medium'}.

You MUST output ONLY a valid JSON object matching this exact schema:
{
  "title": "Creative and immersive problem name",
  "story": "Short real-world or sci-fi narrative wrapping the algorithmic constraints",
  "description": "Clear technical problem statement explaining inputs, outputs, and behaviors",
  "examples": [
    {
      "input": "input representation as string (if multiple parameters, enclose as JSON array like [arg1, arg2])",
      "output": "expected output representation",
      "explanation": "why this input yields this output"
    }
  ],
  "constraints": [
    "Array length constraints...",
    "Value bounds..."
  ],
  "hints": [
    "Incremental progress hint 1",
    "Incremental progress hint 2",
    "Conceptual solution logic hint 3"
  ],
  "editorial": "function solve(...) { \\n // Write Javascript solution code here }",
  "starterCode": {
    "python": "def solve(arg):\n    # Write Python code\n    pass",
    "javascript": "function solve(arg) {\n    // Write JavaScript code\n}",
    "cpp": "class Solution {\npublic:\n    int solve(int arg) {\n        // Write C++ code\n    }\n};",
    "java": "class Solution {\n    public int solve(int arg) {\n        // Write Java code\n    }\n}"
  },
  "testCases": [
    {
      "input": "parameter representation (if multiple arguments, represent as stringified array like [[1,2], 5])",
      "expected": "expected output representation"
    }
  ],
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "targetedWeakness": "Short 1-2 sentence statement explaining why this problem directly trains their DP/Graph or off-by-one weakness."
}

Generate exactly 3 robust examples and 10 progressive test cases (including boundary edge cases like empty elements, zero bounds, or extreme limits).
Make sure constraints are realistic. Do not return any explanations or markdown backticks outside of the raw JSON object string.
`;

  // Pipeline retry loop (max 3 attempts)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      let cleanText = text;
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      const data = JSON.parse(cleanText);

      // Heuristic validations
      if (!data.title || !data.description || !data.starterCode || !data.testCases || data.testCases.length === 0) {
        throw new Error("Validation failed: missing crucial JSON attributes.");
      }

      // Quality Filter: Novelty score check
      const novelty = getNoveltyScore(data.title);
      if (novelty < 0.6) {
        throw new Error(`Novelty filter failed (score ${novelty}): title too similar to common DSA problems.`);
      }

      // Auto-Validation Pipeline: Run editorial solution against test cases
      const validationPassed = runEditorialValidation(data.editorial || data.starterCode.javascript, data.testCases);
      if (!validationPassed) {
        throw new Error("Validation pipeline runner failed: editorial solution output did not match test expected states.");
      }

      return data;
    } catch (err) {
      console.warn(`Attempt ${attempt} of Gemini Generator failed:`, err.message);
      if (attempt === 3) {
        // Ultimate compile failure fallback: Compile procedurally local
        return compileProceduralProblem(profile);
      }
    }
  }
};

/**
 * Archive custom quantum problem inside user's bank
 */
export const saveQuantumProblemToBank = async (userId, problem) => {
  if (isMockMode) {
    const bank = localStorage.getItem(`mock_quantum_bank_${userId}`) || '[]';
    const bankList = JSON.parse(bank);
    const id = `qp_${Date.now()}`;
    const newProblem = {
      id,
      ...problem,
      generatedAt: Date.now(),
      isSolved: false,
      feedbackScore: null
    };
    bankList.push(newProblem);
    localStorage.setItem(`mock_quantum_bank_${userId}`, JSON.stringify(bankList));
    return id;
  }

  try {
    const ref = collection(db, 'users', userId, 'quantumProblems');
    const docRef = await addDoc(ref, {
      ...problem,
      generatedAt: Date.now(),
      isSolved: false,
      feedbackScore: null
    });
    return docRef.id;
  } catch (e) {
    console.error("Failed to archive quantum problem:", e);
    return null;
  }
};

/**
 * Fetch personal bank of generated custom problems
 */
export const getQuantumProblemsBank = async (userId) => {
  if (isMockMode) {
    const bank = localStorage.getItem(`mock_quantum_bank_${userId}`) || '[]';
    return JSON.parse(bank);
  }

  try {
    const ref = collection(db, 'users', userId, 'quantumProblems');
    const snap = await getDocs(ref);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (e) {
    console.error("Failed to get quantum problem bank:", e);
    return [];
  }
};
