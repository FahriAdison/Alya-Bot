import './lib/DB.js';
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, PHONENUMBER_MCC } = await import ('@whiskeysockets/baileys');
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';
import readline from 'readline';
import { printMessageInfo } from './lib/message-info.js'; // Import the logging utility
import config from './config.js'; // Import config.js

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
  const commandTriggers = new Set(); // Menggunakan Set untuk pencarian perintah yang efisien
  const pluginsDir = path.join(__dirname, 'plugins'); // Path ke direktori plugins

  // Pastikan direktori plugins ada
  if (!fs.existsSync(pluginsDir)) {
    console.warn(chalk.yellow(`⚠️ Direktori plugin tidak ditemukan di ${pluginsDir}. Membuatnya...`));
    fs.mkdirSync(pluginsDir, { recursive: true });
  }

  async function scanDirectory(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await scanDirectory(fullPath); // Pindai subdirektori secara rekursif
      } else if (item.isFile() && item.name.endsWith('.js')) {
        try {
          // Buat path relatif untuk import dinamis
          const relativePath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
          const pluginName = item.name.slice(0, -3); // Dapatkan nama plugin tanpa ekstensi .js
          const loadedPlugin = (await import(`./${relativePath}`)).default;
          plugins[pluginName] = loadedPlugin;

          // Kumpulkan perintah dari plugin
          if (loadedPlugin.command) {
            commandTriggers.add(loadedPlugin.command.toLowerCase());
          }
          if (loadedPlugin.commands && Array.isArray(loadedPlugin.commands)) {
            loadedPlugin.commands.forEach(cmd => commandTriggers.add(cmd.toLowerCase()));
          }
          console.log(chalk.blue(`Plugin dimuat: ${pluginName}`));
        } catch (error) {
          console.error(chalk.red(`❌ Kesalahan saat memuat plugin ${item.name} dari ${fullPath}:`), error);
        }
      }
    }
  }

  await scanDirectory(pluginsDir);
  return { plugins, commandTriggers: Array.from(commandTriggers) }; // Kembalikan keduanya
}

async function handlePairingCode(sock) {
  console.log(chalk.bgWhite(chalk.blue('Membuat Kode Pemasangan...')));
  
  let phoneNumber = await question('Masukkan nomor WhatsApp Anda (dengan kode negara, cth. +6281234567890): ');
  phoneNumber = phoneNumber.trim();

  // Validasi format nomor telepon
  if (PHONENUMBER_MCC && !Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
    throw new Error('Format nomor telepon tidak valid! Harap sertakan kode negara.');
  }

  // Buat dan tampilkan kode pemasangan
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
    const sock = makeWASocket(connectionOptions);

    // Tangani pembaruan kredensial
    sock.ev.on('creds.update', saveCreds);

    // Tangani pembaruan koneksi
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

    // Minta kode pemasangan jika belum terdaftar
    if (!state.creds.registered) {
      await handlePairingCode(sock);
    }

    // Muat plugins dan kumpulkan pemicu perintah
    const { plugins, commandTriggers } = await loadPlugins(); // Destrukturisasi untuk mendapatkan commandTriggers
    console.log(chalk.green(`✅ Memuat ${Object.keys(plugins).length} plugin`));
    console.log(chalk.green(`✅ Mengidentifikasi ${commandTriggers.length} pemicu perintah`));

    // Penangan pesan tetap
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        try {
          // Lewati pesan yang dikirim oleh bot itu sendiri
          if (msg.key.fromMe) continue;

          // Gunakan printMessageInfo untuk logging
          printMessageInfo(msg);

          // Tentukan JID yang benar untuk membalas
          const isGroup = msg.key.remoteJid.endsWith('@g.us');
          const replyJid = isGroup ? msg.key.remoteJid : msg.key.participant || msg.key.remoteJid;
          
          const text = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      msg.message?.buttonsResponseMessage?.selectedButtonId || 
                      msg.message?.listResponseMessage?.title || 
                      "";
          
          const userId = msg.key.participant || msg.key.remoteJid;
          const lowerText = text.toLowerCase().trim();

          // Periksa apakah pengirim adalah owner
          const senderNumber = userId.replace(/@s\.whatsapp\.net$/, '');
          const isOwner = config.ownerNumber.includes(senderNumber);

          let isCommandMessage = false;
          // Periksa apakah pesan adalah perintah berdasarkan pemicu yang dikumpulkan
          for (const trigger of commandTriggers) {
            if (lowerText === trigger || lowerText.startsWith(trigger + ' ')) {
              isCommandMessage = true;
              break;
            }
          }

          // --- START: Tangani Antispam ---
          const antispamPlugin = plugins.antispam;
          if (antispamPlugin && typeof antispamPlugin.handle === 'function') {
            // Teruskan flag isCommandMessage yang baru
            await antispamPlugin.handle(sock, msg, replyJid, isCommandMessage);
            // Jika pesan ditandai sebagai spam, hentikan pemrosesan lebih lanjut
            if (msg.isSpam) {
              console.log(chalk.red(`DEBUG: Pesan ditandai sebagai SPAM untuk user ${userId}. Melewati pemrosesan command.`));
              continue; // Lewati semua pemrosesan lebih lanjut untuk pesan spam
            }
          }
          // --- END: Tangani Antispam ---

          // --- START: Tangani Perintah Pendaftaran Secara Terpisah (selalu diizinkan) ---
          const isRegisterCommand = lowerText === 'register' || lowerText.startsWith('register ');
          const isUnregisterCommand = lowerText === 'unregister' || lowerText.startsWith('unregister ');

          if (isRegisterCommand) {
            const registerPlugin = plugins.register;
            if (registerPlugin && typeof registerPlugin.handle === 'function') {
              await registerPlugin.handle(sock, msg, replyJid);
              continue; // Hentikan pemrosesan setelah menangani pendaftaran
            }
          } else if (isUnregisterCommand) {
            const unregisterPlugin = plugins.unregister;
            if (unregisterPlugin && typeof unregisterPlugin.handle === 'function') {
              await unregisterPlugin.handle(sock, msg, replyJid);
              continue; // Hentikan pemrosesan setelah menangani pembatalan pendaftaran
            }
          }
          // --- END: Tangani Perintah Pendaftaran Secara Terpisah ---

          // --- START: Periksa Pendaftaran untuk perintah lain ---
          const db = await import('./lib/DB.js');
          // Hanya periksa pendaftaran jika itu adalah perintah DAN bukan perintah register/unregister
          if (isCommandMessage && !db.isRegistered(userId) && !isRegisterCommand && !isUnregisterCommand) {
            await sock.sendMessage(replyJid, {
              text: "⚠️ Anda harus mendaftar terlebih dahulu! Gunakan: *register <username>*"
            }, { quoted: msg });
            continue; // Hentikan pemrosesan jika tidak terdaftar dan bukan perintah pendaftaran
          }
          // --- END: Periksa Pendaftaran untuk perintah lain ---

          // Proses semua plugin yang dimuat (hanya jika bukan spam, sudah terdaftar untuk command, dll.)
          for (const pluginName in plugins) {
            const plugin = plugins[pluginName];
            if (plugin && typeof plugin.handle === 'function') {
                // Teruskan isOwner ke setiap plugin
                await plugin.handle(sock, msg, replyJid, isOwner);
            }
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

// Mulai bot
connectToWhatsApp();

// Bersihkan saat keluar
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Mematikan bot...'));
  rl.close();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(chalk.red('PENGECUALIAN TIDAK TERTANGKAP:'), err);
});

