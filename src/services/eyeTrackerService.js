import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { generateGeminiContent } from './aiService';

/**
 * Save user confusion telemetry report to Firestore.
 */
export const saveConfusionReport = async (userId, problemId, gazeMap, confusionScore, lessonText) => {
  try {
    const docRef = doc(db, 'confusionData', `${userId}_${problemId}`);
    await setDoc(docRef, {
      userId,
      problemId,
      gazeMap,
      confusionScore,
      microLesson: lessonText,
      microLessonGenerated: true,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error("Failed to archive confusion report:", err);
  }
};

/**
 * Query active confusion report.
 */
export const getConfusionReport = async (userId, problemId) => {
  try {
    const snap = await getDoc(doc(db, 'confusionData', `${userId}_${problemId}`));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null;
  }
};

/**
 * Trigger Gemini AI targeting the most confused text block.
 */
export const generateGazeMicroLesson = async (confusedText) => {
  const prompt = `The student spent most time staring at: "${confusedText}". Generate a 3-sentence plain-English explanation of this concept with one simple example. Be encouraging.`;
  try {
    const lesson = await generateGeminiContent(prompt);
    return lesson || "Great effort! Staring at complex bounds is a great way to map constraints. Always remember to check zero-indexing and overflow limits!";
  } catch (e) {
    return "Keep coding! Staring at complex bounds is a great way to map constraints. Always remember to check zero-indexing and overflow limits!";
  }
};
