import fs from 'fs';
import path from 'path';

const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '🤤', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨'
];

async function sendFakeAdMessage(sock, jid, content, quoted) {
  const thumbnailPath = path.join(process.cwd(), 'storage', 'images', 'fake.jpg');

  let thumbnail;
  try {
    thumbnail = fs.readFileSync(thumbnailPath);
  } catch (error) {
    console.error("Failed to read thumbnail:", error);
    thumbnail = Buffer.from([]);
  }

  const contextInfo = {
    externalAdReply: {
      title: "Alya Roshidere",
      body: "Bot WhatsApp JavaScript",
      mediaType: 1,
      thumbnail: thumbnail,
      renderLargerThumbnail: false,
      showAdAttribution: true,
      containsAutoReply: true
    },
    mentionedJid: []
  };

  if (quoted) {
    contextInfo.quotedMessage = quoted.message;
  }

  try {
    if (typeof content === 'string') {
      await sock.sendMessage(jid, { text: content, contextInfo }, { quoted });
    } else if (typeof content === 'object' && content.text) {
      await sock.sendMessage(jid, { ...content, contextInfo }, { quoted });
    } else {
      console.error("Invalid content type:", content);
    }
  } catch (error) {
    console.error("Failed to send fake ad message:", error);
  }
}

function getRandomEmoji() {
  return emojis[Math.floor(Math.random() * emojis.length)];
}

async function reactWithRandomEmoji(sock, jid, key) {
  try {
    const emoji = getRandomEmoji();
    await sock.sendMessage(jid, {
      react: {
        text: emoji,
        key: key
      }
    });
    console.log(`✅ Reacted with ${emoji} to ${key.id}`);
  } catch (error) {
    console.error('❌ Failed to react:', error.message);
  }
}

export {
  sendFakeAdMessage,
  getRandomEmoji,
  reactWithRandomEmoji
};