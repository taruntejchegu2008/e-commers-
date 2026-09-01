const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { adminClient, isSupabaseConfigured } = require('../config/supabase');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

const router = express.Router();

// Accept image uploads in memory (5 MB cap), then push to Supabase Storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const ALLOWED_IMAGE = /\.(png|jpe?g|gif|webp)$/i;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

// POST /api/upload — admin-only image upload to Supabase Storage.
// Expects multipart/form-data with a file field named "file".
// Returns the public URL of the uploaded image.
router.post('/', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ message: 'Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!ALLOWED_IMAGE.test(req.file.originalname)) {
      return res.status(400).json({ message: 'Only image files are allowed (png, jpg, jpeg, gif, webp)' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const key = `products/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

    // Ensure the bucket exists and is public so the URL is directly usable.
    const { error: createErr } = await adminClient.storage.createBucket(STORAGE_BUCKET, { public: true });
    if (createErr && !/(already exists|duplicate)/i.test(createErr.message)) {
      // Bucket probably already exists -> just try to make it public.
      await adminClient.storage.updateBucket(STORAGE_BUCKET, { public: true }).catch(() => {});
    }

    const { error: uploadErr } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .upload(key, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadErr) {
      return res.status(500).json({ message: 'Upload failed', error: uploadErr.message });
    }

    const { data } = adminClient.storage.from(STORAGE_BUCKET).getPublicUrl(key);
    return res.status(201).json({ url: data.publicUrl, key });
  } catch (error) {
    return res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

module.exports = router;