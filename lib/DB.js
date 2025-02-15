import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(process.cwd(), 'database.json'); // Ensures database.json is in the main project folder

let db = {
  users: {},
};

// Load data from the JSON file
function loadDB() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath, 'utf8');
      db = JSON.parse(data);
    } else {
      console.log("⚠️ database.json not found! Creating a new one...");
      saveDB();
    }
  } catch (error) {
    console.error("❌ Error loading database:", error);
  }
}

// Save data to the JSON file
function saveDB() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf8');
    console.log("✅ Database saved successfully!");
  } catch (error) {
    console.error("❌ Error saving database:", error);
  }
}

// Initial load
loadDB();

// Check if a user has claimed daily limits
function checkClaim(userId) {
  const user = db.users[userId] || { lastClaim: 0, limits: 0 };
  const now = Date.now();
  const canClaim = now - user.lastClaim > 24 * 60 * 60 * 1000;
  return { ...user, canClaim };
}

// Add claim limit to a user
function addClaim(userId, username) {
  const user = db.users[userId] || { lastClaim: 0, limits: 0 };
  const randomLimit = Math.floor(Math.random() * 9) + 1;
  user.lastClaim = Date.now();
  user.limits += randomLimit;
  user.username = username;
  db.users[userId] = user;
  saveDB();
  console.log(`✅ Claim added: ${username} (+${randomLimit} limits)`);
  return randomLimit;
}

// Get remaining cooldown time for claiming
function getRemainingTime(userId) {
  const user = db.users[userId] || { lastClaim: 0 };
  const now = Date.now();
  return Math.max(0, 24 * 60 * 60 * 1000 - (now - user.lastClaim));
}

// Read the full database (for leaderboard)
function readDB() {
  return db.users;
}

// Check if a user is registered
function isRegistered(userId) {
  return !!db.users[userId];
}

// Register a new user
function registerUser(userId, username) {
  if (db.users[userId]) return null;
  const regId = Math.random().toString(36).substr(2, 9);
  db.users[userId] = { username, limits: 0, lastClaim: 0, regId };
  saveDB();
  console.log(`✅ User registered: ${username} (${userId})`);
  return regId;
}

// Unregister a user
function unregisterUser(userId, providedId) {
  const user = db.users[userId];
  if (user && user.regId === providedId) {
    delete db.users[userId];
    saveDB();
    console.log(`✅ User unregistered: ${userId}`);
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