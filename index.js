// index.js (Versi Bersih)

const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, PHONENUMBER_MCC } = await import ('@whiskeysockets/baileys');
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';
import readline from 'readline';
import { printMessageInfo } from './lib/message-info.js';
import config from './lib/config.js';
import { extendWASocket, smsg } from './lib/extensions.js';
import store from './lib/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({ 
  input: process.stdin, 
  output: process.stdout 
});

const question = (text) => new Promise((resolve) => {
  rl.question(text, resolve);
});

const getConnectionOptions = async (state) => {
  const { version } = await fetchLatestBaileysVersion();
  
  return {
    version,
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
  };
};

async function loadPlugins() {
  const plugins = {};
  const commandHandlers = new Map();
  const pluginsDir = path.join(__dirname, 'plugins');

  if (!fs.existsSync(pluginsDir)) {
    console.warn(chalk.yellow(`⚠️ Direktori plugin tidak ditemukan di ${pluginsDir}. Membuatnya...`));
    fs.mkdirSync(pluginsDir, { recursive: true });
  }

  async function scanDirectory(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (item.isFile() && item.name.endsWith('.js')) {
        try {
          const relativePath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
          const pluginName = item.name.slice(0, -3);
          const loadedPlugin = (await import(`./${relativePath}`)).default;
          plugins[pluginName] = loadedPlugin;

          if (loadedPlugin.command) {
            commandHandlers.set(loadedPlugin.command.toLowerCase(), loadedPlugin);
          }
          if (loadedPlugin.commands && Array.isArray(loadedPlugin.commands)) {
            loadedPlugin.commands.forEach(cmd => commandHandlers.set(cmd.toLowerCase(), loadedPlugin));
          }
          console.log(chalk.blue(`Plugin dimuat: ${pluginName}`));
        } catch (error) {
          console.error(chalk.red(`❌ Kesalahan saat memuat plugin ${item.name} dari ${fullPath}:`), error);
        }
      }
    }
  }

  await scanDirectory(pluginsDir);
  return { plugins, commandHandlers };
}

async function handlePairingCode(sock) {
  console.log(chalk.bgWhite(chalk.blue('Membuat Kode Pemasangan...')));
  
  let phoneNumber = await question('Masukkan nomor WhatsApp Anda (dengan kode negara, cth. +6281234567890): ');
  phoneNumber = phoneNumber.trim();

  if (PHONENUMBER_MCC && !Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
    throw new Error('Format nomor telepon tidak valid! Harap sertakan kode negara.');
  }

  try {
    const code = await sock.requestPairingCode(phoneNumber);
    const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
    console.log(chalk.black(chalk.bgGreen('KODE PEMASANGAN ANDA:')), chalk.black(chalk.white(formattedCode)));
    console.log(chalk.yellow('Masukkan kode ini di menu perangkat tertaut WhatsApp Anda dalam 2 menit.'));
  } catch (error) {
    console.error(chalk.red('Gagal membuat kode pemasangan:'), error);
    throw error;
  }
}

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('sessions');
    const connectionOptions = await getConnectionOptions(state);
    let sock = makeWASocket(connectionOptions);
    sock = extendWASocket(sock);
    store.bind(sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, isNewLogin } = update;

      if (isNewLogin) {
        console.log(chalk.green('✅ Login baru terdeteksi!'));
      }
      if (connection === 'connecting') {
        console.log(chalk.yellow('⚡ Menghubungkan ke WhatsApp...'));
      }
      if (connection === 'open') {
        console.log(chalk.green('🔓 Berhasil terhubung ke WhatsApp!'));
      }
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(shouldReconnect ? chalk.yellow('🔁 Koneksi terputus, mencoba menyambungkan kembali...') : chalk.red('❌ Logout permanen'));
        if (shouldReconnect) {
          setTimeout(connectToWhatsApp, 5000);
        }
      }
    });

    if (!state.creds.registered) {
      await handlePairingCode(sock);
    }

    const { plugins, commandHandlers } = await loadPlugins();
    console.log(chalk.green(`✅ Memuat ${Object.keys(plugins).length} plugin`));
    console.log(chalk.green(`✅ Mengidentifikasi ${commandHandlers.size} pemicu perintah`));

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const rawMsg of messages) {
        try {
          if (rawMsg.key.fromMe) continue;

          const m = smsg(sock, rawMsg);
          printMessageInfo(m);

          const isGroup = m.key.remoteJid.endsWith('@g.us');
          const replyJid = isGroup ? m.key.remoteJid : m.key.participant || m.key.remoteJid;
          
          const text = m.message?.conversation || 
                      m.message?.extendedTextMessage?.text || 
                      m.message?.buttonsResponseMessage?.selectedButtonId || 
                      m.message?.listResponseMessage?.title || 
                      "";
          
          const userId = m.key.participant || m.key.remoteJid;
          const lowerText = text.toLowerCase().trim();
          const senderNumber = userId.replace(/@s\.whatsapp\.net$/, '');
          const isOwner = config.ownerNumber.includes(senderNumber);
          const commandPrefixes = config.prefixes || ["!"];

          // --- START: Tangani Antispam ---
          const antispamPlugin = plugins.antispam;
          let isCommandMessage = false;
          
          for (const cmdTrigger of commandHandlers.keys()) {
              for (const prefix of commandPrefixes) {
                  const fullCommandTrigger = prefix + cmdTrigger;
                  if (lowerText === fullCommandTrigger || lowerText.startsWith(fullCommandTrigger + ' ')) {
                      isCommandMessage = true;
                      break;
                  }
              }
              if (isCommandMessage) break;
          }

          if (antispamPlugin && typeof antispamPlugin.handle === 'function') {
            await antispamPlugin.handle(sock, m, replyJid, isCommandMessage);
            if (m.isSpam) {
              continue;
            }
          }
          // --- END: Tangani Antispam ---

          // --- LOGIKA PENANGANAN PERINTAH UTAMA ---
          let commandExecuted = false;
          
          for (const [cmdTrigger, plugin] of commandHandlers.entries()) {
            for (const prefix of commandPrefixes) {
                const fullCommandTrigger = prefix + cmdTrigger;
                
                if (lowerText === fullCommandTrigger || lowerText.startsWith(fullCommandTrigger + ' ')) {
                  commandExecuted = true;
                  
                  if (plugin.commands && (plugin.commands.includes('=>') || plugin.commands.includes('>') || plugin.commands.includes('$'))) {
                    await plugin.handle(sock, m, replyJid, isOwner);
                  } else {
                    const commandTextWithoutPrefix = text.substring(fullCommandTrigger.length).trim();
                    // Modifikasi objek 'm' agar plugin tidak perlu parsing prefiks lagi
                    const modifiedM = { 
                      ...m, 
                      message: { 
                        ...m.message, 
                        conversation: commandTextWithoutPrefix, 
                        extendedTextMessage: { ...m.message?.extendedTextMessage, text: commandTextWithoutPrefix } 
                      } 
                    };
                    await plugin.handle(sock, modifiedM, replyJid, isOwner);
                  }
                  break;
                }
            }
            if (commandExecuted) break;
          }

          if (!commandExecuted) {
            // Logika untuk pesan non-perintah bisa ditambahkan di sini
          }

        } catch (error) {
          console.error(chalk.red('Kesalahan saat memproses pesan:'), error);
        }
      }
    });

    return sock;

  } catch (error) {
    console.error(chalk.red('⚠️ Kesalahan koneksi:'), error);
    console.log(chalk.yellow('🔁 Mencoba menyambungkan kembali dalam 10 detik...'));
    setTimeout(connectToWhatsApp, 10000);
  }
}

connectToWhatsApp();

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Mematikan bot...'));
  rl.close();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(chalk.red('PENGECUALIAN TIDAK TERTANGKAP:'), err);
});