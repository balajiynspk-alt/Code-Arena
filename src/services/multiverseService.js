import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Retrieve AI Gemini key from environment
const getGeminiApiKey = () => {
  return process.env.REACT_APP_GEMINI_KEY || "";
};

/**
 * Generate 5 distinct complete algorithmic approach solutions in active programming languages.
 */
export const generateMultiverseSolutions = async (problemTitle, problemDescription, language) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Missing Gemini API Key in environment settings. Please configure REACT_APP_GEMINI_KEY.");
  }

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
For this DSA coding problem:
Title: "${problemTitle}"
Description:
"${problemDescription}"

Generate exactly 5 distinct COMPLETE, runnable solutions in the "${language}" programming language matching the following paradigms:
1. BRUTE FORCE: simplest O(n²) or worse approach
2. OPTIMIZED: standard optimal approach (expected in technical interviews)
3. ONE-LINER: shortest possible code (clever/idiomatic/condensed)
4. SPACE-OPTIMIZED: minimize auxiliary memory usage
5. CREATIVE: unusual, interesting, or highly unexpected approach that still works

You must output ONLY a valid JSON object matching this exact schema:
{
  "solutions": [
    {
      "approach": "BRUTE FORCE",
      "code": "complete source code string...",
      "timeComplexity": "O(n²)",
      "spaceComplexity": "O(1)"
    },
    ...
  ]
}

Ensure the code is a complete runnable function or block that executes directly. Do not insert any explanations, preambles, or markdown block wrapping in your response. Just return the raw JSON object string.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown markers if present
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
    return data.solutions;
  } catch (err) {
    console.error("Failed to parse Gemini Multiverse JSON output:", err, cleanText);
    throw new Error("Invalid format returned by AI helper. Please try again.");
  }
};

/**
 * Explain a specific solution approach in simple, clear terms using Gemini.
 */
export const explainMultiverseApproach = async (approachName, code, problemTitle) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return "AI Explanations require an active API key.";

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
Explain the following algorithmic solution for "${problemTitle}" in simple, intuitive terms.
Approach paradigm: ${approachName}
Source code:
\`\`\`
${code}
\`\`\`

Provide:
1. Intuition: Why does this work and what is the underlying logic?
2. Line-by-Line: Explaining key components.
3. Tradeoffs: Why should someone pick or avoid this style during interviews?
Keep the explanation engaging and under 4 bullet points.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

/**
 * Save a generated multiverse workspace to the user's profile learning archives.
 */
export const saveMultiverseArtifact = async (userId, problemId, problemTitle, language, solutions) => {
  try {
    const docRef = doc(db, 'multiverseArtifacts', `${userId}_${problemId}`);
    await setDoc(docRef, {
      userId,
      problemId,
      problemTitle,
      language,
      solutions,
      savedAt: Date.now()
    });
    return true;
  } catch (e) {
    console.error("Failed to save multiverse learning artifact:", e);
    return false;
  }
};
