const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join(__dirname, 'assets', 'images');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const prompt = "Festive celebration background, gradient from magenta and deep red at the top to bright orange at the bottom. Decorated with soft glowing lights, falling confetti, floating gold coins, and gift boxes around the edges. The center should remain relatively clean. Vibrant, joyful, suitable for a kids or family lottery event. High quality, smooth gradients, no text, no logos.";

const sizes = [
  { size: 'portrait_16_9', name: 'lottery-bg-mobile.webp' },
  { size: 'portrait_4_3', name: 'lottery-bg-tablet-portrait.webp' },
  { size: 'landscape_4_3', name: 'lottery-bg-tablet-landscape.webp' }
];

async function downloadImage(size, name) {
  const url = `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;
  const filePath = path.join(dir, name);
  
  return new Promise((resolve, reject) => {
    const request = https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (res2) => {
          if (res2.statusCode !== 200) {
            reject(new Error(`Failed to get '${res.headers.location}' (${res2.statusCode})`));
            return;
          }
          const file = fs.createWriteStream(filePath);
          res2.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(filePath, () => {});
          reject(err);
        });
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
        return;
      }
      
      const file = fs.createWriteStream(filePath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (const item of sizes) {
    console.log(`Downloading ${item.name}...`);
    await downloadImage(item.size, item.name);
  }
  console.log("Done.");
}

run();