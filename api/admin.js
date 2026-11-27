const { db, HOTEL_NEEDS, DINING_NEEDS, isAdmin, nightsBetween, wrap } = require('../lib/db');

module.exports = wrap(async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong admin password' });

  if (req.method === 'GET') {
    const [h, d] = await Promise.all([
      db.from('hotel_bookings').select('*, hotels(name)').order('created_at', { ascending: false }).limit(50),
      db.from('dining_reservations').select('*, restaurants(name)').order('created_at', { ascending: false }).limit(50)
    ]);
    return res.json({ hotel: h.data || [], dining: d.data || [] });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use GET or POST' });

  const { type, id, action } = req.body || {};
  const table = type === 'hotel' ? 'hotel_bookings' : 'dining_reservations';
  const { data: b } = await db.from(table).select('*').eq('id', id).single();
  if (!b || b.status !== 'PENDING') return res.status(400).json({ error: 'Only PENDING requests can be reviewed' });

  const finish = patch => db.from(table).update(patch).eq('id', id).then(() => res.json({ status: patch.status, note: patch.admin_note || null }));
  if (action === 'reject') return finish({ status: 'REJECTED', admin_note: 'Rejected by admin' });

  let note = null, amount = 0;
  if (type === 'hotel') {
    const { data: h } = await db.from('hotels').select('*').eq('id', b.hotel_id).single();
    const rooms = Math.ceil(b.guests / h.room_capacity);
    // Step 2: room capacity. Step 3: physical readiness of requested equipment.
    const missing = b.needs.flatMap(n => HOTEL_NEEDS[n]).filter(c => !h[c]);
    if (h.rooms_available < rooms) note = 'Not enough rooms available for this group size.';
    else if (missing.length) note = 'Requested care equipment is not ready: ' + missing.join(', ');
    // Step 4: pro-forma stay bill
    amount = h.price_per_night * rooms * nightsBetween(b.check_in, b.check_out);
  } else {
    const { data: r } = await db.from('restaurants').select('*').eq('id', b.restaurant_id).single();
    // Step 1: table capacity. Step 2: ingredient/access readiness for dietary needs.
    const missing = b.needs.map(n => DINING_NEEDS[n]).filter(c => !r[c]);
    if (r.seats_available < b.guests) note = 'Not enough table seats for this guest count.';
    else if (missing.length) note = 'Cannot prepare the requested dietary/access needs: ' + missing.join(', ');
    // Step 3: heritage dining bill
    amount = r.price_per_guest * b.guests;
  }
  if (note) return finish({ status: 'REJECTED', admin_note: note });
  return finish({ status: 'AWAITING_PAYMENT', bill_amount: amount });
});
