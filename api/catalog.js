const { db, wrap } = require('../lib/db');

module.exports = wrap(async (req, res) => {
  const [p, h, r] = await Promise.all([
    db.from('places').select('*').order('name'),
    db.from('hotels').select('*').order('name'),
    db.from('restaurants').select('*').order('name')
  ]);
  const err = p.error || h.error || r.error;
  if (err) return res.status(500).json({ error: err.message });
  res.json({ places: p.data, hotels: h.data, restaurants: r.data });
});
