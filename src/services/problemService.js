import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  limit, 
  startAfter, 
  orderBy,
  runTransaction,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';

const PROBLEMS_COLLECTION = 'problems';
const SUBMISSIONS_COLLECTION = 'submissions';
const USERS_COLLECTION = 'users';

export const getProblems = async (filters = {}, lastVisibleDoc = null) => {
  try {
    let q = collection(db, PROBLEMS_COLLECTION);
    let conditions = [];

    // Always order by problem number or a consistent field for pagination
    conditions.push(orderBy('number', 'asc'));

    if (filters.difficulty && filters.difficulty !== 'All') {
      conditions.push(where('difficulty', '==', filters.difficulty));
    }

    if (filters.topics && filters.topics.length > 0) {
      conditions.push(where('topics', 'array-contains-any', filters.topics));
    }

    if (lastVisibleDoc) {
      conditions.push(startAfter(lastVisibleDoc));
    }

    conditions.push(limit(20));

    const finalQuery = query(q, ...conditions);
    const snapshot = await getDocs(finalQuery);
    
    const problems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      problems,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (error) {
    console.error("Error fetching problems:", error);
    throw error;
  }
};

export const getProblemById = async (id) => {
  try {
    const docRef = doc(db, PROBLEMS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("Problem not found");
    }
  } catch (error) {
    console.error("Error fetching problem:", error);
    throw error;
  }
};

export const getUserSolvedProblems = async (uid) => {
  try {
    if (!uid) return [];
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().solvedProblems || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching user solved problems:", error);
    return [];
  }
};

export const saveAcceptedSubmission = async (uid, problemId, code, language, executionTime, codeDNA = null) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Save the submission
      const newSubmissionRef = doc(collection(db, SUBMISSIONS_COLLECTION));
      transaction.set(newSubmissionRef, {
        userId: uid,
        problemId,
        code,
        language,
        verdict: 'Accepted',
        executionTime,
        timestamp: new Date(),
        codeDNA
      });

      // 2. Update the user doc (add to solvedProblems and add coins)
      const userRef = doc(db, USERS_COLLECTION, uid);
      const userDoc = await transaction.get(userRef);
      
      let solvedProblems = [];
      let coinsBalance = 0;
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        solvedProblems = data.solvedProblems || [];
        coinsBalance = data.coinsBalance || 0;
      }

      if (!solvedProblems.includes(problemId)) {
        solvedProblems.push(problemId);
        coinsBalance += 10;
        
        transaction.set(userRef, {
          solvedProblems,
          coinsBalance
        }, { merge: true });
      }
    });
  } catch (error) {
    console.error("Error saving submission:", error);
    throw error;
  }
};

export const getUserSubmissionsForProblem = async (uid, problemId) => {
  try {
    if (!uid || !problemId) return [];
    const q = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('userId', '==', uid),
      where('problemId', '==', problemId)
    );
    const snapshot = await getDocs(q);
    const submissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Clean sorting client-side by timestamp ascending
    submissions.sort((a, b) => {
      const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
      const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
      return timeA - timeB;
    });
    
    return submissions;
  } catch (error) {
    console.error("Error fetching user submissions:", error);
    return [];
  }
};

export const getAllProblems = async () => {
  try {
    const q = query(collection(db, PROBLEMS_COLLECTION), orderBy('number', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching all problems:", error);
    return [];
  }
};

export const saveMasteredSkill = async (uid, topicName) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      masteredSkills: arrayUnion(topicName)
    });
  } catch (error) {
    console.error("Error saving mastered skill:", error);
    throw error;
  }
};



