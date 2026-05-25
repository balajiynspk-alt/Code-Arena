import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  increment, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

/**
 * Saves or updates a whiteboard diagram in Firestore.
 */
export const saveWhiteboard = async (userId, displayName, problemId, title, shapes, code) => {
  try {
    const whiteboardId = `${userId}_${problemId || 'general'}_${Date.now()}`;
    const docRef = doc(db, 'whiteboards', whiteboardId);
    
    const payload = {
      id: whiteboardId,
      userId,
      displayName: displayName || 'PixelCoder',
      problemId: problemId || 'general',
      title: title || 'Algorithm Visualisation',
      shapes: shapes || [],
      code: code || '',
      upvotes: 0,
      timestamp: Date.now()
    };

    await setDoc(docRef, payload);
    return whiteboardId;
  } catch (err) {
    console.error("Failed to save whiteboard:", err);
    throw err;
  }
};

/**
 * Fetch all whiteboards for a given problem or all general whiteboards.
 */
export const getWhiteboards = async (problemId = null) => {
  try {
    const colRef = collection(db, 'whiteboards');
    let q = query(colRef, orderBy('upvotes', 'desc'));
    
    if (problemId) {
      q = query(colRef, where('problemId', '==', problemId), orderBy('upvotes', 'desc'));
    }

    const snap = await getDocs(q);
    const results = [];
    snap.forEach(doc => {
      results.push(doc.data());
    });
    return results;
  } catch (err) {
    console.error("Failed to query whiteboards:", err);
    return [];
  }
};

/**
 * Upvote a community whiteboard flowchart.
 */
export const upvoteWhiteboard = async (whiteboardId) => {
  try {
    const docRef = doc(db, 'whiteboards', whiteboardId);
    await updateDoc(docRef, {
      upvotes: increment(1)
    });
  } catch (err) {
    console.error("Failed to upvote whiteboard:", err);
  }
};

/**
 * Retrieve a specific whiteboard diagram.
 */
export const getWhiteboardById = async (whiteboardId) => {
  try {
    const docRef = doc(db, 'whiteboards', whiteboardId);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("Failed to retrieve whiteboard:", err);
    return null;
  }
};
