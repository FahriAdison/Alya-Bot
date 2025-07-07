import './lib/DB.js';
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, PHONENUMBER_MCC } = await import ('@whiskeysockets/baileys');
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';
import readline from 'readline';
import { printMessageInfo } from './message-info.js'; // Import the logging utility

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({ 
  input: process.stdin, 
  output: process.stdout 
});

const question = (text) => new Promise((resolve) => {
  rl.question(text, resolve);
});

// Enhanced connection options
const getConnectionOptions = async (state) => {
  const { version } = await fetchLatestBaileysVersion();
  
  return {
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: state.keys,
    },
    browser: ['Mac OS', 'safari', '5.1.10'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    generateHighQualityLinkPreview: true,
    syncFullHistory: true,
    markOnlineOnConnect: true,
    getMessage: async (key) => {
      // Implement message retrieval if needed
    }
  };
};

async function loadPlugins() {
  const plugins = {};
  const pluginsDir = path.join(__dirname, 'plugins'); // Path to the plugins directory

  // Ensure the plugins directory exists
  if (!fs.existsSync(pluginsDir)) {
    console.warn(chalk.yellow(`⚠️ Plugin directory not found at ${pluginsDir}. Creating it...`));
    fs.mkdirSync(pluginsDir, { recursive: true });
  }

  async function scanDirectory(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await scanDirectory(fullPath); // Recursively scan subdirectories
      } else if (item.isFile() && item.name.endsWith('.js')) {
        try {
          // Construct a relative path for dynamic import
          const relativePath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
          const pluginName = item.name.slice(0, -3); // Get plugin name without .js extension
          plugins[pluginName] = (await import(`./${relativePath}`)).default;
          console.log(chalk.blue(`Loaded plugin: ${pluginName}`));
        } catch (error) {
          console.error(chalk.red(`❌ Error loading plugin ${item.name} from ${fullPath}:`), error);
        }
      }
    }
  }

  await scanDirectory(pluginsDir);
  return plugins;
}

async function handlePairingCode(sock) {
  console.log(chalk.bgWhite(chalk.blue('Generating Pairing Code...')));
  
  let phoneNumber = await question('Enter your WhatsApp number (with country code, e.g. +6281234567890): ');
  phoneNumber = phoneNumber.trim();

  // Validate phone number format
  if (PHONENUMBER_MCC && !Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
    throw new Error('Invalid phone number format! Please include country code.');
  }

  // Generate and display pairing code
  try {
    const code = await sock.requestPairingCode(phoneNumber);
    const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
    console.log(chalk.black(chalk.bgGreen('YOUR PAIRING CODE:')), chalk.black(chalk.white(formattedCode)));
    console.log(chalk.yellow('Enter this code in your WhatsApp linked devices menu within 2 minutes.'));
  } catch (error) {
    console.error(chalk.red('Failed to generate pairing code:'), error);
    throw error;
  }
}

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const connectionOptions = await getConnectionOptions(state);
    const sock = makeWASocket(connectionOptions);

    // Handle credentials update
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, isNewLogin } = update;

      if (isNewLogin) {
        console.log(chalk.green('✅ New login detected!'));
      }

      if (connection === 'connecting') {
        console.log(chalk.yellow('⚡ Connecting to WhatsApp...'));
      }

      if (connection === 'open') {
        console.log(chalk.green('🔓 Successfully connected to WhatsApp!'));
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(shouldReconnect ? chalk.yellow('🔁 Connection lost, reconnecting...') : chalk.red('❌ Permanent logout'));
        if (shouldReconnect) {
          setTimeout(connectToWhatsApp, 5000);
        }
      }
    });

    // Request pairing code if not registered
    if (!state.creds.registered) {
      await handlePairingCode(sock);
    }

    // Load plugins
    const plugins = await loadPlugins();
    console.log(chalk.green(`✅ Loaded ${Object.keys(plugins).length} plugins`));

    // Fixed message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        try {
          // Skip messages sent by the bot itself
          if (msg.key.fromMe) continue;

          // Use printMessageInfo for logging
          printMessageInfo(msg);

          // Determine the correct JID to reply to
          const isGroup = msg.key.remoteJid.endsWith('@g.us');
          const replyJid = isGroup ? msg.key.remoteJid : msg.key.participant || msg.key.remoteJid;
          
          const text = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      msg.message?.buttonsResponseMessage?.selectedButtonId || 
                      msg.message?.listResponseMessage?.title || 
                      "";
          
          const userId = msg.key.participant || msg.key.remoteJid;

          // Handle antispam (assuming antispam.js is in plugins/security/)
          // Note: The original code had a direct import here, but if antispam is a plugin,
          // it should be accessed via the 'plugins' object.
          // I'm modifying this to access it from the loaded plugins.
          const antispamPlugin = plugins.antispam; // Assuming 'antispam.js' is loaded as 'antispam'
          if (antispamPlugin && typeof antispamPlugin.handle === 'function') {
            await antispamPlugin.handle(sock, msg);
            // The 'msg.isSpam' check implies antispam modifies the msg object,
            // which is fine if that's the intended behavior.
            if (msg.isSpam) continue;
          }

          // Handle commands
          const commandTriggers = ['register','unregister','ai','cai','ig', 'play', 'tiktok', 'menu', 'ping', 'claim', 'leaderboard', 'lb', '$', '=>', '>'];
          let isCommand = false;
          const lowerText = text.toLowerCase().trim();
          
          for (const trigger of commandTriggers) {
            if (lowerText === trigger || lowerText.startsWith(trigger + ' ')) {
              isCommand = true;
              break;
            }
          }

          if (isCommand && !lowerText.match(/^(register|unregister)\b/i)) {
            const db = await import('./lib/DB.js');
            if (!db.isRegistered(userId)) {
              await sock.sendMessage(replyJid, {
                text: "⚠️ You must register first! Use: *register <username>*"
              }, { quoted: msg });
              continue; // Stop processing if not registered
            }
          }

          // Process plugins
          for (const pluginName in plugins) {
            const plugin = plugins[pluginName];
            // Check if the current message matches a command handled by this plugin
            // This is a more robust way to route commands to specific plugins
            if (plugin && typeof plugin.handle === 'function') {
                // For 'ai' command, check if the text starts with 'ai ' or is exactly 'ai'
                if (pluginName === 'ai' && (lowerText.startsWith('ai ') || lowerText === 'ai')) {
                    await plugin.handle(sock, msg, replyJid);
                } 
                // For 'menu' command, check if the text is exactly 'menu'
                else if (pluginName === 'menu' && lowerText === 'menu') {
                    await plugin.handle(sock, msg, replyJid);
                }
                // For 'ping' command, check if the text is exactly 'ping'
                else if (pluginName === 'ping' && lowerText === 'ping') {
                    await plugin.handle(sock, msg, replyJid);
                }
                // Add similar checks for other specific commands like 'register', 'unregister', 'claim', 'leaderboard', 'tiktok', 'play', 'ig'
                // For commands that might have arguments (e.g., 'register <username>', 'play <song>'),
                // the plugin's handle function should parse the arguments.
                // The current structure of 'ai.js', 'menu.js', 'ping.js' already handles their specific command parsing within their 'handle' function.
                // So, the general loop below will still work if the plugin's handle function checks for its own trigger.
                // However, for clarity and explicit routing, the above if-else if chain is better for direct commands.
                // For general plugins that might react to any message, the original 'plugin.handle(sock, msg, replyJid)' is fine.
                // Let's revert to original plugin processing, assuming each plugin handles its own command matching.
                // The main issue is plugin loading.
                await plugin.handle(sock, msg, replyJid);
            }
          }
        } catch (error) {
          console.error(chalk.red('Error processing message:'), error);
        }
      }
    });

    return sock;

  } catch (error) {
    console.error(chalk.red('⚠️ Connection error:'), error);
    console.log(chalk.yellow('🔁 Attempting to reconnect in 10 seconds...'));
    setTimeout(connectToWhatsApp, 10000);
  }
}

// Start the bot
connectToWhatsApp();

// Clean up on exit
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Shutting down bot...'));
  rl.close();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(chalk.red('UNCAUGHT EXCEPTION:'), err);
});

