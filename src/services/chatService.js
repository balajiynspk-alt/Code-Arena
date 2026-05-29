import { rtdb, auth, isMockMode } from './firebase';
import { 
  ref, 
  set, 
  push, 
  onValue, 
  off, 
  limitToLast, 
  query, 
  remove, 
  get 
} from 'firebase/database';

/**
 * Sends a message into the specified channel path.
 * @param {string} channelType - 'global' | 'community' | 'problem'
 * @param {string} channelId - 'global' or the specific community/problem ID
 * @param {string} text - Message text
 * @param {string} rank - Operator rank (e.g. Master, Expert, Beginner)
 * @param {string} type - 'message' | 'system'
 * @returns {Promise<void>}
 */
export const sendMessage = async (channelType, channelId, text, rank = 'Expert', type = 'message') => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");

  const msg = {
    uid: currentUser.uid,
    displayName: currentUser.displayName || 'Operator',
    rank,
    text,
    type,
    timestamp: Date.now()
  };

  if (isMockMode) {
    const key = `mock_chat_${channelType}_${channelId}`;
    const raw = localStorage.getItem(key) || '[]';
    const list = JSON.parse(raw);
    list.push(msg);
    if (list.length > 200) list.shift(); // Enforce last 200 limit
    localStorage.setItem(key, JSON.stringify(list));

    // Emit local event so other tabs/components hear it instantly
    window.dispatchEvent(new CustomEvent('mock_chat_update', { detail: { channelType, channelId } }));
    return;
  }

  // Production RTDB write
  const chatRef = ref(rtdb, `chats/${channelType}/${channelId}/messages`);
  const newMsgRef = push(chatRef);
  await set(newMsgRef, msg);

  // Enforce 200 message cap on write
  const fullRef = ref(rtdb, `chats/${channelType}/${channelId}/messages`);
  get(query(fullRef, limitToLast(250))).then((snap) => {
    if (snap.exists()) {
      const msgs = snap.val();
      const keys = Object.keys(msgs);
      if (keys.length > 200) {
        // Delete oldest keys
        const deleteCount = keys.length - 200;
        for (let i = 0; i < deleteCount; i++) {
          remove(ref(rtdb, `chats/${channelType}/${channelId}/messages/${keys[i]}`));
        }
      }
    }
  });
};

/**
 * Subscribes to real-time updates for a given channel messages list.
 */
export const subscribeMessages = (channelType, channelId, callback) => {
  if (isMockMode) {
    const key = `mock_chat_${channelType}_${channelId}`;
    const load = () => {
      const raw = localStorage.getItem(key) || '[]';
      callback(JSON.parse(raw));
    };

    // Load initial
    load();

    const handler = (e) => {
      if (e.detail.channelType === channelType && e.detail.channelId === channelId) {
        load();
      }
    };

    window.addEventListener('mock_chat_update', handler);
    return () => window.removeEventListener('mock_chat_update', handler);
  }

  // Production
  const chatRef = ref(rtdb, `chats/${channelType}/${channelId}/messages`);
  const q = query(chatRef, limitToLast(200));

  onValue(q, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      callback(list);
    } else {
      callback([]);
    }
  });

  return () => off(q);
};

/**
 * Updates the operator's live typing indicator.
 */
export const setTypingStatus = async (channelType, channelId, isTyping) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  if (isMockMode) {
    const key = `mock_typing_${channelType}_${channelId}_${currentUser.uid}`;
    if (isTyping) {
      localStorage.setItem(key, currentUser.displayName || 'Operator');
    } else {
      localStorage.removeItem(key);
    }
    window.dispatchEvent(new CustomEvent('mock_typing_update', { detail: { channelType, channelId } }));
    return;
  }

  const typingRef = ref(rtdb, `chats/${channelType}/${channelId}/typing/${currentUser.uid}`);
  if (isTyping) {
    await set(typingRef, { displayName: currentUser.displayName || 'Operator' });
  } else {
    await remove(typingRef);
  }
};

/**
 * Subscribes to active typers list.
 */
export const subscribeTyping = (channelType, channelId, callback) => {
  if (isMockMode) {
    const getTypers = () => {
      const list = [];
      const prefix = `mock_typing_${channelType}_${channelId}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          list.push(localStorage.getItem(key));
        }
      }
      callback(list);
    };

    getTypers();

    const handler = (e) => {
      if (e.detail.channelType === channelType && e.detail.channelId === channelId) {
        getTypers();
      }
    };
    window.addEventListener('mock_typing_update', handler);
    return () => window.removeEventListener('mock_typing_update', handler);
  }

  const typingRef = ref(rtdb, `chats/${channelType}/${channelId}/typing`);
  onValue(typingRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => data[key].displayName);
      callback(list);
    } else {
      callback([]);
    }
  });

  return () => off(typingRef);
};

/**
 * Tracks user online presence on a specific channel.
 */
export const setOnlinePresence = async (channelType, channelId, isOnline) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  if (isMockMode) {
    const key = `mock_online_${channelType}_${channelId}_${currentUser.uid}`;
    if (isOnline) {
      localStorage.setItem(key, 'true');
    } else {
      localStorage.removeItem(key);
    }
    window.dispatchEvent(new CustomEvent('mock_online_update', { detail: { channelType, channelId } }));
    return;
  }

  const presenceRef = ref(rtdb, `chats/${channelType}/${channelId}/online/${currentUser.uid}`);
  if (isOnline) {
    await set(presenceRef, { online: true });
  } else {
    await remove(presenceRef);
  }
};

/**
 * Subscribes to online count changes.
 */
export const subscribeOnlineCount = (channelType, channelId, callback) => {
  if (isMockMode) {
    const getCount = () => {
      let count = 0;
      const prefix = `mock_online_${channelType}_${channelId}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          count++;
        }
      }
      callback(Math.max(1, count)); // Always at least 1 (the user themselves)
    };

    getCount();

    const handler = (e) => {
      if (e.detail.channelType === channelType && e.detail.channelId === channelId) {
        getCount();
      }
    };
    window.addEventListener('mock_online_update', handler);
    return () => window.removeEventListener('mock_online_update', handler);
  }

  const onlineRef = ref(rtdb, `chats/${channelType}/${channelId}/online`);
  onValue(onlineRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(Object.keys(snapshot.val()).length);
    } else {
      callback(0);
    }
  });

  return () => off(onlineRef);
};

/**
 * Pin or Unpin a message in Community chat (Moderator feature).
 */
export const pinMessage = async (communityId, message) => {
  if (isMockMode) {
    localStorage.setItem(`mock_pinned_${communityId}`, JSON.stringify(message));
    window.dispatchEvent(new CustomEvent('mock_pin_update', { detail: { communityId } }));
    return;
  }
  await set(ref(rtdb, `chats/community/${communityId}/pinned`), message);
};

/**
 * Subscribes to pinned message updates.
 */
export const subscribePinnedMessage = (communityId, callback) => {
  if (isMockMode) {
    const load = () => {
      const raw = localStorage.getItem(`mock_pinned_${communityId}`);
      callback(raw ? JSON.parse(raw) : null);
    };

    load();
    const handler = (e) => {
      if (e.detail.communityId === communityId) load();
    };
    window.addEventListener('mock_pin_update', handler);
    return () => window.removeEventListener('mock_pin_update', handler);
  }

  const pinnedRef = ref(rtdb, `chats/community/${communityId}/pinned`);
  onValue(pinnedRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });

  return () => off(pinnedRef);
};
