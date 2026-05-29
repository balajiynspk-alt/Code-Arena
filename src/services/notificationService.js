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
  updateDoc
} from 'firebase/firestore';

/**
 * Creates a new notification for a specific user.
 * @param {string} targetUid - Recipient user ID
 * @param {string} type - Notification Type
 * @param {string} text - Display text
 * @param {string} link - Navigation path
 */
export const createNotification = async (targetUid, type, text, link) => {
  const currentUser = auth.currentUser;
  const fromUid = currentUser ? currentUser.uid : 'system';
  const fromDisplayName = currentUser ? (currentUser.displayName || 'Operator') : 'System Daemon';

  const notif = {
    type,
    fromUid,
    fromDisplayName,
    text,
    link,
    read: false,
    createdAt: Date.now()
  };

  if (isMockMode) {
    const key = `mock_notifications_${targetUid}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ id: `notif_${Date.now()}`, ...notif });
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('mock_notif_update', { detail: { uid: targetUid } }));
    return;
  }

  // Production Firestore
  const notifCol = collection(db, 'notifications', targetUid, 'items');
  await addDoc(notifCol, notif);
};

/**
 * Subscribes to a user's notification list.
 */
export const subscribeNotifications = (targetUid, callback) => {
  if (isMockMode) {
    const key = `mock_notifications_${targetUid}`;
    const load = () => {
      const raw = localStorage.getItem(key);
      if (raw) {
        callback(JSON.parse(raw));
      } else {
        // Seed initial notifications list!
        const baseline = [
          {
            id: 'n1',
            type: 'NEW_FOLLOWER',
            fromUid: 'Glitch_Viper',
            fromDisplayName: 'Glitch_Viper',
            text: '@Glitch_Viper established a link and started following you.',
            link: '/profile/Glitch_Viper',
            read: false,
            createdAt: Date.now() - 300000
          },
          {
            id: 'n2',
            type: 'COMMENT_REPLY',
            fromUid: 'Aura_Netrunner',
            fromDisplayName: 'Aura_Netrunner',
            text: '@Aura_Netrunner replied to your comment: "Collapsing dynamic grids..."',
            link: '/problems/two-sum',
            read: false,
            createdAt: Date.now() - 1800000
          },
          {
            id: 'n3',
            type: 'BATTLE_RESULT',
            fromUid: 'system',
            fromDisplayName: 'System Daemon',
            text: 'Combat session completed: Won 1v1 vs Cyber_Synthesizer! (+32 ELO)',
            link: '/profile/me',
            read: true,
            createdAt: Date.now() - 3600000 * 4
          },
          {
            id: 'n4',
            type: 'BADGE_EARNED',
            fromUid: 'system',
            fromDisplayName: 'System Daemon',
            text: 'System Achievement Unlocked: Earned "Weekly Warrior" badge!',
            link: '/profile/me',
            read: true,
            createdAt: Date.now() - 3600000 * 24
          }
        ];
        localStorage.setItem(key, JSON.stringify(baseline));
        callback(baseline);
      }
    };

    load();
    const handler = (e) => {
      if (e.detail.uid === targetUid) load();
    };
    window.addEventListener('mock_notif_update', handler);
    return () => window.removeEventListener('mock_notif_update', handler);
  }

  // Production Firestore
  const notifCol = collection(db, 'notifications', targetUid, 'items');
  const q = query(notifCol, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(list);
  });
};

/**
 * Marks a single notification as read.
 */
export const markAsRead = async (targetUid, notifId) => {
  if (isMockMode) {
    const key = `mock_notifications_${targetUid}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = list.map(item => {
      if (item.id === notifId) return { ...item, read: true };
      return item;
    });
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('mock_notif_update', { detail: { uid: targetUid } }));
    return;
  }

  const docRef = doc(db, 'notifications', targetUid, 'items', notifId);
  await updateDoc(docRef, { read: true });
};

/**
 * Marks all notifications as read.
 */
export const markAllAsRead = async (targetUid, notifsList) => {
  if (isMockMode) {
    const key = `mock_notifications_${targetUid}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = list.map(item => ({ ...item, read: true }));
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('mock_notif_update', { detail: { uid: targetUid } }));
    return;
  }

  for (const item of notifsList) {
    if (!item.read) {
      const docRef = doc(db, 'notifications', targetUid, 'items', item.id);
      await updateDoc(docRef, { read: true });
    }
  }
};
