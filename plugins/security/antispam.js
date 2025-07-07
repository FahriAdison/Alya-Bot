// Sebuah pelacak anti-spam sederhana dalam memori.
// Menyimpan array timestamp untuk setiap pengguna.
const userMessageTimestamps = {};
// Untuk mencegah pengiriman peringatan spam berulang kali dalam waktu singkat.
const spamWarningSent = {};

export default {
  handle: async (sock, msg, replyJid, isCommandMessage) => {
    const userId = msg.key.participant || msg.key.remoteJid;
    const now = Date.now();

    // Jika ini bukan pesan perintah, lewati antispam dan bersihkan pelacak peringatan.
    if (!isCommandMessage) {
      delete userMessageTimestamps[userId]; // Bersihkan timestamp untuk non-command
      delete spamWarningSent[userId]; // Pastikan pelacak peringatan dibersihkan
      return; // Lewati antispam untuk pesan non-perintah
    }

    const TIME_WINDOW_MS = 5000; // Jendela waktu untuk mendeteksi spam (5 detik)
    const MESSAGE_THRESHOLD = 5; // Jumlah pesan maksimum dalam jendela waktu

    // Inisialisasi array timestamp jika belum ada
    if (!userMessageTimestamps[userId]) {
      userMessageTimestamps[userId] = [];
    }

    // Tambahkan timestamp pesan saat ini
    userMessageTimestamps[userId].push(now);

    // Hapus timestamp yang sudah di luar jendela waktu
    userMessageTimestamps[userId] = userMessageTimestamps[userId].filter(
      (timestamp) => now - timestamp < TIME_WINDOW_MS
    );

    // Periksa apakah jumlah pesan melebihi batas dalam jendela waktu
    if (userMessageTimestamps[userId].length > MESSAGE_THRESHOLD) {
      msg.isSpam = true; // Tandai pesan sebagai spam
      console.log(chalk.red(`ANTISPAM DEBUG: User ${userId} terdeteksi SPAM command. Menandai msg.isSpam = true.`)); // Log debug

      // Kirim peringatan hanya jika belum dikirim baru-baru ini (misal: setiap 10 detik)
      if (!spamWarningSent[userId] || (now - spamWarningSent[userId] > 10000)) {
        await sock.sendMessage(replyJid, {
          text: `⚠️ Jangan spam! Anda mengirim terlalu banyak perintah dalam waktu singkat. Mohon tunggu sebentar.`
        }, { quoted: msg });
        spamWarningSent[userId] = now; // Catat waktu peringatan dikirim
      }
      // Penting: Jangan return di sini. Biarkan index.js yang menangani 'continue' berdasarkan msg.isSpam
      // Ini memastikan pesan spam tetap ditandai dan diabaikan oleh loop utama.
    } else {
      // Jika pesan tidak dianggap spam (atau tidak melebihi batas), reset pelacak peringatan untuk pengguna ini
      delete spamWarningSent[userId];
    }
  }
};

