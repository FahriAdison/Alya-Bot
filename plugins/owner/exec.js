import syntaxerror from 'syntax-error';
import { format } from 'util';
import cp, { exec as _exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import chalk from 'chalk'; // Import chalk for logging

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);

let execPromise = promisify(_exec).bind(cp);

let commandHistory = {}; // Menggunakan objek untuk history per user

// Definisi CustomArray harus di scope yang bisa diakses oleh evalFunction jika digunakan
class CustomArray extends Array {
  constructor(...args) {
    if (typeof args[0] == 'number') return super(Math.min(args[0], 10000));
    else return super(...args);
  }
}

// Fungsi untuk eksekusi JavaScript
async function handleJSEval(sock, msg, replyJid, text, isOwner) {
  if (!isOwner) {
    await sock.sendMessage(replyJid, { text: '🚫 Anda bukan owner bot.' }, { quoted: msg });
    return;
  }

  let _return;
  let _syntax = '';
  // Ekstrak kode yang akan dieksekusi, hapus prefiks '=>' atau '>'
  let codeToExecute = text.startsWith('=>') ? text.substring(2).trim() : (text.startsWith('>') ? text.substring(1).trim() : '');

  // Tambahkan 'return' secara eksplisit jika kode tidak mengandung 'return' atau 'await'
  // Ini memastikan ekspresi terakhir akan dikembalikan
  const needsExplicitReturn = !codeToExecute.includes('return') && !codeToExecute.includes('await');
  if (needsExplicitReturn) {
      codeToExecute = `return (${codeToExecute});`;
  }

  // Bungkus kode dalam IIFE (Immediately Invoked Function Expression)
  // Ini membantu dalam penanganan scope dan async/await
  const functionBody = `
    // Variabel m, sock, require, process, CustomArray, print, handler sudah tersedia
    // sebagai parameter fungsi ini, jadi tidak perlu dideklarasikan ulang.

    try {
      // Jika kode mengandung 'await', itu harus di dalam fungsi async
      if (/\bawait\b/.test("${codeToExecute.replace(/`/g, '\\`')}")) { // Escape backticks untuk regex
        return await (async () => {
          ${codeToExecute}
        })();
      } else {
        ${codeToExecute} // Jalankan kode, dengan 'return' sudah ditambahkan jika diperlukan
      }
    } catch (e) {
      throw e; // Lempar ulang untuk ditangkap oleh try-catch luar
    }
  `;

  try {
    let i = 15; // Batasi jumlah console.log melalui fungsi print kustom
    let f = { exports: {} };

    // Buat konstruktor Fungsi baru untuk eksekusi kode dinamis
    // Teruskan 'm', 'sock', 'require', 'process', 'CustomArray', 'print', 'handler' sebagai argumen eksplisit
    const evalFunction = new Function(
      'm', 'sock', 'require', 'process', 'CustomArray', 'print', 'handler',
      functionBody
    );
    
    // Panggil fungsi yang dibuat secara dinamis, meneruskan objek yang sebenarnya
    _return = await evalFunction(
      msg, // m
      sock, // sock
      require,
      process,
      CustomArray, // Pastikan CustomArray didefinisikan dan diteruskan
      (...args) => { // Fungsi print kustom untuk logging ke konsol dan chat
        if (--i < 1) return;
        console.log(chalk.blue('JS Eval Output:'), ...args);
        sock.sendMessage(replyJid, { text: format(...args) }, { quoted: msg });
      },
      null // handler (tidak terlalu dibutuhkan untuk eval, tapi ada di yang asli)
    );

  } catch (e) {
    let err = syntaxerror(codeToExecute, 'Execution Function', { // Gunakan codeToExecute
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      sourceType: 'module'
    });
    if (err) _syntax = '```' + err + '```\n\n';
    _return = e;
  } finally {
    const output = _syntax + format(_return);
    // --- PERUBAHAN DI SINI: Selalu kirim sebagai teks ---
    await sock.sendMessage(replyJid, { text: output }, { quoted: msg });
    // --- AKHIR PERUBAHAN ---
  }
}

// Fungsi untuk eksekusi Shell
async function handleShellExec(sock, msg, replyJid, text, isOwner) {
  if (!isOwner) {
    await sock.sendMessage(replyJid, { text: '🚫 Anda bukan owner bot.' }, { quoted: msg });
    return;
  }

  const userId = msg.key.participant || msg.key.remoteJid;
  const commandToExec = text.startsWith('$') ? text.substring(1).trim() : '';

  if (commandToExec.toLowerCase() === 'clearhistory') {
    if (commandHistory[userId]) {
      delete commandHistory[userId];
    }
    await sock.sendMessage(replyJid, { text: 'Riwayat perintah shell dibersihkan.' }, { quoted: msg });
    return;
  }

  await sock.sendMessage(replyJid, { text: 'Mengeksekusi perintah shell...' }, { quoted: msg });

  let o;
  try {
    o = await execPromise(commandToExec);
  } catch (e) {
    o = e;
  } finally {
    let { stdout, stderr } = o;
    let outputMessage = "```";

    if (stdout.trim()) {
      outputMessage += `\n${stdout.trim()}\n`;
    }

    if (stderr.trim()) {
      outputMessage += `\nError: ${stderr.trim()}\n`;
    }

    outputMessage += "```";

    // Simpan riwayat perintah untuk user ini
    if (!commandHistory[userId]) {
      commandHistory[userId] = [];
    }
    commandHistory[userId].push(commandToExec);

    // --- PERUBAHAN DI SINI: Selalu kirim sebagai teks untuk shell exec juga ---
    // Meskipun untuk shell exec, kirim sebagai file jika sangat panjang lebih aman
    // Untuk konsistensi dengan permintaan Anda, saya akan tetap mengirim sebagai teks
    // Namun, pertimbangkan untuk mengembalikan ke pengiriman file jika Anda mengalami masalah
    await sock.sendMessage(replyJid, { text: outputMessage }, { quoted: msg });
    // --- AKHIR PERUBAHAN ---

    let historyMessage = commandHistory[userId].map((cmd, index) => `${index + 1}. ${cmd}`).join('\n');
    await sock.sendMessage(replyJid, { text: `Riwayat Perintah:\n${historyMessage}\n\nUntuk menghapus riwayat ketik $ clearhistory` }, { quoted: msg });
  }
}

export default {
  commands: ['=>', '>', '$'], // Mendeklarasikan semua pemicu owner
  handle: async (sock, msg, replyJid, isOwner) => { // Menerima isOwner
    const messageText = msg.message?.conversation || '';
    const lowerText = messageText.toLowerCase().trim();

    if (lowerText.startsWith('=>') || lowerText.startsWith('>')) {
      await handleJSEval(sock, msg, replyJid, messageText, isOwner);
    } else if (lowerText.startsWith('$')) {
      await handleShellExec(sock, msg, replyJid, messageText, isOwner);
    }
  }
};

