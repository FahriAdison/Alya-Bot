import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.join(__dirname, 'database.json');
let db = {
  users: {},
};

// Load data from the JSON file
function loadDB() {
  if (fs.existsSync(dbFilePath)) {
    const data = fs.readFileSync(dbFilePath, 'utf8');
    db = JSON.parse(data);
  }
}

// Save data to the JSON file
function saveDB() {
  fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf8');
}

// Initial load
loadDB();

function checkClaim(userId) {
  const user = db.users[userId] || { lastClaim: 0, limits: 0 };
  const now = Date.now();
  const canClaim = now - user.lastClaim > 24 * 60 * 60 * 1000;
  return { ...user, canClaim };
}

function addClaim(userId, username) {
  const user = db.users[userId] || { lastClaim: 0, limits: 0 };
  const randomLimit = Math.floor(Math.random() * 9) + 1;
  user.lastClaim = Date.now();
  user.limits += randomLimit;
  user.username = username;
  db.users[userId] = user;
  saveDB();
  return randomLimit;
}

function getRemainingTime(userId) {
  const user = db.users[userId] || { lastClaim: 0 };
  const now = Date.now();
  return Math.max(0, 24 * 60 * 60 * 1000 - (now - user.lastClaim));
}

function readDB() {
  return db.users;
}

function isRegistered(userId) {
  return !!db.users[userId];
}

function registerUser(userId, username) {
  if (db.users[userId]) return null;
  const regId = Math.random().toString(36).substr(2, 9);
  db.users[userId] = { username, limits: 0, lastClaim: 0, regId };
  saveDB();
  return regId;
}

function unregisterUser(userId, providedId) {
  const user = db.users[userId];
  if (user && user.regId === providedId) {
    delete db.users[userId];
    saveDB();
    return true;
  }
  return false;
}

export {
  checkClaim,
  addClaim,
  getRemainingTime,
  readDB,
  isRegistered,
  registerUser,
  unregisterUser
};
