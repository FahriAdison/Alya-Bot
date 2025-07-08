// plugins/tools/get.js

import fetch from 'node-fetch';

export default {
  command: 'get',
  commands: ['get', 'fetch', 'grab'],
  handle: async (sock, m, replyJid, isOwner) => {
    // PERBAIKAN: Menggunakan ekstraksi teks yang lebih lengkap dan standar.
    // Ini memastikan perintah berfungsi bahkan saat membalas pesan lain.
    const modifiedMessageText = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    
    // PENJELASAN: Argumen sudah bersih dari prefiks dan perintah karena sudah ditangani di index.js
    const args = modifiedMessageText.split(/\s+/).filter(s => s.length > 0);

    if (!isOwner) {
      await sock.sendMessage(replyJid, { text: '❌ Hanya untuk pemilik bot.' }, { quoted: m });
      return;
    }

    const url = args[0];

    if (!url) {
      await sock.sendMessage(replyJid, { text: '❌ Masukkan URL yang valid\n*Contoh:* `!get https://api.example.com/data`' }, { quoted: m });
      return;
    }

    await sock.sendMessage(replyJid, { react: { text: '⏳', key: m.key } });

    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type') || '';
      // PERBAIKAN: Menggunakan objek URL untuk parsing yang lebih andal
      const fileName = new URL(url).pathname.split('/').pop() || 'file';

      if (contentType.includes('application/json')) {
        const jsonData = await response.json();
        await sock.sendMessage(replyJid, { text: `🛜 GET Request\n\n📃 Response JSON:\n\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\`` }, { quoted: m });
      } else if (contentType.includes('image')) {
        const buffer = await response.arrayBuffer();
        await sock.sendMessage(replyJid, { image: Buffer.from(buffer), caption: '☑️ Response 200 OK ☑️' }, { quoted: m });
      } else if (contentType.includes('video')) {
        const buffer = await response.arrayBuffer();
        await sock.sendMessage(replyJid, { video: Buffer.from(buffer), caption: '☑️ Response 200 OK ☑️' }, { quoted: m });
      } else if (contentType.includes('audio')) {
        const buffer = await response.arrayBuffer();
        await sock.sendMessage(replyJid, { audio: Buffer.from(buffer), mimetype: contentType, fileName: `${fileName}.mp3` }, { quoted: m });
      } else if (contentType.includes('application') || contentType.includes('text/csv') || contentType.includes('text/xml')) {
        const buffer = await response.arrayBuffer();
        await sock.sendMessage(replyJid, { document: Buffer.from(buffer), mimetype: contentType, fileName: fileName || 'document' }, { quoted: m });
      } else {
        const responseText = await response.text();
        await sock.sendMessage(replyJid, { text: `🛜 GET Request\n\n📃 Response:\n\`\`\`\n${responseText.substring(0, 1500)}\n\`\`\`\n${responseText.length > 1500 ? '*(Respon dipotong karena terlalu panjang)*' : ''}` }, { quoted: m });
      }

      await sock.sendMessage(replyJid, { react: { text: '✅', key: m.key } });

    } catch (error) {
      console.error('Error in get plugin:', error);
      await sock.sendMessage(replyJid, { text: '❌ Gagal melakukan request GET. Pastikan URL benar dan dapat diakses.' }, { quoted: m });
      await sock.sendMessage(replyJid, { react: { text: '❌', key: m.key } });
    }
  }
};