const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const Canvas = require("canvas");
const fs = require("fs");
const sharp = require("sharp");

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./session_data" }),
  puppeteer: { headless: true },
});

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("✅ WhatsApp Bot is ready!"));

client.on("message", async (message) => {
  if (message.body.startsWith("!quote")) {
    if (!message.hasQuotedMsg) return message.reply("❌ *Please reply to a message with !quote*");
    
    const quotedMsg = await message.getQuotedMessage();
    const contact = await quotedMsg.getContact();
    const senderName = contact.pushname || contact.name || "Unknown";
    const text = quotedMsg.body;
    const profilePicUrl = await contact.getProfilePicUrl() || null;
    
    const imagePath = await generateQuoteImage(senderName, text, profilePicUrl);
    const stickerPath = await convertToSticker(imagePath);
    client.sendMessage(message.from, MessageMedia.fromFilePath(stickerPath), { sendMediaAsSticker: true });
  }
});

client.initialize();

async function generateQuoteImage(senderName, text, profilePicUrl) {
  const canvas = Canvas.createCanvas(512, 512);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (profilePicUrl) {
    try {
      const img = await Canvas.loadImage(profilePicUrl);
      ctx.beginPath();
      ctx.arc(60, 60, 40, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 20, 20, 80, 80);
    } catch (error) {
      console.log("⚠️ Error loading profile picture:", error);
    }
  }

  ctx.fillStyle = "#ffffff";
  ctx.roundRect(120, 30, 360, 140, 20);
  ctx.fill();

  ctx.fillStyle = "#F28C28";
  ctx.font = "bold 30px Arial";
  ctx.fillText(senderName, 140, 70);

  ctx.fillStyle = "#000000";
  ctx.font = "28px Arial";
  wrapText(ctx, text, 140, 110, 320, 35);

  const imagePath = "./quote.png";
  fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));
  return imagePath;
}

async function convertToSticker(imagePath) {
  const stickerPath = "./quote.webp";
  await sharp(imagePath).resize(512, 512).toFormat("webp").toFile(stickerPath, { lossless: true });
  return stickerPath;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let words = text.split(" ");
  let line = "";
  for (let i = 0; i < words.length; i++) {
    let testLine = line + words[i] + " ";
    if (ctx.measureText(testLine).width > maxWidth) {
      ctx.fillText(line, x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
