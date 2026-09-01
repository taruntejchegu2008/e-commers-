// ===== Supabase Order Sync =====
//
// Mirrors MongoDB orders into the Supabase Postgres `orders` table so the
// data is available for analytics/reporting on the Supabase side.
//
// The sync is best-effort: if Supabase isn't configured, or the table's
// schema lacks a column, it logs and continues — it NEVER fails the request,
// since MongoDB remains the source of truth for the app.
require('dotenv').config();
const { adminClient, isSupabaseConfigured } = require('../config/supabase');

// Coerce a JS value into something Postgres/PostgREST accepts.
function toDbValue(key, value) {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  if (key === 'items' || key === 'shipping' || (value !== null && typeof value === 'object' && !Array.isArray(value))) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  return value;
}

// Build a payload, excluding unknown columns so an insert won't fail if a
// column does not exist in the table yet.
function buildPayload({ mongoId, userId, userEmail, customerName, totalAmount, status, paymentMethod, paymentStatus, shipping, items }) {
  return {
    user_id: userId || null,
    mongo_id: mongoId,
    user_email: userEmail || null,
    customer_name: customerName || null,
    total_amount: Number(totalAmount) || 0,
    status: status || 'Placed',
    payment_method: paymentMethod || null,
    payment_status: paymentStatus || null,
    shipping: shipping ? toDbValue('shipping', shipping) : null,
    items: items ? toDbValue('items', items) : null,
  };
}

// Insert a new order into Supabase. Best-effort; returns { ok, error }.
async function insertOrder({ mongoId, userId, userEmail, customerName, totalAmount, status, paymentMethod, paymentStatus, shipping, items }) {
  if (!isSupabaseConfigured() || !adminClient) return { ok: false };

  const payload = buildPayload({ mongoId, userId, userEmail, customerName, totalAmount, status, paymentMethod, paymentStatus, shipping, items });

  // Prune unknown columns iteratively: PostgREST reports one missing column
  // at a time, so retry until no column is missing or a non-column error hits.
  for (let attempt = 0; attempt < 15; attempt++) {
    const { error } = await adminClient.from('orders').insert(payload);
    if (!error) return { ok: true };

    const m = error.message && error.message.match(/Could not find the '([^']+)' column/);
    if (m && payload.hasOwnProperty(m[1])) {
      delete payload[m[1]];
      continue;
    }
    // Not a missing-column error — surface it (e.g. NOT NULL / CHECK / FK).
    console.warn('[supabase-sync] order insert failed:', error.message);
    return { ok: false, error: error.message };
  }
  console.warn('[supabase-sync] order insert did not converge');
  return { ok: false, error: 'column pruning did not converge' };
}

// Update an order row (status change) in Supabase, keyed by the Mongo _id we
// stored in the mongo_id column. Best-effort.
async function updateOrderStatus(mongoId, status) {
  if (!isSupabaseConfigured() || !adminClient || !mongoId) return { ok: false };
  const { error } = await adminClient
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('mongo_id', String(mongoId));
  if (error) {
    // Fall back to matching by id if mongo_id column is absent.
    const byId = await adminClient.from('orders').update({ status }).eq('id', String(mongoId));
    if (byId.error) {
      console.warn('[supabase-sync] status update failed:', byId.error.message);
      return { ok: false, error: byId.error.message };
    }
  }
  return { ok: true };
}

module.exports = { insertOrder, updateOrderStatus, isSupabaseConfigured };