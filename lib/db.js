const { createClient } = require('@supabase/supabase-js');

// Server-only client. Keys come from environment variables.
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Care need -> hotel columns that must all be true
const HOTEL_NEEDS = {
  disability: ['step_free', 'ramp', 'roll_in_shower'],
  infant: ['crib', 'child_safe'],
  fire: ['smoke_detectors', 'ground_exits', 'assisted_evac']
};
// Dietary/access need -> restaurant column that must be true
const DINING_NEEDS = { allergen: 'allergen_free', sugar: 'sugar_free', infant: 'infant_seating', wheelchair: 'wheelchair_access' };

const isAdmin = req => !!process.env.ADMIN_PASSWORD && req.headers['x-admin-key'] === process.env.ADMIN_PASSWORD;
const code = prefix => prefix + '-' + Math.random().toString(36).slice(2, 10).toUpperCase();
const nightsBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const wrap = fn => async (req, res) => {
  try { await fn(req, res); } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { db, HOTEL_NEEDS, DINING_NEEDS, isAdmin, code, nightsBetween, wrap };
