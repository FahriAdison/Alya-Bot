// plugins/ping.js
import os from 'os';

export default {
  command: 'ping',
  handle: async (sock, m, replyJid, isOwner) => {
    // PERBAIKAN: Menggunakan ekstraksi teks yang lebih lengkap dan standar.
    const messageText = m.message?.conversation || m.message?.extendedTextMessage?.text || ''; 

    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
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
- Platform: ${os.platform()}
- Tipe OS: ${os.type()}
- Versi OS: ${os.release()}
    `;
    await sock.sendMessage(replyJid, { text: info }, { quoted: m });
  }
};