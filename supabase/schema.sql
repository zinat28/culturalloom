-- Supabase > SQL Editor > New query > paste all > Run

create table if not exists places (
  id bigint generated always as identity primary key,
  name text not null, city text not null, description text,
  ticket_price int not null, transport_cost int not null   -- both per traveler (BDT)
);
create table if not exists hotels (
  id bigint generated always as identity primary key,
  name text not null, city text not null,
  price_per_night int not null, room_capacity int not null, rooms_available int not null,
  step_free bool default false, ramp bool default false, roll_in_shower bool default false,
  crib bool default false, child_safe bool default false,
  smoke_detectors bool default false, ground_exits bool default false, assisted_evac bool default false
);
create table if not exists restaurants (
  id bigint generated always as identity primary key,
  name text not null, city text not null,
  seats_available int not null, price_per_guest int not null,
  allergen_free bool default false, sugar_free bool default false,
  infant_seating bool default false, wheelchair_access bool default false
);
create table if not exists hotel_bookings (
  id uuid primary key default gen_random_uuid(),
  hotel_id bigint references hotels(id), traveler_name text not null, email text not null,
  check_in date not null, check_out date not null, guests int not null, needs text[] not null default '{}',
  status text not null default 'PENDING',   -- PENDING > AWAITING_PAYMENT > PAID  (or REJECTED)
  bill_amount int, voucher_code text, admin_note text, created_at timestamptz default now()
);
create table if not exists dining_reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint references restaurants(id), traveler_name text not null, email text not null,
  guests int not null, meal_slot text not null, reserve_date date not null, needs text[] not null default '{}',
  status text not null default 'PENDING',
  bill_amount int, pass_code text, qr_data text, admin_note text, created_at timestamptz default now()
);
create table if not exists tour_plans (
  id bigint generated always as identity primary key,
  traveler_name text, place_id bigint, days int, travelers int, budget int,
  health text[], plan jsonb, created_at timestamptz default now()
);

-- Only our server (service role key) may touch the data
alter table places enable row level security;
alter table hotels enable row level security;
alter table restaurants enable row level security;
alter table hotel_bookings enable row level security;
alter table dining_reservations enable row level security;
alter table tour_plans enable row level security;

-- Sample data (fictional business names)
insert into places (name, city, description, ticket_price, transport_cost) values
('Lalbagh Fort','Dhaka','17th-century Mughal fort complex',100,300),
('Ahsan Manzil','Dhaka','Pink palace museum on the Buriganga',100,300),
('Panam Nagar','Sonargaon','Historic merchant town',150,500),
('Mahasthangarh','Bogura','Oldest archaeological site in Bangladesh',200,900),
('Sixty Dome Mosque','Bagerhat','UNESCO-listed medieval mosque',200,1000),
('Paharpur Vihara','Naogaon','UNESCO-listed Buddhist monastery ruins',200,1100);

insert into hotels (name,city,price_per_night,room_capacity,rooms_available,step_free,ramp,roll_in_shower,crib,child_safe,smoke_detectors,ground_exits,assisted_evac) values
('Old Dhaka Haveli Stay','Dhaka',6500,3,6,true,true,true,true,true,true,true,true),
('Shakhari Courtyard Inn','Dhaka',3500,2,8,false,false,false,true,true,true,true,false),
('Panam Heritage Lodge','Sonargaon',4800,3,5,true,true,false,true,true,true,true,true),
('Meghna Riverside Rest','Sonargaon',2800,2,6,false,false,false,false,true,true,false,false),
('Mahasthan Terracotta House','Bogura',3900,3,5,true,true,true,false,true,true,true,false),
('Karatoya Guest Haveli','Bogura',2600,2,7,false,false,false,true,false,true,true,false),
('Khan Jahan Retreat','Bagerhat',3200,3,4,true,true,false,true,true,true,true,true),
('Vihara View Lodge','Naogaon',3000,2,5,true,false,false,false,true,true,true,false);

insert into restaurants (name,city,seats_available,price_per_guest,allergen_free,sugar_free,infant_seating,wheelchair_access) values
('Puran Dhaka Bakarkhani House','Dhaka',40,650,true,true,true,true),
('Kutti Biryani Dhaba','Dhaka',60,450,false,false,true,false),
('Panam Feast Hall','Sonargaon',50,550,true,false,true,true),
('Meghna Fish Kitchen','Sonargaon',30,500,true,true,false,false),
('Bogurar Doi Ghar','Bogura',35,400,false,true,true,true),
('Mahasthan Village Table','Bogura',45,350,true,false,false,false),
('Bagerhat Rice & Hilsa','Bagerhat',25,420,true,true,true,false),
('Naogaon Mango Courtyard','Naogaon',30,380,false,false,true,true);
