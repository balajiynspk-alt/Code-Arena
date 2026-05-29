import { db, auth, isMockMode } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  runTransaction
} from 'firebase/firestore';

/**
 * Retrieves threaded comments for a given problem.
 * @param {string} problemId - The problem ID.
 * @returns {Promise<Array>} - Threaded list of comments.
 */
export const getComments = async (problemId) => {
  if (isMockMode) {
    const key = `mock_discussions_${problemId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Initial baseline discussions for standard problems to make the tab immediately engaging!
    const baseline = [
      {
        id: 'comment_baseline_1',
        uid: 'Aura_Netrunner',
        displayName: 'Aura_Netrunner',
        userRank: 'Master',
        text: 'This problem is highly optimized using a **LRU cache** lookup map. Make sure your hash table insertions are O(1) inside key collisions, otherwise standard bounds will fail! 🚀\n\n```python\n# Hint: Use a doubly linked list\n```',
        codeSnippet: 'def solve():\n    cache = {}\n    # track double links\n    pass',
        language: 'python',
        upvotes: 18,
        downvotes: 1,
        parentId: null,
        replyCount: 1,
        createdAt: Date.now() - 3600000 * 4
      },
      {
        id: 'comment_baseline_2',
        uid: 'Glitch_Viper',
        displayName: 'Glitch_Viper',
        userRank: 'Expert',
        text: 'Agreed! I faced an off-by-one check right at the tail bounds. Initializing the dummy head and tail sentinel nodes resolved it instantly.',
        codeSnippet: '',
        language: 'python',
        upvotes: 6,
        downvotes: 0,
        parentId: 'comment_baseline_1',
        replyCount: 0,
        createdAt: Date.now() - 3600000 * 2
      },
      {
        id: 'comment_baseline_3',
        uid: 'Beginner_Bot',
        displayName: 'Beginner_Bot',
        userRank: 'Beginner',
        text: 'Can anyone explain why my C++ code gives a Segmentation Fault on larger matrices? I used regular nested loops without pointers.',
        codeSnippet: 'int mat[100000][100000];\n// segfault here',
        language: 'cpp',
        upvotes: 2,
        downvotes: 0,
        parentId: null,
        replyCount: 0,
        createdAt: Date.now() - 3600000 * 24
      }
    ];

    localStorage.setItem(key, JSON.stringify(baseline));
    return baseline;
  }

  // Production Firestore fetch
  const commentsCol = collection(db, 'discussions', problemId, 'comments');
  const snap = await getDocs(query(commentsCol, orderBy('createdAt', 'asc')));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Adds a new comment or nested reply.
 * @param {string} problemId - The problem ID.
 * @param {string} text - The comment body.
 * @param {string} codeSnippet - Attached Monaco code.
 * @param {string} language - Monaco compiler language.
 * @param {string|null} parentId - Direct parent ID if nested.
 * @returns {Promise<void>}
 */
export const addComment = async (problemId, text, codeSnippet = '', language = 'python', parentId = null) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Operator authentication required.");

  const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const comment = {
    uid: currentUser.uid,
    displayName: currentUser.displayName || 'Operator',
    userRank: 'Expert', // Default rank indicator
    text,
    codeSnippet,
    language,
    upvotes: 0,
    downvotes: 0,
    parentId,
    replyCount: 0,
    createdAt: Date.now()
  };

  if (isMockMode) {
    const key = `mock_discussions_${problemId}`;
    const comments = await getComments(problemId);
    
    // Increment parent reply count if nested
    if (parentId) {
      const idx = comments.findIndex(c => c.id === parentId);
      if (idx !== -1) {
        comments[idx].replyCount = (comments[idx].replyCount || 0) + 1;
        
        // Notify parent owner
        if (comments[idx].uid !== currentUser.uid) {
          const { createNotification } = await import('./notificationService');
          await createNotification(
            comments[idx].uid,
            'COMMENT_REPLY',
            `@${currentUser.displayName || 'Operator'} replied to your comment on problem #${problemId}.`,
            `/problems/${problemId}`
          );
        }
      }
    }

    comments.push({ id: commentId, ...comment });
    localStorage.setItem(key, JSON.stringify(comments));
    return;
  }

  // Firestore transaction to handle upvotes and parent replyCount updates safely
  const commentsCol = collection(db, 'discussions', problemId, 'comments');
  const newDocRef = doc(commentsCol, commentId);

  if (parentId) {
    const parentRef = doc(commentsCol, parentId);
    let parentUid = null;
    await runTransaction(db, async (transaction) => {
      const parentSnap = await transaction.get(parentRef);
      if (parentSnap.exists()) {
        const count = parentSnap.data().replyCount || 0;
        parentUid = parentSnap.data().uid;
        transaction.update(parentRef, { replyCount: count + 1 });
      }
      transaction.set(newDocRef, comment);
    });

    if (parentUid && parentUid !== currentUser.uid) {
      const { createNotification } = await import('./notificationService');
      await createNotification(
        parentUid,
        'COMMENT_REPLY',
        `@${currentUser.displayName || 'Operator'} replied to your comment on problem #${problemId}.`,
        `/problems/${problemId}`
      );
    }
  } else {
    await setDoc(newDocRef, comment);
  }
};

/**
 * Modifies an existing comment body.
 */
export const editComment = async (problemId, commentId, text, codeSnippet = '', language = 'python') => {
  if (isMockMode) {
    const key = `mock_discussions_${problemId}`;
    const comments = await getComments(problemId);
    const idx = comments.findIndex(c => c.id === commentId);
    if (idx !== -1) {
      comments[idx].text = text;
      comments[idx].codeSnippet = codeSnippet;
      comments[idx].language = language;
      localStorage.setItem(key, JSON.stringify(comments));
    }
    return;
  }

  const commentRef = doc(db, 'discussions', problemId, 'comments', commentId);
  await setDoc(commentRef, { text, codeSnippet, language }, { merge: true });
};

/**
 * Deletes a comment.
 */
export const deleteComment = async (problemId, commentId) => {
  if (isMockMode) {
    const key = `mock_discussions_${problemId}`;
    const comments = await getComments(problemId);
    const updated = comments.filter(c => c.id !== commentId && c.parentId !== commentId);
    localStorage.setItem(key, JSON.stringify(updated));
    return;
  }

  const commentRef = doc(db, 'discussions', problemId, 'comments', commentId);
  await deleteDoc(commentRef);
};

/**
 * Registers upvote/downvote clicks safely tracking unique voters in subcollections.
 * @param {string} problemId - Problem ID.
 * @param {string} commentId - Comment ID.
 * @param {string} voteType - 'upvote' | 'downvote'
 * @returns {Promise<object>} - Updated { upvotes, downvotes } counts.
 */
export const voteComment = async (problemId, commentId, voteType) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");
  const myUid = currentUser.uid;

  if (isMockMode) {
    const key = `mock_discussions_${problemId}`;
    const comments = await getComments(problemId);
    const idx = comments.findIndex(c => c.id === commentId);
    if (idx !== -1) {
      const item = comments[idx];
      const voteTrackerKey = `mock_vote_${commentId}_${myUid}`;
      const previousVote = localStorage.getItem(voteTrackerKey); // 'upvote' | 'downvote' | null

      if (previousVote === voteType) {
        // Toggle off
        localStorage.removeItem(voteTrackerKey);
        if (voteType === 'upvote') item.upvotes = Math.max(0, item.upvotes - 1);
        else item.downvotes = Math.max(0, item.downvotes - 1);
      } else {
        // Clear old vote first if present
        if (previousVote === 'upvote') item.upvotes = Math.max(0, item.upvotes - 1);
        else if (previousVote === 'downvote') item.downvotes = Math.max(0, item.downvotes - 1);

        // Apply new vote
        localStorage.setItem(voteTrackerKey, voteType);
        if (voteType === 'upvote') item.upvotes += 1;
        else item.downvotes += 1;
      }

      comments[idx] = item;
      localStorage.setItem(key, JSON.stringify(comments));
      return { upvotes: item.upvotes, downvotes: item.downvotes };
    }
    return { upvotes: 0, downvotes: 0 };
  }

  // Firestore atomic transaction
  const commentRef = doc(db, 'discussions', problemId, 'comments', commentId);
  const voteDocRef = doc(db, 'discussions', problemId, 'comments', commentId, 'votes', myUid);
  
  let result = { upvotes: 0, downvotes: 0 };

  await runTransaction(db, async (transaction) => {
    const commentSnap = await transaction.get(commentRef);
    if (!commentSnap.exists()) throw new Error("Comment does not exist!");

    const voteSnap = await transaction.get(voteDocRef);
    const commentData = commentSnap.data();

    let up = commentData.upvotes || 0;
    let down = commentData.downvotes || 0;

    if (voteSnap.exists()) {
      const oldType = voteSnap.data().type;
      if (oldType === voteType) {
        // Undo vote
        transaction.delete(voteDocRef);
        if (voteType === 'upvote') up = Math.max(0, up - 1);
        else down = Math.max(0, down - 1);
      } else {
        // Change vote type
        transaction.set(voteDocRef, { type: voteType });
        if (voteType === 'upvote') {
          up += 1;
          down = Math.max(0, down - 1);
        } else {
          down += 1;
          up = Math.max(0, up - 1);
        }
      }
    } else {
      // First vote
      transaction.set(voteDocRef, { type: voteType });
      if (voteType === 'upvote') up += 1;
      else down += 1;
    }

    transaction.update(commentRef, { upvotes: up, downvotes: down });
    result = { upvotes: up, downvotes: down };
  });

  return result;
};

/**
 * Checks the voting status of the user on this comment.
 * @returns {Promise<string|null>} - 'upvote' | 'downvote' | null
 */
export const checkUserVote = async (problemId, commentId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  if (isMockMode) {
    return localStorage.getItem(`mock_vote_${commentId}_${currentUser.uid}`);
  }

  const voteDocRef = doc(db, 'discussions', problemId, 'comments', commentId, 'votes', currentUser.uid);
  const snap = await getDoc(voteDocRef);
  return snap.exists() ? snap.data().type : null;
};
