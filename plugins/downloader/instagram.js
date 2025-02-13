import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

async function getInstagramVideo(url) {
  try {
    const match = url.match(/instagram\.com\/(?:p|reel|reels)\/([^/?]+)/i);
    if (!match) throw new Error('Invalid Instagram URL');
    const shortcode = match[1];

    const baseUrl = url.split('?')[0];
    const fetchUrl = `${baseUrl}?__a=1&__d=dis`;

    const response = await axios.get(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                      'Chrome/114.0.0.0 Safari/537.36'
      }
    });

    const media = response.data.graphql?.shortcode_media;
    if (!media) throw new Error('No media found in response');
    if (!media.is_video) throw new Error('Media is not a video');

    return {
      url: media.video_url,
      thumbnail: media.display_url,
      caption: media.edge_media_to_caption?.edges[0]?.node?.text || 'No caption'
    };
  } catch (error) {
    console.error('Instagram Download Error:', error);
    return null;
  }
}

export default {
  handle: async (sock, msg) => {
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
    const commandMatch = text.match(/^ig\s+(https?:\/\/www\.instagram\.com\/\S+)/i);

    if (commandMatch) {
      const igUrl = commandMatch[1];
      
      try {
        await sock.sendMessage(msg.key.remoteJid, 
          { text: '🔍 Fetching Instagram video...' }, 
          { quoted: msg }
        );

        const videoData = await getInstagramVideo(igUrl);
        if (!videoData) throw new Error('Failed to fetch video');

        const tempPath = path.join(__dirname, 'temp');
        await fs.ensureDir(tempPath);
        const videoPath = path.join(tempPath, `ig_video_${Date.now()}.mp4`);

        const response = await axios({
          url: videoData.url,
          responseType: 'stream'
        });
        const writer = fs.createWriteStream(videoPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        let thumbnailBuffer = null;
        if (videoData.thumbnail) {
          const thumbResponse = await axios.get(videoData.thumbnail, { responseType: 'arraybuffer' });
          thumbnailBuffer = Buffer.from(thumbResponse.data);
        }

        await sock.sendMessage(msg.key.remoteJid, {
          document: { url: videoPath },
          mimetype: 'video/mp4',
          fileName: `Instagram_${Date.now()}.mp4`,
          caption: videoData.caption,
          thumbnail: thumbnailBuffer || undefined
        }, { quoted: msg });

      } catch (error) {
        console.error('Instagram error:', error);
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ Failed to fetch Instagram video'
        }, { quoted: msg });
      }
    }
  }
};