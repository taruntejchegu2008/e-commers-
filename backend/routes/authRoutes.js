const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { adminClient, anonClient, isSupabaseAuthEnabled } = require('../config/supabase');

const router = express.Router();

// Password strength policy. Rules:
//   - at least 8 characters
//   - at least one uppercase letter
//   - at least one lowercase letter
//   - at least one digit
//   - at least one special character
const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, msg: 'at least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), msg: 'an uppercase letter' },
  { test: (p) => /[a-z]/.test(p), msg: 'a lowercase letter' },
  { test: (p) => /\d/.test(p), msg: 'a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), msg: 'a special character (!@#$...)' },
];

function getPasswordErrors(password) {
  return PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.msg);
}

// Helper to generate JWT
const generateToken = (userId, isAdmin) => {
  return jwt.sign({ id: userId, isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Coerce values to trimmed strings. This neutralizes object/array
// payloads (e.g. {"email":{"$ne":""}}) so they can never be treated as
// Mongo query operators or cause a CastError. Left unchanged if missing.
function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Upsert the app-level Mongo user that orders reference. The password column
// is a random placeholder when Supabase owns authentication (Supabase verifies
// the real password); legacy local users keep their bcrypt hash.
async function upsertMongoUser({ name, email, isAdmin = false, supabaseUid = null }) {
  const update = { name, email };
  if (supabaseUid) update.supabaseUid = supabaseUid;
  if (isAdmin) update.isAdmin = true;

  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = name;
    if (supabaseUid) existing.supabaseUid = supabaseUid;
    if (isAdmin) existing.isAdmin = true;
    await existing.save();
    return existing;
  }

  return User.create({
    name,
    email,
    password: require('crypto').randomBytes(32).toString('hex'), // hashed by pre-save hook
    isAdmin,
    supabaseUid,
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const name = toTrimmedString(req.body && req.body.name);
    const email = toTrimmedString(req.body && req.body.email);
    const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Strong password policy (brute-force / weak-credential protection)
    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        message: `Password must contain ${passwordErrors.join(', ')}`,
      });
    }

    // If Supabase Auth is enabled, create the identity there first.
    if (isSupabaseAuthEnabled()) {
      const { data: sbUser, error: sbError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (sbError) {
        if (/already.*registered|already.*exists/i.test(sbError.message)) {
          return res.status(400).json({ message: 'A user with this email already exists' });
        }
        return res.status(400).json({ message: sbError.message });
      }

      // Create the linked Mongo user for orders/references, storing the
      // Supabase Auth UUID so orders can reference the same user in Supabase.
      const user = await upsertMongoUser({
        name,
        email,
        isAdmin: false,
        supabaseUid: (sbUser && sbUser.user && sbUser.user.id) || null,
      });
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id, user.isAdmin),
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Create user (password is hashed via pre-save hook in User model)
    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id, user.isAdmin),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = toTrimmedString(req.body && req.body.email);
    const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // If Supabase Auth is enabled, verify credentials with Supabase.
    if (isSupabaseAuthEnabled()) {
      const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

      if (!error && data && data.user) {
        const meta = data.user.user_metadata || {};
        const user = await upsertMongoUser({
          name: meta.name || email.split('@')[0],
          email,
          isAdmin: false,
          supabaseUid: data.user.id,
        });
        return res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          token: generateToken(user._id, user.isAdmin),
        });
      }

      // Fallback: legacy local user (e.g. the seeded admin, which predates
      // Supabase) can still sign in with its stored bcrypt hash.
      const legacy = await User.findOne({ email });
      if (legacy && (await legacy.comparePassword(password))) {
        return res.json({
          _id: legacy._id,
          name: legacy.name,
          email: legacy.email,
          isAdmin: legacy.isAdmin,
          token: generateToken(legacy._id, legacy.isAdmin),
        });
      }

      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id, user.isAdmin),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

module.exports = router;
