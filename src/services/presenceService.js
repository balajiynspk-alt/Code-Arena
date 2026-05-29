import { rtdb, isMockMode } from './firebase';
import { ref, set, onDisconnect, onValue } from 'firebase/database';

export const trackPresence = (uid) => {
  if (isMockMode || !uid) {
    if (uid) {
      // Simulated mock presence set
      localStorage.setItem(`mock_presence_${uid}`, JSON.stringify({ online: true, lastSeen: Date.now() }));
    }
    return;
  }

  try {
    const presenceRef = ref(rtdb, `presence/${uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Set presence to online
        set(presenceRef, {
          online: true,
          lastSeen: Date.now()
        });

        // Set presence to offline on disconnect
        onDisconnect(presenceRef).set({
          online: false,
          lastSeen: Date.now()
        });
      }
    });
  } catch (err) {
    console.error("Presence tracker subscription failed:", err);
  }
};

export const subscribeToPresence = (uid, callback) => {
  if (isMockMode || !uid) {
    // Return mock values instantly
    const getMockPresence = () => {
      if (uid === 'me') return { online: true, lastSeen: Date.now() };
      
      const local = localStorage.getItem(`mock_presence_${uid}`);
      if (local) return JSON.parse(local);

      // Deterministic state by hashing UID length/chars
      const hash = (uid || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const isOnline = hash % 2 === 0;
      return {
        online: isOnline,
        lastSeen: Date.now() - (isOnline ? 0 : 3600000 * (hash % 12))
      };
    };

    callback(getMockPresence());
    
    // Simulate periodic status updates
    const interval = setInterval(() => {
      callback(getMockPresence());
    }, 10000);

    return () => clearInterval(interval);
  }

  try {
    const presenceRef = ref(rtdb, `presence/${uid}`);
    return onValue(presenceRef, (snap) => {
      if (snap.exists()) {
        callback(snap.val());
      } else {
        callback({ online: false, lastSeen: Date.now() });
      }
    });
  } catch (err) {
    console.error("Presence query failed:", err);
    callback({ online: false, lastSeen: Date.now() });
    return () => {};
  }
};

export const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'Offline';
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
