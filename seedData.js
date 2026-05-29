const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, writeBatch } = require('firebase/firestore');

// ── MANUALLY LOAD .ENV CREDENTIALS ──
try {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        process.env[key] = value;
      }
    });
    console.log("📡 ENVIRONMENT CHANNELS ACTIVE: Loaded .env config successfully.");
  }
} catch (e) {
  console.log("⚠️ No active .env config file resolved; falling back to direct system configurations.");
}

// ── FIREBASE CONFIGURATION ──
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAub5Zpd5RmNyg1-glkUlbEVKau3LQ0iRo",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "code-arena-3d552.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "code-arena-3d552",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "code-arena-3d552.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "466965321907",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:466965321907:web:9ac9b71ffd93c476fc78c6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── DATA SEED MATRICES ──

const USERS = {
  'Glitch_Viper': {
    displayName: 'Glitch_Viper',
    email: 'viper@nexus.tech',
    photoURL: '',
    bio: 'Decoupling matrices and seeking algorithmic dominance.',
    college: 'Nexus Institute of Technology',
    languages: ['python', 'cpp'],
    rating: 1580,
    weeklyPoints: 340,
    streak: 12,
    solvedProblems: ['two-sum', 'lru-cache'],
    badges: ['Code Elite', 'Recursion Master'],
    coinsBalance: 450,
    followerCount: 15,
    followingCount: 8,
    isOnline: true,
    lastSeen: Date.now()
  },
  'Aura_Netrunner': {
    displayName: 'Aura_Netrunner',
    email: 'aura@netrunner.org',
    photoURL: '',
    bio: 'Netrunning through quantum binary trees.',
    college: 'Nexus Institute of Technology',
    languages: ['javascript', 'rust'],
    rating: 1720,
    weeklyPoints: 520,
    streak: 24,
    solvedProblems: ['median-two-arrays', 'merge-k-lists'],
    badges: ['Compiler Architect', 'Speed Champion'],
    coinsBalance: 890,
    followerCount: 42,
    followingCount: 18,
    isOnline: false,
    lastSeen: Date.now() - 3600000
  },
  'Binary_Ghost': {
    displayName: 'Binary_Ghost',
    email: 'ghost@aether.co',
    photoURL: '',
    bio: 'Phantom threads solving concurrent challenges.',
    college: 'Aether Cyber Academy',
    languages: ['cpp', 'rust'],
    rating: 1640,
    weeklyPoints: 210,
    streak: 15,
    solvedProblems: ['valid-parentheses', 'min-window-substring'],
    badges: ['Concurrency Sorcerer', 'Array Titan'],
    coinsBalance: 320,
    followerCount: 22,
    followingCount: 12,
    isOnline: true,
    lastSeen: Date.now()
  }
};

const POSTS = {
  'post_1': {
    uid: 'Glitch_Viper',
    type: 'SOLVED',
    problemId: 'two-sum',
    code: 'def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i',
    language: 'python',
    runtime_ms: 12,
    memory_kb: 14200,
    title: 'Optimized twoSum with single-pass hashmap',
    body: 'Fully vectorized linear traversal in O(N) space and time. Safe buffer boundaries verified.',
    tags: ['arrays', 'hashmap', 'easy'],
    reactionCounts: { fire: 8, clap: 4 },
    commentCount: 2,
    views: 45,
    createdAt: Date.now() - 7200000
  },
  'post_2': {
    uid: 'Aura_Netrunner',
    type: 'SOLVED',
    problemId: 'merge-k-lists',
    code: 'pub fn merge_k_lists(lists: Vec<Option<Box<ListNode>>>) -> Option<Box<ListNode>> {\n    let mut heap = BinaryHeap::new();\n    // ... MinHeap implementation\n}',
    language: 'rust',
    runtime_ms: 4,
    memory_kb: 4200,
    title: 'Merge K Sorted Lists via BinaryHeap Sentinel',
    body: 'Relativistic merge rates achieved through native Rust compilation heaps. Time complexity O(N log K).',
    tags: ['heap', 'divide-and-conquer', 'hard'],
    reactionCounts: { fire: 14, celebrate: 8, helpful: 5 },
    commentCount: 4,
    views: 110,
    createdAt: Date.now() - 14400000
  },
  'post_3': {
    uid: 'Binary_Ghost',
    type: 'STREAK',
    problemId: '',
    code: '',
    language: '',
    runtime_ms: 0,
    memory_kb: 0,
    title: 'Continuous Node Telemetry online for 15 days!',
    body: 'Streaking record compiled. Seeking contiguous ELO expansion buffers in subsequent arenas.',
    tags: ['streak', 'active'],
    reactionCounts: { celebrate: 12, clap: 8 },
    commentCount: 1,
    views: 32,
    createdAt: Date.now() - 28800000
  },
  'post_4': {
    uid: 'Glitch_Viper',
    type: 'BATTLE_WIN',
    problemId: 'lru-cache',
    code: '',
    language: '',
    runtime_ms: 0,
    memory_kb: 0,
    title: 'Speed Combat Victory in LRU Cache Matrix',
    body: 'Defeated @Binary_Ghost in speed combat duel. +24 ELO accumulated in active registry.',
    tags: ['battle', 'lru-cache', 'win'],
    reactionCounts: { fire: 10, clap: 6 },
    commentCount: 0,
    views: 50,
    createdAt: Date.now() - 86400000
  },
  'post_5': {
    uid: 'Aura_Netrunner',
    type: 'COURSE',
    problemId: '',
    code: '',
    language: '',
    runtime_ms: 0,
    memory_kb: 0,
    title: 'Curriculum Compiled: Dynamic Programming Paradigms',
    body: 'Completed 100% of the advanced DP sequence course including state compression and matrix exponentiation.',
    tags: ['courses', 'dp', 'completed'],
    reactionCounts: { celebrate: 15, helpful: 7 },
    commentCount: 3,
    views: 88,
    createdAt: Date.now() - 172800000
  }
};

const COMMUNITIES = {
  'nexus-algos': {
    name: 'Nexus Algorithms Guild',
    slug: 'nexus-algos',
    emoji: '🧠',
    memberCount: 128,
    tags: ['algorithms', 'dsa', 'competitive']
  },
  'rust-systems': {
    name: 'Rust Low-Level Compilers',
    slug: 'rust-systems',
    emoji: '🦀',
    memberCount: 74,
    tags: ['rust', 'systems', 'assembly']
  }
};

// ── TRANSACTION EXECUTION ──
const seed = async () => {
  console.log("⚡ INITIATING CYBER-DATA HARVEST: Seeding database pools...");
  const batch = writeBatch(db);

  // 1. Seed Users
  for (const [uid, udata] of Object.entries(USERS)) {
    const ref = doc(db, 'users', uid);
    batch.set(ref, udata);
    console.log(`👤 REGISTERED NODE: @${uid}`);
  }

  // 2. Seed Posts
  for (const [pid, pdata] of Object.entries(POSTS)) {
    const ref = doc(db, 'posts', pid);
    batch.set(ref, pdata);
    console.log(`📝 DISPATCHED POST: [${pid}] "${pdata.title}"`);
  }

  // 3. Seed Communities
  for (const [cid, cdata] of Object.entries(COMMUNITIES)) {
    const ref = doc(db, 'communities', cid);
    batch.set(ref, cdata);
    console.log(`🏫 ESTABLISHED COLLEGE GUILD: ${cdata.emoji} ${cdata.name}`);
  }

  try {
    await batch.commit();
    console.log("\n🚀 DATABASE TRANSFERS COMPLETE: CodeArena Social Layer fully active!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ TRANSMISSION CRASHED: Failed to write to Firestore:", err);
    process.exit(1);
  }
};

seed();
