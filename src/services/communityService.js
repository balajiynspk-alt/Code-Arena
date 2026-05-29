import { db, auth, isMockMode } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  runTransaction
} from 'firebase/firestore';

// Initial pre-seeded communities definitions
export const PRE_SEEDED_COMMUNITIES = [
  {
    id: 'comm_cp',
    name: 'Competitive Programming',
    slug: 'competitive-programming',
    emoji: '🏆',
    description: 'Master optimal space-time complexities, segment trees, DP matrix scaling, and fast binary lookups.',
    memberCount: 1420,
    weeklyChallengeProblemId: '1',
    tags: ['Algorithms', 'C++', 'Math', 'O(log N)']
  },
  {
    id: 'comm_interview',
    name: 'Interview Preparation',
    slug: 'interview-prep',
    emoji: '💼',
    description: 'Conquer FAANG algorithms, live technical rounds, behavioral matrices, and resume diagnostics.',
    memberCount: 980,
    weeklyChallengeProblemId: '2',
    tags: ['LeetCode', 'MockRounds', 'FAANG', 'Career']
  },
  {
    id: 'comm_python',
    name: 'Python Community',
    slug: 'python',
    emoji: '🐍',
    description: 'Elegant list comprehensions, Django microservices, data analytics pipelines, and AI embeddings.',
    memberCount: 840,
    weeklyChallengeProblemId: '3',
    tags: ['Django', 'Scripts', 'FastAPI', 'DataScience']
  },
  {
    id: 'comm_dsa',
    name: 'DSA Beginners',
    slug: 'dsa-beginners',
    emoji: '🧠',
    description: 'Beginner-friendly loops, link pointers, arrays, stacks, and queue structures. Start your journey here!',
    memberCount: 650,
    weeklyChallengeProblemId: '4',
    tags: ['Pointers', 'Arrays', 'Sorting', 'Beginner']
  },
  {
    id: 'comm_design',
    name: 'System Design',
    slug: 'system-design',
    emoji: '🏗️',
    description: 'Scalable system telemetry, sharding databases, load balancers, rate limiters, and micro-architectures.',
    memberCount: 520,
    weeklyChallengeProblemId: '5',
    tags: ['Microservices', 'Scale', 'Redis', 'Kafka']
  },
  {
    id: 'comm_gate',
    name: 'GATE Preparation',
    slug: 'gate-prep',
    emoji: '📝',
    description: 'Cracking CS GATE bounds. Discrete mathematics, OS kernels, compilers, and database theories.',
    memberCount: 430,
    weeklyChallengeProblemId: '1',
    tags: ['Theory', 'GATE', 'OS', 'Compilers']
  }
];

/**
 * Ensures baseline communities exist.
 */
export const seedCommunities = async () => {
  if (isMockMode) {
    if (!localStorage.getItem('mock_communities')) {
      localStorage.setItem('mock_communities', JSON.stringify(PRE_SEEDED_COMMUNITIES));
    }
    return;
  }

  for (const comm of PRE_SEEDED_COMMUNITIES) {
    const docRef = doc(db, 'communities', comm.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, comm);
    }
  }
};

/**
 * Returns all active communities.
 */
export const getCommunities = async () => {
  await seedCommunities();
  if (isMockMode) {
    return JSON.parse(localStorage.getItem('mock_communities') || '[]');
  }
  const snap = await getDocs(collection(db, 'communities'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Resolves a single community by its slug.
 */
export const getCommunityBySlug = async (slug) => {
  const comms = await getCommunities();
  return comms.find(c => c.slug === slug) || null;
};

/**
 * Joins a specific community.
 */
export const joinCommunity = async (communityId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");
  const uid = currentUser.uid;

  if (isMockMode) {
    const key = `mock_joined_${uid}`;
    const joined = JSON.parse(localStorage.getItem(key) || '[]');
    if (!joined.includes(communityId)) {
      joined.push(communityId);
      localStorage.setItem(key, JSON.stringify(joined));
      
      // Update community memberCount
      const comms = await getCommunities();
      const updated = comms.map(c => {
        if (c.id === communityId) return { ...c, memberCount: (c.memberCount || 0) + 1 };
        return c;
      });
      localStorage.setItem('mock_communities', JSON.stringify(updated));
    }
    return;
  }

  const memberRef = doc(db, 'communityMembers', communityId, 'members', uid);
  const commRef = doc(db, 'communities', communityId);

  await runTransaction(db, async (transaction) => {
    const commSnap = await transaction.get(commRef);
    if (!commSnap.exists()) throw new Error("Community does not exist!");
    
    transaction.set(memberRef, {
      uid,
      role: 'member',
      joinedAt: Date.now(),
      weeklyPoints: 0
    });

    const currentCount = commSnap.data().memberCount || 0;
    transaction.update(commRef, { memberCount: currentCount + 1 });
  });
};

/**
 * Leaves a community.
 */
export const leaveCommunity = async (communityId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");
  const uid = currentUser.uid;

  if (isMockMode) {
    const key = `mock_joined_${uid}`;
    const joined = JSON.parse(localStorage.getItem(key) || '[]');
    const updatedJoined = joined.filter(id => id !== communityId);
    localStorage.setItem(key, JSON.stringify(updatedJoined));

    // Decrement memberCount
    const comms = await getCommunities();
    const updated = comms.map(c => {
      if (c.id === communityId) return { ...c, memberCount: Math.max(0, (c.memberCount || 0) - 1) };
      return c;
    });
    localStorage.setItem('mock_communities', JSON.stringify(updated));
    return;
  }

  const memberRef = doc(db, 'communityMembers', communityId, 'members', uid);
  const commRef = doc(db, 'communities', communityId);

  await runTransaction(db, async (transaction) => {
    const commSnap = await transaction.get(commRef);
    if (!commSnap.exists()) throw new Error("Community does not exist!");

    transaction.delete(memberRef);

    const currentCount = commSnap.data().memberCount || 0;
    transaction.update(commRef, { memberCount: Math.max(0, currentCount - 1) });
  });
};

/**
 * Checks if the current user is a member of the community.
 */
export const checkIsMember = async (communityId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  if (isMockMode) {
    const joined = JSON.parse(localStorage.getItem(`mock_joined_${currentUser.uid}`) || '[]');
    return joined.includes(communityId);
  }

  const memberRef = doc(db, 'communityMembers', communityId, 'members', currentUser.uid);
  const snap = await getDoc(memberRef);
  return snap.exists();
};

/**
 * Fetches all communities the current user has joined.
 */
export const getJoinedCommunityIds = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  if (isMockMode) {
    return JSON.parse(localStorage.getItem(`mock_joined_${currentUser.uid}`) || '[]');
  }

  // Unfortunately Firestore cannot easily do collection group queries inside simple list limits without setup,
  // so we can resolve via community scan or simple joins:
  const comms = await getCommunities();
  const joinedIds = [];
  for (const c of comms) {
    const snap = await getDoc(doc(db, 'communityMembers', c.id, 'members', currentUser.uid));
    if (snap.exists()) joinedIds.push(c.id);
  }
  return joinedIds;
};

/**
 * Returns posts lists for a community, sorted by pins, and then creation date.
 */
export const getCommunityPosts = async (communityId) => {
  if (isMockMode) {
    const key = `mock_posts_${communityId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Dynamic high-fidelity mock posts!
    const baseline = [
      {
        id: 'post_baseline_1',
        uid: 'Aura_Netrunner',
        username: 'Aura_Netrunner',
        title: '💥 COMPLETE GUIDE: Mastering Fast Fourier Transforms (FFT) in Algorithmic Arenas',
        body: 'Fast Fourier Transform (FFT) is heavily used to multiply polynomials of size $N$ in $O(N \\log N)$ time. Most modern competitive contests feature constraint sets of $N = 10^5$, where $O(N^2)$ brute forces will time out.\n\n### Core Complexities:\n- Split coefficients into even/odd sequences\n- Recursively solve subproblems\n- Recombine with butterfly operations\n\nHope this resource makes you a master! 🚀',
        tags: ['FastFourier', 'Advanced', 'Resource'],
        type: 'resource',
        upvotes: 42,
        commentCount: 8,
        isPinned: true,
        createdAt: Date.now() - 3600000 * 12
      },
      {
        id: 'post_baseline_2',
        uid: 'Glitch_Viper',
        username: 'Glitch_Viper',
        title: '❓ Why is my matrix exponentiation failing on boundary constraints?',
        body: 'Im getting wrong verdicts on larger exponent ranges. I moduloed the addition bounds but it still overflows. Help!',
        tags: ['Matrix', 'Math', 'Help'],
        type: 'question',
        upvotes: 12,
        commentCount: 4,
        isPinned: false,
        createdAt: Date.now() - 3600000 * 2
      },
      {
        id: 'post_baseline_3',
        uid: 'Cyber_Synthesizer',
        username: 'Cyber_Synthesizer',
        title: '✅ Dynamic Programming: Knapsack O(W) Space Compression Optimized Solution',
        body: 'Managed to collapse the dynamic programming grid from $O(N \\times W)$ to a single 1D array by walking constraints backwards. Standard bottom-up bounds!\n\n```python\nfor w in range(W, val - 1, -1):\n    dp[w] = max(dp[w], dp[w - weight] + val)\n```',
        tags: ['Knapsack', 'DP', 'Optimized'],
        type: 'solution',
        upvotes: 28,
        commentCount: 3,
        isPinned: false,
        createdAt: Date.now() - 3600000 * 24
      }
    ];

    localStorage.setItem(key, JSON.stringify(baseline));
    return baseline;
  }

  const postsCol = collection(db, 'communityPosts', communityId, 'posts');
  const snap = await getDocs(query(postsCol, orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Submits a new post inside the community.
 */
export const createCommunityPost = async (communityId, title, body, tags, type) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");

  const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const post = {
    uid: currentUser.uid,
    username: currentUser.displayName || 'Operator',
    title,
    body,
    tags,
    type, // 'solution' | 'question' | 'resource'
    upvotes: 0,
    commentCount: 0,
    isPinned: false,
    createdAt: Date.now()
  };

  if (isMockMode) {
    const key = `mock_posts_${communityId}`;
    const posts = await getCommunityPosts(communityId);
    posts.unshift({ id: postId, ...post });
    localStorage.setItem(key, JSON.stringify(posts));
    return;
  }

  await setDoc(doc(db, 'communityPosts', communityId, 'posts', postId), post);
};

/**
 * Upvotes a community post.
 */
export const upvotePost = async (communityId, postId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");
  const myUid = currentUser.uid;

  if (isMockMode) {
    const key = `mock_posts_${communityId}`;
    const posts = await getCommunityPosts(communityId);
    const idx = posts.findIndex(p => p.id === postId);
    if (idx !== -1) {
      const trackerKey = `mock_upvote_post_${postId}_${myUid}`;
      if (localStorage.getItem(trackerKey)) {
        // Toggle down
        posts[idx].upvotes = Math.max(0, posts[idx].upvotes - 1);
        localStorage.removeItem(trackerKey);
      } else {
        // Toggle up
        posts[idx].upvotes += 1;
        localStorage.setItem(trackerKey, 'true');
        
        // Notify post owner
        if (posts[idx].uid !== myUid) {
          const { createNotification } = await import('./notificationService');
          await createNotification(
            posts[idx].uid,
            'REACTION',
            `@${currentUser.displayName || 'Operator'} upvoted your community post: "${posts[idx].title.substring(0, 30)}..."`,
            `/community/${communityId}`
          );
        }
      }
      localStorage.setItem(key, JSON.stringify(posts));
      return posts[idx].upvotes;
    }
    return 0;
  }

  const postRef = doc(db, 'communityPosts', communityId, 'posts', postId);
  const upvoteTrackerRef = doc(db, 'communityPosts', communityId, 'posts', postId, 'upvotes', myUid);
  
  let result = 0;
  let targetUid = null;
  let postTitle = '';
  let didUpvote = false;
  await runTransaction(db, async (transaction) => {
    const postSnap = await transaction.get(postRef);
    if (!postSnap.exists()) throw new Error("Post does not exist!");
    const trackerSnap = await transaction.get(upvoteTrackerRef);

    let up = postSnap.data().upvotes || 0;
    targetUid = postSnap.data().uid;
    postTitle = postSnap.data().title;

    if (trackerSnap.exists()) {
      transaction.delete(upvoteTrackerRef);
      up = Math.max(0, up - 1);
      didUpvote = false;
    } else {
      transaction.set(upvoteTrackerRef, { upvoted: true });
      up += 1;
      didUpvote = true;
    }
    transaction.update(postRef, { upvotes: up });
    result = up;
  });

  if (didUpvote && targetUid && targetUid !== myUid) {
    const { createNotification } = await import('./notificationService');
    await createNotification(
      targetUid,
      'REACTION',
      `@${currentUser.displayName || 'Operator'} upvoted your community post: "${postTitle.substring(0, 30)}..."`,
      `/community/${communityId}`
    );
  }
  return result;
};

/**
 * Returns member rankings list sorted by weekly points.
 */
export const getCommunityMembers = async (communityId) => {
  if (isMockMode) {
    // Populate with 5 high-fidelity developer rank nodes!
    return [
      { uid: 'Aura_Netrunner', username: 'Aura_Netrunner', role: 'moderator', weeklyPoints: 480, joinedAt: Date.now() - 86400000 * 20 },
      { uid: 'Glitch_Viper', username: 'Glitch_Viper', role: 'member', weeklyPoints: 320, joinedAt: Date.now() - 86400000 * 15 },
      { uid: 'Cyber_Synthesizer', username: 'Cyber_Synthesizer', role: 'member', weeklyPoints: 210, joinedAt: Date.now() - 86400000 * 10 },
      { uid: 'Data_Daemon', username: 'Data_Daemon', role: 'member', weeklyPoints: 95, joinedAt: Date.now() - 86400000 * 5 },
      { uid: 'Net_Spectre', username: 'Net_Spectre', role: 'member', weeklyPoints: 40, joinedAt: Date.now() - 86400000 * 2 }
    ];
  }

  const membersCol = collection(db, 'communityMembers', communityId, 'members');
  const snap = await getDocs(query(membersCol, orderBy('weeklyPoints', 'desc')));
  
  // We can fetch usernames inside page or attach standard fallbacks
  return snap.docs.map(d => ({
    uid: d.id,
    username: `Operator_${d.id.substring(0, 5)}`,
    ...d.data()
  }));
};
