import axios from 'axios';
import youtubedl from 'youtube-dl-exec';
import ytsr from 'ytsr';
import fs from 'fs-extra';
import path from 'path';

async function getVideoMetadata(title) {
  const tempPath = path.join(__dirname, 'temp');
  await fs.ensureDir(tempPath);

  try {
    const filters = await ytsr.getFilters(title);
    const videoFilter = filters.get('Type').get('Video');
    const results = await ytsr(videoFilter.url, {
      limit: 1,
      gl: 'US',
      hl: 'en'
    });

    if (!results.items.length) return null;
    const video = results.items[0];

    const videoID = video.id.split('?v=')[1] || video.id;
    return {
      title: video.title,
      artist: video.author?.name || 'Unknown Artist',
      thumbnail: `https://i.ytimg.com/vi/${videoID}/maxresdefault.jpg`,
      views: video.views?.toLocaleString() || 'N/A',
      duration: video.duration || 'N/A',
      url: video.url,
      id: videoID
    };

  } catch (error) {
    console.error('Metadata error:', error);
    return null;
  }
}

async function downloadAudio(videoUrl) {
  const tempPath = path.join(__dirname, 'temp');
  try {
    const sanitizedTitle = videoUrl.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50);
    const audioPath = path.join(tempPath, `${sanitizedTitle}.mp3`);

    await youtubedl(videoUrl, {
      output: audioPath,
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      noWarnings: true,
      forceOverwrites: true
    });

    return {
      path: audioPath,
      size: (await fs.stat(audioPath)).size 
    };

  } catch (error) {
    await fs.remove(tempPath).catch(() => {});
    return null;
  }
}

export default {
  handle: async (sock, msg) => {
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
    const commandMatch = text.match(/^!?play\s+(.+)/i);

    if (commandMatch) {
      const query = commandMatch[1].trim();
      
      try {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '🔍 Searching for: ' + query
        }, { quoted: msg });

        const metadata = await getVideoMetadata(query);
        if (!metadata) {
          return await sock.sendMessage(msg.key.remoteJid, 
            { text: '❌ Song not found!' }, 
            { quoted: msg });
        }

        let thumbnailBuffer;
        try {
          const response = await axios.get(metadata.thumbnail, {
            responseType: 'arraybuffer',
            timeout: 5000
          });
          thumbnailBuffer = Buffer.from(response.data);
        } catch {
          const fallbackResponse = await axios.get(
            `https://i.ytimg.com/vi/${metadata.id}/hqdefault.jpg`,
            { responseType: 'arraybuffer' }
          );
          thumbnailBuffer = Buffer.from(fallbackResponse.data);
        }

        const audio = await downloadAudio(metadata.url);
        if (!audio) {
          return await sock.sendMessage(msg.key.remoteJid, 
            { text: '❌ Failed to download audio!' }, 
            { quoted: msg });
        }

        await sock.sendMessage(msg.key.remoteJid, {
          document: { url: audio.path },
          mimetype: 'audio/mpeg',
          fileName: `${metadata.title}.mp3`,
          caption: `🎵 *${metadata.title}*\n🖋 *${metadata.artist}*\n⏱ *${metadata.duration}*\n👀 *${metadata.views}*`,
          thumbnail: thumbnailBuffer
        }, { quoted: msg });

      } catch (error) {
        console.error('Play error:', error);
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ Failed to process play request'
        }, { quoted: msg });
      }
    }
  }
};
