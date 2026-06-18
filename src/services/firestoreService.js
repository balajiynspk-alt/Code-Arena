import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  where, 
  onSnapshot, 
  writeBatch, 
  arrayUnion, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';

const BADGE_CONDITIONS = {
  'first_blood': u => u.solvedProblems?.length >= 1,
  'week_warrior': u => u.streak >= 7,
  'century_club': u => u.solvedProblems?.length >= 100,
  'scholar': u => u.completedCourses?.length >= 1,
  'contest_gladiator': u => u.contestTopTens >= 1,
};

// Activity Feed Logger Helper
export async function addToFeed(userId, activity) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    
    await addDoc(collection(db, 'feed'), {
      userId,
      username: userData.username || userData.displayName || userData.email || 'Anonymous Soldier',
      avatarUrl: userData.avatarUrl || userData.photoURL || null,
      ...activity,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("Failed to add activity to feed:", err);
  }
}

// 1. PROBLEM SUBMISSION FLOW
export async function submitSolution(userId, problemId, code, language, verdict, testResults) {
  const batch = writeBatch(db);
  
  // Save submission
  const subRef = doc(collection(db, 'submissions'));
  batch.set(subRef, {
    userId, problemId, code, language, verdict,
    testResults: testResults || [], submittedAt: serverTimestamp()
  });
  
  // If Accepted: update user stats
  if (verdict === 'Accepted') {
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      solvedProblems: arrayUnion(problemId),
      coinsBalance: increment(10),
      lastActiveDate: serverTimestamp(),
      weeklyPoints: increment(1)
    });
    
    await batch.commit();
    
    // Update streak
    await updateStreak(userId);
    
    // Check and award badges
    await checkBadges(userId);
  } else {
    await batch.commit();
  }
  
  // Write to activity feed
  await addToFeed(userId, {
    type: 'SOLVED',
    problemId,
    language,
    verdict
  });
}

// 2. STREAK SYSTEM
export async function updateStreak(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      streak: 1,
      lastActiveDate: serverTimestamp(),
      longestStreak: 1
    }, { merge: true });
    return;
  }
  
  const user = userSnap.data();
  const today = new Date().toDateString();
  const last = user.lastActiveDate?.toDate ? user.lastActiveDate.toDate().toDateString() : null;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  if (last === today) return; // already counted today
  
  const newStreak = last === yesterday 
    ? (user.streak || 0) + 1   // consecutive: increment
    : 1;                        // broken: reset to 1
  
  await updateDoc(userRef, {
    streak: newStreak,
    lastActiveDate: serverTimestamp(),
    longestStreak: Math.max(newStreak, user.longestStreak || 0)
  });
}

// 3. BADGE SYSTEM
export async function checkBadges(userId) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const user = snap.data();
  
  const newBadges = [];
  for (const [badge, condition] of Object.entries(BADGE_CONDITIONS)) {
    if (!user.badges?.includes(badge) && condition(user)) {
      newBadges.push(badge);
    }
  }
  
  if (newBadges.length > 0) {
    await updateDoc(userRef, { badges: arrayUnion(...newBadges) });
    
    // Create notification for each badge
    for (const badge of newBadges) {
      await addDoc(collection(db, 'notifications', userId, 'items'), {
        type: 'BADGE_EARNED',
        badge,
        text: `You earned the "${badge}" badge!`,
        read: false,
        createdAt: serverTimestamp()
      });
    }
  }
}

// 4. LEADERBOARD (real paginated query)
export async function getLeaderboard(type, currentUserId, page = 0) {
  // GLOBAL
  if (type === 'global') {
    const q = query(
      collection(db, 'users'),
      orderBy('rating', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d, i) => ({ rank: i + 1, ...d.data(), id: d.id }));
  }
  
  // WEEKLY
  if (type === 'weekly') {
    const q = query(
      collection(db, 'users'),
      orderBy('weeklyPoints', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d, i) => ({ rank: i + 1, ...d.data(), id: d.id }));
  }
  
  // FRIENDS
  if (type === 'friends') {
    if (!currentUserId) return [];
    
    const followSnap = await getDocs(
      query(collection(db, 'follows'), where('followerId', '==', currentUserId))
    );
    const friendIds = followSnap.docs.map(d => d.data().followingId);
    friendIds.push(currentUserId);
    
    const friends = await Promise.all(
      friendIds.map(async (id) => {
        const d = await getDoc(doc(db, 'users', id));
        return { exists: d.exists(), data: d.data(), id: d.id };
      })
    );
    
    return friends
      .filter(f => f.exists)
      .map(f => ({ ...f.data, id: f.id }))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .map((u, i) => ({ rank: i + 1, ...u }));
  }
  
  return [];
}

// 5. REAL-TIME NOTIFICATIONS
export function subscribeToNotifications(userId, callback) {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, snap => {
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(notifs);
  });
}

export async function markAllRead(userId) {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
}

// 6. PROBLEM PROGRESS TRACKING
export function subscribeToUserProgress(userId, callback) {
  return onSnapshot(doc(db, 'users', userId), snap => {
    callback(snap.data());
  });
}

export async function saveCodeDraft(userId, problemId, code, language) {
  await setDoc(
    doc(db, 'codeDrafts', `${userId}_${problemId}`),
    { code, language, savedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getCodeDraft(userId, problemId) {
  const snap = await getDoc(doc(db, 'codeDrafts', `${userId}_${problemId}`));
  return snap.exists() ? snap.data() : null;
}

// 7. CONTEST SYSTEM (real-time)
export function subscribeToContestLeaderboard(contestId, callback) {
  const q = query(
    collection(db, 'contestResults'),
    where('contestId', '==', contestId),
    orderBy('score', 'desc'),
    orderBy('penaltyTime', 'asc'),
    limit(100)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() })));
  });
}

export async function submitContestSolution(userId, contestId, problemId, code, language, verdict) {
  if (verdict !== 'Accepted') {
    // Add 20 minute penalty for wrong answer
    await setDoc(
      doc(db, 'contestResults', `${contestId}_${userId}`),
      {
        penaltyTime: increment(20),
        [`attempts.${problemId}`]: increment(1)
      },
      { merge: true }
    );
    return;
  }
  
  const solveTime = Date.now();
  await setDoc(
    doc(db, 'contestResults', `${contestId}_${userId}`),
    {
      contestId,
      userId,
      [`solved.${problemId}`]: solveTime,
      score: increment(1),
    },
    { merge: true }
  );
}
