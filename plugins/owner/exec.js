// plugins/owner/exec.js
import syntaxerror from 'syntax-error';
import { format } from 'util';
import cp, { exec as _exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);

let execPromise = promisify(_exec).bind(cp);
let commandHistory = {};

class CustomArray extends Array {
  constructor(...args) {
    if (typeof args[0] == 'number') return super(Math.min(args[0], 10000));
    else return super(...args);
  }
}

async function handleJSEval(sock, msg, replyJid, text, isOwner) {
  if (!isOwner) {
    await sock.sendMessage(replyJid, { text: '🚫 Anda bukan owner bot.' }, { quoted: msg });
    return;
  }

  let _return;
  let _syntax = '';
  let codeToExecute = text.startsWith('=>') ? text.substring(2).trim() : (text.startsWith('>') ? text.substring(1).trim() : '');

  const needsExplicitReturn = !/await|return/.test(codeToExecute);
  if (needsExplicitReturn) {
    codeToExecute = `return (${codeToExecute});`;
  }

  const functionBody = `
    try {
      if (/\bawait\b/.test("${codeToExecute.replace(/`/g, '\\`')}")) {
        return await (async () => {
          ${codeToExecute}
        })();
      } else {
        return (() => {
          ${codeToExecute}
        })();
      }
    } catch (e) {
      throw e;
    }
  `;

  try {
    let i = 15;
    const evalFunction = new Function('m', 'sock', 'require', 'process', 'CustomArray', 'print', 'handler', functionBody);
    _return = await evalFunction(
      msg, sock, require, process, CustomArray,
      (...args) => {
        if (--i < 1) return;
        console.log(chalk.blue('JS Eval Output:'), ...args);
        sock.sendMessage(replyJid, { text: format(...args) }, { quoted: msg });
      },
      null
    );
  } catch (e) {
    let err = syntaxerror(codeToExecute, 'Execution Function', {
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      sourceType: 'module'
    });
    if (err) _syntax = '```' + err + '```\n\n';
    _return = e;
  } finally {
    const output = _syntax + format(_return);
    await sock.sendMessage(replyJid, { text: output }, { quoted: msg });
  }
}

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
    if (stdout.trim()) outputMessage += `\n${stdout.trim()}\n`;
    if (stderr.trim()) outputMessage += `\nError: ${stderr.trim()}\n`;
    outputMessage += "```";

    if (!commandHistory[userId]) commandHistory[userId] = [];
    commandHistory[userId].push(commandToExec);

    await sock.sendMessage(replyJid, { text: outputMessage }, { quoted: msg });

    let historyMessage = commandHistory[userId].map((cmd, index) => `${index + 1}. ${cmd}`).join('\n');
    await sock.sendMessage(replyJid, { text: `Riwayat Perintah:\n${historyMessage}\n\nUntuk menghapus riwayat ketik $ clearhistory` }, { quoted: msg });
  }
}

export default {
  commands: ['=>', '>', '$'],
  handle: async (sock, msg, replyJid, isOwner) => {
    // PERBAIKAN: Menggunakan ekstraksi teks yang lengkap dan standar.
    // Ini KRUSIAL agar perintah exec/eval berfungsi saat membalas pesan lain.
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const lowerText = messageText.toLowerCase().trim();

    if (lowerText.startsWith('=>') || lowerText.startsWith('>')) {
      await handleJSEval(sock, msg, replyJid, messageText, isOwner);
    } else if (lowerText.startsWith('$')) {
      await handleShellExec(sock, msg, replyJid, messageText, isOwner);
    }
  }
};