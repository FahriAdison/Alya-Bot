import moment from 'moment-timezone';

function printMessageInfo(msg) {
  const sender = msg.key.remoteJid;
  const pushName = msg.pushName || 'Unknown';
  const isGroup = sender.endsWith('@g.us');
  const formattedDate = moment(msg.messageTimestamp * 1000).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');

  let messageType = 'Unknown Type';
  let messageContent = '';

  if (msg.message) {
    messageType = Object.keys(msg.message)[0];
    switch (messageType) {
      case 'conversation':
        messageContent = msg.message.conversation;
        break;
      case 'imageMessage':
        messageContent = '[📷 Image Message]';
        break;
      case 'videoMessage':
        messageContent = '[📹 Video Message]';
        break;
      case 'stickerMessage':
        messageContent = '[🧩 Sticker Message]';
        break;
      case 'extendedTextMessage':
        messageContent = msg.message.extendedTextMessage.text || '[📄 Text Message]';
        break;
      case 'audioMessage':
        messageContent = '[🎵 Audio Message]';
        break;
      case 'contactMessage':
        messageContent = '[👤 Contact Message]';
        break;
      case 'locationMessage':
        messageContent = '[📍 Location Message]';
        break;
      case 'documentMessage':
        messageContent = '[📑 Document Message]';
        break;
      case 'liveLocationMessage':
        messageContent = '[📍 Live Location]';
        break;
      case 'reactionMessage':
        messageContent = '[💬 Reaction]';
        break;
      case 'delete':
        messageContent = '[❌ Deleted Message]';
        break;
      default:
        messageContent = '[❔ Unknown Message]';
    }
  }

  console.log(`
\x1b[32m╔══════════════════════════════════════════════╗\x1b[0m
\x1b[32m║ \x1b[36mSender:\x1b[0m ${pushName} (${sender}) \x1b[32m║\x1b[0m
\x1b[32m║ \x1b[36mType:\x1b[0m ${messageType} \x1b[32m║\x1b[0m
\x1b[32m║ \x1b[36mGroup:\x1b[0m ${isGroup ? 'Yes' : 'No'} \x1b[32m║\x1b[0m
\x1b[32m║ \x1b[36mDate & Time:\x1b[0m ${formattedDate} \x1b[32m║\x1b[0m
\x1b[32m║ \x1b[36mContent:\x1b[0m ${messageContent} \x1b[32m║\x1b[0m
\x1b[32m╚══════════════════════════════════════════════╝\x1b[0m
  `);
}

export { printMessageInfo };