import moment from 'moment-timezone';

function printMessageInfo(msg) {
  const sender = msg.key.remoteJid;
  const pushName = msg.pushName;
  const isGroup = sender.endsWith('@g.us');
  const formattedDate = moment(msg.messageTimestamp * 1000).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
  let messageType = 'Tipe pesan tidak diketahui';
  let messageContent = '';

  if (msg.message) {
    messageType = Object.keys(msg.message)[0];
    switch (messageType) {
      case 'conversation':
        messageContent = msg.message.conversation;
        break;
      case 'imageMessage':
        messageContent = 'Pesan Gambar';
        break;
      case 'videoMessage':
        messageContent = 'Pesan Video';
        break;
      case 'stickerMessage':
        messageContent = 'Pesan Stiker';
        break;
      case 'extendedTextMessage':
        messageContent = 'Pesan Teks';
        break;
      case 'audioMessage':
        messageContent = 'Pesan Suara';
        break;
      case 'contactMessage':
        messageContent = 'Pesan Kontak';
        break;
      case 'locationMessage':
        messageContent = 'Pesan Lokasi';
        break;
      case 'documentMessage':
        messageContent = 'Pesan Dokumen';
        break;
      case 'liveLocationMessage':
        messageContent = 'Pesan Lokasi Langsung';
        break;
      case 'reactionMessage':
        messageContent = 'Reaction';
        break;
      case 'delete':
        messageContent = 'Pesan Ditarik';
        break;
      default:
        messageContent = 'Tipe pesan tidak diketahui';
    }
  }

  const pad = (str, len) => str.length >= len ? str : str + ' '.repeat(len - str.length);

  console.log(`
\x1b[32m╔══════════════════════════════════════════════╗\x1b[0m
\x1b[32m║ \x1b[36mPesan dari:\x1b[0m ${pad(pushName + ' (' + (sender.split('@')[0]) + ')', 35)} \x1b[32m║\x1b[0m
\x1b[32m║ \x1b[36mTipe Pesan:\x1b[0m ${pad(messageType, 35)}                        \x1b[32m║\x1b[0m
\x1b[32m║ \x1b[36mDari Grup:\x1b[0m ${pad(isGroup ? 'Ya' : 'Tidak', 35)}                      \x1b[32m║\x1b[0m
\x1b[32m║ \x1b[36mTanggal & Waktu:\x1b[0m ${pad(formattedDate, 35)}                 \x1b[32m║\x1b[0m
\x1b[32m║ \x1b[36mIsi Pesan:\x1b[0m ${pad(messageContent, 35)}                  \x1b[32m║\x1b[0m
\x1b[32m╚══════════════════════════════════════════════╝\x1b[0m
  `);
}

export { printMessageInfo };