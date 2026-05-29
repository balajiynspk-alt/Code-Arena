import { db, isMockMode } from './firebase';
import { MOCK_PROBLEMS } from './mockData';
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
  if (isMockMode) {
    let list = [...MOCK_PROBLEMS];
    if (filters.difficulty && filters.difficulty !== 'All') {
      list = list.filter(p => p.difficulty === filters.difficulty);
    }
    if (filters.topics && filters.topics.length > 0) {
      list = list.filter(p => p.topics.some(t => filters.topics.includes(t)));
    }
    return {
      problems: list,
      lastDoc: null
    };
  }

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
  if (isMockMode) {
    const found = MOCK_PROBLEMS.find(p => p.id === id || p.number.toString() === id);
    if (found) return found;
    throw new Error("Problem not found");
  }

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
  if (isMockMode) {
    const solved = localStorage.getItem('mock_solved_problems');
    return solved ? JSON.parse(solved) : ["1", "2"]; // Default solved problems
  }

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
  if (isMockMode) {
    // Update Solved Problems array in LocalStorage
    const solved = localStorage.getItem('mock_solved_problems');
    let solvedArray = solved ? JSON.parse(solved) : ["1", "2"];
    if (!solvedArray.includes(problemId)) {
      solvedArray.push(problemId);
      localStorage.setItem('mock_solved_problems', JSON.stringify(solvedArray));
    }

    // Save Submission detail
    const submissions = localStorage.getItem('mock_submissions') || '[]';
    const subList = JSON.parse(submissions);
    subList.push({
      id: `sub_${Date.now()}`,
      userId: uid || 'local_user',
      problemId,
      code,
      language,
      verdict: 'Accepted',
      executionTime,
      timestamp: new Date().toISOString(),
      codeDNA
    });
    localStorage.setItem('mock_submissions', JSON.stringify(subList));

    // Update User metadata stats in LocalStorage
    const profile = localStorage.getItem('mock_user_profile');
    const profileData = profile ? JSON.parse(profile) : { streak: 12, coinsBalance: 450, rating: 1200 };
    profileData.coinsBalance = (profileData.coinsBalance || 0) + 10;
    if (!profileData.solvedProblems) profileData.solvedProblems = [];
    if (!profileData.solvedProblems.includes(problemId)) {
      profileData.solvedProblems.push(problemId);
    }
    localStorage.setItem('mock_user_profile', JSON.stringify(profileData));
    
    // Dispatch local state change trigger event so Navbar updates instantly
    window.dispatchEvent(new Event('mock_profile_updated'));
    return;
  }

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
  if (isMockMode) {
    const submissions = localStorage.getItem('mock_submissions') || '[]';
    const subList = JSON.parse(submissions);
    const results = subList.filter(s => s.problemId === problemId);
    return results.map(s => ({
      ...s,
      timestamp: { toDate: () => new Date(s.timestamp) } // Mock Firestore Timestamp
    }));
  }

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

export const getUserSubmissions = async (uid) => {
  if (isMockMode) {
    const submissions = localStorage.getItem('mock_submissions') || '[]';
    const subList = JSON.parse(submissions);
    // Filter matching either username or uid
    return subList.filter(s => s.userId === uid || s.username === uid).map(s => ({
      id: s.id,
      problemId: s.problemId,
      code: s.code || `// optimal execution\nconsole.log('optimal output');`,
      language: s.language || 'python',
      verdict: s.verdict || 'Accepted',
      executionTime: s.executionTime || 24,
      runtime: s.executionTime || 24,
      timestamp: s.timestamp ? new Date(s.timestamp).getTime() : Date.now()
    }));
  }

  try {
    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        runtime: data.executionTime || 24,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().getTime() : new Date(data.timestamp || 0).getTime()
      };
    });
  } catch (err) {
    console.error("Error fetching user submissions:", err);
    return [];
  }
};

export const getAllProblems = async () => {
  if (isMockMode) {
    return MOCK_PROBLEMS;
  }

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
  if (isMockMode) {
    const mastered = localStorage.getItem('mock_mastered_skills');
    const masteredArray = mastered ? JSON.parse(mastered) : [];
    if (!masteredArray.includes(topicName)) {
      masteredArray.push(topicName);
      localStorage.setItem('mock_mastered_skills', JSON.stringify(masteredArray));
    }
    return;
  }

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



