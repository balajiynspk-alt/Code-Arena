import { rtdb, db, isMockMode } from './firebase';
import { ref, set, update, push, get } from 'firebase/database';
import { doc, updateDoc, writeBatch, collection, addDoc, getDoc } from 'firebase/firestore';
import { getAllProblems } from './problemService';

// ── Elo Rating Formula Calculation ──
export const calculateElo = (ratingA, ratingB, outcome, K = 32) => {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  let actualA = 0.5;
  let actualB = 0.5;

  if (outcome === 'win') {
    actualA = 1;
    actualB = 0;
  } else if (outcome === 'loss') {
    actualA = 0;
    actualB = 1;
  }

  const deltaA = Math.round(K * (actualA - expectedA));
  const deltaB = Math.round(K * (actualB - expectedB));

  return {
    newRatingA: Math.max(100, ratingA + deltaA),
    newRatingB: Math.max(100, ratingB + deltaB),
    changeA: deltaA >= 0 ? `+${deltaA}` : `${deltaA}`,
    changeB: deltaB >= 0 ? `+${deltaB}` : `${deltaB}`
  };
};

// ── Create Battle Challenge ──
export const createBattleChallenge = async (challengerId, challengerName, challengerRating, opponentId, opponentName, opponentRating, difficulty) => {
  if (isMockMode) {
    const battleId = `mock_battle_${Date.now()}`;
    const battleData = {
      battleId,
      challenger: challengerId || 'local_user',
      challengerName: challengerName || 'AlphaCoder',
      challengerRating: challengerRating || 1200,
      opponent: opponentId || 'simulated_bot',
      opponentName: opponentName || 'FAANG_Slayer',
      opponentRating: opponentRating || 1230,
      difficulty,
      status: 'pending',
      timestamp: Date.now(),
      startTime: 0,
      endTime: 0,
      problemId: '',
      problemTitle: '',
      winnerId: '',
      tieBreakerReason: '',
      durationMs: 600000,
      challengerProgress: {
        linesWritten: 0,
        testsPassed: 0,
        totalTests: 5,
        status: 'Typing...',
        submitted: false,
        codeText: ''
      },
      opponentProgress: {
        linesWritten: 0,
        testsPassed: 0,
        totalTests: 5,
        status: 'Waiting...',
        submitted: false,
        codeText: ''
      }
    };
    localStorage.setItem(`mock_battle_${battleId}`, JSON.stringify(battleData));
    return battleId;
  }

  try {
    const battleRef = push(ref(rtdb, 'battles'));
    const battleId = battleRef.key;

    const battleData = {
      battleId,
      challenger: challengerId,
      challengerName,
      challengerRating: challengerRating || 1200,
      opponent: opponentId,
      opponentName,
      opponentRating: opponentRating || 1200,
      difficulty,
      status: 'pending', // pending, active, completed, declined
      timestamp: Date.now(),
      startTime: 0,
      endTime: 0,
      problemId: '',
      problemTitle: '',
      winnerId: '',
      tieBreakerReason: '',
      durationMs: 600000, // 10 minutes default
      challengerProgress: {
        linesWritten: 0,
        testsPassed: 0,
        totalTests: 5,
        status: 'Typing...',
        submitted: false,
        codeText: ''
      },
      opponentProgress: {
        linesWritten: 0,
        testsPassed: 0,
        totalTests: 5,
        status: 'Waiting...',
        submitted: false,
        codeText: ''
      }
    };

    await set(battleRef, battleData);
    return battleId;
  } catch (error) {
    console.error("Error creating battle challenge:", error);
    throw error;
  }
};

// ── Accept Challenge & Select Random Problem ──
export const acceptChallenge = async (battleId, difficulty) => {
  if (isMockMode) {
    const raw = localStorage.getItem(`mock_battle_${battleId}`);
    if (raw) {
      const data = JSON.parse(raw);
      const problems = await getAllProblems();
      const matches = problems.filter(p => p.difficulty?.toLowerCase() === difficulty.toLowerCase());
      const randomProblem = matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)] : problems[0];

      const startTime = Date.now();
      const endTime = startTime + 600000;

      data.status = 'active';
      data.problemId = randomProblem.id;
      data.problemTitle = randomProblem.title;
      data.startTime = startTime;
      data.endTime = endTime;
      data.opponentProgress.status = 'Typing...';

      localStorage.setItem(`mock_battle_${battleId}`, JSON.stringify(data));
      return randomProblem.id;
    }
    throw new Error("Challenge not found");
  }

  try {
    // 1. Fetch all problems to select a random one matching difficulty
    const problems = await getAllProblems();
    const matches = problems.filter(p => p.difficulty?.toLowerCase() === difficulty.toLowerCase());
    
    if (matches.length === 0) {
      throw new Error(`No problems found with difficulty: ${difficulty}`);
    }

    const randomProblem = matches[Math.floor(Math.random() * matches.length)];

    // 2. Set active details and synced start/end timers
    const startTime = Date.now();
    const durationMs = 600000; // 10 minutes
    const endTime = startTime + durationMs;

    const updates = {
      [`battles/${battleId}/status`]: 'active',
      [`battles/${battleId}/problemId`]: randomProblem.id,
      [`battles/${battleId}/problemTitle`]: randomProblem.title,
      [`battles/${battleId}/startTime`]: startTime,
      [`battles/${battleId}/endTime`]: endTime,
      [`battles/${battleId}/opponentProgress/status`]: 'Typing...'
    };

    await update(ref(rtdb), updates);
    return randomProblem.id;
  } catch (error) {
    console.error("Error accepting challenge:", error);
    throw error;
  }
};

// ── Decline Challenge ──
export const declineChallenge = async (battleId) => {
  if (isMockMode) {
    const raw = localStorage.getItem(`mock_battle_${battleId}`);
    if (raw) {
      const data = JSON.parse(raw);
      data.status = 'declined';
      localStorage.setItem(`mock_battle_${battleId}`, JSON.stringify(data));
    }
    return;
  }

  try {
    await update(ref(rtdb), {
      [`battles/${battleId}/status`]: 'declined'
    });
  } catch (error) {
    console.error("Error declining challenge:", error);
  }
};

// ── Live Battle Stats Update ──
export const updateBattleProgress = async (battleId, isChallenger, linesWritten, testsPassed, totalTests, status, codeText) => {
  if (isMockMode) {
    const raw = localStorage.getItem(`mock_battle_${battleId}`);
    if (raw) {
      const data = JSON.parse(raw);
      const prefix = isChallenger ? 'challengerProgress' : 'opponentProgress';
      data[prefix] = {
        ...data[prefix],
        linesWritten,
        testsPassed,
        totalTests,
        status
      };
      if (codeText !== undefined) {
        data[prefix].codeText = codeText;
      }
      localStorage.setItem(`mock_battle_${battleId}`, JSON.stringify(data));
    }
    return;
  }

  const prefix = isChallenger ? 'challengerProgress' : 'opponentProgress';
  const updates = {
    [`battles/${battleId}/${prefix}/linesWritten`]: linesWritten,
    [`battles/${battleId}/${prefix}/testsPassed`]: testsPassed,
    [`battles/${battleId}/${prefix}/totalTests`]: totalTests,
    [`battles/${battleId}/${prefix}/status`]: status
  };

  // If codeText is provided, save it as well for replay (only sent occasionally or on run/submit)
  if (codeText !== undefined) {
    updates[`battles/${battleId}/${prefix}/codeText`] = codeText;
  }

  try {
    await update(ref(rtdb), updates);
  } catch (error) {
    console.error("Error updating battle progress:", error);
  }
};

// ── Complete Battle & Update Ratings ──
export const completeBattle = async (battleId, battleData, winnerId, tieReason) => {
  if (isMockMode) {
    const raw = localStorage.getItem(`mock_battle_${battleId}`);
    if (raw) {
      const data = JSON.parse(raw);
      const isChallengerWinner = winnerId === data.challenger;
      const isOpponentWinner = winnerId === data.opponent;
      
      const ratingA = data.challengerRating || 1200;
      const ratingB = data.opponentRating || 1200;
      
      let outcome = 'draw';
      if (isChallengerWinner) outcome = 'win';
      if (isOpponentWinner) outcome = 'loss';

      const elo = calculateElo(ratingA, ratingB, outcome);

      data.status = 'completed';
      data.winnerId = winnerId;
      data.tieBreakerReason = tieReason || '';
      data.challengerNewRating = elo.newRatingA;
      data.opponentNewRating = elo.newRatingB;
      data.challengerRatingChange = elo.changeA;
      data.opponentRatingChange = elo.changeB;

      // Update opponent code to let the user review it in results screen
      if (isChallengerWinner) {
        data.opponentProgress.codeText = `// Dynamic Anagram Solver\nfunction isAnagram(s, t) {\n  if (s.length !== t.length) return false;\n  const hash = {};\n  for (let char of s) {\n    hash[char] = (hash[char] || 0) + 1;\n  }\n  for (let char of t) {\n    if (!hash[char]) return false;\n    hash[char]--;\n  }\n  return true;\n}`;
      }

      localStorage.setItem(`mock_battle_${battleId}`, JSON.stringify(data));
      
      // Update local profile rating and coins
      const profile = localStorage.getItem('mock_user_profile');
      const profileData = profile ? JSON.parse(profile) : { streak: 12, coinsBalance: 450, rating: 1200 };
      profileData.rating = isChallengerWinner ? elo.newRatingA : elo.newRatingB;
      if (isChallengerWinner) {
        profileData.coinsBalance = (profileData.coinsBalance || 0) + 50; // Challenge win bonus
      }
      localStorage.setItem('mock_user_profile', JSON.stringify(profileData));
      
      // Trigger update event
      window.dispatchEvent(new Event('mock_profile_updated'));

      // Post to mock feed
      if (winnerId !== 'draw') {
        const winnerName = isChallengerWinner ? data.challengerName : data.opponentName;
        const loserName = isChallengerWinner ? data.opponentName : data.challengerName;
        const winnerIdStr = isChallengerWinner ? data.challenger : data.opponent;
        const ratingChg = isChallengerWinner ? elo.changeA : elo.changeB;
        
        import('./feedService').then(({ addFeedItem }) => {
          addFeedItem(winnerIdStr, winnerName, 'BATTLE_WIN', {
            opponent: loserName,
            rating: ratingChg.replace('+', '')
          }).catch(console.error);
        });
      }

      return { elo };
    }
  }

  try {
    const isChallengerWinner = winnerId === battleData.challenger;
    const isOpponentWinner = winnerId === battleData.opponent;
    const isDraw = winnerId === 'draw';

    // Calculate Elo change
    const ratingA = battleData.challengerRating || 1200;
    const ratingB = battleData.opponentRating || 1200;
    
    let outcome = 'draw';
    if (isChallengerWinner) outcome = 'win';
    if (isOpponentWinner) outcome = 'loss';

    const elo = calculateElo(ratingA, ratingB, outcome);

    // 1. Update Realtime Database
    const battleUpdates = {
      [`battles/${battleId}/status`]: 'completed',
      [`battles/${battleId}/winnerId`]: winnerId,
      [`battles/${battleId}/tieBreakerReason`]: tieReason || '',
      [`battles/${battleId}/challengerNewRating`]: elo.newRatingA,
      [`battles/${battleId}/opponentNewRating`]: elo.newRatingB,
      [`battles[` + battleId + `]/challengerRatingChange`]: elo.changeA,
      [`battles/${battleId}/opponentRatingChange`]: elo.changeB
    };

    await update(ref(rtdb), battleUpdates);

    // 2. Update Firestore User documents using writeBatch to ensure integrity
    const batch = writeBatch(db);
    const challengerDocRef = doc(db, 'users', battleData.challenger);
    const opponentDocRef = doc(db, 'users', battleData.opponent);

    batch.update(challengerDocRef, { rating: elo.newRatingA });
    batch.update(opponentDocRef, { rating: elo.newRatingB });

    await batch.commit();

    // 3. Post to activity feed
    if (winnerId !== 'draw') {
      const winnerName = isChallengerWinner ? battleData.challengerName : battleData.opponentName;
      const loserName = isChallengerWinner ? battleData.opponentName : battleData.challengerName;
      const winnerIdStr = isChallengerWinner ? battleData.challenger : battleData.opponent;
      const ratingChg = isChallengerWinner ? elo.changeA : elo.changeB;
      
      const { addFeedItem } = await import('./feedService');
      await addFeedItem(winnerIdStr, winnerName, 'BATTLE_WIN', {
        opponent: loserName,
        rating: ratingChg.replace('+', '')
      });
    }

    return { elo };
  } catch (error) {
    console.error("Error completing battle:", error);
    throw error;
  }
};

// ── Send Spectator Chat Message ──
export const sendSpectatorMessage = async (battleId, userId, userName, messageText) => {
  if (isMockMode) {
    return;
  }

  try {
    const chatRef = ref(rtdb, `battles/${battleId}/chat`);
    const newMessageRef = push(chatRef);
    await set(newMessageRef, {
      userId,
      userName,
      text: messageText,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error sending chat message:", error);
  }
};

// ── Create Battle Invite ──
export const createBattleInvite = async (challengerId, challengerName, opponentId, opponentName, difficulty, timeLimit) => {
  const inviteData = {
    challengerId,
    challengerName,
    opponentId,
    opponentName,
    difficulty,
    timeLimit: parseInt(timeLimit) || 15,
    status: 'pending',
    expiresAt: Date.now() + 600000, // 10 minutes
    createdAt: Date.now()
  };

  if (isMockMode) {
    const inviteId = `invite_${Date.now()}`;
    const mockData = { id: inviteId, ...inviteData };
    const invites = JSON.parse(localStorage.getItem('mock_battle_invites') || '[]');
    invites.push(mockData);
    localStorage.setItem('mock_battle_invites', JSON.stringify(invites));

    // Send Notification
    const { createNotification } = await import('./notificationService');
    await createNotification(
      opponentId,
      'BATTLE_INVITE',
      `⚔️ @${challengerName} issued a 1v1 Arena combat challenge: ${difficulty} (${timeLimit}m)`,
      `/messages`
    );

    // Send DM message containing card details
    const { startConversation, sendDirectMessage } = await import('./dmService');
    const convId = await startConversation(opponentId, opponentName);
    await sendDirectMessage(
      convId,
      `I challenge you to a 1v1 Code Battle! Difficulty: ${difficulty}, Time Limit: ${timeLimit} minutes.`,
      'battle_invite',
      { inviteId, difficulty, timeLimit }
    );

    return inviteId;
  }

  try {
    const inviteRef = await addDoc(collection(db, 'battleInvites'), inviteData);
    const inviteId = inviteRef.id;

    // Send Notification
    const { createNotification } = await import('./notificationService');
    await createNotification(
      opponentId,
      'BATTLE_INVITE',
      `⚔️ @${challengerName} issued a 1v1 Arena combat challenge: ${difficulty} (${timeLimit}m)`,
      `/messages`
    );

    // Send DM message containing card details
    const { startConversation, sendDirectMessage } = await import('./dmService');
    const convId = await startConversation(opponentId, opponentName);
    await sendDirectMessage(
      convId,
      `I challenge you to a 1v1 Code Battle! Difficulty: ${difficulty}, Time Limit: ${timeLimit} minutes.`,
      'battle_invite',
      { inviteId, difficulty, timeLimit }
    );

    return inviteId;
  } catch (error) {
    console.error("Error creating battle invite:", error);
    throw error;
  }
};

// ── Accept Battle Invite ──
export const acceptBattleInvite = async (inviteId, opponentRating = 1200, challengerRating = 1200) => {
  if (isMockMode) {
    const invites = JSON.parse(localStorage.getItem('mock_battle_invites') || '[]');
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) throw new Error("Invite not found");
    
    if (invite.status === 'pending' && invite.expiresAt < Date.now()) {
      invite.status = 'expired';
      localStorage.setItem('mock_battle_invites', JSON.stringify(invites));
      throw new Error("Challenge has expired (10 minutes exceeded).");
    }

    invite.status = 'accepted';
    
    // Create Battle challenge room
    const battleId = await createBattleChallenge(
      invite.challengerId,
      invite.challengerName,
      challengerRating,
      invite.opponentId,
      invite.opponentName,
      opponentRating,
      invite.difficulty
    );
    
    // Set actual random problem on battle room
    await acceptChallenge(battleId, invite.difficulty);
    
    invite.battleId = battleId;
    localStorage.setItem('mock_battle_invites', JSON.stringify(invites));

    // Send Acceptance DM
    const { startConversation, sendDirectMessage } = await import('./dmService');
    const convId = await startConversation(invite.challengerId, invite.challengerName);
    await sendDirectMessage(
      convId,
      `I accepted your 1v1 battle challenge! Entering Arena room...`,
      'text'
    );

    return battleId;
  }

  try {
    const inviteRef = doc(db, 'battleInvites', inviteId);
    const snap = await getDoc(inviteRef);
    if (!snap.exists()) throw new Error("Invite not found");
    const invite = snap.data();

    if (invite.status === 'pending' && invite.expiresAt < Date.now()) {
      await updateDoc(inviteRef, { status: 'expired' });
      throw new Error("Challenge has expired (10 minutes exceeded).");
    }

    // Create Battle challenge room
    const battleId = await createBattleChallenge(
      invite.challengerId,
      invite.challengerName,
      challengerRating,
      invite.opponentId,
      invite.opponentName,
      opponentRating,
      invite.difficulty
    );

    // Accept to populate dynamic problems
    await acceptChallenge(battleId, invite.difficulty);

    // Update Firestore invite document
    await updateDoc(inviteRef, {
      status: 'accepted',
      battleId: battleId
    });

    // Send DM
    const { startConversation, sendDirectMessage } = await import('./dmService');
    const convId = await startConversation(invite.challengerId, invite.challengerName);
    await sendDirectMessage(
      convId,
      `I accepted your 1v1 battle challenge! Entering Arena room...`,
      'text'
    );

    return battleId;
  } catch (error) {
    console.error("Error accepting battle invite:", error);
    throw error;
  }
};

// ── Decline Battle Invite ──
export const declineBattleInvite = async (inviteId) => {
  if (isMockMode) {
    const invites = JSON.parse(localStorage.getItem('mock_battle_invites') || '[]');
    const invite = invites.find(i => i.id === inviteId);
    if (invite) {
      invite.status = 'declined';
      localStorage.setItem('mock_battle_invites', JSON.stringify(invites));

      // Notify challenger
      const { createNotification } = await import('./notificationService');
      await createNotification(
        invite.challengerId,
        'BATTLE_DECLINED',
        `⚔️ @${invite.opponentName} declined your 1v1 Battle challenge.`,
        `/profile/${invite.opponentName}`
      );
    }
    return;
  }

  try {
    const inviteRef = doc(db, 'battleInvites', inviteId);
    const snap = await getDoc(inviteRef);
    if (snap.exists()) {
      const invite = snap.data();
      await updateDoc(inviteRef, { status: 'declined' });

      // Notify challenger
      const { createNotification } = await import('./notificationService');
      await createNotification(
        invite.challengerId,
        'BATTLE_DECLINED',
        `⚔️ @${invite.opponentName} declined your 1v1 Battle challenge.`,
        `/profile/${invite.opponentName}`
      );
    }
  } catch (error) {
    console.error("Error declining battle invite:", error);
  }
};

// ── Get User Battle History ──
export const getUserBattles = async (uid) => {
  if (isMockMode) {
    return [
      {
        id: 'mock_b1',
        opponent: 'Glitch_Viper',
        problemTitle: 'LRU Cache Routing',
        problemId: 'lru-cache',
        result: 'win',
        ratingDelta: '+32',
        challenger: uid,
        challengerCode: `// Dynamic LRU Cache Solution\nclass LRUCache {\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.cache = new Map();\n  }\n  get(key) {\n    if (!this.cache.has(key)) return -1;\n    const val = this.cache.get(key);\n    this.cache.delete(key);\n    this.cache.set(key, val);\n    return val;\n  }\n}`,
        opponentCode: `// Glitch Viper's LRU\nfunction solveLRU() {\n  // Too slow, missed space compression!\n  console.log("Memory overflow");\n}`,
        timestamp: Date.now() - 3600000 * 24 * 3
      },
      {
        id: 'mock_b2',
        opponent: 'Aura_Netrunner',
        problemTitle: 'Dynamic Knapsack',
        problemId: 'knapsack',
        result: 'win',
        ratingDelta: '+28',
        challenger: uid,
        challengerCode: `// Optimized Knapsack DP\nfunction knapsack(W, wt, val, n) {\n  let dp = new Array(W + 1).fill(0);\n  for (let i = 0; i < n; i++) {\n    for (let w = W; w >= wt[i]; w--) {\n      dp[w] = Math.max(dp[w], dp[w - wt[i]] + val[i]);\n    }\n  }\n  return dp[W];\n}`,
        opponentCode: `// Aura DP\nfunction knapsack(W, wt, val, n) {\n  // Double loop but with high overhead!\n}`,
        timestamp: Date.now() - 3600000 * 24 * 5
      },
      {
        id: 'mock_b3',
        opponent: 'FAANG_Slayer',
        problemTitle: 'Optimal Anagrams',
        problemId: 'anagrams',
        result: 'loss',
        ratingDelta: '-15',
        challenger: 'FAANG_Slayer',
        challengerCode: `// FAANG Anagrams\nfunction isAnagram(s, t) {\n  return s.split("").sort().join("") === t.split("").sort().join("");\n}`,
        opponentCode: `// My solution\nfunction isAnagram(s, t) {\n  // Failed count frequency matching!\n}`,
        timestamp: Date.now() - 3600000 * 24 * 7
      }
    ];
  }

  try {
    const battlesRef = ref(rtdb, 'battles');
    const snap = await get(battlesRef);
    if (!snap.exists()) return [];
    const all = snap.val();
    const list = Object.values(all).filter(b => 
      b.status === 'completed' && (b.challenger === uid || b.opponent === uid)
    );
    return list.map(b => {
      const isChallenger = b.challenger === uid;
      const opponentName = isChallenger ? b.opponentName : b.challengerName;
      const isWinner = b.winnerId === uid;
      const ratingDelta = isChallenger ? b.challengerRatingChange : b.opponentRatingChange;
      return {
        id: b.battleId,
        opponent: opponentName,
        problemTitle: b.problemTitle || 'Speed Code Problem',
        problemId: b.problemId || 'two-sum',
        result: b.winnerId === 'draw' ? 'draw' : (isWinner ? 'win' : 'loss'),
        ratingDelta: ratingDelta || '+0',
        challengerCode: b.challengerProgress?.codeText || '// No code recorded',
        opponentCode: b.opponentProgress?.codeText || '// No code recorded',
        timestamp: b.timestamp || Date.now()
      };
    });
  } catch (error) {
    console.error("Error retrieving user battle history:", error);
    return [];
  }
};


