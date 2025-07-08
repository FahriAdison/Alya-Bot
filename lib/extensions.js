// lib/extensions.js

import Jimp from 'jimp';
import path from 'path';
import { toAudio } from './converter.js'; // Import toAudio dari converter.js
import chalk from 'chalk';
import fetch from 'node-fetch';
import PhoneNumber from 'awesome-phonenumber';
import fs from 'fs';
import util from 'util';
import { fileTypeFromBuffer } from 'file-type';
import { format } from 'util';
import { fileURLToPath } from 'url';
// import store from './store.js'; // Store akan di-bind di index.js, jadi tidak perlu di sini

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Baileys imports yang dibutuhkan untuk ekstensi
const {
    proto,
    areJidsSameUser,
    downloadContentFromMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    getDevice,
    WAMessageStubType,
    extractMessageContent,
    jidDecode,
    jidNormalizedUser,
} = (await import('@whiskeysockets/baileys')).default;

// --- Fungsi Utilitas dari simple.js yang berdiri sendiri ---
function isNumber() {
    const int = parseInt(this);
    return typeof int === 'number' && !isNaN(int);
}

function getRandom() {
    if (Array.isArray(this) || this instanceof String) return this[Math.floor(Math.random() * this.length)];
    return Math.floor(Math.random() * this);
}

function nullish(args) {
    return !(args !== null && args !== undefined);
}

async function generateProfilePicture(mediaUpload) {
    let bufferOrFilePath;
    if (Buffer.isBuffer(mediaUpload)) bufferOrFilePath = mediaUpload;
    else if (typeof mediaUpload === 'object' && 'url' in mediaUpload) bufferOrFilePath = mediaUpload.url.toString();
    else if (typeof mediaUpload === 'object' && 'stream' in mediaUpload) {
        const chunks = [];
        for await (const chunk of mediaUpload.stream) {
            chunks.push(chunk);
        }
        bufferOrFilePath = Buffer.concat(chunks);
    } else {
        bufferOrFilePath = Buffer.alloc(0);
    }
    
    const { read, MIME_JPEG, AUTO } = await import('jimp');
    
    const jimp = await read(bufferOrFilePath);
    const min = jimp.getWidth();
    const max = jimp.getHeight();
    const cropped = jimp.crop(0, 0, min, max);
    return {
        img: await cropped.quality(100).scaleToFit(720, 720, AUTO).getBufferAsync(MIME_JPEG)
    };
}

// --- Serialisasi Pesan (smsg) ---
export function smsg(conn, m, hasParent) {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    m = M.fromObject(m);
    m.conn = conn;
    let protocolMessageKey;
    if (m.message) {
        if (m.mtype == 'protocolMessage' && m.msg.key) {
            protocolMessageKey = m.msg.key;
            if (protocolMessageKey.remoteJid === 'status@broadcast') protocolMessageKey.remoteJid = m.chat;
            if (!protocolMessageKey.participant || protocolMessageKey.participant === 'status_me') protocolMessageKey.participant = m.sender;
            protocolMessageKey.fromMe = conn.decodeJid(protocolMessageKey.participant) === conn.decodeJid(conn.user.id);
            if (!protocolMessageKey.fromMe && protocolMessageKey.remoteJid === conn.decodeJid(conn.user.id)) protocolMessageKey.remoteJid = m.sender;
        }
        if (m.quoted) if (!m.quoted.mediaMessage) delete m.quoted.download;
    }
    if (!m.mediaMessage) delete m.download;

    try {
        if (protocolMessageKey && m.mtype == 'protocolMessage') conn.ev.emit('message.delete', protocolMessageKey);
    } catch (e) {
        console.error(e);
    }
    return m;
}

// --- Fungsi Logika ---
export function logic(check, inp, out) {
    if (inp.length !== out.length) throw new Error('Input and Output must have same length');
    for (let i in inp) if (util.isDeepStrictEqual(check, inp[i])) return out[i];
    return null;
}

// --- Ekstensi Prototype (Gunakan dengan Hati-hati) ---
export function protoType() {
    if (!Buffer.prototype.toArrayBuffer) {
        Buffer.prototype.toArrayBuffer = function toArrayBufferV2() {
            const ab = new ArrayBuffer(this.length);
            const view = new Uint8Array(ab);
            for (let i = 0; i < this.length; ++i) {
                view[i] = this[i];
            }
            return ab;
        };
    }
    if (!Buffer.prototype.toArrayBufferV2) {
        Buffer.prototype.toArrayBufferV2 = function toArrayBuffer() {
            return this.buffer.slice(this.byteOffset, this.byteOffset + this.byteLength);
        };
    }
    if (!ArrayBuffer.prototype.toBuffer) {
        ArrayBuffer.prototype.toBuffer = function toBuffer() {
            return Buffer.from(new Uint8Array(this));
        };
    }
    if (!Uint8Array.prototype.getFileType) {
        Uint8Array.prototype.getFileType = ArrayBuffer.prototype.getFileType = Buffer.prototype.getFileType = async function getFileType() {
            return await fileTypeFromBuffer(this);
        };
    }
    if (!String.prototype.isNumber) {
        String.prototype.isNumber = Number.prototype.isNumber = isNumber;
    }
    if (!String.prototype.capitalize) {
        String.prototype.capitalize = function capitalize() {
            return this.charAt(0).toUpperCase() + this.slice(1, this.length);
        };
    }
    if (!String.prototype.capitalizeV2) {
        String.prototype.capitalizeV2 = function capitalizeV2() {
            const str = this.split(' ');
            return str.map(v => v.capitalize()).join(' ');
        };
    }
    if (!String.prototype.decodeJid) {
        String.prototype.decodeJid = function decodeJid() {
            if (/:\d+@/gi.test(this)) {
                const decode = jidDecode(this) || {};
                return (decode.user && decode.server && decode.user + '@' + decode.server || this).trim();
            } else return this.trim();
        };
    }
    if (!Number.prototype.toTimeString) {
        Number.prototype.toTimeString = function toTimeString() {
            const seconds = Math.floor((this / 1000) % 60);
            const minutes = Math.floor((this / (60 * 1000)) % 60);
            const hours = Math.floor((this / (60 * 60 * 1000)) % 24);
            const days = Math.floor((this / (24 * 60 * 60 * 1000)));
            return (
                (days ? `${days} Hari ` : '') +
                (hours ? `${hours} Jam ` : '') +
                (minutes ? `${minutes} Menit ` : '') +
                (seconds ? `${seconds} Detik` : '')
            ).trim();
        };
    }
    if (!Number.prototype.getRandom) {
        Number.prototype.getRandom = String.prototype.getRandom = Array.prototype.getRandom = getRandom;
    }
}

// --- Fungsi Ekstensi Utama ---
export function extendWASocket(sock, options = {}) {
    // Jalankan ekstensi prototype
    protoType();

    let extendedSock = Object.defineProperties(sock, {
        decodeJid: {
            value(jid) {
                if (!jid || typeof jid !== 'string') return (!nullish(jid) && jid) || null;
                return jid.decodeJid();
            }
        },
        logger: {
            get() {
                return {
                    info(...args) {
                        console.log(
                            chalk.bold.bgRgb(51, 204, 51)('INFO '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.cyan(format(...args))
                        );
                    },
                    error(...args) {
                        console.log(
                            chalk.bold.bgRgb(247, 38, 33)('ERROR '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.rgb(255, 38, 0)(format(...args))
                        );
                    },
                    warn(...args) {
                        console.log(
                            chalk.bold.bgRgb(255, 153, 0)('WARNING '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.redBright(format(...args))
                        );
                    },
                    trace(...args) {
                        console.log(
                            chalk.grey('TRACE '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.white(format(...args))
                        );
                    },
                    debug(...args) {
                        console.log(
                            chalk.bold.bgRgb(66, 167, 245)('DEBUG '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.white(format(...args))
                        );
                    }
                };
            },
            enumerable: true
        },
        getFile: {
            async value(PATH, saveToFile = false) {
                let res, filename;
                const data = Buffer.isBuffer(PATH) ? PATH : PATH instanceof ArrayBuffer ? Buffer.from(PATH) : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0);
                if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer');
                const type = await fileTypeFromBuffer(data) || {
                    mime: 'application/octet-stream',
                    ext: '.bin'
                };
                if (data && saveToFile && !filename) (filename = path.join(__dirname, '../../tmp/' + new Date * 1 + '.' + type.ext), await fs.promises.writeFile(filename, data));
                return {
                    res,
                    filename,
                    ...type,
                    data,
                    deleteFile() {
                        return filename && fs.promises.unlink(filename);
                    }
                };
            },
            enumerable: true
        },
        waitEvent: {
            value(eventName, is = () => true, maxTries = 25) {
                return new Promise((resolve, reject) => {
                    let tries = 0;
                    let on = (...args) => {
                        if (++tries > maxTries) reject('Max tries reached');
                        else if (is()) {
                            sock.ev.off(eventName, on);
                            resolve(...args);
                        }
                    };
                    sock.ev.on(eventName, on);
                });
            }
        },
        sendFile: {
            async value(jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) {
                let type = await sock.getFile(path, true);
                let { res, data: file, filename: pathFile } = type;
                if (res && res.status !== 200 || file.length <= 65536) {
                    try { throw { json: JSON.parse(file.toString()) }; }
                    catch (e) { if (e.json) throw e.json; }
                }
                let opt = { filename };
                if (quoted) opt.quoted = quoted;
                if (!type) options.asDocument = true;
                let mtype = '', mimetype = options.mimetype || type.mime, convert;
                if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker';
                else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image';
                else if (/video/.test(type.mime)) mtype = 'video';
                else if (/audio/.test(type.mime)) {
                    convert = await toAudio(file, type.ext); // toAudio sekarang tersedia
                    file = convert.data;
                    pathFile = convert.filename;
                    mtype = 'audio';
                    mimetype = options.mimetype || 'audio/ogg; codecs=opus';
                }
                else mtype = 'document';
                if (options.asDocument) mtype = 'document';

                delete options.asSticker;
                delete options.asLocation;
                delete options.asVideo;
                delete options.asDocument;
                delete options.asImage;

                let message = {
                    ...options,
                    caption,
                    ptt,
                    [mtype]: { url: pathFile },
                    mimetype,
                    fileName: filename || pathFile.split('/').pop()
                };
                let m;
                try {
                    m = await sock.sendMessage(jid, message, { ...opt, ...options });
                } catch (e) {
                    console.error(e);
                    m = null;
                } finally {
                    if (!m) m = await sock.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options });
                    file = null;
                    return m;
                }
            },
            enumerable: true
        },
        sendContact: {
            async value(jid, data, quoted, options) {
                if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data];
                let contacts = [];
                for (let [number, name] of data) {
                    number = number.replace(/[^0-9]/g, '');
                    let njid = number + '@s.whatsapp.net';
                    let biz = await sock.getBusinessProfile(njid).catch(_ => null) || {};
                    let vcard = `
BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, '\\n')};;;
FN:${name.replace(/\n/g, '\\n')}
TEL;type=CELL;type=VOICE;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}${biz.description ? `
X-WA-BIZ-NAME:${(sock.chats[njid]?.vname || sock.getName(njid) || name).replace(/\n/, '\\n')}
X-WA-BIZ-DESCRIPTION:${biz.description.replace(/\n/g, '\\n')}
`.trim() : ''}
END:VCARD
        `.trim();
                    contacts.push({ vcard, displayName: name });

                }
                return await sock.sendMessage(jid, {
                    ...options,
                    contacts: {
                        ...options,
                        displayName: (contacts.length >= 2 ? `${contacts.length} kontak` : contacts[0].displayName) || null,
                        contacts,
                    }
                }, { quoted, ...options });
            },
            enumerable: true
        },
        sendContactArray: {
            async value(jid, data, quoted, options) {
                if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data];
                let contacts = [];
                for (let [number, name, isi, isi1, isi2, isi3, isi4, isi5] of data) {
                    number = number.replace(/[^0-9]/g, '');
                    let njid = number + '@s.whatsapp.net';
                    let biz = await sock.getBusinessProfile(njid).catch(_ => null) || {};
                    let vcard = `
BEGIN:VCARD
VERSION:3.0
N:Sy;Bot;;;
FN:${name.replace(/\n/g, '\\n')}
item.ORG:${isi}
item1.TEL;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}
item1.X-ABLabel:${isi1}
item2.EMAIL;type=INTERNET:${isi2}
item2.X-ABLabel:📧 Email
item3.ADR:;;${isi3};;;;
item3.X-ABADR:ac
item3.X-ABLabel:📍 Region
item4.URL:${isi4}
item4.X-ABLabel:Website
item5.X-ABLabel:${isi5}
END:VCARD`.trim();
                    contacts.push({ vcard, displayName: name });
                }
                return await sock.sendMessage(jid, {
                    contacts: {
                        displayName: (contacts.length > 1 ? `2013 kontak` : contacts[0].displayName) || null,
                        contacts,
                    }
                },
                    {
                        quoted,
                        ...options
                    });
            }
        },
        resize: {
            async value(image, width, height) {
                const { read, MIME_JPEG, AUTO } = await import('jimp');
                let oyy = await read(image);
                let kiyomasa = await oyy.resize(width, height).getBufferAsync(MIME_JPEG);
                return kiyomasa;
            }
        },
        reply: {
            value(jid, text = '', quoted, options) {
                return Buffer.isBuffer(text) ? sock.sendFile(jid, text, 'file', '', quoted, false, options) : sock.sendMessage(jid, {
                    ...options,
                    text,
                    mentions: sock.parseMention(text),
                    ...options
                }, {
                    quoted,
                    ...options
                });
            }
        },
        sendMedia: {
            async value(jid, path, quoted, options = {}) {
                let { ext, mime, data } = await sock.getFile(path);
                let messageType = mime.split("/")[0];
                let pase = messageType.replace('application', 'document') || messageType;
                return await sock.sendMessage(jid, { [`${pase}`]: data, mimetype: mime, ...options }, { quoted });
            }
        },
        updateProfileStatus: {
            async value(status) {
                return await sock.query({
                    tag: 'iq',
                    attrs: {
                        to: 's.whatsapp.net',
                        type: 'set',
                        xmlns: 'status',
                    },
                    content: [
                        {
                            tag: 'status',
                            attrs: {},
                            content: Buffer.from(status, 'utf-8')
                        }
                    ]
                });
            }
        },
        sendButton: {
            async value(jid, text = '', footer = '', buffer, buttons, quoted, options) {
                let type;
                if (Array.isArray(buffer)) (options = quoted, quoted = buttons, buttons = buffer, buffer = null);
                else if (buffer) try { (type = await sock.getFile(buffer), buffer = type.data); } catch { buffer = null; }
                if (!Array.isArray(buttons[0]) && typeof buttons[0] === 'string') buttons = [buttons];
                if (!options) options = {};
                let message = {
                    ...options,
                    [buffer ? 'caption' : 'text']: text || '',
                    footer,
                    buttons: buttons.map(btn => ({
                        buttonId: !nullish(btn[1]) && btn[1] || !nullish(btn[0]) && btn[0] || '',
                        buttonText: {
                            displayText: !nullish(btn[0]) && btn[0] || !nullish(btn[1]) && btn[1] || ''
                        }
                    })),
                    ...(buffer ?
                        options.asLocation && /image/.test(type.mime) ? {
                            location: {
                                ...options,
                                jpegThumbnail: buffer
                            }
                        } : {
                            [/video/.test(type.mime) ? 'video' : /image/.test(type.mime) ? 'image' : 'document']: buffer
                        } : {})
                };

                return await sock.sendMessage(jid, message, {
                    quoted,
                    upload: sock.waUploadToServer,
                    ...options
                });
            },
            enumerable: true
        },
        sendPayment: {
            async value(jid, amount, currency, text = '', from, image, options) {
                let file = await sock.resize(image, 300, 150);
                let a = ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BOV", "BRL", "BSD", "BTN", "BWP", "BYR", "BZD", "CAD", "CDF", "CHE", "CHF", "CHW", "CLF", "CLP", "CNY", "COP", "COU", "CRC", "CUC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF", "IDR", "ILS", "INR", "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LTL", "LVL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRO", "MUR", "MVR", "MWK", "MXN", "MXV", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLL", "SOS", "SRD", "SSP", "STD", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "USN", "USS", "UYI", "UYU", "UZS", "VEF", "VND", "VUV", "WST", "XAF", "XAG", "XAU", "XBA", "XBB", "XBC", "XBD", "XCD", "XDR", "XFU", "XOF", "XPD", "XPF", "XPT", "XTS", "XXX", "YER", "ZAR", "ZMW"];
                let b = a[Math.floor(Math.random() * a.length)];
                const requestPaymentMessage = {
                    amount: {
                        currencyCode: currency || b,
                        offset: 0,
                        value: amount || 9.99
                    },
                    expiryTimestamp: 0,
                    amount1000: (amount || 9.99) * 1000,
                    currencyCodeIso4217: currency || b,
                    requestFrom: from || '0@s.whatsapp.net',
                    noteMessage: {
                        extendedTextMessage: {
                            text: text || 'Example Payment Message'
                        }
                    },
                    background: !!image ? file : undefined
                };
                return await sock.relayMessage(jid, { requestPaymentMessage }, { ...options });
            }
        },
        sendPoll: {
            async value(jid, name = '', optiPoll, options) {
                if (!Array.isArray(optiPoll[0]) && typeof optiPoll[0] === 'string') optiPoll = [optiPoll];
                if (!options) options = {};
                const pollMessage = {
                    name: name,
                    options: optiPoll.map(btn => ({
                        optionName: !nullish(btn[0]) && btn[0] || ''
                    })),
                    selectableOptionsCount: 1
                };
                return sock.relayMessage(jid, { pollCreationMessage: pollMessage }, { ...options });
            }
        },
        downloadAndSaveMediaMessage: {
            async value(message, filename, attachExtension = true) {
                let quoted = message.msg ? message.msg : message;
                let mime = (message.msg || message).mimetype || '';
                let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
                const stream = await downloadContentFromMessage(quoted, messageType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                let type = await fileTypeFromBuffer(buffer);
                let trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
                await fs.writeFileSync(trueFileName, buffer);
                return trueFileName;
            }
        },
        sendHydrated: {
            async value(jid, text = '', footer = '', buffer, url, urlText, call, callText, buttons, quoted, options) {
                let type;
                if (buffer) try { (type = await sock.getFile(buffer), buffer = type.data); } catch { buffer = buffer; }
                if (buffer && !Buffer.isBuffer(buffer) && (typeof buffer === 'string' || Array.isArray(buffer))) (options = quoted, quoted = buttons, buttons = callText, callText = call, call = urlText, urlText = url, url = buffer, buffer = null);
                if (!options) options = {};
                let templateButtons = [];
                if (url || urlText) {
                    if (!Array.isArray(url)) url = [url];
                    if (!Array.isArray(urlText)) urlText = [urlText];
                    templateButtons.push(...(
                        url.map((v, i) => [v, urlText[i]])
                            .map(([url, urlText], i) => ({
                                index: templateButtons.length + i + 1,
                                urlButton: {
                                    displayText: !nullish(urlText) && urlText || !nullish(url) && url || '',
                                    url: !nullish(url) && url || !nullish(urlText) && urlText || ''
                                }
                            })) || []
                    ));
                }
                if (call || callText) {
                    if (!Array.isArray(call)) call = [call];
                    if (!Array.isArray(callText)) callText = [callText];
                    templateButtons.push(...(
                        call.map((v, i) => [v, callText[i]])
                            .map(([call, callText], i) => ({
                                index: templateButtons.length + i + 1,
                                callButton: {
                                    displayText: !nullish(callText) && callText || !nullish(call) && call || '',
                                    phoneNumber: !nullish(call) && call || !nullish(callText) && callText || ''
                                }
                            })) || []
                    ));
                }
                if (buttons.length) {
                    if (!Array.isArray(buttons[0])) buttons = [buttons];
                    templateButtons.push(...(
                        buttons.map(([text, id], index) => ({
                            index: templateButtons.length + index + 1,
                            quickReplyButton: {
                                displayText: !nullish(text) && text || !nullish(id) && id || '',
                                id: !nullish(id) && id || !nullish(text) && text || ''
                            }
                        })) || []
                    ));
                }
                let message = {
                    ...options,
                    [buffer ? 'caption' : 'text']: text || '',
                    footer,
                    templateButtons,
                    ...(buffer ?
                        options.asLocation && /image/.test(type.mime) ? {
                            location: {
                                ...options,
                                jpegThumbnail: buffer
                            }
                        } : {
                            [/video/.test(type.mime) ? 'video' : /image/.test(type.mime) ? 'image' : 'document']: buffer
                        } : {})
                };
                return await sock.sendMessage(jid, message, {
                    quoted,
                    upload: sock.waUploadToServer,
                    ...options
                });
            },
            enumerable: true
        },
        sendHydrated2: {
            async value(jid, text = '', footer = '', buffer, url, urlText, url2, urlText2, buttons, quoted, options) {
                let type;
                if (buffer) try { (type = await sock.getFile(buffer), buffer = type.data); } catch { buffer = buffer; }
                if (buffer && !Buffer.isBuffer(buffer) && (typeof buffer === 'string' || Array.isArray(buffer))) (options = quoted, quoted = buttons, buttons = callText, callText = call, call = urlText, urlText = url, url = buffer, buffer = null);
                if (!options) options = {};
                let templateButtons = [];
                if (url || urlText) {
                    if (!Array.isArray(url)) url = [url];
                    if (!Array.isArray(urlText)) urlText = [urlText];
                    templateButtons.push(...(
                        url.map((v, i) => [v, urlText[i]])
                            .map(([url, urlText], i) => ({
                                index: templateButtons.length + i + 1,
                                urlButton: {
                                    displayText: !nullish(urlText) && urlText || !nullish(url) && url || '',
                                    url: !nullish(url) && url || !nullish(urlText) && urlText || ''
                                }
                            })) || []
                    ));
                }
                if (url2 || urlText2) {
                    if (!Array.isArray(url2)) url2 = [url2];
                    if (!Array.isArray(urlText2)) urlText2 = [urlText2];
                    templateButtons.push(...(
                        url2.map((v, i) => [v, urlText2[i]])
                            .map(([url2, urlText2], i) => ({
                                index: templateButtons.length + i + 1,
                                urlButton: {
                                    displayText: !nullish(urlText2) && urlText2 || !nullish(url2) && url2 || '',
                                    url: !nullish(url2) && url2 || !nullish(urlText2) && urlText2 || ''
                                }
                            })) || []
                    ));
                }
                if (buttons.length) {
                    if (!Array.isArray(buttons[0])) buttons = [buttons];
                    templateButtons.push(...(
                        buttons.map(([text, id], index) => ({
                            index: templateButtons.length + index + 1,
                            quickReplyButton: {
                                displayText: !nullish(text) && text || !nullish(id) && id || '',
                                id: !nullish(id) && id || !nullish(text) && text || ''
                            }
                        })) || []
                    ));
                }
                let message = {
                    ...options,
                    [buffer ? 'caption' : 'text']: text || '',
                    footer,
                    templateButtons,
                    ...(buffer ?
                        options.asLocation && /image/.test(type.mime) ? {
                            location: {
                                ...options,
                                jpegThumbnail: buffer
                            }
                        } : {
                            [/video/.test(type.mime) ? 'video' : /image/.test(type.mime) ? 'image' : 'document']: buffer
                        } : {})
                };
                return await sock.sendMessage(jid, message, {
                    quoted,
                    upload: sock.waUploadToServer,
                    ...options
                });
            },
            enumerable: true
        },
        msToDate: {
            async value(ms) {
                let days = Math.floor(ms / (24 * 60 * 60 * 1000));
                let daysms = ms % (24 * 60 * 60 * 1000);
                let hours = Math.floor((daysms) / (60 * 60 * 1000));
                let hoursms = ms % (60 * 1000);
                let minutes = Math.floor((hoursms) / (60 * 1000));
                let minutesms = ms % (60 * 1000);
                let sec = Math.floor((minutesms) / (1000));
                return days + " Hari " + hours + " Jam " + minutes + " Menit";
            }
        },
        delay: {
            async value(ms) {
                return new Promise((resolve, reject) => setTimeout(resolve, ms));
            }
        },
        cMod: {
            value(jid, message, text = '', sender = sock.user.jid, options = {}) {
                if (options.mentions && !Array.isArray(options.mentions)) options.mentions = [options.mentions];
                let copy = message.toJSON();
                delete copy.message.messageContextInfo;
                delete copy.message.senderKeyDistributionMessage;
                let mtype = Object.keys(copy.message)[0];
                let msg = copy.message;
                let content = msg[mtype];
                if (typeof content === 'string') msg[mtype] = text || content;
                else if (content.caption) content.caption = text || content.caption;
                else if (content.text) content.text = text || content.text;
                if (typeof content !== 'string') {
                    msg[mtype] = { ...content, ...options };
                    msg[mtype].contextInfo = {
                        ...(content.contextInfo || {}),
                        mentionedJid: options.mentions || content.contextInfo?.mentionedJid || []
                    };
                }
                if (copy.participant) sender = copy.participant = sender || copy.participant;
                else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
                if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid;
                else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid;
                copy.key.remoteJid = jid;
                copy.key.fromMe = areJidsSameUser(sender, sock.user.id) || false;
                return proto.WebMessageInfo.fromObject(copy);
            },
            enumerable: true
        },
        copyNForward: {
            async value(jid, message, forwardingScore = true, options = {}) {
                let vtype;
                if (options.readViewOnce && message.message.viewOnceMessage?.message) {
                    vtype = Object.keys(message.message.viewOnceMessage.message)[0];
                    delete message.message.viewOnceMessage.message[vtype].viewOnce;
                    message.message = proto.Message.fromObject(
                        JSON.parse(JSON.stringify(message.message.viewOnceMessage.message))
                    );
                    message.message[vtype].contextInfo = message.message.viewOnceMessage.contextInfo;
                }
                let mtype = Object.keys(message.message)[0];
                let m = generateForwardMessageContent(message, !!forwardingScore);
                let ctype = Object.keys(m)[0];
                if (forwardingScore && typeof forwardingScore === 'number' && forwardingScore > 1) m[ctype].contextInfo.forwardingScore += forwardingScore;
                m[ctype].contextInfo = {
                    ...(message.message[mtype].contextInfo || {}),
                    ...(m[ctype].contextInfo || {})
                };
                m = generateWAMessageFromContent(jid, m, {
                    ...options,
                    userJid: sock.user.jid
                });
                await sock.relayMessage(jid, m.message, { messageId: m.key.id, additionalAttributes: { ...options } });
                return m;
            },
            enumerable: true
        },
        fakeReply: {
            value(jid, text = '', fakeJid = sock.user.jid, fakeText = '', fakeGroupJid, options) {
                return sock.reply(jid, text, { key: { fromMe: areJidsSameUser(fakeJid, sock.user.id), participant: fakeJid, ...(fakeGroupJid ? { remoteJid: fakeGroupJid } : {}) }, message: { conversation: fakeText }, ...options });
            }
        },
        downloadM: {
            async value(m, type, saveToFile) {
                let filename;
                if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);
                const stream = await downloadContentFromMessage(m, type);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                if (saveToFile) ({ filename } = await sock.getFile(buffer, true));
                return saveToFile && fs.existsSync(filename) ? filename : buffer;
            },
            enumerable: true
        },
        parseMention: {
            value(text = '') {
                const regex = /@([0-9]{5,16}|0)/g;
                const mentions = [];
                let match;

                while ((match = regex.exec(text)) !== null) {
                    mentions.push(match[1] + '@s.whatsapp.net');
                }

                return mentions;
            },
            enumerable: true
        },
        saveName: {
            async value(id, name = '') {
                if (!id) return;
                id = sock.decodeJid(id);
                let isGroup = id.endsWith('@g.us');
                if (id in sock.contacts && sock.contacts[id][isGroup ? 'subject' : 'name'] && id in sock.chats) return;
                let metadata = {};
                if (isGroup) metadata = await sock.groupMetadata(id);
                let chat = { ...(sock.contacts[id] || {}), id, ...(isGroup ? { subject: metadata.subject, desc: metadata.desc } : { name }) };
                sock.contacts[id] = chat;
                sock.chats[id] = chat;
            }
        },
        getName: {
            value(jid = '', withoutContact = false) {
                jid = sock.decodeJid(jid);
                withoutContact = sock.withoutContact || withoutContact;
                let v;
                if (jid.endsWith('@g.us')) return new Promise(async (resolve) => {
                    v = sock.chats[jid] || {};
                    if (!(v.name || v.subject)) v = await sock.groupMetadata(jid) || {};
                    resolve(v.name || v.subject || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international'));
                });
                else v = jid === '0@s.whatsapp.net' ? {
                    jid,
                    vname: 'WhatsApp'
                } : areJidsSameUser(jid, sock.user.id) ?
                    sock.user :
                    (sock.chats[jid] || {});
                return (withoutContact ? '' : v.name) || v.subject || v.vname || v.notify || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
            },
            enumerable: true
        },
        loadMessage: {
            value(messageID) {
                return Object.entries(sock.chats)
                    .filter(([_, { messages }]) => typeof messages === 'object')
                    .find(([_, { messages }]) => Object.entries(messages)
                        .find(([k, v]) => (k === messageID || v.key?.id === messageID)))
                    ?.[1].messages?.[messageID];
            },
            enumerable: true
        },
        sendGroupV4Invite: {
            async value(jid, participant, inviteCode, inviteExpiration, groupName = 'unknown subject', caption = 'Invitation to join my WhatsApp group', jpegThumbnail, options = {}) {
                const msg = proto.Message.fromObject({
                    groupInviteMessage: proto.GroupInviteMessage.fromObject({
                        inviteCode,
                        inviteExpiration: parseInt(inviteExpiration) || + new Date(new Date + (3 * 86400000)),
                        groupJid: jid,
                        groupName: (groupName ? groupName : await sock.getName(jid)) || null,
                        jpegThumbnail: Buffer.isBuffer(jpegThumbnail) ? jpegThumbnail : null,
                        caption
                    })
                });
                const message = generateWAMessageFromContent(participant, msg, options);
                await sock.relayMessage(participant, message.message, { messageId: message.key.id, additionalAttributes: { ...options } });
                return message;
            },
            enumerable: true
        },
        processMessageStubType: {
            async value(m) {
                if (!m.messageStubType) return;
                const chat = sock.decodeJid(m.key.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || '');
                if (!chat || chat === 'status@broadcast') return;
                const emitGroupUpdate = (update) => {
                    sock.ev.emit('groups.update', [{ id: chat, ...update }]);
                };
                switch (m.messageStubType) {
                    case WAMessageStubType.REVOKE:
                    case WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
                        emitGroupUpdate({ revoke: m.messageStubParameters[0] });
                        break;
                    case WAMessageStubType.GROUP_CHANGE_ICON:
                        emitGroupUpdate({ icon: m.messageStubParameters[0] });
                        break;
                    default: {
                        console.log({
                            messageStubType: m.messageStubType,
                            messageStubParameters: m.messageStubParameters,
                            type: WAMessageStubType[m.messageStubType]
                        });
                        break;
                    }
                }
                const isGroup = chat.endsWith('@g.us');
                if (!isGroup) return;
                let chats = sock.chats[chat];
                if (!chats) chats = sock.chats[chat] = { id: chat };
                chats.isChats = true;
                const metadata = await sock.groupMetadata(chat).catch(_ => null);
                if (!metadata) return;
                chats.subject = metadata.subject;
                chats.metadata = metadata;
            }
        },
        relayWAMessage: {
            async value(pesanfull) {
                if (pesanfull.message.audioMessage) {
                    await sock.sendPresenceUpdate('recording', pesanfull.key.remoteJid);
                } else {
                    await sock.sendPresenceUpdate('composing', pesanfull.key.remoteJid);
                }
                var mekirim = await sock.relayMessage(pesanfull.key.remoteJid, pesanfull.message, { messageId: pesanfull.key.id });
                sock.ev.emit('messages.upsert', { messages: [pesanfull], type: 'append' });
                return mekirim;
            }
        },
        insertAllGroup: {
            async value() {
                const groups = await sock.groupFetchAllParticipating().catch(_ => null) || {};
                for (const group in groups) sock.chats[group] = { ...(sock.chats[group] || {}), id: group, subject: groups[group].subject, isChats: true, metadata: groups[group] };
                return sock.chats;
            },
        },
        pushMessage: {
            async value(m) {
                if (!m) return;
                if (!Array.isArray(m)) m = [m];
                for (const message of m) {
                    try {
                        if (!message) continue;
                        if (message.messageStubType && message.messageStubType != WAMessageStubType.CIPHERTEXT) sock.processMessageStubType(message).catch(console.error);
                        const _mtype = Object.keys(message.message || {});
                        const mtype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(_mtype[0]) && _mtype[0]) ||
                            (_mtype.length >= 3 && _mtype[1] !== 'messageContextInfo' && _mtype[1]) ||
                            _mtype[_mtype.length - 1];
                        const chat = sock.decodeJid(message.key.remoteJid || message.message?.senderKeyDistributionMessage?.groupId || '');
                        if (message.message?.[mtype]?.contextInfo?.quotedMessage) {
                            let context = message.message[mtype].contextInfo;
                            let participant = sock.decodeJid(context.participant);
                            const remoteJid = sock.decodeJid(context.remoteJid || participant);
                            let quoted = message.message[mtype].contextInfo.quotedMessage;
                            if ((remoteJid && remoteJid !== 'status@broadcast') && quoted) {
                                let qMtype = Object.keys(quoted)[0];
                                if (qMtype == 'conversation') {
                                    quoted.extendedTextMessage = { text: quoted[qMtype] };
                                    delete quoted.conversation;
                                    qMtype = 'extendedTextMessage';
                                }
                                if (!quoted[qMtype].contextInfo) quoted[qMtype].contextInfo = {};
                                quoted[qMtype].contextInfo.mentionedJid = context.mentionedJid || quoted[qMtype].contextInfo.mentionedJid || [];
                                const isGroup = remoteJid.endsWith('g.us');
                                if (isGroup && !participant) participant = remoteJid;
                                const qM = {
                                    key: {
                                        remoteJid,
                                        fromMe: areJidsSameUser(sock.user.jid, remoteJid),
                                        id: context.stanzaId,
                                        participant,
                                    },
                                    message: JSON.parse(JSON.stringify(quoted)),
                                    ...(isGroup ? { participant } : {})
                                };
                                let qChats = sock.chats[participant];
                                if (!qChats) qChats = sock.chats[participant] = { id: participant, isChats: !isGroup };
                                if (!qChats.messages) qChats.messages = {};
                                if (!qChats.messages[context.stanzaId] && !qM.key.fromMe) qChats.messages[context.stanzaId] = qM;
                                let qChatsMessages;
                                if ((qChatsMessages = Object.entries(qChats.messages)).length > 40) qChats.messages = Object.fromEntries(qChatsMessages.slice(30, qChatsMessages.length));
                            }
                        }
                        if (!chat || chat === 'status@broadcast') continue;
                        const isGroup = chat.endsWith('@g.us');
                        let chats = sock.chats[chat];
                        if (!chats) {
                            if (isGroup) await sock.insertAllGroup().catch(console.error);
                            chats = sock.chats[chat] = { id: chat, isChats: true, ...(sock.chats[chat] || {}) };
                        }
                        let metadata, sender;
                        if (isGroup) {
                            if (!chats.subject || !chats.metadata) {
                                metadata = await sock.groupMetadata(chat).catch(_ => ({})) || {};
                                if (!chats.subject) chats.subject = metadata.subject || '';
                                if (!chats.metadata) chats.metadata = metadata;
                            }
                            sender = sock.decodeJid(message.key?.fromMe && sock.user.id || message.participant || message.key?.participant || chat || '');
                            if (sender !== chat) {
                                let chats = sock.chats[sender];
                                if (!chats) chats = sock.chats[sender] = { id: sender };
                                if (!chats.name) chats.name = message.pushName || chats.name || '';
                            }
                        } else if (!chats.name) chats.name = message.pushName || chats.name || '';
                        if (['senderKeyDistributionMessage', 'messageContextInfo'].includes(mtype)) continue;
                        chats.isChats = true;
                        if (!chats.messages) chats.messages = {};
                        const fromMe = message.key.fromMe || areJidsSameUser(sender || chat, sock.user.id);
                        if (!['protocolMessage'].includes(mtype) && !fromMe && message.messageStubType != WAMessageStubType.CIPHERTEXT && message.message) {
                            delete message.message.messageContextInfo;
                            delete message.message.senderKeyDistributionMessage;
                            chats.messages[message.key.id] = JSON.parse(JSON.stringify(message, null, 2));
                            let chatsMessages;
                            if ((chatsMessages = Object.entries(chats.messages)).length > 40) chats.messages = Object.fromEntries(chatsMessages.slice(30, chatsMessages.length));
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        },
        setBio: {
            async value(status) {
                return await sock.query({
                    tag: 'iq',
                    attrs: {
                        to: 's.whatsapp.net',
                        type: 'set',
                        xmlns: 'status',
                    },
                    content: [
                        {
                            tag: 'status',
                            attrs: {},
                            content: Buffer.from(status, 'utf-8')
                        }
                    ]
                });
            }
        },
        serializeM: {
            value(m) {
                return smsg(sock, m);
            }
        },
        updateProfilePicture: {
            async value(jid, content) {
                const { img } = await generateProfilePicture(content);
                return sock.query({
                    tag: 'iq',
                    attrs: { to: jidNormalizedUser(jid), type: 'set', xmlns: 'w:profile:picture' },
                    content: [{ tag: 'picture', attrs: { type: 'image' }, content: img }]
                });
            },
            enumerable: true
        },
        ...(typeof sock.chatRead !== 'function' ? {
            chatRead: {
                value(jid, participant = sock.user.jid, messageID) {
                    return sock.sendReadReceipt(jid, participant, [messageID]);
                },
                enumerable: true
            }
        } : {}),
        ...(typeof sock.setStatus !== 'function' ? {
            setStatus: {
                value(status) {
                    return sock.query({
                        tag: 'iq',
                        attrs: {
                            to: 's.whatsapp.net',
                            type: 'set',
                            xmlns: 'status',
                        },
                        content: [
                            {
                                tag: 'status',
                                attrs: {},
                                content: Buffer.from(status, 'utf-8')
                            }
                        ]
                    });
                },
                enumerable: true
            }
        } : {}),

        // --- Fungsi dari function.js ---
        sendFakeAdMessage: {
            async value(jid, content, quoted) {
                const thumbnailPath = path.join(process.cwd(), 'storage', 'images', 'fake.jpg');
                let thumbnail;
                try {
                    thumbnail = fs.readFileSync(thumbnailPath);
                } catch (error) {
                    console.error("Gagal membaca thumbnail:", error);
                    thumbnail = Buffer.from([]);
                }

                const contextInfo = {
                    externalAdReply: {
                        title: "Alya Roshidere",
                        body: "Bot WhatsApp JavaScript",
                        mediaType: 1,
                        thumbnail: thumbnail,
                        renderLargerThumbnail: false,
                        showAdAttribution: false,
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
                        console.error("Tipe konten tidak valid:", content);
                    }
                } catch (error) {
                    console.error("Gagal mengirim pesan iklan palsu:", error);
                }
            },
            enumerable: true
        },
        reactWithRandomEmoji: {
            async value(jid, key) {
                const emojis = [
                    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '🤤', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨'
                ];
                const getRandomEmoji = () => emojis[Math.floor(Math.random() * emojis.length)];

                try {
                    const emoji = getRandomEmoji();
                    await sock.sendMessage(jid, {
                        react: {
                            text: emoji,
                            key: key
                        }
                    });
                    console.log(`✅ Bereaksi dengan ${emoji} pada pesan ${key.id}`);
                } catch (error) {
                    console.error("Gagal bereaksi dengan emoji:", error);
                }
            },
            enumerable: true
        }
    });

    if (extendedSock.user?.id) extendedSock.user.jid = extendedSock.decodeJid(extendedSock.user.id);
    return extendedSock;
}

