import './lib/DB.js';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Import fileURLToPath from url module
import { dirname } from 'path'; // Import dirname from path module
import { printMessageInfo } from './lib/message-info.js';
import qrcode from 'qrcode-terminal';
import config from './lib/config.js';

// Define __dirname using fileURLToPath and dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadPlugins() {
  const plugins = {};
  const pluginsDir = path.join(__dirname, 'plugins');

  function scanDirectory(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.isFile() && item.name.endsWith('.js')) {
        const pluginName = item.name.slice(0, -3);
        plugins[pluginName] = require(fullPath);
      }
    }
  }

  scanDirectory(pluginsDir);
  return plugins;
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    getMessage: async key => {
      const msg = await sock.loadMessage(key);
      return msg?.message || undefined;
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(shouldReconnect ? '🔁 Reconnecting...' : '❌ Permanent logout');
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      console.log('🔓 Connection established');
      await sock.sendPresenceUpdate('available');
      await sock.updateProfileStatus('Online');
    }
    if (update.qr) {
      qrcode.generate(update.qr, { small: true });
    }
  });

  sock.ev.on('creds.update', saveCreds);

  const plugins = loadPlugins();

  for (const pluginName in plugins) {
    const plugin = plugins[pluginName];
    if (plugin && typeof plugin.init === 'function') {
      plugin.init(sock);
    }
  }

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.key.fromMe && m.messages) {
      printMessageInfo(msg);

      const userId = msg.key.participant || msg.key.remoteJid;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

      const antispam = require('./plugins/security/antispam');
      await antispam.handle(sock, msg);
      if (msg.isSpam) return;

      const commandTriggers = ['ig', 'play', 'tiktok', 'menu', 'ping', 'claim', 'leaderboard', 'lb', '$', '=>', '>'];
      let isCommand = false;
      const lowerText = text.toLowerCase().trim();
      for (const trigger of commandTriggers) {
        if (lowerText === trigger || lowerText.startsWith(trigger + ' ')) {
          isCommand = true;
          break;
        }
      }

      if (isCommand && !lowerText.match(/^(register|unregister)\b/i)) {
        const db = require('./lib/DB.js');
        if (!db.isRegistered(userId)) {
          await sock.sendMessage(msg.key.remoteJid, {
            text: "You must register first. Use: register <username>"
          }, { quoted: msg });
          return;
        }
      }

      for (const pluginName in plugins) {
        const plugin = plugins[pluginName];
        if (plugin && typeof plugin.handle === 'function') {
          plugin.handle(sock, msg);
        }
      }
    }
  });

  return sock;
}

connectToWhatsApp();
