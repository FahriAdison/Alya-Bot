import os from 'os';
import { sendFakeAdMessage } from '../../lib/function.js';

export default {
  handle: async (sock, msg) => {
    const messageText = msg.message?.conversation || '';
    if (messageText.toLowerCase() === 'ping') {
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const formatBytes = (bytes) => {
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
      };

      const info = `
        *Informasi Server*
        - Penggunaan Memori Proses (RSS): ${formatBytes(memUsage.rss)}
        - Total Heap: ${formatBytes(memUsage.heapTotal)}
        - Heap Terpakai: ${formatBytes(memUsage.heapUsed)}
        - Memori Eksternal: ${formatBytes(memUsage.external || 0)}
        - Total Memori Sistem: ${formatBytes(totalMem)}
        - Memori Bebas Sistem: ${formatBytes(freeMem)}
        - Memori Terpakai Sistem: ${formatBytes(usedMem)}
        - Arsitektur CPU: ${os.arch()}
        - Jumlah Core CPU: ${os.cpus().length}
        - Sistem Operasi: ${os.platform()}
      `;

      await sendFakeAdMessage(sock, msg.key.remoteJid, info, msg);
    }
  }
};