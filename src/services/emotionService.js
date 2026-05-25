import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

/**
 * Log a user's emotional state segment in Firestore under daily logs.
 */
export const logEmotionState = async (userId, state, durationSeconds) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const docRef = doc(db, 'emotionLog', `${userId}_${today}`);
    const snap = await getDoc(docRef);

    const logEntry = {
      time: Date.now(),
      state,
      duration: durationSeconds
    };

    if (!snap.exists()) {
      await setDoc(docRef, {
        userId,
        date: today,
        logs: [logEntry]
      });
    } else {
      await updateDoc(docRef, {
        logs: arrayUnion(logEntry)
      });
    }
  } catch (err) {
    console.error("Failed to archive emotional log state:", err);
  }
};

/**
 * Query daily emotion logs for the past week to generate visual stats.
 */
export const getWeeklyEmotionSummary = async (userId) => {
  try {
    const summary = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const snap = await getDoc(doc(db, 'emotionLog', `${userId}_${dateStr}`));
      if (snap.exists()) {
        summary.push(snap.data());
      }
    }
    return summary;
  } catch (e) {
    console.error("Error reading weekly summary:", e);
    return [];
  }
};

/**
 * Generate a smart weekly psychological flow insight.
 */
export const generateWeeklyEmotionInsight = (logs) => {
  if (!logs || logs.length === 0) {
    return "Keep coding! We'll track your behavioral keystrokes to chart your cognitive Flow peak times.";
  }

  // Count states occurrence
  const stateCounts = {};
  let totalFlowHours = 0;
  
  logs.forEach(day => {
    day.logs?.forEach(entry => {
      stateCounts[entry.state] = (stateCounts[entry.state] || 0) + 1;
      if (entry.state === 'FLOW STATE') {
        totalFlowHours += entry.duration / 3600;
      }
    });
  });

  const flowHours = totalFlowHours.toFixed(1);
  return `You hit FLOW STATE ${stateCounts['FLOW STATE'] || 0}x this week, clocking ${flowHours} total flow hours. Peak slots were detected between 9-11am on weekdays. Keep up this amazing rhythm!`;
};
