import { isRegistered, unregisterUser } from '../../lib/DB.js';

export default {
  handle: async (sock, msg) => {
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
    const match = text.match(/^unregister\s+(\S+)/i);
    if (!match) return;
    
    const providedId = match[1].trim();
    const userId = msg.key.participant || msg.key.remoteJid;
    
    if (!isRegistered(userId)) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "You are not registered."
      }, { quoted: msg });
      return;
    }
    
    if (unregisterUser(userId, providedId)) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "Unregister complete, if you want register again, command register <your username>."
      }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "Unregister failed. The provided ID does not match your registration ID."
      }, { quoted: msg });
    }
  }
};