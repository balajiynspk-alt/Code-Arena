import { db } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export const updateStreak = async (userId) => {
  if (!userId) return;

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const lastActive = data.lastActiveDate ? new Date(data.lastActiveDate) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let currentStreak = data.streak || 0;
      let shouldUpdate = false;

      if (!lastActive) {
        // First time active
        currentStreak = 1;
        shouldUpdate = true;
      } else {
        const lastActiveDay = new Date(lastActive);
        lastActiveDay.setHours(0, 0, 0, 0);
        
        const diffTime = Math.abs(today - lastActiveDay);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Active yesterday
          currentStreak += 1;
          shouldUpdate = true;
        } else if (diffDays > 1) {
          // Missed a day
          currentStreak = 1;
          shouldUpdate = true;
        }
        // If diffDays === 0, already active today, do nothing
      }

      if (shouldUpdate) {
        await updateDoc(userRef, {
          streak: currentStreak,
          lastActiveDate: new Date().toISOString()
        });
      }
      
      return currentStreak;
    }
  } catch (error) {
    console.error("Error updating streak:", error);
  }
};
