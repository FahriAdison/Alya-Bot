import moment from 'moment-timezone';
import chalk from 'chalk'; // Import chalk for colored output

// Fungsi untuk mengekstrak panjang file dengan aman dari objek pesan Baileys
function getFileLength(fileLengthObj) {
  if (typeof fileLengthObj === 'object' && fileLengthObj !== null && 'low' in fileLengthObj) {
    // Baileys sering menggunakan tipe Long untuk fileLength.
    // Kita konversi ke angka. Untuk file yang sangat besar, ini mungkin kehilangan presisi,
    // tetapi untuk pesan WhatsApp biasa, ini seharusnya cukup.
    return Number(fileLengthObj.low);
  }
  return Number(fileLengthObj || 0); // Tangani angka langsung atau undefined
}

// Fungsi untuk memformat byte ke format yang mudah dibaca manusia
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Fungsi untuk menghitung ukuran konten pesan
function calculateMessageSize(msgObj) {
  const message = msgObj.message;
  if (!message) return 0;

  let size = 0;
  if (message.imageMessage) size = getFileLength(message.imageMessage.fileLength);
  else if (message.videoMessage) size = getFileLength(message.videoMessage.fileLength);
  else if (message.audioMessage) size = getFileLength(message.audioMessage.fileLength);
  else if (message.documentMessage) size = getFileLength(message.documentMessage.fileLength);
  else if (message.stickerMessage) size = getFileLength(message.stickerMessage.fileLength);
  else if (message.conversation) size = message.conversation.length; // Panjang teks untuk percakapan
  else if (message.extendedTextMessage?.text) size = message.extendedTextMessage.text.length; // Panjang teks untuk extended text message

  return size;
}

function printMessageInfo(msg) {
  const sender = msg.key.remoteJid;
  const pushName = msg.pushName || 'Tidak Dikenal';
  const isGroup = sender.endsWith('@g.us');
  const formattedDate = moment(msg.messageTimestamp * 1000).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');

  let messageType = 'Tipe Tidak Dikenal';
  let messageContent = '';
  let messageSize = 0; // Inisialisasi ukuran pesan
  let typeEmoji = '❔'; // Emoji default

  if (msg.message) {
    messageType = Object.keys(msg.message)[0];
    messageSize = calculateMessageSize(msg); // Hitung ukuran

    switch (messageType) {
      case 'conversation':
        messageContent = msg.message.conversation;
        messageType = 'Pesan Teks';
        typeEmoji = '💬';
        break;
      case 'imageMessage':
        messageContent = `[Gambar]`;
        messageType = 'Pesan Gambar';
        typeEmoji = '📸';
        break;
      case 'videoMessage':
        messageContent = `[Video]`;
        messageType = 'Pesan Video';
        typeEmoji = '🎥';
        break;
      case 'stickerMessage':
        messageContent = `[Stiker]`;
        messageType = 'Pesan Stiker';
        typeEmoji = '🧩';
        break;
      case 'extendedTextMessage':
        messageContent = msg.message.extendedTextMessage.text || '[Pesan Teks Diperluas]';
        messageType = 'Pesan Teks Diperluas';
        typeEmoji = '📄';
        break;
      case 'audioMessage':
        messageContent = msg.message.audioMessage.ptt ? '[Audio (PTT)]' : '[Audio]';
        messageType = msg.message.audioMessage.ptt ? 'Pesan Suara (PTT)' : 'Pesan Audio';
        typeEmoji = msg.message.audioMessage.ptt ? '🎤' : '🎵';
        break;
      case 'contactMessage':
        messageContent = `[Kontak: ${msg.message.contactMessage.displayName || 'Tidak Diketahui'}]`;
        messageType = 'Pesan Kontak';
        typeEmoji = '👤';
        break;
      case 'locationMessage':
        messageContent = '[Lokasi]';
        messageType = 'Pesan Lokasi';
        typeEmoji = '📍';
        break;
      case 'documentMessage':
        messageContent = `[Dokumen: ${msg.message.documentMessage.fileName || 'Tidak Diketahui'}]`;
        messageType = 'Pesan Dokumen';
        typeEmoji = '📑';
        break;
      case 'liveLocationMessage':
        messageContent = '[Lokasi Langsung]';
        messageType = 'Pesan Lokasi Langsung';
        typeEmoji = '📍';
        break;
      case 'reactionMessage':
        messageContent = `[Reaksi: ${msg.message.reactionMessage.text || 'Tidak Ada'}]`;
        messageType = 'Pesan Reaksi';
        typeEmoji = '👍'; // Atau emoji reaksi yang sesuai
        break;
      case 'delete':
        messageContent = '[Pesan Dihapus]';
        messageType = 'Pesan Dihapus';
        typeEmoji = '🗑️';
        break;
      default:
        messageContent = `[Tipe Tidak Dikenal: ${messageType}]`;
        messageType = 'Tipe Tidak Dikenal';
        typeEmoji = '❓';
    }
  }

  // Format ukuran pesan
  const formattedSize = formatBytes(messageSize);

  console.log(chalk.bold.hex('#FFD700')(`\n╔══════════════════════════════════════════════╗`));
  console.log(chalk.bold.hex('#FFD700')(`║ ${chalk.bold.cyan('INFO PESAN MASUK')}                     ║`));
  console.log(chalk.bold.hex('#FFD700')(`╠══════════════════════════════════════════════╣`));
  console.log(chalk.bold.hex('#FFD700')(`║ ${chalk.green('👤 Pengirim:')} ${chalk.white(pushName)} (${chalk.yellow(sender)})`));
  console.log(chalk.bold.hex('#FFD700')(`║ ${chalk.green('📦 Tipe:')} ${typeEmoji} ${chalk.white(messageType)}`));
  console.log(chalk.bold.hex('#FFD700')(`║ ${chalk.green('👥 Grup:')} ${isGroup ? chalk.white('Ya') : chalk.white('Tidak')}`));
  console.log(chalk.bold.hex('#FFD700')(`║ ${chalk.green('⏰ Waktu:')} ${chalk.white(formattedDate)}`));
  console.log(chalk.bold.hex('#FFD700')(`║ ${chalk.green('📏 Ukuran:')} ${chalk.white(formattedSize)}`));
  console.log(chalk.bold.hex('#FFD700')(`║ ${chalk.green('📝 Konten:')} ${chalk.white(messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : ''))}`)); // Batasi konten agar tidak terlalu panjang
  console.log(chalk.bold.hex('#FFD700')(`╚══════════════════════════════════════════════╝`));
}

export { printMessageInfo };

