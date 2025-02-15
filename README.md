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
This project follows **Semantic Versioning (`v<major>.<minor>.<patch>`)**.

---

## **[v1.1.0] - 2024-02-16**
### ✨ New Features
- **Added support for Character AI & OpenAI chat integration**
- **Enhanced logging with `message-info.js`** for cleaner console output
- **Added RPG claim system & leaderboard**
- **Added multi-platform installation guide (Windows, macOS, Linux, Ubuntu, Termux, Pterodactyl)**

### 🐞 Bug Fixes
- **Fixed registration & unregistration issues**
- **Database (`database.json`) now correctly saves & loads user data**
- **Fixed `register` and `unregister` commands not responding in Termux**
- **Anti-spam system now properly blocks rapid messages**

### 🚀 Improvements
- **Optimized plugin loading in `index.js`**
- **Improved YouTube, Instagram & TikTok downloader stability**
- **Formatted console logs with colors & structured messages**
- **Replaced `console.log()` with `printMessageInfo()` from `message-info.js`**

---

## **[v1.0.0] - 2024-02-15**
### 🎉 Initial Release
- ✅ **WhatsApp AI Chat** (OpenAI & Character AI)
- ✅ **YouTube, TikTok, Instagram Video Downloader**
- ✅ **Basic Bot Commands (`ping`, `menu`, `help`)**
- ✅ **Group Management Tools (Anti-Spam, Auto-Replies)**
- ✅ **Owner Commands (`exec`, `eval`, etc.)**
- ✅ **Multi-Platform Support** (Windows, Linux, Termux, Ubuntu, macOS)

---

## **✨ Features**
- ✅ **WhatsApp AI Chat** (OpenAI & Character AI)  
- ✅ **YouTube, TikTok, Instagram Video Downloader**  
- ✅ **RPG Claim System & Leaderboard**  
- ✅ **Group Management Tools** (Anti-Spam, Auto-Replies)  
- ✅ **Owner Commands** (`exec`, `eval`, etc.)  
- ✅ Works on **Windows, macOS, Linux, Ubuntu, Termux, and Pterodactyl!**  

---

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
   git clone https://github.com/FahriAdison/Alya-Bot.git
   cd YOUR-REPO
   npm install

3. Start the bot:
   node index.js

4. Scan the QR code to link WhatsApp!
```

### **🍏 macOS Setup**
```bash
1. Install Node.js & Git:
   brew install node git

2. Clone the repository & install dependencies:
   git clone https://github.com/FahriAdison/Alya-Bot.git
   cd YOUR-REPO
   npm install

3. Run the bot:
   node index.js
```

### **🐧 Linux / Ubuntu Setup**
```bash
1. Update system & install Node.js, Git, FFmpeg:
   sudo apt update && sudo apt upgrade -y
   sudo apt install nodejs npm git ffmpeg -y

2. Clone the project & install dependencies:
   git clone https://github.com/FahriAdison/Alya-Bot.git
   cd YOUR-REPO
   npm install

3. Run the bot:
   node index.js
```

### **📱 Termux (Android) Setup**
```bash
1. Install Termux from F-Droid (Not Play Store)

2. Update packages & install dependencies:
   pkg update && pkg upgrade
   pkg install nodejs git ffmpeg -y

3. Clone and install the bot:
   git clone https://github.com/FahriAdison/Alya-Bot.git
   cd YOUR-REPO
   npm install

4. Start the bot:
   node index.js

5. Scan the QR code in WhatsApp Web.
```

### **📦 Pterodactyl Panel Setup**
```bash
1. Create a new server with Node.js 16+
2. Connect to the server & install dependencies:
   cd /home/container
   npm install

3. Run the bot:
   node index.js

4. Scan the QR code from the panel console.
```

---

## **🚀 Usage Guide**
### **📜 Commands**
- **Register:**  
  `register <your_name>`
- **Check Server Status:**  
  `ping`
- **Download YouTube Video:**  
  `play <song_name>`
- **Download TikTok Video:**  
  `tiktok <link>`
- **Claim Daily Bonus:**  
  `claim`
- **Check Leaderboard:**  
  `leaderboard`

---

## **🔧 Configuration**
Modify `config.js` to customize bot settings:
```javascript
export default {
  ownerNumber: '1234567890@s.whatsapp.net',
  botName: 'Alya-Bot',
  prefix: '!',
  sessionPath: 'auth_info_baileys'
};
```

---

## **🛠️ Troubleshooting**
- **Bot Doesn't Start?**  
  Ensure you have Node.js 16+ installed.

- **Delete `auth_info_baileys/` and restart:**  
  ```bash
  rm -rf auth_info_baileys
  node index.js
  ```

- **Session Expired?**  
  Run:
  ```bash
  rm -rf auth_info_baileys
  ```
  Restart and scan the QR code again.

---

## **📜 License**
This project is licensed under the **MIT License**.

---

## **💙 Credits**
- **Alya-Bot** by Papah-Chan Fahri  
- **Baileys Library** by @whiskeysockets  
- **Contributors:**  
  - Sad Teams  
  - Jhnspntx  
  - Willy  
  - And All The Users 😊  

---

<p align="center">
  💻 Developed with ❤️ by Papah-Chan Fahri 🚀
</p>

---
