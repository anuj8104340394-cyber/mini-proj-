const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Check if Cloudinary credentials are provided in .env
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let storage;

if (isCloudinaryConfigured) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  // Cloudinary Online Storage (Supports Images & Videos)
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const isVideo = file.mimetype && file.mimetype.startsWith('video/');
      if (isVideo) {
        return {
          folder: 'twitter_videos',
          resource_type: 'video',
          allowed_formats: ['mp4', 'mov', 'webm', 'mkv', 'avi']
        };
      }
      return {
        folder: 'twitter_posts',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [{ width: 1200, crop: 'limit' }]
      };
    }
  });

  console.log('☁️ Storage mode: Cloudinary (Online Cloud Storage active - Photos & Videos)');
} else {
  // Fallback to local storage if Cloudinary keys not provided yet
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      const prefix = file.mimetype && file.mimetype.startsWith('video/') ? 'vid' : 'img';
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
  });

  console.log('📁 Storage mode: Local /uploads folder (Add CLOUDINARY_* in .env to upload online)');
}

const fileFilter = (req, file, cb) => {
  const allowedImageExts = /jpeg|jpg|png|webp|gif/;
  const allowedVideoExts = /mp4|mov|webm|mkv|avi/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  const isImage = file.mimetype && file.mimetype.startsWith('image/') && (allowedImageExts.test(ext) || ext === '');
  const isVideo = file.mimetype && file.mimetype.startsWith('video/') && (allowedVideoExts.test(ext) || ext === '');

  if (isImage || isVideo) {
    return cb(null, true);
  } else {
    cb(new Error('Only photos (jpg, png, webp, gif) or videos (mp4, mov, webm) are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter
});

module.exports = upload;
