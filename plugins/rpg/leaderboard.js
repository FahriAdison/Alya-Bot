import { readDB } from '../../lib/DB.js';

export default {
  handle: async (sock, msg) => {
    try {
      const messageText = (
        msg.message?.conversation || 
        msg.message?.extendedTextMessage?.text || 
        ''
      ).trim().toLowerCase();

      if (!/^!?(leaderboard|lb)$/i.test(messageText)) return;

      const users = Object.entries(readDB())
        .filter(([_, data]) => data.limits > 0)
        .map(([id, data]) => ({
          id,
          username: data.username || 'Anonymous',
          limits: data.limits || 0
        }))
        .sort((a, b) => b.limits - a.limits)
        .slice(0, 10);

      const leaderboard = users.map((user, index) => 
        `${index + 1}. 🏅 ${user.username} - ${user.limits} limits`
      ).join('\n') || 'No users found';

      await sock.sendMessage(msg.key.remoteJid, {
        text: `🏆 *TOP 10 LEADERBOARD* 🏆\n\n` +
              `${leaderboard}\n\n` +
              `Use !claim to earn more limits!`
      }, { quoted: msg });

    } catch (error) {
      console.error('Leaderboard error:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ Failed to fetch leaderboard'
      }, { quoted: msg });
    }
  }
};