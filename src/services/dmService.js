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
  addDoc,
  onSnapshot,
  runTransaction,
  updateDoc
} from 'firebase/firestore';

/**
 * Helper to generate conversation ID between 2 UIDs deterministically.
 */
export const getConversationId = (uid1, uid2) => {
  return [uid1, uid2].sort().join('_');
};

/**
 * Returns all active DM conversations for the current authenticated user.
 */
export const subscribeConversations = (callback) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return () => {};

  if (isMockMode) {
    const key = 'mock_conversations';
    const load = () => {
      const raw = localStorage.getItem(key);
      if (raw) {
        callback(JSON.parse(raw));
      } else {
        // Pre-seed some awesome conversations!
        const baseline = [
          {
            id: getConversationId(currentUser.uid, 'Aura_Netrunner'),
            participants: [currentUser.uid, 'Aura_Netrunner'],
            participantNames: {
              [currentUser.uid]: currentUser.displayName || 'Operator',
              'Aura_Netrunner': 'Aura_Netrunner'
            },
            lastMessage: "Challenged you to a live 1v1 Battle! Are you ready?",
            lastMessageTime: Date.now() - 600000,
            unreadCount: {
              [currentUser.uid]: 2,
              'Aura_Netrunner': 0
            }
          },
          {
            id: getConversationId(currentUser.uid, 'Glitch_Viper'),
            participants: [currentUser.uid, 'Glitch_Viper'],
            participantNames: {
              [currentUser.uid]: currentUser.displayName || 'Operator',
              'Glitch_Viper': 'Glitch_Viper'
            },
            lastMessage: "I optimized the binary lookup loop. Check it out!",
            lastMessageTime: Date.now() - 3600000 * 3,
            unreadCount: {
              [currentUser.uid]: 0,
              'Glitch_Viper': 0
            }
          }
        ];
        localStorage.setItem(key, JSON.stringify(baseline));
        callback(baseline);
      }
    };

    load();
    const handler = () => load();
    window.addEventListener('mock_dm_update', handler);
    return () => window.removeEventListener('mock_dm_update', handler);
  }

  // Production Firestore
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', currentUser.uid),
    orderBy('lastMessageTime', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(list);
  });
};

/**
 * Starts or resolves a conversation between the current user and another operator.
 */
export const startConversation = async (otherUid, otherName) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");

  const convId = getConversationId(currentUser.uid, otherUid);

  if (isMockMode) {
    const key = 'mock_conversations';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    let conv = list.find(c => c.id === convId);
    if (!conv) {
      conv = {
        id: convId,
        participants: [currentUser.uid, otherUid],
        participantNames: {
          [currentUser.uid]: currentUser.displayName || 'Operator',
          [otherUid]: otherName
        },
        lastMessage: "Conversation initialized.",
        lastMessageTime: Date.now(),
        unreadCount: {
          [currentUser.uid]: 0,
          [otherUid]: 0
        }
      };
      list.push(conv);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('mock_dm_update'));
    }
    return convId;
  }

  const convRef = doc(db, 'conversations', convId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) {
    await setDoc(convRef, {
      participants: [currentUser.uid, otherUid],
      participantNames: {
        [currentUser.uid]: currentUser.displayName || 'Operator',
        [otherUid]: otherName
      },
      lastMessage: "Conversation initialized.",
      lastMessageTime: Date.now(),
      unreadCount: {
        [currentUser.uid]: 0,
        [otherUid]: 0
      }
    });
  }
  return convId;
};

/**
 * Subscribes to messages inside a single conversation.
 */
export const subscribeMessages = (conversationId, callback) => {
  if (isMockMode) {
    const key = `mock_dm_msgs_${conversationId}`;
    const load = () => {
      const raw = localStorage.getItem(key);
      if (raw) {
        callback(JSON.parse(raw));
      } else {
        // Seed initial message list
        let baseline = [];
        if (conversationId.includes('Aura_Netrunner')) {
          baseline = [
            {
              id: 'm1',
              senderId: 'Aura_Netrunner',
              text: "Hey! Ready to test your optimal binary search skills?",
              type: 'text',
              read: true,
              timestamp: Date.now() - 1200000
            },
            {
              id: 'm2',
              senderId: 'Aura_Netrunner',
              text: "Duel challenge issued!",
              type: 'battle_invite',
              read: false,
              timestamp: Date.now() - 600000,
              metadata: {
                battleId: 'battle_rtdb_mock_123',
                difficulty: 'Medium'
              }
            }
          ];
        } else if (conversationId.includes('Glitch_Viper')) {
          baseline = [
            {
              id: 'mv1',
              senderId: 'Glitch_Viper',
              text: "Check out this clean dynamic space compress solution to problem #3!",
              type: 'solution_share',
              read: true,
              timestamp: Date.now() - 3600000 * 4,
              metadata: {
                problemTitle: 'Dynamic Knapsack Compress',
                code: 'def knapsack(W, weights, values):\n    dp = [0] * (W + 1)\n    for i in range(len(values)):\n        for w in range(W, weights[i] - 1, -1):\n            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])\n    return dp[W]',
                stats: 'O(W) Space Complexity, 12ms execution'
              }
            }
          ];
        }
        localStorage.setItem(key, JSON.stringify(baseline));
        callback(baseline);
      }
    };

    load();
    const handler = () => load();
    window.addEventListener('mock_dm_msg_update', handler);
    return () => window.removeEventListener('mock_dm_msg_update', handler);
  }

  // Production Firestore
  const msgsCol = collection(db, 'messages', conversationId, 'msgs');
  const q = query(msgsCol, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(list);
  });
};

/**
 * Sends a private message to a conversation.
 */
export const sendDirectMessage = async (conversationId, text, type = 'text', metadata = {}) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");

  const otherUid = conversationId.split('_').find(id => id !== currentUser.uid);

  const msg = {
    senderId: currentUser.uid,
    text,
    type, // 'text' | 'battle_invite' | 'solution_share'
    read: false,
    timestamp: Date.now(),
    metadata
  };

  if (isMockMode) {
    // Write message
    const msgKey = `mock_dm_msgs_${conversationId}`;
    const msgs = JSON.parse(localStorage.getItem(msgKey) || '[]');
    msgs.push({ id: `m_${Date.now()}`, ...msg });
    localStorage.setItem(msgKey, JSON.stringify(msgs));

    // Update conversation metadata
    const convKey = 'mock_conversations';
    const convs = JSON.parse(localStorage.getItem(convKey) || '[]');
    const idx = convs.findIndex(c => c.id === conversationId);
    if (idx !== -1) {
      convs[idx].lastMessage = text;
      convs[idx].lastMessageTime = msg.timestamp;
      convs[idx].unreadCount[otherUid] = (convs[idx].unreadCount[otherUid] || 0) + 1;
      localStorage.setItem(convKey, JSON.stringify(convs));
    }

    if (type === 'battle_invite') {
      const { createNotification } = await import('./notificationService');
      await createNotification(
        otherUid,
        'BATTLE_INVITE',
        `⚔️ @${currentUser.displayName || 'Operator'} issued a 1v1 Arena combat challenge to your node!`,
        `/messages`
      );
    }

    window.dispatchEvent(new Event('mock_dm_update'));
    window.dispatchEvent(new Event('mock_dm_msg_update'));
    return;
  }

  // Production Firestore Transaction
  const convRef = doc(db, 'conversations', conversationId);
  const msgCol = collection(db, 'messages', conversationId, 'msgs');

  await runTransaction(db, async (transaction) => {
    const convSnap = await transaction.get(convRef);
    if (!convSnap.exists()) throw new Error("Conversation does not exist.");

    const currentUnreads = convSnap.data().unreadCount || {};
    const nextUnreads = {
      ...currentUnreads,
      [otherUid]: (currentUnreads[otherUid] || 0) + 1
    };

    transaction.update(convRef, {
      lastMessage: text,
      lastMessageTime: msg.timestamp,
      unreadCount: nextUnreads
    });

    const newMsgDoc = doc(msgCol);
    transaction.set(newMsgDoc, msg);
  });

  if (type === 'battle_invite') {
    const { createNotification } = await import('./notificationService');
    await createNotification(
      otherUid,
      'BATTLE_INVITE',
      `⚔️ @${currentUser.displayName || 'Operator'} issued a 1v1 Arena combat challenge to your node!`,
      `/messages`
    );
  }
};

/**
 * Marks all messages inside a conversation as read.
 */
export const markAsRead = async (conversationId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  if (isMockMode) {
    const convKey = 'mock_conversations';
    const convs = JSON.parse(localStorage.getItem(convKey) || '[]');
    const idx = convs.findIndex(c => c.id === conversationId);
    if (idx !== -1) {
      convs[idx].unreadCount[currentUser.uid] = 0;
      localStorage.setItem(convKey, JSON.stringify(convs));
    }

    const msgKey = `mock_dm_msgs_${conversationId}`;
    const msgs = JSON.parse(localStorage.getItem(msgKey) || '[]');
    const updated = msgs.map(m => {
      if (m.senderId !== currentUser.uid) return { ...m, read: true };
      return m;
    });
    localStorage.setItem(msgKey, JSON.stringify(updated));

    window.dispatchEvent(new Event('mock_dm_update'));
    window.dispatchEvent(new Event('mock_dm_msg_update'));
    return;
  }

  // Production Firestore updates
  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  if (snap.exists()) {
    const unread = snap.data().unreadCount || {};
    if (unread[currentUser.uid] > 0) {
      const nextUnreads = { ...unread, [currentUser.uid]: 0 };
      await updateDoc(convRef, { unreadCount: nextUnreads });
    }
  }

  // Update messages collection as well
  const msgsCol = collection(db, 'messages', conversationId, 'msgs');
  const unreadQuery = query(msgsCol, where('senderId', '!=', currentUser.uid), where('read', '==', false));
  const unreadSnaps = await getDocs(unreadQuery);
  for (const docItem of unreadSnaps.docs) {
    await updateDoc(docItem.ref, { read: true });
  }
};

/**
 * Block User option.
 */
export const blockUser = async (targetUid) => {
  const key = `blocked_users_${auth.currentUser?.uid || 'guest'}`;
  const blocked = JSON.parse(localStorage.getItem(key) || '[]');
  if (!blocked.includes(targetUid)) {
    blocked.push(targetUid);
    localStorage.setItem(key, JSON.stringify(blocked));
  }
};

/**
 * Checks if user is blocked.
 */
export const isUserBlocked = (targetUid) => {
  const key = `blocked_users_${auth.currentUser?.uid || 'guest'}`;
  const blocked = JSON.parse(localStorage.getItem(key) || '[]');
  return blocked.includes(targetUid);
};
