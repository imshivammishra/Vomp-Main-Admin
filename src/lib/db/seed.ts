import fs from "node:fs";
import path from "node:path";
import { Country as CscCountry, State as CscState } from "country-state-city";
import worldCountries from "world-countries";
import bcrypt from "bcryptjs";
// The seed runs *inside* ensureDatabase(), so it must use the raw query helpers;
// the regular query/execute/one helpers would await the very migration promise
// that is currently executing and deadlock.
import { rawQuery as query, rawExecute as execute, rawOne as one } from "./client";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "../rbac";

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(file: string, fallback: T): T {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function seedRoles(): Promise<void> {
  for (const role of ROLES) {
    await query(
      `INSERT INTO roles (key, name, description, is_system)
       VALUES ($1,$2,$3,true)
       ON CONFLICT (key) DO UPDATE SET name = excluded.name, description = excluded.description`,
      [role.key, role.name, role.description]
    );
  }
  for (const [key, description] of PERMISSIONS) {
    await query(
      `INSERT INTO permissions (key, description) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET description = excluded.description`,
      [key, description]
    );
  }
  for (const [roleKey, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await execute(
      `DELETE FROM role_permissions
       WHERE role_id = (SELECT id FROM roles WHERE key = $1)`,
      [roleKey]
    );
    await execute(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r, permissions p
       WHERE r.key = $1 AND p.key = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [roleKey, permissions]
    );
  }
}

async function seedGeography(): Promise<void> {
  const iso3 = new Map<string, string>(
    worldCountries.map((c) => [c.cca2, c.cca3])
  );
  const callingCode = new Map<string, string>(
    worldCountries.map((c) => [
      c.cca2,
      c.idd?.root
        ? `${c.idd.root}${c.idd.suffixes?.[0] ?? ""}`.replace(/^\+?/, "+")
        : "",
    ])
  );

  const all = CscCountry.getAllCountries();
  const values: unknown[] = [];
  const tuples: string[] = [];
  all.forEach((c, i) => {
    // Six placeholders per row; `active` is a literal, so advance by 6.
    const base = i * 6;
    tuples.push(
      `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},false)`
    );
    values.push(
      c.isoCode,
      iso3.get(c.isoCode) ?? "",
      c.name,
      callingCode.get(c.isoCode) ?? (c.phonecode ? `+${c.phonecode}` : ""),
      c.flag ?? "",
      c.currency ?? ""
    );
  });
  await query(
    `INSERT INTO countries (iso2, iso3, name, calling_code, flag, currency, active)
     VALUES ${tuples.join(",")}
     ON CONFLICT (iso2) DO NOTHING`,
    values
  );

  // Activate the launch markets without deactivating anything an admin set.
  await execute(`UPDATE countries SET active = true WHERE iso2 IN ('IN','IT')`);

  const countryIds = await query<{ id: number; iso2: string }>(
    "SELECT id, iso2 FROM countries"
  );
  const idByIso = new Map(countryIds.map((r) => [r.iso2.trim(), r.id]));

  // Skip countries that already have states so a partially completed seed
  // resumes instead of duplicating work.
  const seeded = new Set(
    (await query<{ country_id: number }>("SELECT DISTINCT country_id FROM states")).map(
      (row) => Number(row.country_id)
    )
  );

  const stateValues: unknown[] = [];
  const stateTuples: string[] = [];
  let n = 0;
  for (const c of all) {
    const countryId = idByIso.get(c.isoCode);
    if (!countryId || seeded.has(countryId)) continue;
    for (const s of CscState.getStatesOfCountry(c.isoCode)) {
      const base = n * 5;
      stateTuples.push(
        `($${base + 1},$${base + 2},$${base + 3},$${base + 4}::numeric,$${base + 5}::numeric)`
      );
      stateValues.push(
        countryId,
        s.isoCode ?? "",
        s.name,
        s.latitude ? Number(s.latitude) : null,
        s.longitude ? Number(s.longitude) : null
      );
      n++;
      if (stateTuples.length >= 400) {
        await query(
          `INSERT INTO states (country_id, code, name, latitude, longitude)
           VALUES ${stateTuples.join(",")} ON CONFLICT DO NOTHING`,
          stateValues
        );
        stateTuples.length = 0;
        stateValues.length = 0;
        n = 0;
      }
    }
  }
  if (stateTuples.length) {
    await query(
      `INSERT INTO states (country_id, code, name, latitude, longitude)
       VALUES ${stateTuples.join(",")} ON CONFLICT DO NOTHING`,
      stateValues
    );
  }
}

const DEFAULT_SETTINGS: Record<string, string> = {
  brandName: "Venue On My Plate",
  tagline: "Find a venue worthy of your occasion",
  email: "hello@venueonmyplate.in",
  phone: "+91 98765 43210",
  whatsapp: "+919462460555",
  address: "Udaipur · Jaipur · Jodhpur · Jaisalmer · Goa",
  hours: "Mon–Sat, 10am–7pm IST",
  responseNote: "We respond within one business day.",
  footerNote: "Luxury venue discovery across India and Italy.",
  instagram: "https://instagram.com/venueonmyplate",
  facebook: "",
  youtube: "",
  twitter: "",
  seoTitle: "Venue On My Plate — Luxury Venue Discovery",
  seoDescription:
    "Find and book luxury wedding and event venues across India and Italy.",
  seoKeywords: "wedding venue, event venue, luxury venue, India, Italy",
  heroTitle: "Find a Venue Worthy of Your Occasion",
  heroSubtitle:
    "Curated luxury venues for weddings, corporate events, and celebrations.",
  heroTagline: "Discover · Compare · Book",
  featuredSectionTitle: "Featured Venues",
  featuredSectionSubtitle: "Hand-picked spaces trusted by thousands of hosts.",
  ctaTitle: "Ready to find your perfect venue?",
  ctaCopy: "Let our experts guide you to the ideal space for your next event.",
  currency: "INR",
  locale: "en-IN",
  timezone: "Asia/Kolkata",
  taxPct: "18",
  bookingLeadDays: "7",
  cancellationPolicy:
    "Cancellation terms are confirmed in the venue proposal before any payment.",
};

async function seedSettings(): Promise<void> {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await execute(
      `INSERT INTO settings (key, value) VALUES ($1,$2)
       ON CONFLICT (key) DO NOTHING`,
      [key, value]
    );
  }

  const sections = [
    { key: "hero", type: "hero", title: "Find a Venue Worthy of Your Occasion", sort: 10 },
    { key: "featured", type: "featured_venues", title: "Featured Venues", sort: 20 },
    { key: "destinations", type: "destinations", title: "Destinations", sort: 30 },
    { key: "testimonials", type: "testimonials", title: "What hosts say", sort: 40 },
    { key: "faq", type: "faq", title: "Frequently asked questions", sort: 50 },
    { key: "cta", type: "cta", title: "Ready to find your perfect venue?", sort: 60 },
  ];
  for (const section of sections) {
    await execute(
      `INSERT INTO homepage_sections (key, type, title, sort_order)
       VALUES ($1,$2,$3,$4) ON CONFLICT (key) DO NOTHING`,
      [section.key, section.type, section.title, section.sort]
    );
  }

  const nav = [
    ["header", "Venues", "/venues", 10],
    ["header", "Destinations", "/cities", 20],
    ["header", "Journal", "/blogs", 30],
    ["header", "About", "/about", 40],
    ["header", "Contact", "/contact", 50],
    ["footer", "Privacy", "/privacy", 10],
    ["footer", "Terms", "/terms", 20],
    ["footer", "Partner with us", "/partner", 30],
  ] as const;
  for (const [location, label, url, sort] of nav) {
    await execute(
      `INSERT INTO navigation_items (location, label, url, sort_order)
       SELECT $1,$2,$3,$4
       WHERE NOT EXISTS (
         SELECT 1 FROM navigation_items WHERE location = $1 AND url = $3
       )`,
      [location, label, url, sort]
    );
  }

  const flags: Array<[string, boolean, string]> = [
    ["bookings_enabled", true, "Allow creating and confirming bookings."],
    ["online_payments", false, "Enable online payment collection."],
    ["public_reviews", true, "Show approved testimonials on the public website."],
    ["maintenance_mode", false, "Show a maintenance notice on the public website."],
  ];
  for (const [key, enabled, description] of flags) {
    await execute(
      `INSERT INTO feature_flags (key, enabled, description) VALUES ($1,$2,$3)
       ON CONFLICT (key) DO NOTHING`,
      [key, enabled, description]
    );
  }

  for (const key of ["email", "sms", "storage", "maps", "payments", "analytics", "monitoring"]) {
    await execute(
      `INSERT INTO integrations (key) VALUES ($1) ON CONFLICT (key) DO NOTHING`,
      [key]
    );
  }
}

async function seedAdmin(): Promise<void> {
  const row = await one<{ count: string }>("SELECT COUNT(*)::text AS count FROM admin_users");
  if (Number(row?.count ?? 0) > 0) return;
  const email = (process.env.ADMIN_EMAIL ?? "admin@venueonmyplate.in")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "vomp2024";
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.ADMIN_PASSWORD || password === "vomp2024")
  ) {
    console.warn(
      "[seed] Refusing to create the default admin in production. Set ADMIN_EMAIL and ADMIN_PASSWORD."
    );
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO admin_users (email, name, password_hash, role_id)
     VALUES ($1,$2,$3,(SELECT id FROM roles WHERE key = 'super_admin'))`,
    [email, "Admin", hash]
  );
}

async function legacyJsonMigration(): Promise<void> {
  const vCount = await one<{ count: string }>("SELECT COUNT(*)::text AS count FROM venues");
  if (Number(vCount?.count ?? 0) > 0) return;

  const cities = readJson<Array<Record<string, unknown>>>("cities.json", []);
  for (const c of cities) {
    const country = await one<{ id: number }>(
      "SELECT id FROM countries WHERE iso2 = $1 OR name = $2 LIMIT 1",
      [String(c.countryCode ?? ""), String(c.country ?? "")]
    );
    if (!country) continue;
    await execute(
      `INSERT INTO cities (slug,name,country_id,tagline,description,image,image_alt,venue_count_label,popular_types,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
       ON CONFLICT (slug) DO NOTHING`,
      [
        c.slug, c.name, country.id, c.tagline ?? "", c.description ?? "",
        c.image ?? "", c.imageAlt ?? "", c.venueCountLabel ?? "Curated venues",
        JSON.stringify(c.popularTypes ?? []), c.status ?? "published",
      ]
    );
  }

  const venues = readJson<Array<Record<string, unknown>>>("venues.json", []);
  for (const v of venues) {
    const country = await one<{ id: number }>(
      "SELECT id FROM countries WHERE iso2 = $1 OR name = $2 LIMIT 1",
      [String(v.countryCode ?? ""), String(v.country ?? "")]
    );
    const city = await one<{ id: number }>("SELECT id FROM cities WHERE slug = $1 LIMIT 1", [
      v.citySlug,
    ]);
    await execute(
      `INSERT INTO venues (
        slug,name,country_id,city_id,city,city_slug,area,type,setting,
        capacity_min,capacity_max,price_hint,image,image_alt,short_description,
        amenities,event_types,featured,status,created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19,
        (SELECT id FROM admin_users ORDER BY id LIMIT 1))
       ON CONFLICT (slug) DO NOTHING`,
      [
        v.slug, v.name, country?.id ?? null, city?.id ?? null, v.city ?? "",
        v.citySlug ?? "", v.area ?? "", v.type ?? "", v.setting ?? "Indoor",
        v.capacityMin ?? 50, v.capacityMax ?? 500, v.priceHint ?? null,
        v.image ?? "", v.imageAlt ?? "", v.shortDescription ?? "",
        JSON.stringify(v.amenities ?? []), JSON.stringify(v.eventTypes ?? []),
        v.featured ? true : false, v.status ?? "draft",
      ]
    );
  }

  const blogs = readJson<Array<Record<string, unknown>>>("blogs.json", []);
  for (const b of blogs) {
    await execute(
      `INSERT INTO blogs (slug,title,excerpt,category,author,published_on,reading_minutes,image,image_alt,body,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
       ON CONFLICT (slug) DO NOTHING`,
      [
        b.slug, b.title, b.excerpt ?? "", b.category ?? "General",
        b.author ?? "Team VOMP", b.publishedOn ?? new Date().toISOString().slice(0, 10),
        b.readingMinutes ?? 5, b.image ?? "", b.imageAlt ?? "",
        JSON.stringify(b.body ?? []), b.status ?? "draft",
      ]
    );
  }

  const reviews = readJson<Array<Record<string, unknown>>>("reviews.json", []);
  for (const r of reviews) {
    await execute(
      `INSERT INTO reviews (name,context,quote,rating,image,venue_slug,featured,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        r.name, r.context ?? "", r.quote ?? "", r.rating ?? 5, r.image ?? "",
        r.venueSlug ?? "", r.featured ? true : false, r.status ?? "draft",
      ]
    );
  }

  const enquiries = readJson<Array<Record<string, unknown>>>("enquiries.json", []);
  for (const e of enquiries) {
    await execute(
      `INSERT INTO enquiries (name,phone,email,city,event_type,event_date,guest_count,message,venue_name,source,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        e.name, e.phone ?? "", e.email ?? "", e.city ?? "", e.eventType ?? "",
        e.eventDate ?? "", e.guestCount ?? "", e.message ?? null,
        e.venueName ?? null, e.source ?? "website", e.status ?? "new",
      ]
    );
  }

  const media = readJson<Array<Record<string, unknown>>>("media.json", []);
  for (const m of media) {
    await execute(
      `INSERT INTO media (url,filename,original_name,size,mime_type,kind)
       VALUES ($1,$2,$3,$4,$5,'image')`,
      [m.url, m.filename, m.filename, m.size ?? 0, m.mimeType ?? "image/jpeg"]
    );
  }

  const settings = readJson<Record<string, unknown>>("settings.json", {});
  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined || value === null) continue;
    await execute(
      `INSERT INTO settings (key,value) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()`,
      [key, String(value)]
    );
  }
}

export async function seedCore(): Promise<void> {
  await seedRoles();
  await seedGeography();
  await seedSettings();
  await seedAdmin();
  await legacyJsonMigration();
}
