/**
 * Simple file-based JSON database.
 * Data lives in <project-root>/data/ and is read/written synchronously.
 */
import fs from "fs";
import path from "path";
import type { Venue, City, Country, BlogPost, Review, SiteSettings, MediaFile, Enquiry } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  ensure();
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) as T; }
  catch { return fallback; }
}

function writeJson<T>(file: string, data: T): void {
  ensure();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf-8");
}

function nextId(items: Array<{ id: string }>): string {
  const max = items.reduce((m, i) => Math.max(m, parseInt(i.id) || 0), 0);
  return String(max + 1);
}

// ── Venues ────────────────────────────────────────────────────────────────────
export const venuesDb = {
  list: (): Venue[] => readJson<Venue[]>("venues.json", []),
  get: (id: string): Venue | undefined => venuesDb.list().find(v => v.id === id || v.slug === id),
  create: (data: Omit<Venue, "id" | "createdAt" | "updatedAt">): Venue => {
    const venues = venuesDb.list();
    const venue: Venue = { ...data, id: nextId(venues), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    writeJson("venues.json", [...venues, venue]);
    return venue;
  },
  update: (id: string, data: Partial<Venue>): Venue | null => {
    const venues = venuesDb.list();
    const idx = venues.findIndex(v => v.id === id);
    if (idx === -1) return null;
    venues[idx] = { ...venues[idx], ...data, id, updatedAt: new Date().toISOString() };
    writeJson("venues.json", venues);
    return venues[idx];
  },
  delete: (id: string): boolean => {
    const venues = venuesDb.list();
    const next = venues.filter(v => v.id !== id);
    if (next.length === venues.length) return false;
    writeJson("venues.json", next);
    return true;
  },
};

// ── Cities ────────────────────────────────────────────────────────────────────
export const citiesDb = {
  list: (): City[] => readJson<City[]>("cities.json", []),
  get: (id: string): City | undefined => citiesDb.list().find(c => c.id === id || c.slug === id),
  create: (data: Omit<City, "id">): City => {
    const cities = citiesDb.list();
    const city: City = { ...data, id: nextId(cities) };
    writeJson("cities.json", [...cities, city]);
    return city;
  },
  update: (id: string, data: Partial<City>): City | null => {
    const cities = citiesDb.list();
    const idx = cities.findIndex(c => c.id === id);
    if (idx === -1) return null;
    cities[idx] = { ...cities[idx], ...data, id };
    writeJson("cities.json", cities);
    return cities[idx];
  },
  delete: (id: string): boolean => {
    const cities = citiesDb.list();
    const next = cities.filter(c => c.id !== id);
    if (next.length === cities.length) return false;
    writeJson("cities.json", next);
    return true;
  },
};

// ── Countries ─────────────────────────────────────────────────────────────────
export const countriesDb = {
  list: (): Country[] => readJson<Country[]>("countries.json", []),
  get: (id: string): Country | undefined => countriesDb.list().find(c => c.id === id),
  create: (data: Omit<Country, "id">): Country => {
    const countries = countriesDb.list();
    const country: Country = { ...data, id: nextId(countries) };
    writeJson("countries.json", [...countries, country]);
    return country;
  },
  update: (id: string, data: Partial<Country>): Country | null => {
    const countries = countriesDb.list();
    const idx = countries.findIndex(c => c.id === id);
    if (idx === -1) return null;
    countries[idx] = { ...countries[idx], ...data, id };
    writeJson("countries.json", countries);
    return countries[idx];
  },
  delete: (id: string): boolean => {
    const countries = countriesDb.list();
    const next = countries.filter(c => c.id !== id);
    if (next.length === countries.length) return false;
    writeJson("countries.json", next);
    return true;
  },
};

// ── Blogs ─────────────────────────────────────────────────────────────────────
export const blogsDb = {
  list: (): BlogPost[] => readJson<BlogPost[]>("blogs.json", []),
  get: (id: string): BlogPost | undefined => blogsDb.list().find(b => b.id === id || b.slug === id),
  create: (data: Omit<BlogPost, "id">): BlogPost => {
    const blogs = blogsDb.list();
    const blog: BlogPost = { ...data, id: nextId(blogs) };
    writeJson("blogs.json", [...blogs, blog]);
    return blog;
  },
  update: (id: string, data: Partial<BlogPost>): BlogPost | null => {
    const blogs = blogsDb.list();
    const idx = blogs.findIndex(b => b.id === id);
    if (idx === -1) return null;
    blogs[idx] = { ...blogs[idx], ...data, id };
    writeJson("blogs.json", blogs);
    return blogs[idx];
  },
  delete: (id: string): boolean => {
    const blogs = blogsDb.list();
    const next = blogs.filter(b => b.id !== id);
    if (next.length === blogs.length) return false;
    writeJson("blogs.json", next);
    return true;
  },
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsDb = {
  list: (): Review[] => readJson<Review[]>("reviews.json", []),
  get: (id: string): Review | undefined => reviewsDb.list().find(r => r.id === id),
  update: (id: string, data: Partial<Review>): Review | null => {
    const reviews = reviewsDb.list();
    const idx = reviews.findIndex(r => r.id === id);
    if (idx === -1) return null;
    reviews[idx] = { ...reviews[idx], ...data, id };
    writeJson("reviews.json", reviews);
    return reviews[idx];
  },
  delete: (id: string): boolean => {
    const reviews = reviewsDb.list();
    const next = reviews.filter(r => r.id !== id);
    if (next.length === reviews.length) return false;
    writeJson("reviews.json", next);
    return true;
  },
};

// ── Settings ──────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: SiteSettings = {
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
  seoDescription: "Find and book luxury wedding and event venues across India and Italy.",
  seoKeywords: "wedding venue, event venue, luxury venue, India, Italy",
  heroTitle: "Find a Venue Worthy of Your Occasion",
  heroSubtitle: "Curated luxury venues for weddings, corporate events, and celebrations.",
  heroTagline: "Discover · Compare · Book",
  featuredSectionTitle: "Featured Venues",
  featuredSectionSubtitle: "Hand-picked spaces trusted by thousands of hosts.",
  ctaTitle: "Ready to find your perfect venue?",
  ctaCopy: "Let our experts guide you to the ideal space for your next event.",
};

export const settingsDb = {
  get: (): SiteSettings => readJson<SiteSettings>("settings.json", DEFAULT_SETTINGS),
  update: (data: Partial<SiteSettings>): SiteSettings => {
    const settings = { ...settingsDb.get(), ...data };
    writeJson("settings.json", settings);
    return settings;
  },
};

// ── Media ─────────────────────────────────────────────────────────────────────
export const mediaDb = {
  list: (): MediaFile[] => readJson<MediaFile[]>("media.json", []),
  add: (file: Omit<MediaFile, "id">): MediaFile => {
    const media = mediaDb.list();
    const item: MediaFile = { ...file, id: nextId(media) };
    writeJson("media.json", [...media, item]);
    return item;
  },
  delete: (id: string): boolean => {
    const media = mediaDb.list();
    const next = media.filter(m => m.id !== id);
    if (next.length === media.length) return false;
    writeJson("media.json", next);
    return true;
  },
};

// ── Enquiries ────────────────────────────────────────────────────────────────
export const enquiriesDb = {
  list: (): Enquiry[] => readJson<Enquiry[]>("enquiries.json", []),
  get: (id: string): Enquiry | undefined => enquiriesDb.list().find(e => e.id === id),
  create: (data: Omit<Enquiry, "id" | "createdAt">): Enquiry => {
    const enquiries = enquiriesDb.list();
    const enquiry: Enquiry = { ...data, id: nextId(enquiries as Array<{ id: string }>), createdAt: new Date().toISOString() };
    writeJson("enquiries.json", [...enquiries, enquiry]);
    return enquiry;
  },
  update: (id: string, data: Partial<Enquiry>): Enquiry | null => {
    const enquiries = enquiriesDb.list();
    const idx = enquiries.findIndex(e => e.id === id);
    if (idx === -1) return null;
    enquiries[idx] = { ...enquiries[idx], ...data, id };
    writeJson("enquiries.json", enquiries);
    return enquiries[idx];
  },
  delete: (id: string): boolean => {
    const enquiries = enquiriesDb.list();
    const next = enquiries.filter(e => e.id !== id);
    if (next.length === enquiries.length) return false;
    writeJson("enquiries.json", next);
    return true;
  },
};
