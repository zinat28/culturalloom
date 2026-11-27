const { db, HOTEL_NEEDS, DINING_NEEDS, nightsBetween, wrap } = require('../lib/db');
const emailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

module.exports = wrap(async (req, res) => {
  // Traveler looks up their own requests by email
  if (req.method === 'GET') {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email' });
    const [h, d] = await Promise.all([
      db.from('hotel_bookings').select('*, hotels(name, city)').eq('email', email).order('created_at', { ascending: false }),
      db.from('dining_reservations').select('*, restaurants(name, city)').eq('email', email).order('created_at', { ascending: false })
    ]);
    return res.json({ hotel: h.data || [], dining: d.data || [] });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use GET or POST' });

  // New request is stored as PENDING (Step 1 of both workflows)
  const b = req.body || {};
  const name = String(b.traveler_name || '').trim().slice(0, 60);
  const email = String(b.email || '').trim().toLowerCase();
  const needs = Array.isArray(b.needs) ? b.needs : [];
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email' });
  if (!Number.isInteger(b.guests) || b.guests < 1 || b.guests > 30) return res.status(400).json({ error: 'Guests must be 1-30' });

  if (b.type === 'hotel') {
    if (!needs.every(n => HOTEL_NEEDS[n])) return res.status(400).json({ error: 'Unknown care need' });
    if (!(nightsBetween(b.check_in, b.check_out) >= 1)) return res.status(400).json({ error: 'Check-out must be after check-in' });
    const { error } = await db.from('hotel_bookings').insert({
      hotel_id: b.hotel_id, traveler_name: name, email, check_in: b.check_in, check_out: b.check_out, guests: b.guests, needs
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ status: 'PENDING' });
  }
  if (b.type === 'dining') {
    if (!needs.every(n => DINING_NEEDS[n])) return res.status(400).json({ error: 'Unknown dietary need' });
    if (!b.meal_slot || !b.reserve_date) return res.status(400).json({ error: 'Choose a date and meal slot' });
    const { error } = await db.from('dining_reservations').insert({
      restaurant_id: b.restaurant_id, traveler_name: name, email, guests: b.guests, meal_slot: b.meal_slot, reserve_date: b.reserve_date, needs
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ status: 'PENDING' });
  }
  res.status(400).json({ error: 'type must be hotel or dining' });
});
