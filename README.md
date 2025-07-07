---

<p align="center">
  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSEZ68teEMBr3lzhdLiSdWeUGhIyw_kPycIVw&usqp=CAU" alt="Alya-Bot" width="100%">
</p>

<h1 align="center">🤖 Alya-Bot - WhatsApp Multi-Function Bot</h1>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-ESM-green?style=for-the-badge&logo=javascript" alt="JavaScript">
  <img src="https://img.shields.io/badge/Node.js-%3E=16.0-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/github/license/FahriAdison/Alya-Bot?style=for-the-badge" alt="License">
</p>

<p align="center">
  Alya-Bot is an advanced <strong>WhatsApp Multi-Function Bot</strong> built with <code>@whiskeysockets/baileys</code>. It supports <strong>YouTube/Instagram/TikTok downloads, AI chat, anti-spam, RPG claims, and more!</strong> 🚀
</p>

---

# 📜 Changelog - Alya-Bot

All notable changes to this project will be documented in this file.  

---

## **[v1.2.0] - 2025-07-08**
### ✨ New Features
- **Dukungan Multi-Owner**: Sekarang dapat mengkonfigurasi beberapa nomor owner di `config.js`.
- **Eksekusi Perintah Owner Gabungan**: Perintah `eval` (`=>`, `>`) dan `shell` (`$`) digabungkan ke dalam satu plugin `exec.js` untuk manajemen yang lebih mudah.
- **Output Perintah Owner Langsung**: Output dari perintah `eval` dan `shell` sekarang dikirim langsung sebagai teks di chat (tidak lagi sebagai file, kecuali jika sangat panjang).

### 🐞 Bug Fixes
- **Perbaikan Antispam Command**: Sistem antispam sekarang berfungsi dengan benar hanya untuk perintah bot, dengan pesan peringatan yang muncul saat spam terdeteksi.
- **Pesan Pendaftaran Akurat**: Pesan "Anda harus mendaftar" tidak lagi muncul untuk pesan non-perintah, hanya ketika pengguna yang belum terdaftar mencoba menggunakan perintah bot (selain `register`/`unregister`).
- **Perintah Case-Insensitive**: Semua perintah bot sekarang merespons tanpa mempedulikan huruf besar atau kecil (misal: `menu` atau `Menu` akan berfungsi).
- **Perbaikan Eksekusi JS Owner (`eval`)**: Memperbaiki masalah `SyntaxError: Identifier 'm' has already been declared` dan memastikan output yang benar (tidak lagi `undefined`) untuk ekspresi JavaScript.

### 🚀 Improvements
- **Deteksi Perintah Dinamis**: `index.js` sekarang secara otomatis mengumpulkan perintah dari setiap plugin, menghilangkan kebutuhan untuk pembaruan manual `commandTriggers`.
- **Peningkatan Logging Konsol**: Log pesan di konsol sekarang lebih rapi, berwarna, dan informatif dengan struktur yang lebih baik dan penggunaan emoji.

---

## **[v1.1.0] - 2025-02-16**
### ✨ New Features
- **Added support for Character AI & OpenAI chat integration**
- **Enhanced logging with `message-info.js`** for cleaner console output
- **Added RPG claim system & leaderboard**
- **Added multi-platform installation guide (Windows, macOS, Linux, Ubuntu, Termux, Pterodactyl)**

### 🐞 Bug Fixes
- **Fixed registration & unregistration issues**
- **Database (`database.json`) now correctly saves & loads user data**
- **Fixed `register` and `unregister` commands not responding**
- **Anti-spam system now properly blocks rapid messages**

### 🚀 Improvements
- **Optimized plugin loading in `index.js`**
- **Improved YouTube, Instagram & TikTok downloader stability**
- **Formatted console logs with colors & structured messages**
- **Replaced `console.log()` with `printMessageInfo()` from `message-info.js`**

---

## **[v1.0.0] - 2025-02-13**
### 🎉 Initial Release
- ✅ **WhatsApp AI Chat** (OpenAI & Character AI)
- ✅ **YouTube, TikTok, Instagram Video Downloader**
- ✅ **Basic Bot Commands (`ping`, `menu`, `help`)**
- ✅ **Group Management Tools (Anti-Spam, Auto-Replies)**
- ✅ **Owner Commands (`exec`, `eval`, etc.)**
- ✅ **Multi-Platform Support** (Windows, Linux, Termux, Ubuntu, macOS)

---

## **✨ Features**
- ✅ **Owner Commands** (`exec`, `eval`, etc.)  
- ✅ Works on **Windows, macOS, Linux, Ubuntu, Termux, and Pterodactyl!** ---

## **📦 Installation Guide**
Follow these steps to set up Alya-Bot on **any platform**.

### **🔹 Requirements**
- **Node.js** (`>=16.0`)
- **Git** (optional, for cloning)
- **FFmpeg** (for audio/video processing)

### **🖥️ Windows Setup**
```bash
1. Install [Node.js](https://nodejs.org/) & [Git](https://git-scm.com/downloads)
2. Open PowerShell or CMD and run:
   git clone [https://github.com/FahriAdison/Alya-Bot.git](https://github.com/FahriAdison/Alya-Bot.git)
   cd YOUR-REPO
   npm install

3. Start the bot:
   node index.js

4. Pairing Your Number To WhatsApp!
