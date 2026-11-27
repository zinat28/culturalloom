const { db, HOTEL_NEEDS, DINING_NEEDS, wrap } = require('../lib/db');
const MEALS_PER_DAY = 2;

// Feature 1: Tour Planner. Input: place, time, budget, health info.
// Output: the best complete package (transport, hotel, food, entry tickets).
module.exports = wrap(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { traveler_name, place_id, days, travelers, budget, health = [] } = req.body || {};
  const ok = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
  if (!String(traveler_name || '').trim()) return res.status(400).json({ error: 'Name is required' });
  if (!ok(days, 1, 14) || !ok(travelers, 1, 20) || !ok(budget, 1000, 10000000)) {
    return res.status(400).json({ error: 'Check days (1-14), travelers (1-20) and budget' });
  }

  // Step 1: find the place and everything available in its city
  const { data: place } = await db.from('places').select('*').eq('id', place_id).single();
  if (!place) return res.status(404).json({ error: 'Place not found' });
  const [h, r] = await Promise.all([
    db.from('hotels').select('*').eq('city', place.city),
    db.from('restaurants').select('*').eq('city', place.city)
  ]);

  // Step 2: keep only stays/restaurants that satisfy the health info
  const hotelNeeds = health.filter(x => HOTEL_NEEDS[x]);
  const diningNeeds = health.map(x => (x === 'disability' ? 'wheelchair' : x)).filter(x => DINING_NEEDS[x]);
  const hotels = h.data
    .map(x => ({ ...x, rooms: Math.ceil(travelers / x.room_capacity) }))
    .filter(x => x.rooms_available >= x.rooms && hotelNeeds.every(n => HOTEL_NEEDS[n].every(c => x[c])));
  const restaurants = r.data.filter(x => x.seats_available >= travelers && diningNeeds.every(n => x[DINING_NEEDS[n]]));
  if (!hotels.length || !restaurants.length) {
    return res.json({ found: false, message: 'No hotel and restaurant in this area match your health needs and group size. Try another place.' });
  }

  // Step 3: price every combination and pick the best one inside the budget
  const fixed = (place.transport_cost + place.ticket_price) * travelers;
  const combos = [];
  for (const hotel of hotels) for (const rest of restaurants) {
    const stay = hotel.price_per_night * hotel.rooms * days;
    const food = rest.price_per_guest * travelers * days * MEALS_PER_DAY;
    combos.push({ hotel, rest, stay, food, total: fixed + stay + food });
  }
  const within = combos.filter(c => c.total <= budget);
  const best = within.length
    ? within.reduce((a, b) => (b.total > a.total ? b : a))   // best quality that fits
    : combos.reduce((a, b) => (b.total < a.total ? b : a));  // cheapest, flagged over budget
  const plan = {
    found: true,
    within_budget: within.length > 0,
    place: place.name,
    breakdown: {
      transport: place.transport_cost * travelers,
      tickets: place.ticket_price * travelers,
      hotel: { name: best.hotel.name, rooms: best.hotel.rooms, cost: best.stay },
      food: { name: best.rest.name, meals: days * MEALS_PER_DAY, cost: best.food }
    },
    total: best.total
  };
  await db.from('tour_plans').insert({ traveler_name: String(traveler_name).trim(), place_id, days, travelers, budget, health, plan });
  res.json(plan);
});
