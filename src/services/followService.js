import { db, auth, isMockMode } from './firebase';
import { 
  writeBatch, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  increment,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Follows a user by writing to the follows collection and incrementing user counts.
 * @param {string} targetUid - The UID of the user to be followed.
 * @returns {Promise<void>}
 */
export const followUser = async (targetUid) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Operator not authenticated.");
  const myUid = currentUser.uid;
  const myName = currentUser.displayName || myUid;

  if (isMockMode) {
    // ── MOCK/LOCAL STORAGE FALLBACK ──
    const relationKey = `mock_follow_${myUid}_${targetUid}`;
    localStorage.setItem(relationKey, JSON.stringify({
      followerId: myUid,
      followerName: myName,
      followingId: targetUid,
      createdAt: Date.now()
    }));

    // Update current user's profile following count
    const myProfileRaw = localStorage.getItem(`mock_profile_${myName}`);
    if (myProfileRaw) {
      const myProf = JSON.parse(myProfileRaw);
      const followingList = myProf.following || [];
      if (!followingList.includes(targetUid)) followingList.push(targetUid);
      localStorage.setItem(`mock_profile_${myName}`, JSON.stringify({
        ...myProf,
        following: followingList,
        followingCount: (myProf.followingCount || 0) + 1
      }));
    }

    // Update target user's profile follower count
    const targetProfileRaw = localStorage.getItem(`mock_profile_${targetUid}`);
    if (targetProfileRaw) {
      const tProf = JSON.parse(targetProfileRaw);
      const followerList = tProf.followers || [];
      if (!followerList.includes(myName)) followerList.push(myName);
      localStorage.setItem(`mock_profile_${targetUid}`, JSON.stringify({
        ...tProf,
        followers: followerList,
        followerCount: (tProf.followerCount || 0) + 1
      }));
    }
    return;
  }

  // ── REAL FIRESTORE WRITE BATCH ──
  const batch = writeBatch(db);
  const followDocRef = doc(db, 'follows', `${myUid}_${targetUid}`);
  
  batch.set(followDocRef, {
    followerId: myUid,
    followerName: myName,
    followingId: targetUid,
    createdAt: serverTimestamp()
  });

  // Increment active stats on both users
  const myUserRef = doc(db, 'users', myUid);
  const targetUserRef = doc(db, 'users', targetUid);

  batch.update(myUserRef, { followingCount: increment(1) });
  batch.update(targetUserRef, { followerCount: increment(1) });

  await batch.commit();
};

/**
 * Unfollows a user by deleting the follows document and decrementing user counts.
 * @param {string} targetUid - The UID of the user to be unfollowed.
 * @returns {Promise<void>}
 */
export const unfollowUser = async (targetUid) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Operator not authenticated.");
  const myUid = currentUser.uid;
  const myName = currentUser.displayName || myUid;

  if (isMockMode) {
    // ── MOCK/LOCAL STORAGE FALLBACK ──
    const relationKey = `mock_follow_${myUid}_${targetUid}`;
    localStorage.removeItem(relationKey);

    // Update current user's profile following count
    const myProfileRaw = localStorage.getItem(`mock_profile_${myName}`);
    if (myProfileRaw) {
      const myProf = JSON.parse(myProfileRaw);
      localStorage.setItem(`mock_profile_${myName}`, JSON.stringify({
        ...myProf,
        following: (myProf.following || []).filter(uid => uid !== targetUid),
        followingCount: Math.max(0, (myProf.followingCount || 0) - 1)
      }));
    }

    // Update target user's profile follower count
    const targetProfileRaw = localStorage.getItem(`mock_profile_${targetUid}`);
    if (targetProfileRaw) {
      const tProf = JSON.parse(targetProfileRaw);
      localStorage.setItem(`mock_profile_${targetUid}`, JSON.stringify({
        ...tProf,
        followers: (tProf.followers || []).filter(name => name !== myName),
        followerCount: Math.max(0, (tProf.followerCount || 0) - 1)
      }));
    }
    return;
  }

  // ── REAL FIRESTORE WRITE BATCH ──
  const batch = writeBatch(db);
  const followDocRef = doc(db, 'follows', `${myUid}_${targetUid}`);

  batch.delete(followDocRef);

  // Decrement active stats on both users
  const myUserRef = doc(db, 'users', myUid);
  const targetUserRef = doc(db, 'users', targetUid);

  batch.update(myUserRef, { followingCount: increment(-1) });
  batch.update(targetUserRef, { followerCount: increment(-1) });

  await batch.commit();
};

/**
 * Checks if the current authenticated user is following a target user.
 * @param {string} targetUid - The UID of the user to check.
 * @returns {Promise<boolean>}
 */
export const checkIsFollowing = async (targetUid) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  const myUid = currentUser.uid;

  if (isMockMode) {
    const relationKey = `mock_follow_${myUid}_${targetUid}`;
    return localStorage.getItem(relationKey) !== null;
  }

  const followDocRef = doc(db, 'follows', `${myUid}_${targetUid}`);
  const snap = await getDoc(followDocRef);
  return snap.exists();
};

/**
 * Retrieves the list of followers for a given user.
 * @param {string} uid - The target UID.
 * @returns {Promise<Array>}
 */
export const getFollowers = async (uid) => {
  if (isMockMode) {
    const followers = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('mock_follow_') && key.endsWith(`_${uid}`)) {
        const item = JSON.parse(localStorage.getItem(key));
        // Push detail structure
        followers.push({
          uid: item.followerId,
          displayName: item.followerName || item.followerId,
          rank: 'Expert',
          avatarUrl: ''
        });
      }
    }
    // Add default mock followers to make UI vibrant
    if (followers.length === 0) {
      return [
        { uid: 'Glitch_Viper', displayName: 'Glitch_Viper', rank: 'Expert', avatarUrl: '' },
        { uid: 'Aura_Netrunner', displayName: 'Aura_Netrunner', rank: 'Master', avatarUrl: '' }
      ];
    }
    return followers;
  }

  const q = query(collection(db, 'follows'), where('followingId', '==', uid));
  const snap = await getDocs(q);
  const relations = snap.docs.map(d => d.data());

  // Resolve profile items
  const userPromises = relations.map(async (r) => {
    const uSnap = await getDoc(doc(db, 'users', r.followerId));
    if (uSnap.exists()) {
      const uData = uSnap.data();
      return {
        uid: r.followerId,
        displayName: uData.displayName || r.followerId,
        rank: uData.rank || 'Beginner',
        avatarUrl: uData.avatarUrl || ''
      };
    }
    return { uid: r.followerId, displayName: r.followerId, rank: 'Beginner', avatarUrl: '' };
  });

  return Promise.all(userPromises);
};

/**
 * Retrieves the list of users a given user is following.
 * @param {string} uid - The target UID.
 * @returns {Promise<Array>}
 */
export const getFollowing = async (uid) => {
  if (isMockMode) {
    const following = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(`mock_follow_${uid}_`)) {
        const item = JSON.parse(localStorage.getItem(key));
        following.push({
          uid: item.followingId,
          displayName: item.followingId,
          rank: 'Master',
          avatarUrl: ''
        });
      }
    }
    // Add default mock following to make UI vibrant
    if (following.length === 0) {
      return [
        { uid: 'Glitch_Viper', displayName: 'Glitch_Viper', rank: 'Expert', avatarUrl: '' }
      ];
    }
    return following;
  }

  const q = query(collection(db, 'follows'), where('followerId', '==', uid));
  const snap = await getDocs(q);
  const relations = snap.docs.map(d => d.data());

  // Resolve profile items
  const userPromises = relations.map(async (r) => {
    const uSnap = await getDoc(doc(db, 'users', r.followingId));
    if (uSnap.exists()) {
      const uData = uSnap.data();
      return {
        uid: r.followingId,
        displayName: uData.displayName || r.followingId,
        rank: uData.rank || 'Beginner',
        avatarUrl: uData.avatarUrl || ''
      };
    }
    return { uid: r.followingId, displayName: r.followingId, rank: 'Beginner', avatarUrl: '' };
  });

  return Promise.all(userPromises);
};
