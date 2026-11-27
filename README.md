# CulturalLoom: build guide from scratch to live site

Course project for **Zinat Zaman Liza (2330044)**. It implements three features:
1. **Tour Planner**: place, time, budget and health info become the best complete package (transport, hotel, food, entry tickets).
2. **Heritage Hotel & Stay Reservation with Safety & Care Filters**: PENDING, then admin checks capacity and equipment, then a pro-forma bill. After payment rooms are deducted and a Hotel Stay Voucher is issued.
3. **Heritage Culinary & Traditional Dining Reservation**: admin verifies table capacity and dietary readiness, then a dining bill. After payment seats are locked and a QR Dining Reservation Pass is issued.

Stack: plain HTML/CSS/JS (UI) · Node.js serverless functions (backend) · Supabase (database) · Vercel (hosting).

## How the parts connect
```
Browser  public/app.js
   │  fetch('/api/catalog'), '/api/tour', '/api/bookings', '/api/pay', '/api/admin'
   ▼
Vercel serverless functions  api/*.js  (Node.js, share lib/db.js)
   │  @supabase/supabase-js + secret key from environment variables
   ▼
Supabase Postgres  (places, hotels, restaurants, hotel_bookings, dining_reservations, tour_plans)
```
The browser never touches Supabase directly. Only your `/api` functions hold the secret key.

## Booking status flow
`PENDING` > admin "Verify and generate bill" > `AWAITING_PAYMENT` > traveler pays > `PAID` (voucher or QR pass).
If capacity or equipment fails the check, the status becomes `REJECTED` with the reason shown to the traveler.

## Step 0: Install tools
1. Node.js LTS (nodejs.org). Check with `node -v`.
2. Git. Check with `git --version`.
3. Free accounts: github.com, supabase.com, vercel.com (sign in to Vercel with GitHub).

## Step 1: Create the database in Supabase
1. Supabase dashboard > **New project** > name it `culturalloom`, set a database password, pick a region, **Create**. Wait about 2 minutes.
2. **SQL Editor** > **New query** > paste all of `supabase/schema.sql` > **Run**.
3. **Table Editor** should now list 6 tables, with 6 places, 8 hotels and 8 restaurants (sample data).

## Step 2: Get your keys
Supabase > **Project Settings** > **API Keys** (older dashboards: **API**).
- Copy the **Project URL**.
- Copy the **service_role** secret key. Never put it in `public/` or on GitHub.

## Step 3: Run on your computer
```
npm install
copy .env.example .env        (Windows)     cp .env.example .env     (Mac/Linux)
```
Edit `.env`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
ADMIN_PASSWORD=pick-your-own-password
```
Start it:
```
npx vercel dev
```
First time: log in, link the project, accept defaults, answer **N** to "override settings". Open http://localhost:3000.

## Step 4: Test the full flow (also your demo script)
0. The **Explore** tab opens first and lists every place, hotel and restaurant. The Heritage stay and Dining tabs also list everything straight away, and the filters narrow the list as you change them. If Explore shows an error, see Step 7.
1. **Tour planner**: choose Panam Nagar, 2 days, 2 travelers, budget 30000, tick "Mobility support". A package appears.
2. **Heritage stay**: Sonargaon, 2 guests, two dates, tick all three care filters. Click **Request stay** (status PENDING).
3. **Admin** tab: enter your `ADMIN_PASSWORD`, click **Verify and generate bill**.
4. **My bookings**: enter your email, click **Pay**. The voucher with safety guarantees appears.
5. **Dining**: Sonargaon, tick Allergen-free, reserve, then repeat admin approval and payment. A QR pass appears.
6. In Supabase **Table Editor**, `hotels.rooms_available` and `restaurants.seats_available` have gone down.

## Step 5: Put the code on GitHub
```
git init
git add .
git commit -m "CulturalLoom first version"
```
Create an empty repository on github.com, then:
```
git remote add origin https://github.com/YOUR-NAME/culturalloom.git
git branch -M main
git push -u origin main
```

## Step 6: Deploy on Vercel and connect Supabase
1. Vercel > **Add New > Project** > import `culturalloom`.
2. Framework Preset: **Other**. Leave build settings empty.
3. **Environment Variables**: add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PASSWORD` with the same values as your `.env`.
4. **Deploy**. You get a link like `culturalloom.vercel.app`. Each `git push` redeploys automatically.

Alternative: in Vercel, **Storage / Integrations** has a Supabase integration that adds the Supabase variables for you. If you use it, check the variable names it created match `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (rename them if not), and still add `ADMIN_PASSWORD` yourself. Redeploy after changing variables.

## Step 7: Troubleshooting
| Problem | Fix |
|---|---|
| "Could not load data" | Env variables missing or wrong. Fix them and redeploy. |
| Admin says "Wrong admin password" | `ADMIN_PASSWORD` not set on Vercel, or typed differently. |
| `/api/...` 404 locally | Use `npx vercel dev`, not opening `index.html` directly. |
| `invalid API key` | Use the service_role/secret key, not the anon/publishable key. |
| Explore is empty or shows an error | The Supabase tables are empty or the keys are wrong. Run `schema.sql`, check the three environment variables, restart `npx vercel dev` (or redeploy on Vercel). |
| Tables empty | Run `schema.sql` again (delete old tables first if needed). |

## Project structure
```
api/catalog.js    places, hotels, restaurants
api/tour.js       Feature 1: package builder
api/bookings.js   create PENDING requests, list by email
api/admin.js      verify capacity/readiness, generate bills, reject
api/pay.js        payment: deduct capacity, issue voucher / QR pass
lib/db.js         Supabase client and shared rules
public/           UI (index.html, style.css, app.js)
supabase/schema.sql  tables, security, sample data
```

## Notes for your report
- Row Level Security is on with no public policies, so only the backend can read or write.
- The server re-checks capacity at payment time, so two travelers cannot take the same last room.
- Payment is simulated (a Pay button). A real gateway such as bKash or Stripe would replace `api/pay.js`.
- Looking up bookings by email is simple on purpose. Supabase Auth would be the next improvement.
- Sample hotel and restaurant names are fictional.
