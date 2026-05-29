import { db, isMockMode } from './firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';

// Static lists of all standard tags for auto-suggest
export const TOPIC_TAGS = [
  'Arrays', 'Trees', 'DP', 'Graphs', 'Greedy', 
  'Binary Search', 'Stack', 'Queue', 'Heap', 'Strings', 'Math'
];

export const APPROACH_TAGS = [
  'HashMap', 'Two Pointers', 'Sliding Window', 'BFS/DFS', 'Recursion', 'Bit Manipulation'
];

/**
 * In Firestore, indexes a shared solution under tagIndex/{tag}/posts/{postId}
 * @param {string} postId 
 * @param {object} post 
 */
export const indexPostTags = async (postId, post) => {
  const tags = post.tags || [];
  if (tags.length === 0) return;

  if (isMockMode) {
    // In mock mode, we keep indexing in mock_tag_index
    const key = 'mock_tag_index';
    const tagIndex = JSON.parse(localStorage.getItem(key) || '{}');
    
    tags.forEach(tag => {
      if (!tagIndex[tag]) tagIndex[tag] = {};
      tagIndex[tag][postId] = { id: postId, ...post };
    });
    
    localStorage.setItem(key, JSON.stringify(tagIndex));
    return;
  }

  // Production Firestore: Concurrent writes to index posts in nested subcollections
  try {
    const promises = tags.map(async (tag) => {
      const indexDocRef = doc(db, 'tagIndex', tag, 'posts', postId);
      await setDoc(indexDocRef, {
        id: postId,
        uid: post.uid,
        username: post.username,
        type: 'solution',
        problemId: post.problemId,
        problemTitle: post.problemTitle,
        difficulty: post.difficulty,
        code: post.code,
        language: post.language,
        runtime_ms: post.runtime_ms,
        memory_kb: post.memory_kb,
        caption: post.caption,
        tags: post.tags,
        reactionCounts: post.reactionCounts || { fire: 0, clap: 0, mind: 0, helpful: 0 },
        commentCount: post.commentCount || 0,
        isPublic: post.isPublic,
        createdAt: post.createdAt
      });
    });
    await Promise.all(promises);
  } catch (err) {
    console.error("Error writing tag index document:", err);
  }
};

/**
 * Removes tag indexes if a post is deleted
 */
export const deindexPostTags = async (postId, tags) => {
  if (!tags || tags.length === 0) return;

  if (isMockMode) {
    const key = 'mock_tag_index';
    const tagIndex = JSON.parse(localStorage.getItem(key) || '{}');
    tags.forEach(tag => {
      if (tagIndex[tag]) {
        delete tagIndex[tag][postId];
      }
    });
    localStorage.setItem(key, JSON.stringify(tagIndex));
    return;
  }

  try {
    const promises = tags.map(async (tag) => {
      const indexDocRef = doc(db, 'tagIndex', tag, 'posts', postId);
      await deleteDoc(indexDocRef);
    });
    await Promise.all(promises);
  } catch (err) {
    console.error("Error deindexing post tags:", err);
  }
};

/**
 * Retrieves all solution posts containing a specific tag.
 * Supports sorting by 'new' or 'top' (reactions count).
 */
export const getPostsByTag = async (tag, sortBy = 'new') => {
  if (isMockMode) {
    // Retrieve from local mock tag index
    const key = 'mock_tag_index';
    const tagIndex = JSON.parse(localStorage.getItem(key) || '{}');
    const postsObj = tagIndex[tag] || {};
    let posts = Object.values(postsObj);

    // Fallback: search main shared solutions if the index doesn't have it yet
    if (posts.length === 0) {
      const { getSharedSolutions } = await import('./solutionShareService');
      const allShared = await getSharedSolutions();
      posts = allShared.filter(p => p.tags && p.tags.includes(tag));
    }

    // Apply sorting
    if (sortBy === 'top') {
      posts.sort((a, b) => {
        const reactionsA = Object.values(a.reactionCounts || {}).reduce((acc, v) => acc + v, 0);
        const reactionsB = Object.values(b.reactionCounts || {}).reduce((acc, v) => acc + v, 0);
        return reactionsB - reactionsA;
      });
    } else {
      posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return posts;
  }

  // Production Firestore fetch
  try {
    const indexCol = collection(db, 'tagIndex', tag, 'posts');
    const q = query(indexCol, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (sortBy === 'top') {
      posts.sort((a, b) => {
        const reactionsA = Object.values(a.reactionCounts || {}).reduce((acc, v) => acc + v, 0);
        const reactionsB = Object.values(b.reactionCounts || {}).reduce((acc, v) => acc + v, 0);
        return reactionsB - reactionsA;
      });
    }
    return posts;
  } catch (err) {
    console.error(`Error querying solutions with tag ${tag}:`, err);
    return [];
  }
};

/**
 * Computes a leaderboard ranking users who solved the most problems in a topic
 */
export const getTagLeaderboard = async (tag) => {
  // Query all posts/solutions for this tag, then group by user display name
  const posts = await getPostsByTag(tag, 'new');
  const userMap = {};

  posts.forEach(post => {
    const username = post.username || 'Operator';
    if (!userMap[username]) {
      userMap[username] = {
        username: username,
        solvedCount: 0,
        rating: 1200,
        rank: 'Expert'
      };
    }
    userMap[username].solvedCount += 1;
  });

  const leaderboard = Object.values(userMap);
  leaderboard.sort((a, b) => b.solvedCount - a.solvedCount);

  // Inject some fun ranks/ratings if not fully present
  return leaderboard.map((u, index) => {
    let rating = 1200 + u.solvedCount * 25;
    let rank = 'Intermediate';
    if (rating > 1600) rank = 'Master';
    else if (rating > 1400) rank = 'Expert';

    return {
      rankIndex: index + 1,
      displayName: u.username,
      solvedCount: u.solvedCount,
      rating,
      rank
    };
  });
};

/**
 * Aggregates all post tags to find the top active trending tags
 */
export const getTrendingTags = async () => {
  let posts = [];

  if (isMockMode) {
    const { getSharedSolutions } = await import('./solutionShareService');
    posts = await getSharedSolutions();
  } else {
    try {
      const postCol = collection(db, 'posts');
      const q = query(postCol, orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      posts = snap.docs.map(d => d.data());
    } catch (e) {
      console.warn("Could not query trending tags from firestore. Falling back to default list.", e);
    }
  }

  const tagCounts = {};
  posts.forEach(p => {
    if (p.tags && Array.isArray(p.tags)) {
      p.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  // Convert to array and sort
  const trendingList = Object.keys(tagCounts).map(tag => ({
    name: tag,
    count: tagCounts[tag]
  }));

  trendingList.sort((a, b) => b.count - a.count);

  // Return top 5 trending, or standard list if none exist yet
  if (trendingList.length === 0) {
    return [
      { name: 'HashMap', count: 12 },
      { name: 'Arrays', count: 10 },
      { name: 'TwoPointers', count: 8 },
      { name: 'Greedy', count: 7 },
      { name: 'DP', count: 5 }
    ];
  }

  return trendingList.slice(0, 5);
};
