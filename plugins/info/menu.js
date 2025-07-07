// plugins/menu.js
import { sendFakeAdMessage } from '../../lib/function.js';

export default {
  command: 'menu', // Pastikan ini ada
  handle: async (sock, msg) => {
    const messageText = msg.message?.conversation || ''; // Ambil teks pesan
    if (messageText.toLowerCase() === 'menu') { // <--- Pastikan Anda menggunakan .toLowerCase() di sini
      const message = `
*Hai,Saya Adalah Bot Alya,Saya Ada Assisten Bot WhatsApp Dibuat Oleh Papah-Chan Menggunakan Javascript,Berikut Daftar Menu Yang Ku Milik:*

Downloader:
• tiktok <link>
• ig <link>
• play <judul lagu>

Info:
• ping
• menu

RPG:
• claim
• leaderboard

Owner:
• =>
• >
• $

© Made By Papah-Chan
      `;
      await sendFakeAdMessage(sock, msg.key.remoteJid, message, msg);
    }
  }
};
