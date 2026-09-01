// ===== Supabase Connection (ShopEasy backend) =====
//
// Two clients:
//   - anonClient:  public "anon" key client. Safe to send to a browser,
//                  but limited to your Postgres Row-Level-Security rules.
//   - adminClient: "service_role" key client. SERVER-ONLY. Bypasses RLS,
//                  full read/write access. NEVER ship this key to the frontend.
//
// Reads config from env:  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isSupabaseConfigured = () => !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

// Auth requires ALL three keys (anon key is used for password sign-in).
const isSupabaseAuthEnabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);

// If Supabase isn't configured yet, log once and let the app keep running
// in local mode rather than crashing.
if (!isSupabaseConfigured()) {
  console.warn('Supabase is not configured (missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY). Supabase features disabled.');
}

const anonClient = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const adminClient = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

module.exports = { anonClient, adminClient, isSupabaseConfigured, isSupabaseAuthEnabled };