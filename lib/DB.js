const db = {
  users: {},
};

export function checkClaim(userId) {
  const user = db.users[userId] || { lastClaim: 0, limits: 0 };
  const now = Date.now();
  const canClaim = now - user.lastClaim > 24 * 60 * 60 * 1000;
  return { ...user, canClaim };
}

export function addClaim(userId, username) {
  const user = db.users[userId] || { lastClaim: 0, limits: 0 };
  const randomLimit = Math.floor(Math.random() * 9) + 1;
  user.lastClaim = Date.now();
  user.limits += randomLimit;
  user.username = username;
  db.users[userId] = user;
  return randomLimit;
}

export function getRemainingTime(userId) {
  const user = db.users[userId] || { lastClaim: 0 };
  const now = Date.now();
  return Math.max(0, 24 * 60 * 60 * 1000 - (now - user.lastClaim));
}

export function readDB() {
  return db.users;
}

export function isRegistered(userId) {
  return !!db.users[userId];
}

export function registerUser(userId, username) {
  if (db.users[userId]) return null;
  const regId = Math.random().toString(36).substr(2, 9);
  db.users[userId] = { username, limits: 0, lastClaim: 0, regId };
  return regId;
}

export function unregisterUser(userId, providedId) {
  const user = db.users[userId];
  if (user && user.regId === providedId) {
    delete db.users[userId];
    return true;
  }
  return false;
}