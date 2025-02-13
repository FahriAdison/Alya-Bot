import { exec } from 'child_process';
import util from 'util';
import config from '../../lib/config.js';
import { sendFakeAdMessage } from '../../lib/function.js';

const execPromise = util.promisify(exec);

export default {
  handle: async (sock, msg) => {
    const text = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      ''
    ).trim();

    const sender = msg.key.remoteJid; 
    const isOwner = sender.startsWith(config.ownerNumber);

    if (text.startsWith('$ ') || text.startsWith('=> ') || text.startsWith('> ')) {
      try {
        if (!isOwner) {
          return sendFakeAdMessage(sock, msg.key.remoteJid, {
            text: "⚠️ Akses ditolak! Hanya owner yang bisa menggunakan fitur ini!",
          }, msg);
        }

        if (text.startsWith('$ ')) {
          const { stdout } = await execPromise(text.slice(2), { timeout: 10000 });
          return sendFakeAdMessage(sock, msg.key.remoteJid, {
            text: `💻 Output:\n\`\`\`${stdout.slice(0, 1500)}\`\`\``,
          }, msg);
        }

        if (text.startsWith('=> ') || text.startsWith('> ')) {
          const code = text.startsWith('=> ')? `(${text.slice(3)})`: text.slice(2);
          const result = await eval(code);

          return sendFakeAdMessage(sock, msg.key.remoteJid, {
            text: `📜 Result:\n${util.inspect(result, { depth: 1 })}`,
          }, msg);
        }

      } catch (error) {
        await sendFakeAdMessage(sock, msg.key.remoteJid, {
          text: `❌ Error: ${error.message}`,
        }, msg);
      }
    }
  }
};