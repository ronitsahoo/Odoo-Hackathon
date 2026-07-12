import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');

// Ensure the uploads directory exists (first run on a fresh clone).
fs.mkdirSync(uploadDir, { recursive: true });

/**
 * Local disk storage under server/uploads, served statically at /uploads.
 *
 * SWITCHING TO CLOUDINARY: if CLOUDINARY_* env keys are present, replace this
 * storage engine with `multer-storage-cloudinary` (npm i cloudinary
 * multer-storage-cloudinary) and point `storage` at a CloudinaryStorage
 * instance. The controllers already just persist whatever path/URL multer
 * returns on `req.file(s)`, so no controller changes are needed.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (/^image\/(jpe?g|png|gif|webp|avif)$/.test(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files are allowed'));
};

export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
});

/** Turn a stored filename into the public path saved on models. */
export const toPublicPath = (file) => `/uploads/${file.filename}`;
