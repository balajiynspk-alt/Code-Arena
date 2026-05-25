import { rtdb, db } from './firebase';
import { ref, set, update, push, get, child, onValue, off } from 'firebase/database';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
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
      [`battles/${battleId}/challengerRatingChange`]: elo.changeA,
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
    return { elo };
  } catch (error) {
    console.error("Error completing battle:", error);
    throw error;
  }
};

// ── Send Spectator Chat Message ──
export const sendSpectatorMessage = async (battleId, userId, userName, messageText) => {
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
