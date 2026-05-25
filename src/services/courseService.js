import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  runTransaction
} from 'firebase/firestore';

const COURSES_COLLECTION = 'courses';
const PROGRESS_COLLECTION = 'progress';
const USERS_COLLECTION = 'users';

export const getCourses = async (trackFilter = 'All') => {
  try {
    let q = collection(db, COURSES_COLLECTION);
    if (trackFilter !== 'All') {
      q = query(q, where('track', '==', trackFilter));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};

export const getCourseById = async (id) => {
  try {
    const docRef = doc(db, COURSES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    throw new Error("Course not found");
  } catch (error) {
    console.error("Error fetching course:", error);
    throw error;
  }
};

export const getCourseProgress = async (userId, courseId) => {
  if (!userId) return null;
  try {
    const progressId = `${userId}_${courseId}`;
    const docRef = doc(db, PROGRESS_COLLECTION, progressId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching progress:", error);
    return null;
  }
};

export const enrollInCourse = async (userId, courseId) => {
  try {
    const progressId = `${userId}_${courseId}`;
    const docRef = doc(db, PROGRESS_COLLECTION, progressId);
    await setDoc(docRef, {
      userId,
      courseId,
      completedLessons: [],
      quizScores: {},
      enrolledAt: new Date(),
      lastLessonId: null
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error enrolling in course:", error);
    throw error;
  }
};

export const markLessonComplete = async (userId, courseId, lessonId, isQuiz = false, score = 0) => {
  try {
    const progressId = `${userId}_${courseId}`;
    const docRef = doc(db, PROGRESS_COLLECTION, progressId);
    
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) throw new Error("Progress document not found");
      
      const data = docSnap.data();
      const completedLessons = data.completedLessons || [];
      const quizScores = data.quizScores || {};
      
      const updates = { lastLessonId: lessonId };
      
      if (!completedLessons.includes(lessonId)) {
        updates.completedLessons = arrayUnion(lessonId);
      }
      
      if (isQuiz) {
        updates[`quizScores.${lessonId}`] = score;
      }
      
      transaction.update(docRef, updates);
    });
  } catch (error) {
    console.error("Error marking lesson complete:", error);
    throw error;
  }
};

export const checkCourseCompletion = async (userId, courseId, totalLessonsCount) => {
  try {
    const progressId = `${userId}_${courseId}`;
    const docRef = doc(db, PROGRESS_COLLECTION, progressId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const completedCount = (docSnap.data().completedLessons || []).length;
      if (completedCount >= totalLessonsCount) {
        // Mark course completed in user doc
        const userRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(userRef, {
          completedCourses: arrayUnion(courseId)
        });
      }
    }
  } catch (error) {
    console.error("Error checking course completion:", error);
  }
};
