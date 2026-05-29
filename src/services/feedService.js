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
  limit, 
  startAfter, 
  writeBatch,
  increment,
  runTransaction
} from 'firebase/firestore';
import { getFollowing } from './followService';

/**
 * Creates and writes a new feed item to the global feed collection.
 * @param {string} userId - The operator ID.
 * @param {string} username - The operator name.
 * @param {string} type - 'SOLVED' | 'BATTLE_WIN' | 'CONTEST' | 'COURSE' | 'STREAK'
 * @param {object} payload - Action-specific variables.
 * @returns {Promise<void>}
 */
export const addFeedItem = async (userId, username, type, payload) => {
  const itemId = `${userId}_${Date.now()}`;
  const feedRef = doc(db, 'feed', itemId);

  const item = {
    id: itemId,
    userId,
    username,
    avatarUrl: '',
    type,
    payload,
    reactions: { fire: 0, celebrate: 0, helpful: 0, clap: 0 },
    reactionUsers: { fire: [], celebrate: [], helpful: [], clap: [] },
    commentCount: 0,
    timestamp: Date.now()
  };

  if (isMockMode) {
    const localRaw = localStorage.getItem('mock_feed_items');
    const items = localRaw ? JSON.parse(localRaw) : [];
    items.unshift(item);
    localStorage.setItem('mock_feed_items', JSON.stringify(items));
    return;
  }

  // Also write to user-nested subcollection as requested: feed/{userId}/items
  const batch = writeBatch(db);
  const userSubRef = doc(db, 'users', userId, 'items', itemId);
  
  batch.set(feedRef, item);
  batch.set(userSubRef, item);
  await batch.commit();
};

/**
 * Retrieves the home feed combining items from followed users and self.
 * @param {string} uid - Current user ID.
 * @param {object} lastVisibleDoc - Firestore startAfter cursor element (or index in mock mode).
 * @param {number} pageSize - Limit of items per page.
 * @returns {Promise<object>} - { items: Array, lastVisible: cursor }
 */
export const getHomeFeed = async (uid, lastVisibleDoc = null, pageSize = 20) => {
  const currentUser = auth.currentUser;
  const myName = currentUser?.displayName || uid;

  if (isMockMode) {
    // ── MOCK/LOCAL STORAGE FALLBACK ──
    let items = [];
    const localRaw = localStorage.getItem('mock_feed_items');
    
    if (localRaw) {
      items = JSON.parse(localRaw);
    } else {
      // Prepopulate with gorgeous cyberpunk baseline actions
      items = [
        {
          id: 'mock_f1',
          userId: 'Aura_Netrunner',
          username: 'Aura_Netrunner',
          type: 'SOLVED',
          payload: { problem: 'LRU Cache Routing', time: '14 min', lang: 'python', runtime: '48ms (Faster than 96.2%)' },
          reactions: { fire: 8, celebrate: 4, helpful: 2, clap: 5 },
          reactionUsers: { fire: [], celebrate: [], helpful: [], clap: [] },
          commentCount: 3,
          timestamp: Date.now() - 600000 // 10m ago
        },
        {
          id: 'mock_f2',
          userId: 'Glitch_Viper',
          username: 'Glitch_Viper',
          type: 'BATTLE_WIN',
          payload: { opponent: 'Binary_Ghost', rating: 32 },
          reactions: { fire: 12, celebrate: 8, helpful: 0, clap: 10 },
          reactionUsers: { fire: [], celebrate: [], helpful: [], clap: [] },
          commentCount: 5,
          timestamp: Date.now() - 3600000 // 1h ago
        },
        {
          id: 'mock_f3',
          userId: 'Cyber_Synthesizer',
          username: 'Cyber_Synthesizer',
          type: 'CONTEST',
          payload: { rank: 14, contest: 'Grid-Run Weekly Arena #48' },
          reactions: { fire: 6, celebrate: 12, helpful: 4, clap: 8 },
          reactionUsers: { fire: [], celebrate: [], helpful: [], clap: [] },
          commentCount: 2,
          timestamp: Date.now() - 7200000 // 2h ago
        },
        {
          id: 'mock_f4',
          userId: 'Aura_Netrunner',
          username: 'Aura_Netrunner',
          type: 'STREAK',
          payload: { n: 15 },
          reactions: { fire: 24, celebrate: 10, helpful: 1, clap: 15 },
          reactionUsers: { fire: [], celebrate: [], helpful: [], clap: [] },
          commentCount: 8,
          timestamp: Date.now() - 86400000 // 1 day ago
        },
        {
          id: 'mock_f5',
          userId: 'Glitch_Viper',
          username: 'Glitch_Viper',
          type: 'COURSE',
          payload: { course: 'Quantum Trees and Graphs' },
          reactions: { fire: 4, celebrate: 6, helpful: 8, clap: 4 },
          reactionUsers: { fire: [], celebrate: [], helpful: [], clap: [] },
          commentCount: 0,
          timestamp: Date.now() - 172800000 // 2 days ago
        }
      ];
      localStorage.setItem('mock_feed_items', JSON.stringify(items));
    }

    // Filter items from users I follow + myself
    let followedIds = [uid, myName];
    try {
      const followingList = await getFollowing(uid);
      followedIds = [...followedIds, ...followingList.map(u => u.uid), ...followingList.map(u => u.displayName)];
    } catch (e) {
      console.warn("Could not retrieve following list, showing all feed items", e);
    }

    const filtered = items.filter(item => 
      followedIds.includes(item.userId) || followedIds.includes(item.username)
    );

    // Pagination slice
    const startIndex = lastVisibleDoc ? Number(lastVisibleDoc) : 0;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);
    const nextCursor = (startIndex + pageSize < filtered.length) ? (startIndex + pageSize).toString() : null;

    return {
      items: paginatedItems,
      lastVisible: nextCursor
    };
  }

  // ── PRODUCTION FIRESTORE PAGINATION ──
  // Resolve followed list
  let followedUids = [uid];
  try {
    const following = await getFollowing(uid);
    followedUids = [uid, ...following.map(u => u.uid)];
  } catch (e) {
    console.error("Error retrieving following list for query", e);
  }

  // Firestore "in" queries are limited to 30 elements.
  const queriedUids = followedUids.slice(0, 30);

  let q = query(
    collection(db, 'feed'),
    where('userId', 'in', queriedUids),
    orderBy('timestamp', 'desc'),
    limit(pageSize)
  );

  if (lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }

  const snap = await getDocs(q);
  const items = snap.docs.map(doc => doc.data());
  const lastDoc = snap.docs[snap.docs.length - 1] || null;

  return {
    items,
    lastVisible: lastDoc
  };
};

/**
 * Toggles a user's reaction on a feed item.
 * @param {string} itemId - The feed item ID.
 * @param {string} reactionType - 'fire' | 'celebrate' | 'helpful' | 'clap'
 * @param {string} userId - The operator UID reacting.
 * @returns {Promise<object>} - Updated reactions object.
 */
export const toggleReaction = async (itemId, reactionType, userId) => {
  if (isMockMode) {
    const localRaw = localStorage.getItem('mock_feed_items');
    if (!localRaw) return null;
    const items = JSON.parse(localRaw);
    
    const index = items.findIndex(i => i.id === itemId);
    if (index === -1) return null;

    const item = items[index];
    if (!item.reactionUsers) item.reactionUsers = { fire: [], celebrate: [], helpful: [], clap: [] };
    if (!item.reactions) item.reactions = { fire: 0, celebrate: 0, helpful: 0, clap: 0 };

    const usersList = item.reactionUsers[reactionType] || [];
    const hasReacted = usersList.includes(userId);

    if (hasReacted) {
      item.reactionUsers[reactionType] = usersList.filter(id => id !== userId);
      item.reactions[reactionType] = Math.max(0, (item.reactions[reactionType] || 0) - 1);
    } else {
      usersList.push(userId);
      item.reactionUsers[reactionType] = usersList;
      item.reactions[reactionType] = (item.reactions[reactionType] || 0) + 1;
    }

    items[index] = item;
    localStorage.setItem('mock_feed_items', JSON.stringify(items));
    return item.reactions;
  }

  // Firestore transaction to ensure atomic updates
  const itemRef = doc(db, 'feed', itemId);
  let updatedReactions = {};

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(itemRef);
    if (!docSnap.exists()) throw new Error("Feed item does not exist!");

    const data = docSnap.data();
    const rxUsers = data.reactionUsers || { fire: [], celebrate: [], helpful: [], clap: [] };
    const rxCounts = data.reactions || { fire: 0, celebrate: 0, helpful: 0, clap: 0 };

    const currentUsers = rxUsers[reactionType] || [];
    const reacted = currentUsers.includes(userId);

    if (reacted) {
      rxUsers[reactionType] = currentUsers.filter(id => id !== userId);
      rxCounts[reactionType] = Math.max(0, rxCounts[reactionType] - 1);
    } else {
      currentUsers.push(userId);
      rxUsers[reactionType] = currentUsers;
      rxCounts[reactionType] = rxCounts[reactionType] + 1;
    }

    transaction.update(itemRef, {
      reactions: rxCounts,
      reactionUsers: rxUsers
    });

    updatedReactions = rxCounts;
  });

  return updatedReactions;
};
