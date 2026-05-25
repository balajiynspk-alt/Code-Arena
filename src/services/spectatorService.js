import { ref, set, onValue, off, update, runTransaction, push } from 'firebase/database';
import { rtdb } from './firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Retrieve AI Gemini key from environment
const getGeminiApiKey = () => {
  return process.env.REACT_APP_GEMINI_KEY || "";
};

/**
 * AI Esports Commentator Call
 */
export const getAICommentary = async (currentCode, prevCode) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return "The programmer makes a silent adjustment to the algorithmic bounds, waiting for execution confirmation.";
  }

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
A competitive programmer is writing this code live on CodeArena.
Current Code state:
"""
${currentCode}
"""

Previous Code state:
"""
${prevCode}
"""

In EXACTLY ONE sentence, commentate on what just changed or what they are writing like an enthusiastic, hyper-excited, and technical sports commentator (e.g. Esports commentator). 
Be extremely enthusiastic, energetic, mention code specifics (like functions, complex loops, array operations, or optimization choices), and keep it punchy. 
Return only that single comment sentence. Do not wrap in quotes or markdown.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error("AI Commentary generation failed:", e);
    return "WHAT A SHIFT! The coder is refactoring variable references to optimize the call stack!";
  }
};

/**
 * Start Realtime database Broadcaster stream
 */
export const startBroadcast = async (userId, userName, rating, problemId, code, cursorLine = 1) => {
  const streamRef = ref(rtdb, `broadcasts/${userId}`);
  await set(streamRef, {
    userId,
    userName,
    rating: rating || 1850,
    problemId: problemId || '1',
    code: code || '',
    cursorLine,
    viewerCount: 1,
    isLive: true,
    startedAt: Date.now()
  });
};

/**
 * Live keystrokes stream synchronizer
 */
export const updateBroadcast = async (userId, updates) => {
  const streamRef = ref(rtdb, `broadcasts/${userId}`);
  await update(streamRef, updates);
};

/**
 * Close active stream
 */
export const endBroadcast = async (userId) => {
  const streamRef = ref(rtdb, `broadcasts/${userId}`);
  await set(streamRef, null); // Remove room from RTDB
};

/**
 * Increment viewer counters upon page loading
 */
export const joinBroadcastRoom = async (userId) => {
  const viewerRef = ref(rtdb, `broadcasts/${userId}/viewerCount`);
  try {
    await runTransaction(viewerRef, (currentCount) => {
      return (currentCount || 0) + 1;
    });
  } catch (e) {
    console.error("Failed to increment viewer tally:", e);
  }
};

/**
 * Decrement viewer counters on unmounting
 */
export const leaveBroadcastRoom = async (userId) => {
  const viewerRef = ref(rtdb, `broadcasts/${userId}/viewerCount`);
  try {
    await runTransaction(viewerRef, (currentCount) => {
      if (currentCount && currentCount > 1) {
        return currentCount - 1;
      }
      return 1;
    });
  } catch (e) {
    console.error("Failed to decrement viewer count:", e);
  }
};

/**
 * Push viewer emoji reactions to RTDB queue
 */
export const sendReaction = async (userId, emoji) => {
  const reactionRef = ref(rtdb, `broadcasts/${userId}/reactions`);
  const newReaction = push(reactionRef);
  await set(newReaction, {
    emoji,
    timestamp: Date.now()
  });
};

/**
 * Fetch all active live broadcaster streams
 */
export const subscribeLiveBroadcasters = (onList) => {
  const broadcastsRef = ref(rtdb, 'broadcasts');
  onValue(broadcastsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      onList([]);
      return;
    }
    const list = Object.keys(data).map(key => ({
      userId: key,
      ...data[key]
    })).filter(b => b.isLive);
    onList(list);
  });

  return () => off(broadcastsRef);
};
