const view = document.getElementById('view');
let cat = null;

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '৳' + Number(n).toLocaleString();
const list = (arr, f) => arr.map(f).join('');
async function api(path, opt = {}) {
  const r = await fetch(path, { ...opt, headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  const b = await r.json();
  if (!r.ok) throw new Error(b.error || 'Request failed');
  return b;
}
const post = (p, d, h) => api(p, { method: 'POST', body: JSON.stringify(d), headers: h });
const checks = (name, items) => list(items, ([k, l]) => `<label class="chk"><input type="checkbox" name="${name}" value="${k}"> ${l}</label>`);
const picked = (form, name) => [...form.querySelectorAll(`[name=${name}]:checked`)].map(x => x.value);
const say = (el, text, ok) => { el.textContent = text; el.className = ok ? 'okmsg' : 'err'; };

const HN = [['disability', 'Disability / paralysis support'], ['infant', 'Infant care'], ['fire', 'Fire & emergency safety']];
const DN = [['allergen', 'Allergen-free'], ['sugar', 'Sugar-free'], ['infant', 'Infant seating'], ['wheelchair', 'Wheelchair access']];
const HC = { disability: ['step_free', 'ramp', 'roll_in_shower'], infant: ['crib', 'child_safe'], fire: ['smoke_detectors', 'ground_exits', 'assisted_evac'] };
const DC = { allergen: 'allergen_free', sugar: 'sugar_free', infant: 'infant_seating', wheelchair: 'wheelchair_access' };
const GUAR = { step_free: 'Ground-floor step-free room', ramp: 'Wheelchair ramp', roll_in_shower: 'Roll-in shower', crib: 'Baby crib', child_safe: 'Child-safe room', smoke_detectors: 'Verified smoke detectors', ground_exits: 'Direct ground-level exits', assisted_evac: 'Assisted evacuation' };
const cities = () => [...new Set(cat.places.map(p => p.city))];
const cityOptions = () => list(cities(), c => `<option>${esc(c)}</option>`);

// ---------- Explore: all places, stays and dining ----------
function exploreView() {
  const yes = (o, map) => list(Object.keys(map).filter(k => o[k]), k => `<span class="tag">${map[k]}</span>`);
  const DG = { allergen_free: 'Allergen-free', sugar_free: 'Sugar-free', infant_seating: 'Infant seating', wheelchair_access: 'Wheelchair access' };
  view.innerHTML = `
    <h2>Heritage places</h2>
    ${list(cat.places, p => `<div class="card"><div class="row"><strong>${esc(p.name)}</strong><span class="muted">${esc(p.city)}</span></div>
      <p class="muted">${esc(p.description)} · Ticket ${money(p.ticket_price)}</p></div>`)}
    <h2>Heritage stays</h2>
    ${list(cat.hotels, h => `<div class="card"><div class="row"><strong>${esc(h.name)}</strong><span class="muted">${esc(h.city)}</span></div>
      <p class="muted">${money(h.price_per_night)} per night · ${h.room_capacity} guests per room · ${h.rooms_available} rooms left</p>${yes(h, GUAR)}</div>`)}
    <h2>Traditional dining</h2>
    ${list(cat.restaurants, r => `<div class="card"><div class="row"><strong>${esc(r.name)}</strong><span class="muted">${esc(r.city)}</span></div>
      <p class="muted">${money(r.price_per_guest)} per guest · ${r.seats_available} seats left</p>${yes(r, DG)}</div>`)}`;
}

// ---------- Feature 1: Tour planner ----------
function planView() {
  view.innerHTML = `
  <form id="f" class="card">
    <h2>Plan my tour</h2>
    <label>Your name<input name="traveler_name" required></label>
    <label>Place<select name="place_id">${list(cat.places, p => `<option value="${p.id}">${esc(p.name)} (${esc(p.city)})</option>`)}</select></label>
    <div class="two">
      <label>Days<input type="number" name="days" min="1" max="14" value="2" required></label>
      <label>Travelers<input type="number" name="travelers" min="1" max="20" value="2" required></label>
    </div>
    <label>Budget (BDT)<input type="number" name="budget" min="1000" value="30000" required></label>
    <fieldset><legend>Health info</legend>${checks('health', [['disability', 'Mobility support'], ['infant', 'Traveling with an infant'], ['allergen', 'Food allergy'], ['sugar', 'Sugar-free diet']])}</fieldset>
    <button class="btn">Find best package</button>
  </form><div id="out"></div>`;
  document.getElementById('f').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, out = document.getElementById('out');
    try {
      const p = await post('/api/tour', {
        traveler_name: f.traveler_name.value, place_id: Number(f.place_id.value), days: Number(f.days.value),
        travelers: Number(f.travelers.value), budget: Number(f.budget.value), health: picked(f, 'health')
      });
      if (!p.found) return (out.innerHTML = `<p class="err">${esc(p.message)}</p>`);
      const b = p.breakdown;
      out.innerHTML = `<div class="card"><h2>${esc(p.place)}</h2>
        <p class="${p.within_budget ? 'okmsg' : 'err'}">${p.within_budget ? 'Best package within your budget.' : 'Over budget. This is the cheapest package that fits your needs.'}</p>
        <table>
          <tr><td>Transport</td><td>${money(b.transport)}</td></tr>
          <tr><td>Entry tickets</td><td>${money(b.tickets)}</td></tr>
          <tr><td>Hotel: ${esc(b.hotel.name)} (${b.hotel.rooms} room${b.hotel.rooms > 1 ? 's' : ''})</td><td>${money(b.hotel.cost)}</td></tr>
          <tr><td>Food: ${esc(b.food.name)} (${b.food.meals} meals each)</td><td>${money(b.food.cost)}</td></tr>
          <tr><td><strong>Total</strong></td><td><strong>${money(p.total)}</strong></td></tr>
        </table></div>`;
    } catch (err) { out.innerHTML = `<p class="err">${esc(err.message)}</p>`; }
  };
}

// ---------- Feature 2: Heritage stay ----------
function stayView() {
  view.innerHTML = `
  <form id="f" class="card">
    <h2>Find a heritage stay</h2>
    <div class="two"><label>Your name<input name="traveler_name" required></label><label>Email<input type="email" name="email" required></label></div>
    <div class="two"><label>Destination<select name="city">${cityOptions()}</select></label><label>Group size<input type="number" name="guests" min="1" max="30" value="2" required></label></div>
    <div class="two"><label>Check-in<input type="date" name="check_in" required></label><label>Check-out<input type="date" name="check_out" required></label></div>
    <fieldset><legend>Special care checklist</legend>${checks('needs', HN)}</fieldset>
    <button class="btn">Search stays</button>
  </form><div id="out"></div>`;
  const f = document.getElementById('f');
  f.onsubmit = e => { e.preventDefault(); showStays(); };
  f.oninput = showStays;
  showStays();
  function showStays() {
    const needs = picked(f, 'needs'), guests = Number(f.guests.value) || 1;
    const found = cat.hotels.filter(h => h.city === f.city.value && h.rooms_available >= Math.ceil(guests / h.room_capacity) && needs.every(n => HC[n].every(c => h[c])));
    const out = document.getElementById('out');
    out.innerHTML = found.length ? list(found, h => `<div class="card row"><div>
        <strong>${esc(h.name)}</strong><p class="muted">${money(h.price_per_night)} per night · ${h.room_capacity} guests per room · ${h.rooms_available} rooms left</p>
        ${list(Object.keys(GUAR).filter(k => h[k]), k => `<span class="tag">${GUAR[k]}</span>`)}</div>
        <button class="btn" data-id="${h.id}">Request stay</button></div>`) + '<p id="msg"></p>'
      : '<p class="err">No stay matches these needs. Try fewer filters or another destination.</p>';
    out.querySelectorAll('button[data-id]').forEach(b => b.onclick = async () => {
      try {
        await post('/api/bookings', { type: 'hotel', hotel_id: Number(b.dataset.id), traveler_name: f.traveler_name.value, email: f.email.value, guests, check_in: f.check_in.value, check_out: f.check_out.value, needs });
        say(document.getElementById('msg'), 'Request sent with status PENDING. Track it under My bookings.', true);
      } catch (err) { say(document.getElementById('msg'), err.message); }
    });
  }
}

// ---------- Feature 3: Dining ----------
function dineView() {
  view.innerHTML = `
  <form id="f" class="card">
    <h2>Reserve traditional dining</h2>
    <div class="two"><label>Your name<input name="traveler_name" required></label><label>Email<input type="email" name="email" required></label></div>
    <div class="two"><label>Near (city of your stay)<select name="city">${cityOptions()}</select></label><label>Guests<input type="number" name="guests" min="1" max="30" value="2" required></label></div>
    <div class="two"><label>Date<input type="date" name="reserve_date" required></label>
      <label>Meal slot<select name="meal_slot"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Community feast</option></select></label></div>
    <fieldset><legend>Dietary and access needs</legend>${checks('needs', DN)}</fieldset>
    <button class="btn">Search dining houses</button>
  </form><div id="out"></div>`;
  const f = document.getElementById('f');
  f.onsubmit = e => { e.preventDefault(); showDining(); };
  f.oninput = showDining;
  showDining();
  function showDining() {
    const needs = picked(f, 'needs'), guests = Number(f.guests.value) || 1;
    const found = cat.restaurants.filter(r => r.city === f.city.value && r.seats_available >= guests && needs.every(n => r[DC[n]]));
    const out = document.getElementById('out');
    out.innerHTML = found.length ? list(found, r => `<div class="card row"><div>
        <strong>${esc(r.name)}</strong><p class="muted">${money(r.price_per_guest)} per guest · ${r.seats_available} seats left</p>
        ${list(DN.filter(([k]) => r[DC[k]]), ([, l]) => `<span class="tag">${l}</span>`)}</div>
        <button class="btn" data-id="${r.id}">Reserve</button></div>`) + '<p id="msg"></p>'
      : '<p class="err">No dining house matches. Try fewer needs or another city.</p>';
    out.querySelectorAll('button[data-id]').forEach(b => b.onclick = async () => {
      try {
        await post('/api/bookings', { type: 'dining', restaurant_id: Number(b.dataset.id), traveler_name: f.traveler_name.value, email: f.email.value, guests, meal_slot: f.meal_slot.value, reserve_date: f.reserve_date.value, needs });
        say(document.getElementById('msg'), 'Reservation sent with status PENDING. Track it under My bookings.', true);
      } catch (err) { say(document.getElementById('msg'), err.message); }
    });
  }
}

// ---------- My bookings ----------
function mineView() {
  view.innerHTML = `<form id="f" class="card"><h2>My bookings</h2>
    <label>Email used when booking<input type="email" name="email" required></label><button class="btn">Show my bookings</button></form><div id="out"></div>`;
  document.getElementById('f').onsubmit = async e => {
    e.preventDefault();
    const email = e.target.email.value, out = document.getElementById('out');
    const load = async () => {
      const d = await api('/api/bookings?email=' + encodeURIComponent(email));
      const rows = [...d.hotel.map(x => ({ ...x, type: 'hotel' })), ...d.dining.map(x => ({ ...x, type: 'dining' }))];
      out.innerHTML = rows.length ? list(rows, bookingCard) : '<p class="muted">No bookings for this email yet.</p>';
      out.querySelectorAll('button[data-pay]').forEach(b => b.onclick = async () => {
        try { await post('/api/pay', { type: b.dataset.type, id: b.dataset.pay, email }); await load(); }
        catch (err) { alert(err.message); }
      });
    };
    try { await load(); } catch (err) { out.innerHTML = `<p class="err">${esc(err.message)}</p>`; }
  };
}
function bookingCard(x) {
  const hotel = x.type === 'hotel';
  const place = hotel ? x.hotels : x.restaurants;
  const when = hotel ? `${x.check_in} to ${x.check_out}` : `${x.reserve_date}, ${esc(x.meal_slot)}`;
  const guarantees = hotel && x.status === 'PAID' ? `<p class="muted">Verified guarantees: ${esc(list([...new Set(x.needs.flatMap(n => HC[n]))], k => GUAR[k] + '; ') || 'none requested')}</p>` : '';
  const doc = x.status === 'PAID' ? (hotel ? `<p><strong>Official Hotel Stay Voucher: ${esc(x.voucher_code)}</strong></p>${guarantees}`
    : `<p><strong>Dining pass: ${esc(x.pass_code)}</strong></p><img class="qr" alt="QR dining pass" src="${x.qr_data}">`) : '';
  return `<div class="card"><div class="row"><strong>${esc(place?.name)}</strong><span class="st ${x.status}">${x.status.replace('_', ' ')}</span></div>
    <p class="muted">${hotel ? 'Stay' : 'Dining'} · ${when} · ${x.guests} guests</p>
    ${x.bill_amount ? `<p class="muted">${hotel ? 'Pro-forma stay bill' : 'Heritage dining bill'}: ${money(x.bill_amount)}</p>` : ''}
    ${x.admin_note ? `<p class="err">${esc(x.admin_note)}</p>` : ''}
    ${x.status === 'AWAITING_PAYMENT' ? `<button class="btn" data-pay="${x.id}" data-type="${x.type}">Pay ${money(x.bill_amount)}</button>` : ''}${doc}</div>`;
}

// ---------- Admin ----------
function adminView() {
  view.innerHTML = `<form id="f" class="card"><h2>Admin review</h2>
    <label>Admin password<input type="password" name="pw" required></label><button class="btn">Open dashboard</button></form><div id="out"></div>`;
  document.getElementById('f').onsubmit = async e => {
    e.preventDefault();
    const pw = e.target.pw.value, out = document.getElementById('out');
    const load = async () => {
      const d = await api('/api/admin', { headers: { 'x-admin-key': pw } });
      const rows = [...d.hotel.map(x => ({ ...x, type: 'hotel', label: x.hotels?.name })), ...d.dining.map(x => ({ ...x, type: 'dining', label: x.restaurants?.name }))];
      out.innerHTML = list(rows, x => `<div class="card"><div class="row"><strong>${esc(x.label)}</strong><span class="st ${x.status}">${x.status.replace('_', ' ')}</span></div>
        <p class="muted">${x.type} · ${esc(x.traveler_name)} · ${x.guests} guests · needs: ${esc(x.needs.join(', ') || 'none')}</p>
        ${x.admin_note ? `<p class="err">${esc(x.admin_note)}</p>` : ''}
        ${x.status === 'PENDING' ? `<div class="row"><button class="btn" data-a="approve" data-id="${x.id}" data-t="${x.type}">Verify and generate bill</button><button class="btn bad" data-a="reject" data-id="${x.id}" data-t="${x.type}">Reject</button></div>` : ''}</div>`) || '<p class="muted">No requests yet.</p>';
      out.querySelectorAll('button[data-a]').forEach(b => b.onclick = async () => {
        try { await post('/api/admin', { type: b.dataset.t, id: b.dataset.id, action: b.dataset.a }, { 'x-admin-key': pw }); await load(); }
        catch (err) { alert(err.message); }
      });
    };
    try { await load(); } catch (err) { out.innerHTML = `<p class="err">${esc(err.message)}</p>`; }
  };
}

// ---------- navigation ----------
const tabs = { explore: exploreView, plan: planView, stay: stayView, dine: dineView, mine: mineView, admin: adminView };
function show(t) {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  tabs[t]();
}
document.querySelectorAll('nav button').forEach(b => b.onclick = () => show(b.dataset.tab));
(async () => {
  try {
    cat = await api('/api/catalog');
    if (!cat.places.length) throw new Error('The database is empty. Run supabase/schema.sql in the Supabase SQL Editor');
    show('explore');
  }
  catch (e) { view.innerHTML = `<p class="err">Could not load data: ${esc(e.message)}. Check your Supabase keys.</p>`; }
})();
