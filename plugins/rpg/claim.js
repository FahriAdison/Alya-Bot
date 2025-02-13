import { checkClaim, addClaim, getRemainingTime } from '../../lib/DB.js';

function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default {
  handle: async (sock, msg) => {
    try {
      const messageText = (
        msg.message?.conversation || 
        msg.message?.extendedTextMessage?.text || 
        ''
      ).trim().toLowerCase();

      if (!/^!?claim$/i.test(messageText)) return;

      const userId = msg.key.participant || msg.key.remoteJid;
      const userData = checkClaim(userId);
      const username = msg.pushName || 'Anonymous';

      if (userData.canClaim) {
        const newLimit = addClaim(userId, username);
        await sock.sendMessage(msg.key.remoteJid, {
          text: `✅ *CLAIM SUCCESS*\n` +
                `🎁 Received: +${newLimit} limits\n` +
                `💰 Total: ${userData.limits + newLimit}\n` +
                `👤 User: ${username}`
        }, { quoted: msg });
      } else {
        const remaining = getRemainingTime(userId);
        await sock.sendMessage(msg.key.remoteJid, {
          text: `⏳ *CLAIM COOLDOWN*\n` +
                `You can claim again in: ${formatTime(remaining)}\n` +
                `Next claim available: ${new Date(Date.now() + remaining).toLocaleTimeString()}`
        }, { quoted: msg });
      }
    } catch (error) {
      console.error('Claim error:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ Failed to process claim request'
      }, { quoted: msg });
    }
  }
};