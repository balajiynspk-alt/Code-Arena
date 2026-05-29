import { rtdb, isMockMode } from './firebase';
import { ref, set, push, update, onValue, get } from 'firebase/database';

const ROOMS_PATH = 'pairRooms';

/**
 * Creates a collaborative pair programming room.
 */
export const createPairRoom = async (problemId, hostId, hostName, initialCode = "", language = "python") => {
  const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  if (isMockMode) {
    const roomPayload = {
      roomId,
      problemId,
      hostId,
      hostName,
      guestId: null,
      guestName: null,
      code: initialCode,
      language,
      driverId: hostId, // Host is driver by default
      mode: 'free', // 'free' or 'driver-navigator'
      compileResult: null,
      turnLockExpires: 0
    };
    localStorage.setItem(`mock_pair_room_${roomId}`, JSON.stringify(roomPayload));
    localStorage.setItem(`mock_pair_chat_${roomId}`, JSON.stringify([]));
    return roomId;
  }

  const roomRef = ref(rtdb, `${ROOMS_PATH}/${roomId}`);
  const roomPayload = {
    roomId,
    problemId,
    hostId,
    hostName,
    guestId: null,
    guestName: null,
    code: initialCode,
    language,
    driverId: hostId,
    mode: 'free',
    compileResult: null,
    turnLockExpires: 0
  };

  await set(roomRef, roomPayload);
  return roomId;
};

/**
 * Guest joins the room.
 */
export const joinPairRoom = async (roomId, guestId, guestName) => {
  if (isMockMode) {
    const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
    if (roomRaw) {
      const room = JSON.parse(roomRaw);
      room.guestId = guestId;
      room.guestName = guestName;
      localStorage.setItem(`mock_pair_room_${roomId}`, JSON.stringify(room));
    }
    return;
  }

  const roomRef = ref(rtdb, `${ROOMS_PATH}/${roomId}`);
  await update(roomRef, {
    guestId,
    guestName
  });
};

/**
 * Sync Monaco text changes.
 */
export const updateRoomCode = async (roomId, code) => {
  if (isMockMode) {
    const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
    if (roomRaw) {
      const room = JSON.parse(roomRaw);
      room.code = code;
      localStorage.setItem(`mock_pair_room_${roomId}`, JSON.stringify(room));
    }
    return;
  }

  const codeRef = ref(rtdb, `${ROOMS_PATH}/${roomId}/code`);
  await set(codeRef, code);
};

/**
 * Cursor coordinate synchronizer.
 */
export const updateCursorPosition = async (roomId, userId, line, column, role) => {
  if (isMockMode) {
    const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
    if (roomRaw) {
      const room = JSON.parse(roomRaw);
      if (!room.cursors) room.cursors = {};
      room.cursors[userId] = {
        line,
        column,
        role,
        timestamp: Date.now()
      };
      localStorage.setItem(`mock_pair_room_${roomId}`, JSON.stringify(room));
    }
    return;
  }

  const cursorRef = ref(rtdb, `${ROOMS_PATH}/${roomId}/cursors/${userId}`);
  await set(cursorRef, {
    line,
    column,
    role,
    timestamp: Date.now()
  });
};

/**
 * Send collab chat message.
 */
export const sendPairMessage = async (roomId, senderId, senderName, text) => {
  if (isMockMode) {
    const chatRaw = localStorage.getItem(`mock_pair_chat_${roomId}`) || '[]';
    const chat = JSON.parse(chatRaw);
    chat.push({
      id: `msg_${Date.now()}`,
      senderId,
      senderName,
      text,
      timestamp: Date.now()
    });
    localStorage.setItem(`mock_pair_chat_${roomId}`, JSON.stringify(chat));
    return;
  }

  const chatRef = ref(rtdb, `${ROOMS_PATH}/${roomId}/chat`);
  const newMessageRef = push(chatRef);
  await set(newMessageRef, {
    senderId,
    senderName,
    text,
    timestamp: Date.now()
  });
};

/**
 * Sync driver permissions role.
 */
export const updateDriverRole = async (roomId, driverId) => {
  if (isMockMode) {
    const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
    if (roomRaw) {
      const room = JSON.parse(roomRaw);
      room.driverId = driverId;
      localStorage.setItem(`mock_pair_room_${roomId}`, JSON.stringify(room));
    }
    return;
  }

  const driverRef = ref(rtdb, `${ROOMS_PATH}/${roomId}/driverId`);
  await set(driverRef, driverId);
};

/**
 * Host toggles Driver/Navigator mode.
 */
export const updateRoomMode = async (roomId, mode) => {
  if (isMockMode) {
    const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
    if (roomRaw) {
      const room = JSON.parse(roomRaw);
      room.mode = mode;
      localStorage.setItem(`mock_pair_room_${roomId}`, JSON.stringify(room));
    }
    return;
  }

  const modeRef = ref(rtdb, `${ROOMS_PATH}/${roomId}/mode`);
  await set(modeRef, mode);
};

/**
 * Politeness Take-Turn lock (Navigator blocks driver for 30s).
 */
export const takeTurnRequest = async (roomId, requesterId) => {
  if (isMockMode) {
    const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
    if (roomRaw) {
      const room = JSON.parse(roomRaw);
      room.driverId = requesterId;
      room.turnLockExpires = Date.now() + 30000;
      localStorage.setItem(`mock_pair_room_${roomId}`, JSON.stringify(room));
    }
    return;
  }

  const roomRef = ref(rtdb, `${ROOMS_PATH}/${roomId}`);
  const expires = Date.now() + 30000;
  await update(roomRef, {
    driverId: requesterId,
    turnLockExpires: expires
  });
};

/**
 * Sync compiler outcomes on run.
 */
export const updateCompileResult = async (roomId, result) => {
  if (isMockMode) {
    const roomRaw = localStorage.getItem(`mock_pair_room_${roomId}`);
    if (roomRaw) {
      const room = JSON.parse(roomRaw);
      room.compileResult = result;
      localStorage.setItem(`mock_pair_room_${roomId}`, JSON.stringify(room));
    }
    return;
  }

  const resultRef = ref(rtdb, `${ROOMS_PATH}/${roomId}/compileResult`);
  await set(resultRef, {
    ...result,
    timestamp: Date.now()
  });
};
