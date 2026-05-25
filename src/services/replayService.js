import { db } from './firebase';
import { doc, setDoc, getDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Saves a completed Monaco code session replay to Firestore.
 */
export const saveReplay = async (userId, userName, problemId, problemTitle, replayData) => {
  if (!userId || !problemId) return;
  try {
    const docRef = doc(db, 'replays', `${userId}_${problemId}`);
    await setDoc(docRef, {
      userId,
      userName: userName || 'Anonymous Coder',
      problemId,
      problemTitle: problemTitle || 'Algorithmic Problem',
      events: replayData.events || [],
      totalTime: replayData.totalTime || 0,
      solveTime: replayData.solveTime || 0,
      deletedChars: replayData.deletedChars || 0,
      writtenChars: replayData.writtenChars || 0,
      pauseCount: replayData.pauseCount || 0,
      markers: replayData.markers || [],
      timestamp: serverTimestamp()
    });
    console.log("Successfully committed Code Arena replay to Firestore.");
  } catch (error) {
    console.error("Error saving code replay:", error);
  }
};

/**
 * Fetches a single Monaco session replay.
 */
export const getReplay = async (userId, problemId) => {
  try {
    const docRef = doc(db, 'replays', `${userId}_${problemId}`);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("Error fetching single replay:", error);
    return null;
  }
};

/**
 * Fetches the fastest solution replays.
 */
export const getTopReplays = async () => {
  try {
    const q = query(
      collection(db, 'replays'),
      orderBy('solveTime', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching arena top replays:", error);
    return [];
  }
};

/**
 * Comments on replay timestamps.
 */
export const addReplayComment = async (userId, userName, replayId, timestampSeconds, text) => {
  try {
    const refCol = collection(db, `replays/${replayId}/comments`);
    await addDoc(refCol, {
      userId,
      userName,
      timestampSeconds,
      text,
      createdAt: new Date()
    });
  } catch (err) {
    console.error("Error committing replay comment:", err);
  }
};

export const getReplayComments = async (replayId) => {
  try {
    const refCol = collection(db, `replays/${replayId}/comments`);
    const snap = await getDocs(refCol);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort by timestampSeconds
    list.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    return list;
  } catch (err) {
    console.error("Error loading replay comments:", err);
    return [];
  }
};
