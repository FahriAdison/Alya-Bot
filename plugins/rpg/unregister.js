import { isRegistered, unregisterUser } from '../../lib/DB.js';

export default {
  handle: async (sock, msg) => {
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
    const match = text.match(/^unregister\s+(\S+)/i);
    if (!match) return;
    
    const providedId = match[1].trim();
    const userId = msg.key.participant || msg.key.remoteJid;

    console.log(`📩 Unregister command received: ${providedId} (${userId})`); // Debugging log

    if (!isRegistered(userId)) {
      console.log("❌ User is not registered.");
      await sock.sendMessage(msg.key.remoteJid, {
        text: "⚠️ You are not registered."
      }, { quoted: msg });
      return;
    }
    
    if (unregisterUser(userId, providedId)) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "✅ Unregistration successful! You can register again with: `register <username>`."
      }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Unregistration failed. Your provided ID is incorrect."
      }, { quoted: msg });
    }
  }
};