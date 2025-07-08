// plugins/menu.js
import fs from 'fs';
import path from 'path';
import Jimp from 'jimp'; // Import Jimp for image resizing

export default {
  command: 'menu',
  handle: async (sock, m, replyJid, isOwner) => {
    // PERBAIKAN: Menggunakan ekstraksi teks yang lebih lengkap dan standar.
    // Ini membuat plugin lebih konsisten dan siap jika suatu saat memerlukan argumen.
    const messageText = m.message?.conversation || m.message?.extendedTextMessage?.text || '';

    // Fungsi untuk mengukur waktu uptime bot
    const clockString = (ms) => {
      let h = Math.floor(ms / 3600000);
      let m = Math.floor(ms / 60000) % 60;
      let s = Math.floor(ms / 1000) % 60;
      return [h, ' H ', m, ' M ', s, ' S '].map(v => v.toString().padStart(2, 0)).join('');
    };

    // Fungsi untuk ucapan selamat pagi/siang/sore/malam
    const ucapan = async () => { 
      const moment = (await import('moment-timezone')).default; 
      const time = moment.tz('Asia/Jakarta').format('HH');
      let res = "Kok Belum Tidur Kak? 🥱";
      if (time >= 4) res = "Pagi Kak 🌄";
      if (time >= 10) res = "Siang Kak ☀️";
      if (time >= 15) res = "Sore Kak 🌇";
      if (time >= 18) res = "Malam Kak 🌙";
      return res;
    };

    let _uptime = process.uptime() * 1000;
    let uptime = clockString(_uptime);
    const name = m.pushName || 'Pengguna';
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const thumbnailPath = path.join(__dirname, '../../storage', 'images', 'fake.jpg');
    let thumbnailBuffer;
    try {
      thumbnailBuffer = fs.readFileSync(thumbnailPath);
    } catch (error) {
      console.warn("⚠️ Thumbnail tidak ditemukan di:", thumbnailPath, ". Menggunakan thumbnail kosong.");
      thumbnailBuffer = Buffer.from([]);
    }

    const resize = async (imageBuffer, width, height) => {
      try {
        const jimpImage = await Jimp.read(imageBuffer);
        const resizedImage = await jimpImage.resize(width, height).getBufferAsync(Jimp.MIME_JPEG);
        return resizedImage;
      } catch (error) {
        console.error("Error resizing image:", error);
        return imageBuffer;
      }
    };

    const menuMessage = `
*Hai, Selamat ${await ucapan()} ${name}!*

Saya adalah *Alya-Bot*, asisten WhatsApp yang dibuat oleh Papah-Chan menggunakan JavaScript. Berikut adalah daftar menu yang saya miliki:

*Informasi Bot:*
- Uptime: ${uptime}
- Mode: Publik

© Made By Papah-Chan
    `;

    const menuCategories = {
      'main': '🏠 Main Menu', 'ai': '🤖 AI Commands', 'downloader': '📥 Downloader Commands', 'sticker': '📝 Sticker Commands', 'tools': '⚙️ Tools Commands', 'group': '👥 Group Commands', 'search': '🔎 Search Commands', 'owner': '👑 Owner Commands', 'other': '🔹 Lainnya',
    };

    const commands = {
      'main': [{ header: '📂 MAIN', title: 'menampilkan semua daftar perintah', description: 'Klik untuk Menampilkan', id: '.menu' }],
      'ai': [{ header: '📂 BLACKBOX AI', title: 'AI atau bot yang bisa menjawab pertanyaan Anda', description: 'Klik untuk Menampilkan', id: '.bb' }, { header: '📂 QWEN AI', title: 'AI keren yang bisa membantu Anda, sudah support session', description: 'Klik untuk Menampilkan', id: '.qw' }, { header: '📂 COMING SOON', title: 'belum ada handler', description: 'Klik untuk Menampilkan', id: 'totaluser2' }],
      'downloader': [{ header: '📂 IGDL', title: 'untuk mengunduh video/foto dari Instagram', description: 'Klik untuk Menampilkan', id: '.ig' }, { header: '📂 TTDL', title: 'untuk mengunduh video/foto dari TikTok', description: 'Klik untuk Menampilkan', id: '.tt' }, { header: '📂 MEDIAFIRE', title: 'untuk mengunduh dokumen dari Mediafire', description: 'Klik untuk Menampilkan', id: '.mediafire' }, { header: '📂 GIT CLONE', title: 'untuk mengunduh repository dari GitHub', description: 'Klik untuk Menampilkan', id: '.gitclone' }],
      'sticker': [{ header: '📂 COMING SOON', title: 'belum ada handler', description: 'Klik untuk Menampilkan', id: 'totalcase2' }, { header: '📂 COMING SOON', title: 'belum ada handler', description: 'Klik untuk Menampilkan', id: 'ping2' }, { header: '📂 COMING SOON', title: 'belum ada handler', description: 'Klik untuk Menampilkan', id: 'totaluser2' }],
      'tools': [{ header: '📂 HD/REMINI', title: 'membuat foto lebih HD', description: 'Klik untuk Menampilkan', id: '.hd' }, { header: '📂 REMOVE BG', title: 'untuk menghapus background foto', description: 'Klik untuk Menampilkan', id: '.removebg' }, { header: '📂 GET', title: 'untuk menampilkan get result API dll', description: 'Klik untuk Menampilkan', id: '.get' }, { header: '📂 CEK ID CH', title: 'untuk melihat ID channel', description: 'Klik untuk Menampilkan', id: '.idch' }],
      'group': [{ header: '📂 COMING SOON', title: 'belum ada handler', description: 'Klik untuk Menampilkan', id: 'totalcase2' }, { header: '📂 COMING SOON', title: 'belum ada handler', description: 'Klik untuk Menampilkan', id: 'ping2' }, { header: '📂 COMING SOON', title: 'belum ada handler', description: 'Klik untuk Menampilkan', id: 'totaluser2' }],
      'search': [{ header: '📂 PLAY', title: 'untuk mencari lagu', description: 'Klik untuk Menampilkan', id: '.play' }, { header: '📂 YTS', title: 'untuk unduh mp3/mp4 dari YouTube', description: 'Klik untuk Menampilkan', id: '.yts' }, { header: '📂 COMING SOON', title: 'belum ada handler', description: 'Klik untuk Menampilkan', id: 'totaluser2' }],
      'owner': [{ header: '📂 DF', title: 'untuk menghapus plugin', description: 'Klik untuk Menampilkan', id: '.df' }, { header: '📂 GP', title: 'untuk mengambil plugin', description: 'Klik untuk Menampilkan', id: '.gp' }, { header: '📂 SF', title: 'untuk menambahkan plugin', description: 'Klik untuk Menampilkan', id: '.sf' }],
      'other': [{ header: '📂 PLN', title: 'untuk cek tagihan listrik', description: 'Klik untuk Menampilkan', id: '.pln' }, { header: '📂 SCRIPT', title: 'informasi update script', description: 'Klik untuk Menampilkan', id: '.script' }, { header: '📂 SPAM REACT CH', title: 'untuk spam react ke channel WhatsApp', description: 'Klik untuk Menampilkan', id: '.reactch' }]
    };

    const sections = Object.keys(menuCategories).map(categoryKey => ({
      title: menuCategories[categoryKey],
      highlight_label: `1.0.0`,
      rows: commands[categoryKey].map(cmd => ({
        header: cmd.header, title: cmd.title, description: cmd.description, id: cmd.id
      }))
    }));

    await sock.sendMessage(replyJid, { react: { text: '📄', key: m.key } });

    await sock.sendMessage(replyJid, {
      document: fs.readFileSync("./package.json"),
      fileName: "Alya-Bot Menu",
      mimetype: "application/json",
      fileLength: 99999,
      pageCount: 666,
      jpegThumbnail: await resize(thumbnailBuffer, 400, 400),
      caption: menuMessage,
      footer: `─ Hallo Selamat *${await ucapan()}*\n─ *© Papah-Chan 2020-2025*`,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        mentionedJid: [m.sender],
        forwardedNewsletterMessageInfo: {
          newsletterName: "Alya-Bot Updates",
          newsletterJid: `120363384162991692@newsletter`,
        },
        externalAdReply: {
          title: "Alya-Bot",
          body: "WhatsApp Bot JavaScript",
          thumbnailUrl: `https://fastrestapis.fasturl.cloud/file/v2/dVGN0Ax.jpg`,
          sourceUrl: "https://github.com/DanadyaksaDev/CataclysmX-MD",
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
      buttons: [{
        buttonId: '.owner', buttonText: { displayText: '👤 Creator' }, type: 1
      }, {
        buttonId: 'action', buttonText: { displayText: '📂 Kategori Menu' }, type: 4,
        nativeFlowInfo: {
          name: 'single_select',
          paramsJson: JSON.stringify({
            title: '📂 Kategori Menu',
            sections: sections
          })
        }
      }],
      headerType: 1,
      viewOnce: true
    }, { quoted: m });
  }
};