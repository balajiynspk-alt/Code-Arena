import { rtdb } from './firebase';
import { ref, set, push, update, onValue, get } from 'firebase/database';

const ROOMS_PATH = 'pairRooms';

/**
 * Creates a collaborative pair programming room.
 */
export const createPairRoom = async (problemId, hostId, hostName, initialCode = "", language = "python") => {
  const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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
    driverId: hostId, // Host is driver by default
    mode: 'free', // 'free' or 'driver-navigator'
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
  const codeRef = ref(rtdb, `${ROOMS_PATH}/${roomId}/code`);
  await set(codeRef, code);
};

/**
 * Cursor coordinate synchronizer.
 */
export const updateCursorPosition = async (roomId, userId, line, column, role) => {
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
  const driverRef = ref(rtdb, `${ROOMS_PATH}/${roomId}/driverId`);
  await set(driverRef, driverId);
};

/**
 * Host toggles Driver/Navigator mode.
 */
export const updateRoomMode = async (roomId, mode) => {
  const modeRef = ref(rtdb, `${ROOMS_PATH}/${roomId}/mode`);
  await set(modeRef, mode);
};

/**
 * Politeness Take-Turn lock (Navigator blocks driver for 30s).
 */
export const takeTurnRequest = async (roomId, requesterId) => {
  const roomRef = ref(rtdb, `${ROOMS_PATH}/${roomId}`);
  const expires = Date.now() + 30000; // 30 second turn lock
  await update(roomRef, {
    driverId: requesterId,
    turnLockExpires: expires
  });
};

/**
 * Sync compiler outcomes on run.
 */
export const updateCompileResult = async (roomId, result) => {
  const resultRef = ref(rtdb, `${ROOMS_PATH}/${roomId}/compileResult`);
  await set(resultRef, {
    ...result,
    timestamp: Date.now()
  });
};
