const QRCode = require('qrcode');
const { db, code, wrap } = require('../lib/db');

// Simulated payment. On success: capacity is deducted and a voucher / QR pass is issued.
module.exports = wrap(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { type, id } = req.body || {};
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const table = type === 'hotel' ? 'hotel_bookings' : 'dining_reservations';
  const { data: b } = await db.from(table).select('*').eq('id', id).eq('email', email).single();
  if (!b || b.status !== 'AWAITING_PAYMENT') return res.status(400).json({ error: 'Nothing to pay for this booking' });

  if (type === 'hotel') {
    const { data: h } = await db.from('hotels').select('*').eq('id', b.hotel_id).single();
    const rooms = Math.ceil(b.guests / h.room_capacity);
    if (h.rooms_available < rooms) return res.status(409).json({ error: 'Rooms were taken before payment. Please book again.' });
    await db.from('hotels').update({ rooms_available: h.rooms_available - rooms }).eq('id', h.id);
    await db.from(table).update({ status: 'PAID', voucher_code: code('HV') }).eq('id', id);
  } else {
    const { data: r } = await db.from('restaurants').select('*').eq('id', b.restaurant_id).single();
    if (r.seats_available < b.guests) return res.status(409).json({ error: 'Seats were taken before payment. Please book again.' });
    await db.from('restaurants').update({ seats_available: r.seats_available - b.guests }).eq('id', r.id);
    const pass = code('HD');
    const qr = await QRCode.toDataURL(`CulturalLoom|${pass}|${id}`);
    await db.from(table).update({ status: 'PAID', pass_code: pass, qr_data: qr }).eq('id', id);
  }
  res.json({ status: 'PAID' });
});
