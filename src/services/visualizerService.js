import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

// Initialize Gemini
const getAIModel = () => {
  const key = process.env.REACT_APP_GEMINI_KEY || "";
  if (!key) return null;
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

// Clean markdown JSON tags if returned by Gemini
function cleanJsonResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim();
  }
  return cleaned;
}

export async function getAutoVisualization(problem) {
  if (!problem) return null;
  const problemId = problem.id || problem.number?.toString();
  if (!problemId) return null;

  // 1. Check Cache first
  const cacheRef = doc(db, 'problems', problemId);
  try {
    const snap = await getDoc(cacheRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.visualizerType && data.visualizerSteps) {
        return {
          type: data.visualizerType,
          initialData: data.visualizerData || null,
          steps: data.visualizerSteps
        };
      }
    }
  } catch (err) {
    console.warn("Failed to read cached visualizer data:", err);
  }

  // 2. Call Gemini for classification & step generation
  const model = getAIModel();
  if (!model) {
    console.warn("Gemini API key is not configured.");
    return null;
  }

  try {
    // Stage 1: Classify Problem Type and obtain initial structure
    const classificationPrompt = `
      Given this coding problem: "${problem.title}"
      Description: "${problem.description}"
      
      Classify what type of algorithm visualizer would best
      illustrate solving this problem. Return only one of:
      array | tree | graph | dp | hash | sort | linked_list | binary_search | two_pointer | sliding_window | none
      
      Also return the initial data to visualize as JSON:
      For array problems: the first example's input array (e.g. [2, 7, 11, 15])
      For tree problems: the first example's tree structure represented as nodes/links
      For linked_list: an array representation of the linked list
      For others: any relevant array, string, or number value.
      
      Return format MUST be a strict JSON object with fields: "type", "initialData", "steps_hint". Do NOT wrap in markdown block.
    `;

    const classificationResult = await model.generateContent(classificationPrompt);
    const classificationText = cleanJsonResponse(await classificationResult.response.text());
    const classification = JSON.parse(classificationText);

    // Stage 2: Generate step-by-step instructions
    const sampleInput = problem.examples?.[0]?.input || "standard test bounds";
    const sampleOutput = problem.examples?.[0]?.output || "expected output";
    
    const stepsPrompt = `
      For the problem "${problem.title}" with sample input "${sampleInput}" and output "${sampleOutput}", 
      generate a step-by-step visualization execution walkthrough (8-12 steps).
      
      Each step must contain:
      1. "step": the step index number (1-indexed)
      2. "action": a descriptive pseudocode sentence explaining this step
      3. "highlight": an array of line numbers to highlight (e.g. [2] or [4, 5])
      4. "state": an object containing:
         - "arr" or similar values showing the current array/structure data state
         - pointer positions or key index locations (e.g. left, right, mid, i, j, current)
         - "done" or "visited" keys/indexes if relevant.
      5. "desc": short explanation of what is changing.

      Return format MUST be a strict JSON array of objects. Do NOT wrap in markdown code blocks.
    `;

    const stepsResult = await model.generateContent(stepsPrompt);
    const stepsText = cleanJsonResponse(await stepsResult.response.text());
    const steps = JSON.parse(stepsText);

    // Save classification & steps to Firestore Cache
    try {
      await updateDoc(doc(db, 'problems', problemId), {
        visualizerType: classification.type,
        visualizerData: classification.initialData || null,
        visualizerSteps: steps
      });
    } catch (e) {
      await setDoc(doc(db, 'problems', problemId), {
        visualizerType: classification.type,
        visualizerData: classification.initialData || null,
        visualizerSteps: steps
      }, { merge: true });
    }

    return {
      type: classification.type,
      initialData: classification.initialData,
      steps
    };
  } catch (error) {
    console.error("Gemini classification/step generation failed:", error);
    return null;
  }
}
