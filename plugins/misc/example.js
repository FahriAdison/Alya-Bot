// plugins/misc/example.js

/**
 * INI ADALAH CONTOH PLUGIN DASAR
 * 
 * Gunakan file ini sebagai template untuk membuat fitur/plugin baru.
 * Cukup salin file ini, ganti namanya, dan ubah logikanya sesuai kebutuhan.
 * 
 * PENJELASAN STRUKTUR:
 * - 'command': Pemicu utama perintah.
 * - 'commands': (Opsional) Alias atau nama lain untuk perintah yang sama.
 * - 'category': (Sangat Direkomendasikan) Kategori plugin, berguna untuk pengelompokan di menu.
 * - 'handle': Fungsi utama yang akan dieksekusi ketika perintah dipanggil.
 */

export default {
  /**
   * Pemicu utama untuk perintah ini.
   * Saat pengguna mengetik `!example`, plugin ini akan aktif.
   * (Prefiks "!" diatur di config.js)
   */
  command: 'example',

  /**
   * (Opsional) Daftar alias atau nama lain untuk perintah ini.
   * Pengguna juga bisa mengetik `!ex` atau `!contoh`.
   */
  commands: ['ex', 'contoh'],

  /**
   * (Sangat Direkomendasikan) Kategori untuk pengelompokan di menu.
   * Contoh: 'main', 'tools', 'downloader', 'owner', 'misc'.
   */
  category: 'misc',

  /**
   * Fungsi utama yang menangani logika perintah.
   * 
   * @param {import('@whiskeysockets/baileys').WASocket} sock - Objek utama Baileys untuk berinteraksi dengan WhatsApp (mengirim pesan, dll.).
   * @param {object} m - Objek pesan yang telah diserialisasi dan diperkaya (oleh smsg dan extensions.js). Mengandung semua info tentang pesan masuk.
   * @param {string} replyJid - JID (ID chat) yang benar untuk membalas pesan, sudah menangani grup dan chat pribadi.
   * @param {boolean} isOwner - Sebuah boolean (true/false) yang menandakan apakah pengirim pesan adalah owner bot.
   */
  handle: async (sock, m, replyJid, isOwner) => {
    // --- 1. MENGAMBIL TEKS DAN ARGUMEN ---
    // 'm.message.conversation' sudah berisi teks bersih tanpa prefiks dan perintah,
    // karena sudah diolah di index.js.
    const text = m.message?.conversation || '';
    const args = text.split(' ').filter(arg => arg.length > 0);

    // Kirim reaksi 'sedang diproses' untuk memberikan feedback ke pengguna.
    await sock.sendMessage(replyJid, { react: { text: '🤔', key: m.key } });


    // --- 2. LOGIKA DASAR: MEMBALAS JIKA TIDAK ADA ARGUMEN ---
    // Jika pengguna hanya mengetik `!example` tanpa teks tambahan.
    if (args.length === 0) {
      const replyText = `👋 Halo! Ini adalah contoh plugin.\nCoba kirim \`!example halo dunia\` atau balas sebuah gambar dengan perintah \`!example\`.`;
      // Mengirim pesan balasan ke chat yang benar, dan mengutip pesan asli pengguna.
      await sock.sendMessage(replyJid, { text: replyText }, { quoted: m });
      
      // Hentikan eksekusi di sini karena tugas selesai.
      return; 
    }


    // --- 3. LOGIKA BERDASARKAN ARGUMEN TEKS ---
    // Jika pengguna memberikan argumen, misalnya `!example halo dunia`.
    // Kita akan menggabungkan kembali argumennya dan membalas.
    const fullArgText = args.join(' ');
    await sock.sendMessage(replyJid, { text: `Anda mengirim teks: "${fullArgText}"` }, { quoted: m });


    // --- 4. LOGIKA KHUSUS OWNER ---
    // Contoh fitur yang hanya bisa diakses oleh owner.
    if (text.toLowerCase() === 'secret') {
      if (isOwner) {
        await sock.sendMessage(replyJid, { text: '🔑 Anda adalah owner! Ini adalah pesan rahasia.' }, { quoted: m });
      } else {
        await sock.sendMessage(replyJid, { text: '🚫 Anda tidak memiliki akses ke fitur rahasia ini.' }, { quoted: m });
      }
      return; // Hentikan di sini setelah menangani kasus 'secret'.
    }


    // --- 5. LOGIKA MENANGANI MEDIA (GAMBAR/STIKER) ---
    // Periksa apakah pesan pengguna adalah balasan (reply) ke pesan lain.
    const quotedMessage = m.quoted;
    if (quotedMessage) {
      // Periksa apakah pesan yang di-reply adalah gambar.
      if (quotedMessage.message?.imageMessage) {
        await sock.sendMessage(replyJid, { text: 'Anda membalas sebuah gambar!' }, { quoted: m });
        
        // Contoh cara mengunduh media yang di-reply.
        // 'downloadM' adalah fungsi dari extensions.js yang mengembalikan buffer.
        try {
          const imageBuffer = await sock.downloadM(quotedMessage);
          // Setelah diunduh, Anda bisa memprosesnya (misal: mengirim kembali, dianalisis, dll).
          await sock.sendMessage(replyJid, { 
            image: imageBuffer, 
            caption: 'Ini gambar yang Anda balas, saya unduh dan kirim kembali!' 
          }, { quoted: m });
        } catch (error) {
          console.error("Gagal mengunduh gambar:", error);
          await sock.sendMessage(replyJid, { text: 'Maaf, gagal memproses gambar yang Anda balas.' }, { quoted: m });
        }
      } 
      // Periksa apakah pesan yang di-reply adalah stiker.
      else if (quotedMessage.message?.stickerMessage) {
        await sock.sendMessage(replyJid, { text: 'Anda membalas sebuah stiker!' }, { quoted: m });
      }
    }


    // --- 6. KIRIM REAKSI 'SELESAI' ---
    // Setelah semua logika selesai, ganti reaksi menjadi tanda centang.
    await sock.sendMessage(replyJid, { react: { text: '✅', key: m.key } });
  }
};
