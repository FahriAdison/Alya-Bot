import { isRegistered, registerUser } from '../../lib/DB.js';

export default {
  handle: async (sock, msg) => {
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
    const match = text.match(/^register\s+(.+)/i);
    if (!match) return;
    
    const username = match[1].trim();
    const userId = msg.key.participant || msg.key.remoteJid;
    
    if (isRegistered(userId)) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "You already registered, don't have to register again."
      }, { quoted: msg });
      return;
    }
    
    const regId = registerUser(userId, username);
    if (regId) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `Register Completed ${username}\nYour Id: ${regId}\nSave that id if you want unregister by command unregister <your id>`
      }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "Registration failed. Please try again."
      }, { quoted: msg });
    }
  }
};