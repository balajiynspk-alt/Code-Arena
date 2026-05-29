import { db, isMockMode } from './firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

// Baseline set of high-fidelity cyber-coders for search
const MOCK_USERS_POOL = [
  {
    uid: 'Glitch_Viper',
    username: 'Glitch_Viper',
    displayName: 'Glitch_Viper',
    bio: 'Decoupling matrices and seeking algorithmic dominance.',
    college: 'Nexus Institute of Technology',
    location: 'Neo-Tokyo Sector 4',
    favoriteLanguages: ['python', 'cpp'],
    rating: 1580,
    rank: 'Expert',
    easySolved: 50,
    mediumSolved: 35,
    hardSolved: 15,
    solvedCount: 100,
    streak: 12,
    avatarUrl: ''
  },
  {
    uid: 'Aura_Netrunner',
    username: 'Aura_Netrunner',
    displayName: 'Aura_Netrunner',
    bio: 'Netrunning through quantum binary trees.',
    college: 'Nexus Institute of Technology',
    location: 'Neo-Tokyo Sector 9',
    favoriteLanguages: ['javascript', 'rust'],
    rating: 1720,
    rank: 'Master',
    easySolved: 85,
    mediumSolved: 60,
    hardSolved: 30,
    solvedCount: 175,
    streak: 24,
    avatarUrl: ''
  },
  {
    uid: 'NeonPro',
    username: 'NeonPro',
    displayName: 'NeonPro',
    bio: 'Pixel-perfect CSS and optimized React graph systems.',
    college: 'Silicon Guild Academy',
    location: 'Neo-Tokyo Sector 2',
    favoriteLanguages: ['javascript', 'go'],
    rating: 1410,
    rank: 'Intermediate',
    easySolved: 35,
    mediumSolved: 20,
    hardSolved: 5,
    solvedCount: 60,
    streak: 4,
    avatarUrl: ''
  },
  {
    uid: 'Binary_Ghost',
    username: 'Binary_Ghost',
    displayName: 'Binary_Ghost',
    bio: 'Phantom threads solving concurrent challenges.',
    college: 'Aether Cyber Academy',
    location: 'Sector 7 Hub',
    favoriteLanguages: ['cpp', 'rust'],
    rating: 1640,
    rank: 'Expert',
    easySolved: 62,
    mediumSolved: 44,
    hardSolved: 18,
    solvedCount: 124,
    streak: 15,
    avatarUrl: ''
  },
  {
    uid: 'FAANG_Slayer',
    username: 'FAANG_Slayer',
    displayName: 'FAANG_Slayer',
    bio: 'Cracking whiteboard arrays at relativistic velocities.',
    college: 'Silicon Guild Academy',
    location: 'Neo-Tokyo Sector 1',
    favoriteLanguages: ['java', 'python'],
    rating: 1890,
    rank: 'Master',
    easySolved: 110,
    mediumSolved: 90,
    hardSolved: 50,
    solvedCount: 250,
    streak: 31,
    avatarUrl: ''
  },
  {
    uid: 'Beginner_Bot',
    username: 'Beginner_Bot',
    displayName: 'Beginner_Bot',
    bio: 'Initializing stack overflow buffers. Please hold...',
    college: 'Nexus Institute of Technology',
    location: 'Neo-Tokyo Sector 12',
    favoriteLanguages: ['python'],
    rating: 1020,
    rank: 'Beginner',
    easySolved: 8,
    mediumSolved: 2,
    hardSolved: 0,
    solvedCount: 10,
    streak: 1,
    avatarUrl: ''
  }
];

/**
 * Perform reactive search over user records based on prefix matching
 * @param {string} searchTerm - Query text
 * @param {object} filters - College, rank, rating limits, language
 * @param {string} sortBy - 'rating' | 'solved' | 'streak'
 * @returns {Promise<Array>}
 */
export const searchUsers = async (searchTerm = '', filters = {}, sortBy = 'rating') => {
  const cleanSearch = searchTerm.trim().toLowerCase();

  if (isMockMode) {
    // Read local storage profiles to sync edits
    let users = [...MOCK_USERS_POOL];
    
    // Check if current user profile is saved
    const myProfileRaw = localStorage.getItem('mock_user_profile');
    if (myProfileRaw) {
      const myProfile = JSON.parse(myProfileRaw);
      // Ensure local user is searchable if matched
      if (!users.some(u => u.uid === 'me' || u.uid === myProfile.username)) {
        users.push({
          uid: 'me',
          username: myProfile.username || 'me',
          displayName: myProfile.displayName || 'me',
          bio: myProfile.bio || 'Cyber developer on active node.',
          college: myProfile.college || 'Local Terminal Academy',
          location: myProfile.location || 'Local Grid',
          favoriteLanguages: myProfile.favoriteLanguages || ['python'],
          rating: myProfile.rating || 1200,
          rank: myProfile.rank || 'Intermediate',
          easySolved: myProfile.easySolved || 2,
          mediumSolved: myProfile.mediumSolved || 1,
          hardSolved: myProfile.hardSolved || 0,
          solvedCount: (myProfile.easySolved || 0) + (myProfile.mediumSolved || 0) + (myProfile.hardSolved || 0),
          streak: myProfile.streak || 1,
          avatarUrl: myProfile.avatarUrl || ''
        });
      }
    }

    // Apply text search on username or display name
    if (cleanSearch) {
      users = users.filter(u => 
        u.displayName.toLowerCase().includes(cleanSearch) || 
        u.username.toLowerCase().includes(cleanSearch)
      );
    }

    // Apply filters
    if (filters.rank && filters.rank !== 'All') {
      users = users.filter(u => u.rank === filters.rank);
    }
    if (filters.college && filters.college !== 'All') {
      users = users.filter(u => u.college === filters.college);
    }
    if (filters.language && filters.language !== 'All') {
      users = users.filter(u => u.favoriteLanguages && u.favoriteLanguages.includes(filters.language.toLowerCase()));
    }
    if (filters.minRating !== undefined && filters.maxRating !== undefined) {
      users = users.filter(u => u.rating >= filters.minRating && u.rating <= filters.maxRating);
    }

    // Apply Sorting
    users.sort((a, b) => {
      if (sortBy === 'solved') {
        return (b.solvedCount || 0) - (a.solvedCount || 0);
      }
      if (sortBy === 'streak') {
        return (b.streak || 0) - (a.streak || 0);
      }
      return (b.rating || 0) - (a.rating || 0);
    });

    return users;
  }

  // ── PRODUCTION FIRESTORE PREFIX QUERY ──
  try {
    const usersCol = collection(db, 'users');
    let q;

    if (cleanSearch) {
      // prefix search
      const termEnd = cleanSearch + '\uf8ff';
      q = query(
        usersCol,
        where('displayName', '>=', searchTerm),
        where('displayName', '<=', searchTerm + '\uf8ff'),
        limit(50)
      );
    } else {
      q = query(usersCol, limit(50));
    }

    const snap = await getDocs(q);
    let results = snap.docs.map(doc => {
      const data = doc.data();
      const easy = data.easySolved || 0;
      const med = data.mediumSolved || 0;
      const hard = data.hardSolved || 0;
      return {
        uid: doc.id,
        ...data,
        solvedCount: easy + med + hard
      };
    });

    // Client-side filtering & sorting to bypass indexing limitations
    if (filters.rank && filters.rank !== 'All') {
      results = results.filter(u => u.rank === filters.rank);
    }
    if (filters.college && filters.college !== 'All') {
      results = results.filter(u => u.college === filters.college);
    }
    if (filters.language && filters.language !== 'All') {
      results = results.filter(u => u.favoriteLanguages?.some(lang => lang.toLowerCase() === filters.language.toLowerCase()));
    }
    if (filters.minRating !== undefined && filters.maxRating !== undefined) {
      results = results.filter(u => (u.rating || 1200) >= filters.minRating && (u.rating || 1200) <= filters.maxRating);
    }

    // Apply sorting
    results.sort((a, b) => {
      if (sortBy === 'solved') {
        return (b.solvedCount || 0) - (a.solvedCount || 0);
      }
      if (sortBy === 'streak') {
        return (b.streak || 0) - (a.streak || 0);
      }
      return (b.rating || 1200) - (a.rating || 1200);
    });

    return results;
  } catch (error) {
    console.error("Firestore user search error:", error);
    return [];
  }
};
