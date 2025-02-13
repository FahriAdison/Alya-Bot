const { CAINode } = require("cainode");
const client = new CAINode();

// In-memory storage for user chat history
const userChatHistory = {};

async function generateCAIResponse(userInput) {
    try {
        await client.login("RWABGq1cnSiJ1a31GOwE6eK35iFTA2hKpY96UITrz0g"); // Replace with your Character.AI token
        const characterId = "RWABGq1cnSiJ1a31GOwE6eK35iFTA2hKpY96UITrz0g"; // Replace with your character ID
        const chat = await client.character.connect(characterId);
        const response = await client.character.send_message(userInput);
        return response.message;
    } catch (error) {
        console.error("Error fetching data from Character AI:", error.message);
        throw error;
    } finally {
        await client.logout();
    }
}

module.exports = {
    handle: async (sock, msg) => {
        const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
        const commandMatch = text.match(/^cai\s+(.+)/i);
        const userId = msg.key.remoteJid;

        if (commandMatch) {
            const userInput = commandMatch[1];

            // Store user input in chat history
            if (!userChatHistory[userId]) {
                userChatHistory[userId] = [];
                // Set a timeout to clear chat history after 10 minutes
                setTimeout(() => {
                    delete userChatHistory[userId];
                }, 10 * 60 * 1000);
            }
            userChatHistory[userId].push(userInput);

            try {
                await sock.sendMessage(userId, 
                    { text: '💡 Generating Character AI response...' }, 
                    { quoted: msg }
                );

                const caiResponse = await generateCAIResponse(userInput);

                await sock.sendMessage(userId, 
                    { text: caiResponse }, 
                    { quoted: msg }
                );

            } catch (error) {
                console.error('Character AI Plugin Error:', error);
                await sock.sendMessage(userId,
                    { text: '⚠️ Failed to generate Character AI response. Please try again later.' },
                    { quoted: msg }
                );
            }
        }
    }
};