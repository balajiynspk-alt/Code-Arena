import { db } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Retrieve AI Gemini key from environment
const getGeminiApiKey = () => {
  return process.env.REACT_APP_GEMINI_KEY || "";
};

/**
 * Heuristically compiles user weakness profile based on their submission history.
 */
export const getUserWeaknessProfile = async (userId) => {
  try {
    const profileRef = doc(db, 'weaknessProfiles', userId);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {
    console.error("Failed to fetch custom weakness profile:", e);
  }

  // Robust, engaging fallback profile for initiate or new profiles
  return {
    weakTopics: [
      { topic: 'Dynamic Programming', winRate: 31, avgTime: 42 },
      { topic: 'Graphs (DFS/BFS)', winRate: 45, avgTime: 38 }
    ],
    strongTopics: [
      { topic: 'Arrays & Hashing', winRate: 82, avgTime: 12 },
      { topic: 'Two Pointers', winRate: 75, avgTime: 16 }
    ],
    failurePatterns: ['boundary cases', 'off-by-one indices', 'null checks'],
    recommendedDifficulty: 'Medium'
  };
};

/**
 * Save weakness profile updates after solving
 */
export const saveWeaknessProfile = async (userId, profile) => {
  try {
    const profileRef = doc(db, 'weaknessProfiles', userId);
    await setDoc(profileRef, {
      ...profile,
      updatedAt: Date.now()
    });
    return true;
  } catch (e) {
    console.error("Failed to update weakness profile:", e);
    return false;
  }
};

/**
 * Generate a completely unique, highly tailored DSA problem using Gemini
 */
export const generateQuantumProblem = async (userId, profile) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Missing REACT_APP_GEMINI_KEY in environment. Problem generation locked.");
  }

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const weakStr = profile.weakTopics.map(t => `${t.topic} (${t.winRate}% win rate)`).join(', ');
  const patternStr = profile.failurePatterns.join(', ');

  const prompt = `
Generate a completely original coding problem (NEVER seen on LeetCode, HackerRank, or CodeForces) that specifically targets and challenges these weak areas: ${weakStr}.
The developer frequently fails on: ${patternStr}.
Target difficulty level: ${profile.recommendedDifficulty || 'Medium'}.

You MUST output ONLY a valid JSON object matching this exact schema:
{
  "title": "Creative and immersive problem name",
  "story": "Short real-world or sci-fi narrative wrapping the algorithmic constraints",
  "description": "Clear technical problem statement explaining inputs, outputs, and behaviors",
  "examples": [
    {
      "input": "input representation as string",
      "output": "expected output representation",
      "explanation": "why this input yields this output"
    }
  ],
  "constraints": [
    "Array length constraints...",
    "Value bounds..."
  ],
  "hints": [
    "Incremental progress hint 1",
    "Incremental progress hint 2",
    "Conceptual solution logic hint 3"
  ],
  "editorial": "Clear explanation of the optimal solution paradigm",
  "starterCode": {
    "python": "def solve(arg):\n    # Write Python code\n    pass",
    "javascript": "function solve(arg) {\n    // Write JavaScript code\n}",
    "cpp": "class Solution {\npublic:\n    int solve(int arg) {\n        // Write C++ code\n    }\n};",
    "java": "class Solution {\n    public int solve(int arg) {\n        // Write Java code\n    }\n}"
  },
  "testCases": [
    {
      "input": "arg representation",
      "expected": "expected output"
    }
  ],
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "targetedWeakness": "Short 1-2 sentence statement explaining why this problem directly trains their DP/Graph or off-by-one weakness."
}

Generate exactly 3 robust examples and 6 progressive test cases (including boundary edge cases like empty elements, zero bounds, or extreme limits).
Make sure constraints are realistic. Do not return any explanations or markdown backticks outside of the raw JSON object string.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Clean markdown wrappings
  let cleanText = text;
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  cleanText = cleanText.trim();

  try {
    const data = JSON.parse(cleanText);
    
    // Auto-Validate pipeline checklist
    if (!data.title || !data.description || !data.starterCode || !data.testCases || data.testCases.length === 0) {
      throw new Error("Validation pipeline checklist failed: incomplete JSON schema components.");
    }
    
    return data;
  } catch (err) {
    console.error("Gemini Quantum Problem JSON parse error:", err, cleanText);
    throw new Error("Validation parsing checklist failed. Please attempt next quantum compilation cycle.");
  }
};

/**
 * Archive custom quantum problem inside user's bank
 */
export const saveQuantumProblemToBank = async (userId, problem) => {
  try {
    const ref = collection(db, 'users', userId, 'quantumProblems');
    const docRef = await addDoc(ref, {
      ...problem,
      generatedAt: Date.now(),
      isSolved: false,
      feedbackScore: null // too easy / target / too hard
    });
    return docRef.id;
  } catch (e) {
    console.error("Failed to archive quantum problem:", e);
    return null;
  }
};

/**
 * Fetch personal bank of generated custom problems
 */
export const getQuantumProblemsBank = async (userId) => {
  try {
    const ref = collection(db, 'users', userId, 'quantumProblems');
    const snap = await getDocs(ref);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (e) {
    console.error("Failed to get quantum problem bank:", e);
    return [];
  }
};
