import { db, auth, isMockMode } from './firebase';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc,
  runTransaction
} from 'firebase/firestore';

/**
 * Publishes a coding solution to the public timeline.
 */
export const shareSolution = async ({
  problemId,
  problemTitle,
  difficulty,
  code,
  language,
  runtime_ms,
  memory_kb,
  caption,
  tags,
  isPublic = true
}) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");

  const post = {
    uid: currentUser.uid,
    username: currentUser.displayName || 'Operator',
    type: 'solution',
    problemId,
    problemTitle,
    difficulty,
    code,
    language,
    runtime_ms: Number(runtime_ms) || 24,
    memory_kb: Number(memory_kb) || 1240,
    caption: caption.substring(0, 120),
    tags: tags || [],
    reactionCounts: { fire: 0, clap: 0, mind: 0, helpful: 0 },
    commentCount: 0,
    isPublic,
    createdAt: Date.now()
  };

  const { indexPostTags } = await import('./tagService');

  if (isMockMode) {
    const key = 'mock_shared_solutions';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const id = `post_${Date.now()}`;
    const newPost = { id, ...post };
    list.unshift(newPost);
    localStorage.setItem(key, JSON.stringify(list));
    await indexPostTags(id, newPost);
    window.dispatchEvent(new Event('mock_solution_update'));
    return id;
  }

  // Production Firestore
  const postCol = collection(db, 'posts');
  const docRef = await addDoc(postCol, post);
  await indexPostTags(docRef.id, { id: docRef.id, ...post });
  return docRef.id;
};

/**
 * Returns all shared public solutions.
 */
export const getSharedSolutions = async () => {
  if (isMockMode) {
    const key = 'mock_shared_solutions';
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Baseline solutions templates
    const baseline = [
      {
        id: 'post_sol_1',
        uid: 'Glitch_Viper',
        username: 'Glitch_Viper',
        type: 'solution',
        problemId: 'two-sum',
        problemTitle: 'Two Sum',
        difficulty: 'Easy',
        code: 'def twoSum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            return [lookup[diff], i]\n        lookup[num] = i\n    return []',
        language: 'python',
        runtime_ms: 18,
        memory_kb: 14200,
        caption: 'Blazing fast single-pass lookup table approach using Python dictionaries. Optimal O(N) space time bounds!',
        tags: ['HashMap', 'Arrays', 'OnePass'],
        reactionCounts: { fire: 12, clap: 8, mind: 3, helpful: 15 },
        commentCount: 2,
        isPublic: true,
        createdAt: Date.now() - 600000
      },
      {
        id: 'post_sol_2',
        uid: 'Aura_Netrunner',
        username: 'Aura_Netrunner',
        type: 'solution',
        problemId: 'container-with-most-water',
        problemTitle: 'Container With Most Water',
        difficulty: 'Medium',
        code: 'function maxArea(height) {\n    let left = 0, right = height.length - 1;\n    let maxArea = 0;\n    while (left < right) {\n        let area = Math.min(height[left], height[right]) * (right - left);\n        maxArea = Math.max(maxArea, area);\n        if (height[left] < height[right]) left++;\n        else right--;\n    }\n    return maxArea;\n}',
        language: 'javascript',
        runtime_ms: 68,
        memory_kb: 42300,
        caption: 'Immersive sliding window two-pointer sequence! Converges optimal bounds dynamically.',
        tags: ['TwoPointers', 'Arrays', 'Greedy'],
        reactionCounts: { fire: 24, clap: 14, mind: 9, helpful: 18 },
        commentCount: 5,
        isPublic: true,
        createdAt: Date.now() - 3600000 * 2
      }
    ];
    localStorage.setItem(key, JSON.stringify(baseline));
    return baseline;
  }

  // Production Firestore
  const q = query(
    collection(db, 'posts'),
    where('type', '==', 'solution'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Handles toggling a single reaction on a shared solution.
 * @param {string} postId - Post ID
 * @param {string} type - 'fire' | 'mind' | 'clap' | 'helpful'
 */
export const toggleReaction = async (postId, type) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");
  const myUid = currentUser.uid;

  if (isMockMode) {
    const key = 'mock_shared_solutions';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = list.findIndex(p => p.id === postId);
    if (idx === -1) return;

    const post = list[idx];
    const reactKey = `mock_reaction_${postId}_${myUid}`;
    const previousReaction = localStorage.getItem(reactKey); // 'fire'|'mind'|'clap'|'helpful'|null

    if (previousReaction === type) {
      // Toggle off
      localStorage.removeItem(reactKey);
      post.reactionCounts[type] = Math.max(0, (post.reactionCounts[type] || 0) - 1);
    } else {
      // Decrement previous if existed
      if (previousReaction) {
        post.reactionCounts[previousReaction] = Math.max(0, (post.reactionCounts[previousReaction] || 0) - 1);
      }
      // Apply new
      localStorage.setItem(reactKey, type);
      post.reactionCounts[type] = (post.reactionCounts[type] || 0) + 1;
      
      // Notify post author!
      if (post.uid !== myUid) {
        try {
          const { createNotification } = await import('./notificationService');
          await createNotification(
            post.uid,
            'REACTION',
            `@${currentUser.displayName || 'Operator'} reacted with "${type}" on your shared solution for "${post.problemTitle}".`,
            `/problems/${post.problemId}`
          );
        } catch (err) {
          console.warn("Reaction notify failed:", err);
        }
      }
    }

    list[idx] = post;
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('mock_solution_update'));
    return post.reactionCounts;
  }

  // Production Firestore atomic transaction
  const postRef = doc(db, 'posts', postId);
  const reactRef = doc(db, 'reactions', postId, 'users', myUid);

  let updatedCounts = {};
  await runTransaction(db, async (transaction) => {
    const postSnap = await transaction.get(postRef);
    if (!postSnap.exists()) throw new Error("Post does not exist!");
    const reactSnap = await transaction.get(reactRef);

    const postData = postSnap.data();
    const counts = { ...postData.reactionCounts };
    const prevType = reactSnap.exists() ? reactSnap.data().type : null;

    if (prevType === type) {
      // Toggle off
      transaction.delete(reactRef);
      counts[type] = Math.max(0, (counts[type] || 0) - 1);
    } else {
      // Undo previous type if existed
      if (prevType) {
        counts[prevType] = Math.max(0, (counts[prevType] || 0) - 1);
      }
      // Add new type
      transaction.set(reactRef, { type, createdAt: Date.now() });
      counts[type] = (counts[type] || 0) + 1;
    }

    transaction.update(postRef, { reactionCounts: counts });
    updatedCounts = counts;
  });

  return updatedCounts;
};

/**
 * Returns the current authenticated user's active reaction on this post.
 */
export const getUserReaction = async (postId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  if (isMockMode) {
    return localStorage.getItem(`mock_reaction_${postId}_${currentUser.uid}`);
  }

  const reactRef = doc(db, 'reactions', postId, 'users', currentUser.uid);
  const snap = await getDoc(reactRef);
  return snap.exists() ? snap.data().type : null;
};
