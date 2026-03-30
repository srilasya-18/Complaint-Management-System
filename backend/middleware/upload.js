import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// ── ensure upload folder exists on server start ───────────────────────
const uploadDir = 'uploads/complaints';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── multer: store in memory before compression ────────────────────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG and WEBP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB max before compression
    files: 3                      // max 3 photos per complaint
  }
});

// ── sharp: compress and save to disk ─────────────────────────────────
const compressAndSave = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      req.uploadedPhotos = [];
      return next();
    }

    const compressed = await Promise.all(
      req.files.map(async (file) => {
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
        const outputPath = path.join(uploadDir, filename);

        await sharp(file.buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 70, progressive: true })
          .toFile(outputPath);

        const { size } = fs.statSync(outputPath);

        return {
          url: `/uploads/complaints/${filename}`,
          filename,
          originalName: file.originalname,
          sizeKB: Math.round(size / 1024)
        };
      })
    );

    req.uploadedPhotos = compressed;
    next();

  } catch (err) {
    next(err);
  }
};

// ── cleanup: delete files if complaint save fails ─────────────────────
const cleanupOnError = (uploadedPhotos) => {
  uploadedPhotos?.forEach(({ filename }) => {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
};

export { upload, compressAndSave, cleanupOnError };