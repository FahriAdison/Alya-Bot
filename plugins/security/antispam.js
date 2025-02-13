// A simple in-memory anti-spam tracker.
const userLastMessage = {};

export default {
  handle: async (sock, msg) => {
    const userId = msg.key.participant || msg.key.remoteJid;
    const now = Date.now();
    // If the previous message was sent less than 2000ms (2 sec) ago, mark as spam.
    if (userLastMessage[userId] && now - userLastMessage[userId] < 2000) {
      // Mark the message as spam so other plugins can skip processing.
      msg.isSpam = true;
      return;
    }
    userLastMessage[userId] = now;
  }
};