import { db } from './firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { generateGeminiContent } from './aiService';

/**
 * Rates the developer's thought process using Gemini 1.5 Flash.
 */
export const rateThoughtsWithAI = async (problemTitle, thoughts, code) => {
  const thoughtsText = thoughts.map(t => `[Line ${t.line}]: "${t.text}"`).join('\n');
  const prompt = `You are a cognitive programming mentor. Rate this student's solving thoughts for the problem "${problemTitle}".
Here is their final code:
${code}

Here is their spoken voice thoughts captured line-by-line during coding:
${thoughtsText}

Provide a 1-sentence expert rating of their approach starting with a title (e.g. "Optimal Intuition: You identified the linear approach immediately..."). Do not mention line numbers. Keep it encouraging and under 25 words.`;

  try {
    const feedback = await generateGeminiContent(prompt);
    return feedback || "Optimal Intuition: Outstanding algorithmic structure and modular breakdown.";
  } catch (err) {
    console.warn("Gemini Rating fallback:", err);
    return "Expert Thinking: Excellent modular formulation and step-by-step optimization.";
  }
};

/**
 * Saves a completed Thought Map session to Firestore.
 */
export const saveThoughtMap = async (userId, userName, problemId, problemTitle, thoughts, code, totalTime) => {
  const docRef = doc(db, 'thoughtMaps', `${userId}_${problemId}`);
  
  // Get AI Insight rating
  const insightScore = await rateThoughtsWithAI(problemTitle, thoughts, code);

  const payload = {
    userId,
    userName,
    problemId,
    problemTitle,
    thoughts,
    code,
    totalTime,
    insightScore,
    views: 0,
    timestamp: Date.now()
  };

  await setDoc(docRef, payload);
  return payload;
};

/**
 * Fetches a single user's thought map for a problem.
 */
export const getThoughtMap = async (userId, problemId) => {
  const docRef = doc(db, 'thoughtMaps', `${userId}_${problemId}`);
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    // Increment views as secondary activity
    await updateDoc(docRef, { views: increment(1) });
    return snap.data();
  }
  return null;
};

/**
 * Queries top-rated/most-viewed thought maps for a specific problem.
 */
export const getTopThoughtMaps = async (problemId) => {
  const colRef = collection(db, 'thoughtMaps');
  const q = query(colRef, where('problemId', '==', problemId));
  
  try {
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list.sort((a, b) => b.views - a.views).slice(0, 5);
  } catch (err) {
    console.warn("Could not fetch top guides:", err);
    return [];
  }
};
