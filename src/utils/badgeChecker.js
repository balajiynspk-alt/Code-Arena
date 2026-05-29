import { db } from '../services/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const BADGES = {
  first_blood: { id: 'first_blood', name: 'First Blood', description: 'Solve your first problem', condition: (user) => user.solvedProblems?.length >= 1 },
  week_warrior: { id: 'week_warrior', name: 'Week Warrior', description: 'Maintain a 7-day streak', condition: (user) => user.streak >= 7 },
  century_club: { id: 'century_club', name: 'Century Club', description: 'Solve 100 problems', condition: (user) => user.solvedProblems?.length >= 100 },
  scholar: { id: 'scholar', name: 'Scholar', description: 'Complete a course', condition: (user) => user.completedCourses?.length >= 1 }
};

export const checkAndAwardBadges = async (userId, userDocData) => {
  if (!userId || !userDocData) return [];
  
  const currentBadges = userDocData.badges || [];
  const newlyEarned = [];

  for (const badge of Object.values(BADGES)) {
    if (!currentBadges.includes(badge.id)) {
      if (badge.condition(userDocData)) {
        newlyEarned.push(badge.id);
      }
    }
  }

  if (newlyEarned.length > 0) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        badges: arrayUnion(...newlyEarned)
      });
      // In a real app, you might trigger a toast notification here
      console.log(`Earned new badges: ${newlyEarned.join(', ')}`);
    } catch (error) {
      console.error("Error awarding badges:", error);
    }
  }

  return newlyEarned;
};

export const ALL_BADGES = Object.values(BADGES);
