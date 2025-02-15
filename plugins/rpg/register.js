import { isRegistered, registerUser } from '../../lib/DB.js';

export default {
  handle: async (sock, msg) => {
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
    const match = text.match(/^register\s+(.+)/i);
    if (!match) return;
    
    const username = match[1].trim();
    const userId = msg.key.participant || msg.key.remoteJid;

    console.log(`📩 Register command received: ${username} (${userId})`); // Debugging log

    if (isRegistered(userId)) {
      console.log("❌ User is already registered.");
      await sock.sendMessage(msg.key.remoteJid, {
        text: "⚠️ You are already registered."
      }, { quoted: msg });
      return;
    }
    
    const regId = registerUser(userId, username);
    if (regId) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `✅ Registration successful!\n👤 Username: ${username}\n🆔 ID: ${regId}\n\nUse this ID if you want to unregister.`
      }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Registration failed. Please try again."
      }, { quoted: msg });
    }
  }
};