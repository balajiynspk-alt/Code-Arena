import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';

const BOSS_NAMES = ["The Graph Reaper", "DP Demon", "The Binary Beast", "Stack Overflow Spirit"];

/**
 * Fetches or instantiates the Daily Boss doc for today's calendar date.
 */
export const getDailyBoss = async () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const docRef = doc(db, 'dailyBoss', todayStr);
  
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    } else {
      // Create new daily boss instance
      const bossName = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)];
      const bossData = {
        problemId: 'boss_problem_' + todayStr.replace(/-/g, '_'),
        problemTitle: 'Optimized Path Reconstruction',
        difficulty: 'Hard',
        bossName,
        bossHP: 10000,
        currentHP: 10000,
        defeated: false,
        defeatTime: null,
        participants: [],
        topDamagers: [],
        recentHits: []
      };
      await setDoc(docRef, bossData);
      return bossData;
    }
  } catch (err) {
    console.error("Error loading daily boss:", err);
    return null;
  }
};

/**
 * Commits damage hit event details to Firestore.
 */
export const attackBoss = async (userId, userName, damage, runtime) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const docRef = doc(db, 'dailyBoss', todayStr);
  const snap = await getDoc(docRef);

  if (!snap.exists()) throw new Error("Boss encounter not initialized.");
  const data = snap.data();
  if (data.defeated) throw new Error("The Daily Boss has already been defeated!");

  // Enforce max 1 attack attempt per day
  const alreadyAttacked = data.participants.some(p => p.userId === userId);
  if (alreadyAttacked) {
    throw new Error("You have already dealt damage to today's Boss.");
  }

  const nextHP = Math.max(0, data.currentHP - damage);
  const isKillingBlow = nextHP === 0;

  const hitEvent = {
    userId,
    userName,
    damage,
    runtime,
    timestamp: Date.now(),
    isCritical: damage >= 500
  };

  const participant = {
    userId,
    userName,
    damage,
    timestamp: Date.now()
  };

  // Compile sorted top damagers list
  const updatedTop = [...data.topDamagers, participant]
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 10);

  const updates = {
    currentHP: nextHP,
    participants: arrayUnion(participant),
    topDamagers: updatedTop,
    recentHits: arrayUnion(hitEvent)
  };

  if (isKillingBlow) {
    updates.defeated = true;
    updates.defeatTime = Date.now();
    updates.killerId = userId;
    updates.killerName = userName;
  }

  await updateDoc(docRef, updates);

  // Award coins balance & special badges inside solver's profile
  try {
    const userRef = doc(db, 'users', userId);
    const coinsReward = damage * 2;
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      const badges = uData.badges || [];
      
      if (isKillingBlow && !badges.includes('executioner')) {
        badges.push('executioner');
      }
      const slayerBadge = `boss_slayer_${todayStr.replace(/-/g, '_')}`;
      if (!badges.includes(slayerBadge)) {
        badges.push(slayerBadge);
      }
      
      await updateDoc(userRef, {
        coinsBalance: increment(coinsReward),
        badges
      });
    }
  } catch (err) {
    console.warn("Could not award badges to offline profile:", err);
  }

  return {
    ...data,
    ...updates
  };
};
