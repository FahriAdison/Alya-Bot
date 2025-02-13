import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.101 Mobile Safari/537.36';

async function getTikTokVideo(url) {
  try {
    const expandedUrl = new URL(url);

    const tikwmUrl = `https://www.tikwm.com/api/?url=${expandedUrl}?hd=1`;
    const response = await axios.get(tikwmUrl, {
      headers: {
        'User-Agent': MOBILE_UA
      }
    });

    const data = response.data;

    console.log(JSON.stringify(data, null, 2));  // ***ADD THIS LINE FOR DEBUGGING (REMOVE LATER!)***

    if (data && data.code === 0 && data.data) {  // Use data.code instead of data.status
      return {
        url: data.data.play,
        caption: data.data.title || 'TikTok Video',
        thumbnail: data.data.cover
      };
    } else {
      throw new Error(`tikwm API Error: ${data.msg || 'Unknown error'}`); // More informative error
    }

  } catch (error) {
    console.error('Error fetching video data from tikwm:', error);
    return null;
  }
}

async function downloadVideo(url, outputPath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const headResponse = await axios.head(url, {
        headers: {
          'User-Agent': MOBILE_UA
        }
      });

      const contentLength = parseInt(headResponse.headers['content-length'], 10);

      console.log(`Content-Length: ${contentLength} bytes`);

      if (isNaN(contentLength) || contentLength < 50 * 1024) {
        throw new Error(`Invalid Content-Length: ${contentLength}`);
      }

      const response = await axios({
        url: url,
        responseType: 'stream',
        headers: {
          'User-Agent': MOBILE_UA
        }
      });

      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      return;
    } catch (error) {
      console.error(`Download failed (attempt ${i + 1}):`, error);
      if (i === retries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

export default {
  handle: async (sock, msg) => {
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
    const commandMatch = text.match(/^tiktok\s+(https?:\/\/\S+)/i);

    if (commandMatch) {
      const tiktokUrl = commandMatch[1];

      try {
        await sock.sendMessage(msg.key.remoteJid, { text: '🔍 Fetching TikTok video...' }, { quoted: msg });

        const videoData = await getTikTokVideo(tiktokUrl);

        if (!videoData) {
          throw new Error('Failed to get TikTok video data');
        }

        const tempDir = path.join(__dirname, 'temp');
        await fs.ensureDir(tempDir);
        const videoPath = path.join(tempDir, `tiktok_video_${Date.now()}.mp4`);

        await downloadVideo(videoData.url, videoPath);

        await sock.sendMessage(msg.key.remoteJid, {
          document: { url: videoPath },
          mimetype: 'video/mp4',
          fileName: `TikTok_${Date.now()}.mp4`,
          caption: videoData.caption,
          thumbnail: videoData.thumbnail
        }, { quoted: msg });

      } catch (error) {
        console.error('TikTok error:', error);
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ Failed to fetch TikTok video'
        }, { quoted: msg });
      }
    }
  }
};