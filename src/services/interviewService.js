import { db } from './firebase';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getGeminiKey = () => {
  return process.env.REACT_APP_GEMINI_KEY || "";
};

const PROBLEMS_POOL = {
  Easy: [
    { title: "Two Sum", description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume each input has exactly one solution, and you may not use the same element twice." },
    { title: "Valid Parentheses", description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid." }
  ],
  Medium: [
    { title: "Container With Most Water", description: "You are given an integer array height of length n. Find two lines that together with the x-axis form a container, such that the container contains the most water." },
    { title: "Longest Substring Without Repeating Characters", description: "Given a string s, find the length of the longest substring without repeating characters." }
  ],
  Hard: [
    { title: "Merge k Sorted Lists", description: "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it." },
    { title: "Edit Distance", description: "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You have 3 operations permitted on a word: Insert, Delete, Replace." }
  ]
};

/**
 * Initiates a new interview session, returning the opening problem details.
 */
export const startInterviewSession = (difficulty) => {
  const pool = PROBLEMS_POOL[difficulty] || PROBLEMS_POOL.Medium;
  return pool[Math.floor(Math.random() * pool.length)];
};

/**
 * Sends a message to the Gemini interviewer model, including current code and chat logs.
 */
export const askInterviewer = async (company, difficulty, problem, chatHistory, currentCode, candidateMessage) => {
  const apiKey = getGeminiKey();
  
  if (!apiKey) {
    console.warn("REACT_APP_GEMINI_KEY not found. Simulating interviewer response.");
    const fallbacks = [
      `I see. Walk me through how you're planning to optimize the time complexity for this approach.`,
      `That makes sense. Can you explain how you'd handle edge cases like null or empty inputs?`,
      `I notice your current code contains some loop iterations. Can we optimize this using a hash map?`,
      `Excellent explanation! Let's start writing down the code for this in the editor.`
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Format chat history for context
    const historyText = chatHistory.map(m => `${m.sender === 'interviewer' ? 'Interviewer' : 'Candidate'}: "${m.text}"`).join('\n');

    const prompt = `You are a FAANG interviewer at ${company}. You are interviewing a candidate on the problem "${problem.title}".
Problem description:
"${problem.description}"

Here is the current conversation history:
${historyText}

The candidate's latest message:
"${candidateMessage}"

The candidate's current Monaco Editor code:
\`\`\`
${currentCode}
\`\`\`

System Instructions:
Be professional but encouraging. React naturally to what the candidate says and their editor code.
If they just explained an approach, ask follow-up questions or prompt them to start coding.
If they wrote code in the editor, comment on it (e.g. "I see you're using a double loop here, how can we improve?").
Ask ONE single question at a time. Keep your response under 3 sentences. No markdown code blocks.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini Interviewer error:", err);
    return "That's an interesting approach. Let's think about how we can optimize the storage limits here.";
  }
};

/**
 * Invokes Gemini to compile the final JSON report card.
 */
export const evaluateInterview = async (company, difficulty, problem, chatHistory, finalCode, userId) => {
  const apiKey = getGeminiKey();
  const defaultReport = {
    score: 75,
    breakdown: { problemSolving: 70, communication: 80, codeQuality: 75, complexityAnalysis: 75 },
    feedback: "You demonstrated solid communication, but forgot to consider edge cases.",
    rating: `Ready for ${company} L3`
  };

  let report = defaultReport;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const historyText = chatHistory.map(m => `${m.sender === 'interviewer' ? 'Interviewer' : 'Candidate'}: "${m.text}"`).join('\n');

      const prompt = `Evaluate the candidate's interview performance at ${company} for problem "${problem.title}" (Difficulty: ${difficulty}).
Conversation history:
${historyText}

Final Code:
\`\`\`
${finalCode}
\`\`\`

You must respond ONLY with a valid JSON object matching this structure:
{
  "score": number (0-100),
  "breakdown": {
    "problemSolving": number (0-100),
    "communication": number (0-100),
    "codeQuality": number (0-100),
    "complexityAnalysis": number (0-100)
  },
  "feedback": "string summarizing strengths and missing parts like handling null inputs",
  "rating": "string like 'Ready for Google L4' or 'L3 level'"
}`;

      const result = await model.generateContent(prompt);
      const cleaned = result.response.text().trim().replace(/```json/g, "").replace(/```/g, "").trim();
      report = JSON.parse(cleaned);
    } catch (err) {
      console.error("Error creating AI report card:", err);
    }
  }

  // Save report card history to Firestore
  try {
    const interviewData = {
      userId,
      company,
      difficulty,
      problemTitle: problem.title,
      score: report.score,
      breakdown: report.breakdown,
      feedback: report.feedback,
      rating: report.rating,
      timestamp: Date.now()
    };
    await addDoc(collection(db, 'interviews'), interviewData);
  } catch (err) {
    console.warn("Could not save interview details to Firestore:", err);
  }

  return report;
};
