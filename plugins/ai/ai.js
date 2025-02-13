import axios from 'axios';

const userChatHistory = {};

async function generateAIResponse(userInput) {
  try {
    const response = await axios.get(`https://api.freegpt4.ddns.net/?text=${encodeURIComponent(userInput)}`);
    return response.data || "";
  } catch (error) {
    console.error("Error fetching data from freegpt4:", error.message);
    throw error;
  }
}

export default {
  handle: async (sock, msg) => {
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
    const commandMatch = text.match(/^ai\s+(.+)/i);
    const userId = msg.key.remoteJid;

    if (commandMatch) {
      const userInput = commandMatch[1];

      if (!userChatHistory[userId]) {
        userChatHistory[userId] = [];
        setTimeout(() => {
          delete userChatHistory[userId];
        }, 10 * 60 * 1000);
      }
      userChatHistory[userId].push(userInput);

      try {
        await sock.sendMessage(userId, 
          { text: '💡 Generating AI response...' }, 
          { quoted: msg }
        );

        const aiResponse = await generateAIResponse(userInput);

        await sock.sendMessage(userId, 
          { text: aiResponse }, 
          { quoted: msg }
        );

      } catch (error) {
        console.error('AI Plugin Error:', error);
        await sock.sendMessage(userId,
          { text: '⚠️ Failed to generate AI response. Please try again later.' },
          { quoted: msg }
        );
      }
    }
  }
};