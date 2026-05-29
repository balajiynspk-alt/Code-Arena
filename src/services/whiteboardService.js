import { db, isMockMode } from './firebase';
import { MOCK_WHITEBOARDS } from './mockData';
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
  if (isMockMode) {
    const whiteboardId = `wb_${userId || 'local'}_${problemId || 'general'}_${Date.now()}`;
    const payload = {
      id: whiteboardId,
      userId: userId || 'local_user',
      displayName: displayName || 'PixelCoder',
      problemId: problemId || 'general',
      title: title || 'Algorithm Visualisation',
      shapes: shapes || [],
      code: code || '',
      upvotes: 0,
      timestamp: Date.now()
    };

    const saved = localStorage.getItem('mock_whiteboards') || JSON.stringify(MOCK_WHITEBOARDS);
    const list = JSON.parse(saved);
    list.unshift(payload); // Add new on top
    localStorage.setItem('mock_whiteboards', JSON.stringify(list));
    return whiteboardId;
  }

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
  if (isMockMode) {
    const saved = localStorage.getItem('mock_whiteboards') || JSON.stringify(MOCK_WHITEBOARDS);
    let list = JSON.parse(saved);
    if (problemId) {
      list = list.filter(w => w.problemId === problemId);
    }
    // Sort by upvotes desc
    list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    return list;
  }

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
  if (isMockMode) {
    const saved = localStorage.getItem('mock_whiteboards') || JSON.stringify(MOCK_WHITEBOARDS);
    const list = JSON.parse(saved);
    const found = list.find(w => w.id === whiteboardId);
    if (found) {
      found.upvotes = (found.upvotes || 0) + 1;
      localStorage.setItem('mock_whiteboards', JSON.stringify(list));
    }
    return;
  }

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
  if (isMockMode) {
    const saved = localStorage.getItem('mock_whiteboards') || JSON.stringify(MOCK_WHITEBOARDS);
    const list = JSON.parse(saved);
    const found = list.find(w => w.id === whiteboardId);
    return found || null;
  }

  try {
    const docRef = doc(db, 'whiteboards', whiteboardId);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("Failed to retrieve whiteboard:", err);
    return null;
  }
};
