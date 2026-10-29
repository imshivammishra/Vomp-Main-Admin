-- VenueOnMyPlate — PostgreSQL schema
-- This is the single source of truth for the admin platform and public API.
-- All timestamps are stored as timestamptz (UTC).

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Identity, roles and permissions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          serial PRIMARY KEY,
  key         text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_system   boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS permissions (
  id          serial PRIMARY KEY,
  key         text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       integer NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id integer NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id                 serial PRIMARY KEY,
  email              text NOT NULL,
  name               text NOT NULL DEFAULT 'Admin',
  password_hash      text NOT NULL,
  role_id            integer NOT NULL REFERENCES roles(id),
  is_active          boolean NOT NULL DEFAULT true,
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until       timestamptz,
  last_login_at      timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_uidx ON admin_users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  id          text PRIMARY KEY,
  user_id     integer NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  ip          text NOT NULL DEFAULT '',
  user_agent  text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id         bigserial PRIMARY KEY,
  email      text NOT NULL,
  ip         text NOT NULL DEFAULT '',
  success    boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON login_attempts(lower(email), created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         bigserial PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Audit log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            bigserial PRIMARY KEY,
  actor_id      integer REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_email   text NOT NULL DEFAULT '',
  action        text NOT NULL,
  resource_type text NOT NULL DEFAULT '',
  resource_id   text NOT NULL DEFAULT '',
  outcome       text NOT NULL DEFAULT 'success',
  summary       jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip            text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs(resource_type, resource_id);

-- ── Geography ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
  id           serial PRIMARY KEY,
  iso2         char(2) NOT NULL,
  iso3         char(3) NOT NULL DEFAULT '',
  name         text NOT NULL,
  calling_code text NOT NULL DEFAULT '',
  flag         text NOT NULL DEFAULT '',
  currency     text NOT NULL DEFAULT '',
  active       boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS countries_iso2_uidx ON countries (iso2);

CREATE TABLE IF NOT EXISTS states (
  id         serial PRIMARY KEY,
  country_id integer NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  code       text NOT NULL DEFAULT '',
  name       text NOT NULL,
  latitude   numeric(9,6),
  longitude  numeric(9,6)
);
CREATE UNIQUE INDEX IF NOT EXISTS states_country_code_uidx ON states (country_id, code, name);
CREATE INDEX IF NOT EXISTS states_country_idx ON states(country_id);

CREATE TABLE IF NOT EXISTS cities (
  id                serial PRIMARY KEY,
  slug              text NOT NULL UNIQUE,
  name              text NOT NULL,
  country_id        integer NOT NULL REFERENCES countries(id),
  state_id          integer REFERENCES states(id) ON DELETE SET NULL,
  tagline           text NOT NULL DEFAULT '',
  description       text NOT NULL DEFAULT '',
  image             text NOT NULL DEFAULT '',
  image_alt         text NOT NULL DEFAULT '',
  venue_count_label text NOT NULL DEFAULT 'Curated venues',
  popular_types     jsonb NOT NULL DEFAULT '[]'::jsonb,
  status            text NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft','archived')),
  latitude          numeric(9,6),
  longitude         numeric(9,6),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cities_country_idx ON cities(country_id);
CREATE INDEX IF NOT EXISTS cities_status_idx ON cities(status);

-- ── Venue taxonomy & media ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_categories (
  id        serial PRIMARY KEY,
  slug      text NOT NULL UNIQUE,
  name      text NOT NULL,
  parent_id integer REFERENCES venue_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS amenities (
  id   serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id            serial PRIMARY KEY,
  url           text NOT NULL,
  filename      text NOT NULL,
  original_name text NOT NULL DEFAULT '',
  size          bigint NOT NULL DEFAULT 0,
  mime_type     text NOT NULL DEFAULT 'image/jpeg',
  kind          text NOT NULL DEFAULT 'image' CHECK (kind IN ('image','video','document')),
  width         integer,
  height        integer,
  duration      numeric(10,2),
  alt_text      text NOT NULL DEFAULT '',
  caption       text NOT NULL DEFAULT '',
  credit        text NOT NULL DEFAULT '',
  folder        text NOT NULL DEFAULT 'general',
  checksum      text NOT NULL DEFAULT '',
  poster_url    text NOT NULL DEFAULT '',
  variants      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by    integer REFERENCES admin_users(id) ON DELETE SET NULL,
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_kind_idx ON media(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS media_folder_idx ON media(folder);

-- ── Venues ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
  id                    serial PRIMARY KEY,
  slug                  text NOT NULL UNIQUE,
  name                  text NOT NULL,
  country_id            integer REFERENCES countries(id),
  state_id              integer REFERENCES states(id) ON DELETE SET NULL,
  city_id               integer REFERENCES cities(id) ON DELETE SET NULL,
  city                  text NOT NULL DEFAULT '',
  city_slug             text NOT NULL DEFAULT '',
  area                  text NOT NULL DEFAULT '',
  address               text NOT NULL DEFAULT '',
  postal_code           text NOT NULL DEFAULT '',
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  timezone              text NOT NULL DEFAULT 'Asia/Kolkata',
  type                  text NOT NULL DEFAULT '',
  category_id           integer REFERENCES venue_categories(id) ON DELETE SET NULL,
  setting               text NOT NULL DEFAULT 'Indoor' CHECK (setting IN ('Indoor','Outdoor','Indoor + Outdoor')),
  capacity_min          integer NOT NULL DEFAULT 50 CHECK (capacity_min >= 0),
  capacity_max          integer NOT NULL DEFAULT 500 CHECK (capacity_max >= 0),
  indoor_capacity       integer,
  outdoor_capacity      integer,
  rooms_count           integer,
  parking               boolean NOT NULL DEFAULT false,
  accessible            boolean NOT NULL DEFAULT false,
  catering              boolean NOT NULL DEFAULT false,
  accommodation         boolean NOT NULL DEFAULT false,
  decoration            boolean NOT NULL DEFAULT false,
  price_hint            text,
  starting_price        numeric(14,2),
  currency              char(3) NOT NULL DEFAULT 'INR',
  pricing_unit          text NOT NULL DEFAULT 'per_event',
  packages              jsonb NOT NULL DEFAULT '[]'::jsonb,
  taxes_pct             numeric(5,2) NOT NULL DEFAULT 0,
  security_deposit      numeric(14,2),
  min_booking_hours     integer,
  booking_lead_days     integer NOT NULL DEFAULT 0,
  cancellation_policy   text NOT NULL DEFAULT '',
  rules                 text NOT NULL DEFAULT '',
  opening_hours         jsonb NOT NULL DEFAULT '{}'::jsonb,
  blackout_dates        jsonb NOT NULL DEFAULT '[]'::jsonb,
  image                 text NOT NULL DEFAULT '',
  image_alt             text NOT NULL DEFAULT '',
  gallery               jsonb NOT NULL DEFAULT '[]'::jsonb,
  short_description     text NOT NULL DEFAULT '',
  full_description      text NOT NULL DEFAULT '',
  amenities             jsonb NOT NULL DEFAULT '[]'::jsonb,
  event_types           jsonb NOT NULL DEFAULT '[]'::jsonb,
  features              jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title             text NOT NULL DEFAULT '',
  seo_description       text NOT NULL DEFAULT '',
  canonical_url         text NOT NULL DEFAULT '',
  og_image              text NOT NULL DEFAULT '',
  robots                text NOT NULL DEFAULT 'index,follow',
  structured_data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_notes        text NOT NULL DEFAULT '',
  verification_status   text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  owner_id              integer REFERENCES admin_users(id) ON DELETE SET NULL,
  featured              boolean NOT NULL DEFAULT false,
  rank                  integer NOT NULL DEFAULT 0,
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','published','unpublished','rejected','archived')),
  published_at          timestamptz,
  deleted_at            timestamptz,
  created_by            integer REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS venues_status_idx ON venues(status, created_at DESC);
CREATE INDEX IF NOT EXISTS venues_country_idx ON venues(country_id);
CREATE INDEX IF NOT EXISTS venues_city_idx ON venues(city_id);
CREATE INDEX IF NOT EXISTS venues_featured_idx ON venues(featured, rank);
CREATE INDEX IF NOT EXISTS venues_deleted_idx ON venues(deleted_at);
CREATE INDEX IF NOT EXISTS venues_name_search_idx ON venues(lower(name));

CREATE TABLE IF NOT EXISTS venue_amenities (
  venue_id   integer NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  amenity_id integer NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (venue_id, amenity_id)
);

CREATE TABLE IF NOT EXISTS venue_media (
  venue_id  integer NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  media_id  integer NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'gallery',
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (venue_id, media_id)
);
CREATE INDEX IF NOT EXISTS venue_media_venue_idx ON venue_media(venue_id, sort_order);

CREATE TABLE IF NOT EXISTS venue_spaces (
  id            serial PRIMARY KEY,
  venue_id      integer NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name          text NOT NULL,
  capacity      integer NOT NULL DEFAULT 0,
  setting       text NOT NULL DEFAULT 'Indoor',
  hourly_price  numeric(14,2),
  is_active     boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS venue_spaces_venue_idx ON venue_spaces(venue_id);

-- ── Content: cities, blogs, pages, homepage ─────────────────────────────────
CREATE TABLE IF NOT EXISTS blogs (
  id              serial PRIMARY KEY,
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  excerpt         text NOT NULL DEFAULT '',
  category        text NOT NULL DEFAULT 'General',
  author          text NOT NULL DEFAULT 'Team VOMP',
  published_on    date NOT NULL DEFAULT CURRENT_DATE,
  reading_minutes integer NOT NULL DEFAULT 5,
  image           text NOT NULL DEFAULT '',
  image_alt       text NOT NULL DEFAULT '',
  body            jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title       text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  canonical_url   text NOT NULL DEFAULT '',
  robots          text NOT NULL DEFAULT 'index,follow',
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at    timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blogs_status_idx ON blogs(status, published_on DESC);

CREATE TABLE IF NOT EXISTS pages (
  id              serial PRIMARY KEY,
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  blocks          jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title       text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  canonical_url   text NOT NULL DEFAULT '',
  og_image        text NOT NULL DEFAULT '',
  robots          text NOT NULL DEFAULT 'index,follow',
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at    timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS page_revisions (
  id         bigserial PRIMARY KEY,
  page_id    integer NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  snapshot   jsonb NOT NULL,
  created_by integer REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS homepage_sections (
  id         serial PRIMARY KEY,
  key        text NOT NULL UNIQUE,
  type       text NOT NULL,
  title      text NOT NULL DEFAULT '',
  subtitle   text NOT NULL DEFAULT '',
  content    jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  visible    boolean NOT NULL DEFAULT true,
  background text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS navigation_items (
  id         serial PRIMARY KEY,
  location   text NOT NULL DEFAULT 'header' CHECK (location IN ('header','footer')),
  label      text NOT NULL,
  url        text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  visible    boolean NOT NULL DEFAULT true,
  parent_id  integer REFERENCES navigation_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcements (
  id         serial PRIMARY KEY,
  message    text NOT NULL,
  link_url   text NOT NULL DEFAULT '',
  link_label text NOT NULL DEFAULT '',
  starts_at  timestamptz,
  ends_at    timestamptz,
  visible    boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faqs (
  id         serial PRIMARY KEY,
  question   text NOT NULL,
  answer     text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  visible    boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS reviews (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  context    text NOT NULL DEFAULT '',
  quote      text NOT NULL DEFAULT '',
  rating     integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  image      text NOT NULL DEFAULT '',
  venue_slug text NOT NULL DEFAULT '',
  featured   boolean NOT NULL DEFAULT false,
  status     text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── CRM, bookings and finance ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL DEFAULT '',
  phone      text NOT NULL DEFAULT '',
  country_id integer REFERENCES countries(id),
  notes      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_uidx ON customers(lower(email)) WHERE email <> '';

CREATE TABLE IF NOT EXISTS bookings (
  id              serial PRIMARY KEY,
  reference       text NOT NULL UNIQUE,
  venue_id        integer NOT NULL REFERENCES venues(id),
  space_id        integer REFERENCES venue_spaces(id) ON DELETE SET NULL,
  customer_id     integer REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   text NOT NULL,
  customer_email  text NOT NULL DEFAULT '',
  customer_phone  text NOT NULL DEFAULT '',
  event_type      text NOT NULL DEFAULT '',
  event_date      date NOT NULL,
  start_time      time,
  end_time        time,
  timezone        text NOT NULL DEFAULT 'Asia/Kolkata',
  guest_count     integer NOT NULL DEFAULT 0 CHECK (guest_count >= 0),
  status          text NOT NULL DEFAULT 'enquiry' CHECK (status IN ('enquiry','pending','confirmed','completed','cancelled','no_show')),
  currency        char(3) NOT NULL DEFAULT 'INR',
  subtotal        numeric(14,2) NOT NULL DEFAULT 0,
  taxes           numeric(14,2) NOT NULL DEFAULT 0,
  total           numeric(14,2) NOT NULL DEFAULT 0,
  deposit_paid    numeric(14,2) NOT NULL DEFAULT 0,
  payment_status  text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
  internal_notes  text NOT NULL DEFAULT '',
  quotation       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      integer REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  cancelled_at    timestamptz
);
CREATE INDEX IF NOT EXISTS bookings_venue_date_idx ON bookings(venue_id, event_date);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status, event_date);
CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings(customer_id);

CREATE TABLE IF NOT EXISTS booking_status_history (
  id         bigserial PRIMARY KEY,
  booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status text,
  to_status  text NOT NULL,
  note       text NOT NULL DEFAULT '',
  actor_id   integer REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id             serial PRIMARY KEY,
  booking_id     integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider       text NOT NULL DEFAULT '',
  provider_ref   text NOT NULL DEFAULT '',
  amount         numeric(14,2) NOT NULL,
  currency       char(3) NOT NULL DEFAULT 'INR',
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','refunded')),
  paid_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  phone       text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  city        text NOT NULL DEFAULT '',
  event_type  text NOT NULL DEFAULT '',
  event_date  text NOT NULL DEFAULT '',
  guest_count text NOT NULL DEFAULT '',
  message     text,
  venue_name  text,
  source      text NOT NULL DEFAULT 'website',
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','replied','archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enquiries_status_idx ON enquiries(status, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id         bigserial PRIMARY KEY,
  type       text NOT NULL,
  recipient  text NOT NULL DEFAULT '',
  subject    text NOT NULL DEFAULT '',
  body       text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  provider   text NOT NULL DEFAULT '',
  provider_ref text NOT NULL DEFAULT '',
  error      text NOT NULL DEFAULT '',
  attempts   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at    timestamptz
);

-- ── Settings, integrations and SEO ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  key         text PRIMARY KEY,
  enabled     boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integrations (
  key         text PRIMARY KEY,
  provider    text NOT NULL DEFAULT '',
  enabled     boolean NOT NULL DEFAULT false,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_tested_at timestamptz,
  last_test_ok   boolean,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redirects (
  id         serial PRIMARY KEY,
  from_path  text NOT NULL UNIQUE,
  to_path    text NOT NULL,
  status_code integer NOT NULL DEFAULT 301 CHECK (status_code IN (301,302,307,308)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id            serial PRIMARY KEY,
  code          text NOT NULL UNIQUE,
  description   text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(14,2) NOT NULL DEFAULT 0,
  starts_at     timestamptz,
  ends_at       timestamptz,
  max_uses      integer,
  used_count    integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
