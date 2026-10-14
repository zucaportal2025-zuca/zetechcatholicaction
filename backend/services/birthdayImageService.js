const cloudinary = require("cloudinary").v2;
const sharp = require("sharp");
const fetch = require("node-fetch");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function generateBirthdayImage(user) {
  try {
    if (!user.birthdayPhoto) {
      throw new Error("User has no birthday photo");
    }

    const response = await fetch(user.birthdayPhoto);
    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    // ✅ FIX: Use integer 338 instead of 337.5
    const blurred = await sharp(imageBuffer)
      .resize(1080, 338, { fit: "cover" })
      .blur(40)
      .toBuffer();

    const foreground = await sharp(imageBuffer)
      .resize(120, 120, { fit: "cover" })
      .toBuffer();

    const finalImage = await sharp(blurred)
      .composite([
        {
          input: foreground,
          gravity: "centre",
          blend: "over"
        }
      ])
      .toBuffer();

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "zuca/birthdays",
          public_id: `birthday_${user.id}_${Date.now()}`,
          format: "png",
          overwrite: true
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(finalImage);
    });

    return result.secure_url;

  } catch (error) {
    console.error("Image generation failed:", error.message);
    return null;
  }
}

module.exports = { generateBirthdayImage };