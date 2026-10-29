/**
 * Typed repositories. Every write is validated and every query is parameterised.
 */
import { query, one, execute, transaction } from "./db/client";
import { City as GeoCity, State as GeoState } from "country-state-city";
import type {
  Venue, City, Country, BlogPost, Review, SiteSettings, Enquiry, MediaFile,
  AdminUser, AdminUserRecord, Booking, WebsitePage, AuditLogEntry, State,
} from "@/types";

// ── helpers ──────────────────────────────────────────────────────────────────
function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}
function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === 1;
}
function asJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}
function iso(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
function clampInt(value: unknown, fallback: number, min = 0, max = 1_000_000): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function cleanText(value: unknown, max = 20_000): string {
  if (typeof value !== "string") return "";
  // Remove null characters for security
  // eslint-disable-next-line no-control-regex
  return value.replace(/\u0000/g, "").slice(0, max);
}
function cleanSlug(value: unknown): string {
  return cleanText(value, 200)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class ValidationError extends Error {
  status = 422;
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super(Object.values(fields)[0] ?? "Validation failed");
    this.fields = fields;
  }
}

// ── Venues ───────────────────────────────────────────────────────────────────
interface VenueRow extends Record<string, unknown> {
  country_code?: string;
  country_name?: string;
}

function rowToVenue(row: VenueRow): Venue {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    country: String(row.country_name ?? ""),
    countryCode: String(row.country_code ?? "").trim(),
    countryId: row.country_id ? asNumber(row.country_id) : undefined,
    stateId: row.state_id ? asNumber(row.state_id) : null,
    city: String(row.city ?? ""),
    citySlug: String(row.city_slug ?? ""),
    cityId: row.city_id ? asNumber(row.city_id) : null,
    area: String(row.area ?? ""),
    address: String(row.address ?? ""),
    postalCode: String(row.postal_code ?? ""),
    latitude: row.latitude === null || row.latitude === undefined ? null : asNumber(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : asNumber(row.longitude),
    timezone: String(row.timezone ?? "Asia/Kolkata"),
    type: String(row.type ?? ""),
    setting: (row.setting as Venue["setting"]) ?? "Indoor",
    capacityMin: asNumber(row.capacity_min),
    capacityMax: asNumber(row.capacity_max),
    indoorCapacity: row.indoor_capacity == null ? null : asNumber(row.indoor_capacity),
    outdoorCapacity: row.outdoor_capacity == null ? null : asNumber(row.outdoor_capacity),
    roomsCount: row.rooms_count == null ? null : asNumber(row.rooms_count),
    parking: asBool(row.parking),
    accessible: asBool(row.accessible),
    catering: asBool(row.catering),
    accommodation: asBool(row.accommodation),
    decoration: asBool(row.decoration),
    priceHint: row.price_hint ? String(row.price_hint) : undefined,
    startingPrice: row.starting_price == null ? null : asNumber(row.starting_price),
    currency: String(row.currency ?? "INR"),
    pricingUnit: String(row.pricing_unit ?? "per_event"),
    packages: asJson(row.packages, []),
    taxesPct: asNumber(row.taxes_pct),
    securityDeposit: row.security_deposit == null ? null : asNumber(row.security_deposit),
    minBookingHours: row.min_booking_hours == null ? null : asNumber(row.min_booking_hours),
    bookingLeadDays: asNumber(row.booking_lead_days),
    cancellationPolicy: String(row.cancellation_policy ?? ""),
    rules: String(row.rules ?? ""),
    openingHours: asJson(row.opening_hours, {}),
    blackoutDates: asJson(row.blackout_dates, []),
    image: String(row.image ?? ""),
    imageAlt: String(row.image_alt ?? ""),
    gallery: asJson(row.gallery, []),
    shortDescription: String(row.short_description ?? ""),
    fullDescription: String(row.full_description ?? ""),
    amenities: asJson(row.amenities, []),
    eventTypes: asJson(row.event_types, []),
    features: asJson(row.features, []),
    seoTitle: String(row.seo_title ?? ""),
    seoDescription: String(row.seo_description ?? ""),
    canonicalUrl: String(row.canonical_url ?? ""),
    ogImage: String(row.og_image ?? ""),
    robots: String(row.robots ?? "index,follow"),
    internalNotes: String(row.internal_notes ?? ""),
    verificationStatus: (row.verification_status as Venue["verificationStatus"]) ?? "unverified",
    featured: asBool(row.featured),
    rank: asNumber(row.rank),
    status: (row.status as Venue["status"]) ?? "draft",
    publishedAt: row.published_at ? iso(row.published_at) : null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    deletedAt: row.deleted_at ? iso(row.deleted_at) : null,
  };
}

const VENUE_SELECT = `
  SELECT v.*, c.iso2 AS country_code, c.name AS country_name
  FROM venues v
  LEFT JOIN countries c ON c.id = v.country_id
`;

export interface VenueFilter {
  status?: string;
  country?: string;
  search?: string;
  city?: string;
  type?: string;
  featured?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

function venueFilterSql(filter: VenueFilter = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (!filter.includeDeleted) where.push("v.deleted_at IS NULL");
  if (filter.status) { params.push(filter.status); where.push(`v.status = $${params.length}`); }
  if (filter.country) {
    params.push(filter.country);
    where.push(`(c.iso2 = $${params.length} OR c.name = $${params.length})`);
  }
  if (filter.city) {
    params.push(filter.city);
    where.push(`(lower(v.city) = lower($${params.length}) OR v.city_slug = $${params.length})`);
  }
  if (filter.type) { params.push(filter.type); where.push(`v.type = $${params.length}`); }
  if (filter.featured !== undefined) { params.push(filter.featured); where.push(`v.featured = $${params.length}`); }
  if (filter.search) {
    const q = `%${cleanText(filter.search, 100)}%`;
    params.push(q, q, q, q);
    where.push(`(v.name ILIKE $${params.length - 3} OR v.city ILIKE $${params.length - 2} OR v.area ILIKE $${params.length - 1} OR v.short_description ILIKE $${params.length})`);
  }
  return { where: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

export const venuesDb = {
  async list(filter: VenueFilter = {}) {
    const { where, params } = venueFilterSql(filter);
    const limit = clampInt(filter.limit, 20, 1, 200);
    const page = clampInt(filter.page, 1, 1, 100_000);
    const allowedSort: Record<string, string> = {
      createdAt: "v.created_at",
      updatedAt: "v.updated_at",
      name: "v.name",
      rank: "v.rank",
      status: "v.status",
    };
    const sort = allowedSort[filter.sort ?? "createdAt"] ?? "v.created_at";
    const order = filter.order === "asc" ? "ASC" : "DESC";
    const count = await one<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM venues v LEFT JOIN countries c ON c.id = v.country_id ${where}`,
      params
    );
    const rows = await query<VenueRow>(
      `${VENUE_SELECT} ${where} ORDER BY ${sort} ${order}, v.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );
    return { data: rows.map(rowToVenue), total: Number(count?.count ?? 0), page };
  },

  async get(idOrSlug: string): Promise<Venue | undefined> {
    const key = cleanText(idOrSlug, 200);
    if (!key) return undefined;
    const numericId = /^\d+$/.test(key) ? Number(key) : -1;
    const row = await one<VenueRow>(
      `${VENUE_SELECT} WHERE (v.id = $1 OR v.slug = $2) LIMIT 1`,
      [numericId, key]
    );
    return row ? rowToVenue(row) : undefined;
  },

  async create(input: Partial<Venue>, actorId?: number): Promise<Venue> {
    const data = normaliseVenue(input, true);
    const row = await one<{ id: number }>(
      `INSERT INTO venues (
        slug,name,country_id,state_id,city_id,city,city_slug,area,address,postal_code,
        latitude,longitude,timezone,type,setting,capacity_min,capacity_max,
        indoor_capacity,outdoor_capacity,rooms_count,parking,accessible,catering,
        accommodation,decoration,price_hint,starting_price,currency,pricing_unit,
        packages,taxes_pct,security_deposit,min_booking_hours,booking_lead_days,
        cancellation_policy,rules,opening_hours,blackout_dates,image,image_alt,gallery,
        short_description,full_description,amenities,event_types,features,seo_title,
        seo_description,canonical_url,og_image,robots,internal_notes,verification_status,
        featured,rank,status,published_at,created_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30::jsonb,$31,$32,$33,$34,$35,$36,
        $37::jsonb,$38::jsonb,$39,$40,$41::jsonb,$42,$43,$44::jsonb,$45::jsonb,
        $46::jsonb,$47,$48,$49,$50,$51,$52,$53,$54,$55,$56,$57,$58
      ) RETURNING id`,
      [
        data.slug, data.name, data.countryId, data.stateId, data.cityId, data.city,
        data.citySlug, data.area, data.address, data.postalCode, data.latitude,
        data.longitude, data.timezone, data.type, data.setting, data.capacityMin,
        data.capacityMax, data.indoorCapacity, data.outdoorCapacity, data.roomsCount,
        data.parking, data.accessible, data.catering, data.accommodation,
        data.decoration, data.priceHint, data.startingPrice, data.currency,
        data.pricingUnit, JSON.stringify(data.packages), data.taxesPct,
        data.securityDeposit, data.minBookingHours, data.bookingLeadDays,
        data.cancellationPolicy, data.rules, JSON.stringify(data.openingHours),
        JSON.stringify(data.blackoutDates), data.image, data.imageAlt,
        JSON.stringify(data.gallery), data.shortDescription, data.fullDescription,
        JSON.stringify(data.amenities), JSON.stringify(data.eventTypes),
        JSON.stringify(data.features), data.seoTitle, data.seoDescription,
        data.canonicalUrl, data.ogImage, data.robots, data.internalNotes,
        data.verificationStatus, data.featured, data.rank, data.status,
        data.status === "published" ? new Date() : null, actorId ?? null,
      ]
    );
    return (await venuesDb.get(String(row!.id)))!;
  },

  async update(id: string, input: Partial<Venue>): Promise<Venue | null> {
    const existing = await venuesDb.get(id);
    if (!existing) return null;
    const data = normaliseVenue({ ...existing, ...input }, false);
    await execute(
      `UPDATE venues SET
        slug=$1,name=$2,country_id=$3,state_id=$4,city_id=$5,city=$6,city_slug=$7,
        area=$8,address=$9,postal_code=$10,latitude=$11,longitude=$12,timezone=$13,
        type=$14,setting=$15,capacity_min=$16,capacity_max=$17,indoor_capacity=$18,
        outdoor_capacity=$19,rooms_count=$20,parking=$21,accessible=$22,catering=$23,
        accommodation=$24,decoration=$25,price_hint=$26,starting_price=$27,currency=$28,
        pricing_unit=$29,packages=$30::jsonb,taxes_pct=$31,security_deposit=$32,
        min_booking_hours=$33,booking_lead_days=$34,cancellation_policy=$35,rules=$36,
        opening_hours=$37::jsonb,blackout_dates=$38::jsonb,image=$39,image_alt=$40,
        gallery=$41::jsonb,short_description=$42,full_description=$43,amenities=$44::jsonb,
        event_types=$45::jsonb,features=$46::jsonb,seo_title=$47,seo_description=$48,
        canonical_url=$49,og_image=$50,robots=$51,internal_notes=$52,
        verification_status=$53,featured=$54,rank=$55,status=$56,
        published_at = CASE WHEN $56 = 'published' AND published_at IS NULL THEN now() ELSE published_at END,
        updated_at = now()
       WHERE id=$57`,
      [
        data.slug, data.name, data.countryId, data.stateId, data.cityId, data.city,
        data.citySlug, data.area, data.address, data.postalCode, data.latitude,
        data.longitude, data.timezone, data.type, data.setting, data.capacityMin,
        data.capacityMax, data.indoorCapacity, data.outdoorCapacity, data.roomsCount,
        data.parking, data.accessible, data.catering, data.accommodation,
        data.decoration, data.priceHint, data.startingPrice, data.currency,
        data.pricingUnit, JSON.stringify(data.packages), data.taxesPct,
        data.securityDeposit, data.minBookingHours, data.bookingLeadDays,
        data.cancellationPolicy, data.rules, JSON.stringify(data.openingHours),
        JSON.stringify(data.blackoutDates), data.image, data.imageAlt,
        JSON.stringify(data.gallery), data.shortDescription, data.fullDescription,
        JSON.stringify(data.amenities), JSON.stringify(data.eventTypes),
        JSON.stringify(data.features), data.seoTitle, data.seoDescription,
        data.canonicalUrl, data.ogImage, data.robots, data.internalNotes,
        data.verificationStatus, data.featured, data.rank, data.status, existing.id,
      ]
    );
    return (await venuesDb.get(existing.id)) ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const venue = await venuesDb.get(id);
    if (!venue) return false;
    const row = await execute(
      `UPDATE venues SET deleted_at = now(), status = 'archived', updated_at = now() WHERE id = $1 AND deleted_at IS NULL`,
      [venue.id]
    );
    return row > 0;
  },

  async permanentDelete(id: string): Promise<boolean> {
    const venue = await venuesDb.get(id);
    if (!venue) return false;
    const deps = await one<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM bookings WHERE venue_id = $1",
      [venue.id]
    );
    if (Number(deps?.count ?? 0) > 0) {
      throw new ValidationError({ venue: "Venue has bookings and cannot be permanently deleted" });
    }
    return (await execute("DELETE FROM venues WHERE id = $1", [venue.id])) > 0;
  },

  async restore(id: string): Promise<Venue | null> {
    const venue = await venuesDb.get(id);
    if (!venue) return null;
    await execute(
      "UPDATE venues SET deleted_at = NULL, status = 'draft', updated_at = now() WHERE id = $1",
      [venue.id]
    );
    return (await venuesDb.get(venue.id)) ?? null;
  },

  async duplicate(id: string): Promise<Venue | null> {
    const venue = await venuesDb.get(id);
    if (!venue) return null;
    const base = `${venue.slug}-copy`;
    let slug = base;
    let n = 2;
    while (await venuesDb.get(slug)) slug = `${base}-${n++}`;
    return venuesDb.create({ ...venue, slug, name: `${venue.name} (copy)`, status: "draft", featured: false });
  },

  async stats() {
    const row = await one<Record<string, string>>(
      `SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL)::text AS total,
        COUNT(*) FILTER (WHERE status = 'published' AND deleted_at IS NULL)::text AS published,
        COUNT(*) FILTER (WHERE status = 'pending' AND deleted_at IS NULL)::text AS pending,
        COUNT(*) FILTER (WHERE status = 'draft' AND deleted_at IS NULL)::text AS draft,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::text AS archived
       FROM venues`
    );
    return {
      total: Number(row?.total ?? 0),
      published: Number(row?.published ?? 0),
      pending: Number(row?.pending ?? 0),
      draft: Number(row?.draft ?? 0),
      archived: Number(row?.archived ?? 0),
    };
  },
};

function normaliseVenue(input: Partial<Venue>, requireRequired: boolean) {
  const name = cleanText(input.name, 200).trim();
  const slug = cleanSlug(input.slug || name);
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Venue name is required";
  if (!slug) errors.slug = "A valid slug is required";
  if (!input.countryId && !input.countryCode) errors.countryCode = "Country is required";
  if (!cleanText(input.city, 120).trim()) errors.city = "City is required";
  if (!cleanText(input.type, 120).trim()) errors.type = "Venue type is required";
  const capacityMin = clampInt(input.capacityMin, 0, 0);
  const capacityMax = clampInt(input.capacityMax, 0, 0);
  if (capacityMax > 0 && capacityMin > capacityMax) {
    errors.capacityMax = "Maximum capacity must be greater than the minimum";
  }
  const status = (["draft", "pending", "published", "unpublished", "rejected", "archived"] as const)
    .includes(input.status as Venue["status"])
    ? (input.status as Venue["status"])
    : "draft";
  if (requireRequired && Object.keys(errors).length > 0) throw new ValidationError(errors);
  return {
    slug,
    name,
    countryId: input.countryId ?? null,
    stateId: input.stateId ?? null,
    cityId: input.cityId ?? null,
    city: cleanText(input.city, 120).trim(),
    citySlug: cleanSlug(input.citySlug || input.city || ""),
    area: cleanText(input.area, 200),
    address: cleanText(input.address, 500),
    postalCode: cleanText(input.postalCode, 40),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    timezone: cleanText(input.timezone, 80) || "Asia/Kolkata",
    type: cleanText(input.type, 120),
    setting: (["Indoor", "Outdoor", "Indoor + Outdoor"] as const).includes(input.setting as never)
      ? input.setting!
      : "Indoor",
    capacityMin,
    capacityMax,
    indoorCapacity: input.indoorCapacity ?? null,
    outdoorCapacity: input.outdoorCapacity ?? null,
    roomsCount: input.roomsCount ?? null,
    parking: Boolean(input.parking),
    accessible: Boolean(input.accessible),
    catering: Boolean(input.catering),
    accommodation: Boolean(input.accommodation),
    decoration: Boolean(input.decoration),
    priceHint: cleanText(input.priceHint, 200),
    startingPrice: input.startingPrice ?? null,
    currency: cleanText(input.currency, 3) || "INR",
    pricingUnit: cleanText(input.pricingUnit, 40) || "per_event",
    packages: Array.isArray(input.packages) ? input.packages : [],
    taxesPct: Math.max(0, Number(input.taxesPct ?? 0)),
    securityDeposit: input.securityDeposit ?? null,
    minBookingHours: input.minBookingHours ?? null,
    bookingLeadDays: clampInt(input.bookingLeadDays, 0, 0),
    cancellationPolicy: cleanText(input.cancellationPolicy, 5_000),
    rules: cleanText(input.rules, 5_000),
    openingHours: input.openingHours ?? {},
    blackoutDates: Array.isArray(input.blackoutDates) ? input.blackoutDates : [],
    image: cleanText(input.image, 2_000),
    imageAlt: cleanText(input.imageAlt, 300),
    gallery: Array.isArray(input.gallery) ? input.gallery : [],
    shortDescription: cleanText(input.shortDescription, 1_000),
    fullDescription: cleanText(input.fullDescription, 50_000),
    amenities: Array.isArray(input.amenities) ? input.amenities.map((a) => cleanText(a, 120)).filter(Boolean).slice(0, 100) : [],
    eventTypes: Array.isArray(input.eventTypes) ? input.eventTypes.map((a) => cleanText(a, 120)).filter(Boolean).slice(0, 50) : [],
    features: Array.isArray(input.features) ? input.features.map((a) => cleanText(a, 120)).filter(Boolean).slice(0, 50) : [],
    seoTitle: cleanText(input.seoTitle, 200),
    seoDescription: cleanText(input.seoDescription, 400),
    canonicalUrl: cleanText(input.canonicalUrl, 2_000),
    ogImage: cleanText(input.ogImage, 2_000),
    robots: cleanText(input.robots, 100) || "index,follow",
    internalNotes: cleanText(input.internalNotes, 10_000),
    verificationStatus: (["unverified", "pending", "verified", "rejected"] as const).includes(input.verificationStatus as never)
      ? input.verificationStatus!
      : "unverified",
    featured: Boolean(input.featured),
    rank: clampInt(input.rank, 0, 0),
    status,
  };
}

// ── Cities ───────────────────────────────────────────────────────────────────
function rowToCity(row: Record<string, unknown>): City {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    country: String(row.country_name ?? ""),
    countryCode: String(row.country_code ?? "").trim(),
    countryId: row.country_id ? asNumber(row.country_id) : undefined,
    stateId: row.state_id ? asNumber(row.state_id) : null,
    tagline: String(row.tagline ?? ""),
    description: String(row.description ?? ""),
    image: String(row.image ?? ""),
    imageAlt: String(row.image_alt ?? ""),
    venueCountLabel: String(row.venue_count_label ?? "Curated venues"),
    popularTypes: asJson(row.popular_types, []),
    status: (row.status as City["status"]) ?? "published",
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

const CITY_SELECT = `SELECT ci.*, co.iso2 AS country_code, co.name AS country_name
  FROM cities ci LEFT JOIN countries co ON co.id = ci.country_id`;

export const citiesDb = {
  async list(filter: { status?: string; country?: string; search?: string } = {}) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter.status) { params.push(filter.status); where.push(`ci.status = $${params.length}`); }
    if (filter.country) {
      params.push(filter.country);
      where.push(`(co.iso2 = $${params.length} OR co.name = $${params.length})`);
    }
    if (filter.search) { params.push(`%${cleanText(filter.search, 100)}%`); where.push(`ci.name ILIKE $${params.length}`); }
    const rows = await query<Record<string, unknown>>(
      `${CITY_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ci.name ASC`,
      params
    );
    return { data: rows.map(rowToCity), total: rows.length };
  },

  async get(idOrSlug: string): Promise<City | undefined> {
    const key = cleanText(idOrSlug, 200);
    const numericId = /^\d+$/.test(key) ? Number(key) : -1;
    const row = await one<Record<string, unknown>>(
      `${CITY_SELECT} WHERE ci.id = $1 OR ci.slug = $2 LIMIT 1`,
      [numericId, key]
    );
    return row ? rowToCity(row) : undefined;
  },

  async create(input: Partial<City>): Promise<City> {
    const name = cleanText(input.name, 150).trim();
    const slug = cleanSlug(input.slug || name);
    if (!name || !slug) throw new ValidationError({ name: "City name is required" });
    if (!input.countryId) throw new ValidationError({ countryId: "Country is required" });
    const existing = await one<{ id: number }>("SELECT id FROM cities WHERE slug = $1", [slug]);
    if (existing) throw new ValidationError({ slug: "A city with this slug already exists" });
    const row = await one<{ id: number }>(
      `INSERT INTO cities (slug,name,country_id,state_id,tagline,description,image,image_alt,venue_count_label,popular_types,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) RETURNING id`,
      [
        slug, name, input.countryId, input.stateId ?? null,
        cleanText(input.tagline, 300), cleanText(input.description, 10_000),
        cleanText(input.image, 2_000), cleanText(input.imageAlt, 300),
        cleanText(input.venueCountLabel, 120) || "Curated venues",
        JSON.stringify(input.popularTypes ?? []),
        ["published", "draft", "archived"].includes(input.status ?? "") ? input.status : "published",
      ]
    );
    return (await citiesDb.get(String(row!.id)))!;
  },

  async update(id: string, input: Partial<City>): Promise<City | null> {
    const existing = await citiesDb.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...input };
    const slug = cleanSlug(merged.slug || merged.name);
    const duplicate = await one<{ id: number }>("SELECT id FROM cities WHERE slug = $1 AND id <> $2", [slug, existing.id]);
    if (duplicate) throw new ValidationError({ slug: "A city with this slug already exists" });
    await execute(
      `UPDATE cities SET slug=$1,name=$2,country_id=$3,state_id=$4,tagline=$5,description=$6,
        image=$7,image_alt=$8,venue_count_label=$9,popular_types=$10::jsonb,status=$11,updated_at=now()
       WHERE id=$12`,
      [
        slug, cleanText(merged.name, 150), merged.countryId ?? existing.countryId, merged.stateId ?? null,
        cleanText(merged.tagline, 300), cleanText(merged.description, 10_000),
        cleanText(merged.image, 2_000), cleanText(merged.imageAlt, 300),
        cleanText(merged.venueCountLabel, 120) || "Curated venues",
        JSON.stringify(merged.popularTypes ?? []), merged.status ?? "draft", existing.id,
      ]
    );
    return (await citiesDb.get(existing.id)) ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const city = await citiesDb.get(id);
    if (!city) return false;
    const venues = await one<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM venues WHERE city_id = $1 AND deleted_at IS NULL",
      [city.id]
    );
    if (Number(venues?.count ?? 0) > 0) {
      throw new ValidationError({ city: "Move or archive the venues in this city before deleting it" });
    }
    return (await execute("DELETE FROM cities WHERE id = $1", [city.id])) > 0;
  },
};

// ── Countries ────────────────────────────────────────────────────────────────
function rowToCountry(row: Record<string, unknown>): Country {
  return {
    id: String(row.id),
    code: String(row.iso2 ?? "").trim(),
    iso3: String(row.iso3 ?? "").trim(),
    name: String(row.name ?? ""),
    flag: String(row.flag ?? ""),
    callingCode: String(row.calling_code ?? ""),
    currency: String(row.currency ?? ""),
    active: asBool(row.active),
    cityCount: asNumber(row.city_count),
    venueCount: asNumber(row.venue_count),
  };
}

export const countriesDb = {
  async list(filter: { active?: boolean; search?: string; all?: boolean } = {}) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (!filter.all) {
      // Market countries plus any country already used by a venue or city.
      where.push(`(co.active = true OR EXISTS (SELECT 1 FROM venues v WHERE v.country_id = co.id AND v.deleted_at IS NULL) OR EXISTS (SELECT 1 FROM cities ci WHERE ci.country_id = co.id))`);
    }
    if (filter.active !== undefined) { params.push(filter.active); where.push(`co.active = $${params.length}`); }
    if (filter.search) { params.push(`%${cleanText(filter.search, 100)}%`); where.push(`co.name ILIKE $${params.length}`); }
    const rows = await query<Record<string, unknown>>(
      `SELECT co.*,
        (SELECT COUNT(*) FROM cities ci WHERE ci.country_id = co.id)::text AS city_count,
        (SELECT COUNT(*) FROM venues v WHERE v.country_id = co.id AND v.deleted_at IS NULL)::text AS venue_count
       FROM countries co
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY co.name ASC`,
      params
    );
    return { data: rows.map(rowToCountry), total: rows.length };
  },

  async get(idOrCode: string) {
    const key = cleanText(idOrCode, 50);
    const numericId = /^\d+$/.test(key) ? Number(key) : -1;
    const row = await one<Record<string, unknown>>(
      `SELECT co.*,
        (SELECT COUNT(*) FROM cities ci WHERE ci.country_id = co.id)::text AS city_count,
        (SELECT COUNT(*) FROM venues v WHERE v.country_id = co.id AND v.deleted_at IS NULL)::text AS venue_count
       FROM countries co WHERE co.id = $1 OR co.iso2 = $2 OR co.iso3 = $2 LIMIT 1`,
      [numericId, key.toUpperCase()]
    );
    return row ? rowToCountry(row) : undefined;
  },

  async create(input: Partial<Country>): Promise<Country> {
    const code = cleanText(input.code, 2).toUpperCase();
    const name = cleanText(input.name, 150).trim();
    if (!/^[A-Z]{2}$/.test(code)) throw new ValidationError({ code: "Use a 2-letter ISO country code" });
    if (!name) throw new ValidationError({ name: "Country name is required" });
    await execute(
      `INSERT INTO countries (iso2,iso3,name,calling_code,flag,currency,active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (iso2) DO UPDATE SET name=excluded.name, active=excluded.active`,
      [code, cleanText(input.iso3, 3).toUpperCase(), name, cleanText(input.callingCode, 10), cleanText(input.flag, 16), cleanText(input.currency, 3), Boolean(input.active)]
    );
    return (await countriesDb.get(code))!;
  },

  async update(id: string, input: Partial<Country>): Promise<Country | null> {
    const existing = await countriesDb.get(id);
    if (!existing) return null;
    await execute(
      `UPDATE countries SET name=$1, calling_code=$2, flag=$3, currency=$4, active=$5 WHERE id=$6`,
      [
        cleanText(input.name, 150) || existing.name,
        cleanText(input.callingCode ?? existing.callingCode, 10),
        cleanText(input.flag ?? existing.flag, 16),
        cleanText(input.currency ?? existing.currency, 3),
        input.active ?? existing.active,
        existing.id,
      ]
    );
    return (await countriesDb.get(existing.id)) ?? null;
  },

  async setActive(id: string, active: boolean): Promise<Country | null> {
    const existing = await countriesDb.get(id);
    if (!existing) return null;
    await execute("UPDATE countries SET active = $1 WHERE id = $2", [active, existing.id]);
    return (await countriesDb.get(existing.id)) ?? null;
  },
};

// ── Geography (states from SQL, cities from maintained dataset) ──────────────
const cityCache = new Map<string, Array<{ name: string; stateCode: string }>>();

export const geoDb = {
  async states(countryCode: string): Promise<State[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT s.* FROM states s JOIN countries c ON c.id = s.country_id
       WHERE c.iso2 = $1 ORDER BY s.name ASC`,
      [cleanText(countryCode, 2).toUpperCase()]
    );
    return rows.map((row) => ({
      id: String(row.id),
      countryId: String(row.country_id),
      code: String(row.code ?? ""),
      name: String(row.name),
    }));
  },

  cities(countryCode: string, stateCode?: string) {
    const key = `${countryCode}:${stateCode ?? "*"}`;
    if (!cityCache.has(key)) {
      const rows = stateCode
        ? GeoCity.getCitiesOfState(countryCode, stateCode)
        : GeoCity.getCitiesOfCountry(countryCode) ?? [];
      cityCache.set(key, rows.map((c) => ({ name: c.name, stateCode: c.stateCode })));
    }
    return cityCache.get(key)!;
  },

  stateDataset(countryCode: string) {
    return GeoState.getStatesOfCountry(countryCode).map((s) => ({
      code: s.isoCode,
      name: s.name,
    }));
  },
};

// ── Blogs ────────────────────────────────────────────────────────────────────
function rowToBlog(row: Record<string, unknown>): BlogPost {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    category: String(row.category ?? "General"),
    author: String(row.author ?? "Team VOMP"),
    publishedOn: iso(row.published_on).slice(0, 10),
    readingMinutes: asNumber(row.reading_minutes),
    image: String(row.image ?? ""),
    imageAlt: String(row.image_alt ?? ""),
    body: asJson(row.body, []),
    seoTitle: String(row.seo_title ?? ""),
    seoDescription: String(row.seo_description ?? ""),
    canonicalUrl: String(row.canonical_url ?? ""),
    robots: String(row.robots ?? "index,follow"),
    status: (row.status as BlogPost["status"]) ?? "draft",
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export const blogsDb = {
  async list(filter: { status?: string; search?: string; page?: number; limit?: number } = {}) {
    const where: string[] = ["deleted_at IS NULL"];
    const params: unknown[] = [];
    if (filter.status) { params.push(filter.status); where.push(`status = $${params.length}`); }
    if (filter.search) { params.push(`%${cleanText(filter.search, 100)}%`); where.push(`title ILIKE $${params.length}`); }
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM blogs WHERE ${where.join(" AND ")} ORDER BY published_on DESC, id DESC`,
      params
    );
    return { data: rows.map(rowToBlog), total: rows.length };
  },

  async get(idOrSlug: string) {
    const key = cleanText(idOrSlug, 200);
    const numericId = /^\d+$/.test(key) ? Number(key) : -1;
    const row = await one<Record<string, unknown>>(
      "SELECT * FROM blogs WHERE (id = $1 OR slug = $2) AND deleted_at IS NULL LIMIT 1",
      [numericId, key]
    );
    return row ? rowToBlog(row) : undefined;
  },

  async create(input: Partial<BlogPost>): Promise<BlogPost> {
    const slug = cleanSlug(input.slug || input.title || "");
    if (!input.title || !slug) throw new ValidationError({ title: "Title is required" });
    const exists = await one<{ id: number }>("SELECT id FROM blogs WHERE slug = $1", [slug]);
    if (exists) throw new ValidationError({ slug: "A post with this slug already exists" });
    const row = await one<{ id: number }>(
      `INSERT INTO blogs (slug,title,excerpt,category,author,published_on,reading_minutes,image,image_alt,body,seo_title,seo_description,canonical_url,robots,status,published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        slug, cleanText(input.title, 250), cleanText(input.excerpt, 1_000),
        cleanText(input.category, 100) || "General", cleanText(input.author, 150) || "Team VOMP",
        input.publishedOn || new Date().toISOString().slice(0, 10),
        clampInt(input.readingMinutes, 5, 1, 300), cleanText(input.image, 2_000),
        cleanText(input.imageAlt, 300), JSON.stringify(input.body ?? []),
        cleanText(input.seoTitle, 200), cleanText(input.seoDescription, 400),
        cleanText(input.canonicalUrl, 2_000), cleanText(input.robots, 100) || "index,follow",
        ["draft", "published", "archived"].includes(input.status ?? "") ? input.status : "draft",
        input.status === "published" ? new Date() : null,
      ]
    );
    return (await blogsDb.get(String(row!.id)))!;
  },

  async update(id: string, input: Partial<BlogPost>): Promise<BlogPost | null> {
    const existing = await blogsDb.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...input };
    const slug = cleanSlug(merged.slug || merged.title);
    const duplicate = await one<{ id: number }>("SELECT id FROM blogs WHERE slug = $1 AND id <> $2", [slug, existing.id]);
    if (duplicate) throw new ValidationError({ slug: "A post with this slug already exists" });
    await execute(
      `UPDATE blogs SET slug=$1,title=$2,excerpt=$3,category=$4,author=$5,published_on=$6,reading_minutes=$7,
        image=$8,image_alt=$9,body=$10::jsonb,seo_title=$11,seo_description=$12,canonical_url=$13,robots=$14,
        status=$15, published_at = CASE WHEN $15 = 'published' AND published_at IS NULL THEN now() ELSE published_at END,
        updated_at=now() WHERE id=$16`,
      [
        slug, cleanText(merged.title, 250), cleanText(merged.excerpt, 1_000),
        cleanText(merged.category, 100) || "General", cleanText(merged.author, 150) || "Team VOMP",
        merged.publishedOn, clampInt(merged.readingMinutes, 5, 1, 300),
        cleanText(merged.image, 2_000), cleanText(merged.imageAlt, 300),
        JSON.stringify(merged.body ?? []), cleanText(merged.seoTitle, 200),
        cleanText(merged.seoDescription, 400), cleanText(merged.canonicalUrl, 2_000),
        cleanText(merged.robots, 100) || "index,follow", merged.status, existing.id,
      ]
    );
    return (await blogsDb.get(existing.id)) ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const existing = await blogsDb.get(id);
    if (!existing) return false;
    return (await execute("UPDATE blogs SET deleted_at = now(), status = 'archived' WHERE id = $1", [existing.id])) > 0;
  },
};

// ── Reviews / testimonials ───────────────────────────────────────────────────
function rowToReview(row: Record<string, unknown>): Review {
  return {
    id: String(row.id),
    name: String(row.name),
    context: String(row.context ?? ""),
    quote: String(row.quote ?? ""),
    rating: asNumber(row.rating),
    image: String(row.image ?? ""),
    venueSlug: String(row.venue_slug ?? ""),
    featured: asBool(row.featured),
    status: (row.status as Review["status"]) ?? "draft",
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export const reviewsDb = {
  async list(filter: { status?: string; venueSlug?: string; featured?: boolean } = {}) {
    const where: string[] = ["deleted_at IS NULL"];
    const params: unknown[] = [];
    if (filter.status) { params.push(filter.status); where.push(`status = $${params.length}`); }
    if (filter.venueSlug) { params.push(filter.venueSlug); where.push(`venue_slug = $${params.length}`); }
    if (filter.featured !== undefined) { params.push(filter.featured); where.push(`featured = $${params.length}`); }
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM reviews WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
      params
    );
    return { data: rows.map(rowToReview), total: rows.length };
  },

  async get(id: string) {
    const row = await one<Record<string, unknown>>("SELECT * FROM reviews WHERE id = $1", [Number(id) || -1]);
    return row ? rowToReview(row) : undefined;
  },

  async update(id: string, input: Partial<Review>) {
    const existing = await reviewsDb.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...input };
    await execute(
      `UPDATE reviews SET name=$1,context=$2,quote=$3,rating=$4,image=$5,venue_slug=$6,featured=$7,status=$8,updated_at=now() WHERE id=$9`,
      [
        cleanText(merged.name, 150), cleanText(merged.context, 200), cleanText(merged.quote, 2_000),
        clampInt(merged.rating, 5, 1, 5), cleanText(merged.image, 2_000),
        cleanText(merged.venueSlug, 200),
        Boolean(merged.featured),
        ["draft", "published", "archived"].includes(merged.status) ? merged.status : "draft",
        existing.id,
      ]
    );
    return reviewsDb.get(existing.id);
  },

  async create(input: Partial<Review>) {
    if (!input.name) throw new ValidationError({ name: "Name is required" });
    const row = await one<{ id: number }>(
      `INSERT INTO reviews (name,context,quote,rating,image,venue_slug,featured,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        cleanText(input.name, 150), cleanText(input.context, 200), cleanText(input.quote, 2_000),
        clampInt(input.rating, 5, 1, 5), cleanText(input.image, 2_000),
        cleanText(input.venueSlug, 200), Boolean(input.featured),
        ["draft", "published", "archived"].includes(input.status ?? "") ? input.status : "draft",
      ]
    );
    return (await reviewsDb.get(String(row!.id)))!;
  },

  async delete(id: string) {
    return (await execute("UPDATE reviews SET deleted_at = now(), status = 'archived' WHERE id = $1", [Number(id) || -1])) > 0;
  },
};

// ── Enquiries ────────────────────────────────────────────────────────────────
function rowToEnquiry(row: Record<string, unknown>): Enquiry {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    city: String(row.city ?? ""),
    eventType: String(row.event_type ?? ""),
    eventDate: String(row.event_date ?? ""),
    guestCount: String(row.guest_count ?? ""),
    message: row.message ? String(row.message) : undefined,
    venueName: row.venue_name ? String(row.venue_name) : undefined,
    source: String(row.source ?? "website"),
    status: (row.status as Enquiry["status"]) ?? "new",
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export const enquiriesDb = {
  async list(filter: { status?: string; search?: string; page?: number; limit?: number } = {}) {
    const where: string[] = ["1=1"];
    const params: unknown[] = [];
    if (filter.status) { params.push(filter.status); where.push(`status = $${params.length}`); }
    if (filter.search) {
      const q = `%${cleanText(filter.search, 100)}%`;
      params.push(q, q, q);
      where.push(`(name ILIKE $${params.length - 2} OR email ILIKE $${params.length - 1} OR phone ILIKE $${params.length})`);
    }
    const limit = clampInt(filter.limit, 20, 1, 500);
    const page = clampInt(filter.page, 1, 1, 100_000);
    const count = await one<{ count: string }>(`SELECT COUNT(*)::text AS count FROM enquiries WHERE ${where.join(" AND ")}`, params);
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM enquiries WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );
    return { data: rows.map(rowToEnquiry), total: Number(count?.count ?? 0), page };
  },

  async get(id: string) {
    const row = await one<Record<string, unknown>>("SELECT * FROM enquiries WHERE id = $1", [Number(id) || -1]);
    return row ? rowToEnquiry(row) : undefined;
  },

  async create(input: Omit<Enquiry, "id" | "createdAt">) {
    const name = cleanText(input.name, 150).trim();
    if (!name) throw new ValidationError({ name: "Name is required" });
    const email = cleanText(input.email, 320).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError({ email: "Enter a valid email" });
    const row = await one<{ id: number }>(
      `INSERT INTO enquiries (name,phone,email,city,event_type,event_date,guest_count,message,venue_name,source,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        name, cleanText(input.phone, 40), email, cleanText(input.city, 120),
        cleanText(input.eventType, 120), cleanText(input.eventDate, 120),
        cleanText(input.guestCount, 60), cleanText(input.message, 5_000),
        cleanText(input.venueName, 200), cleanText(input.source, 60) || "website", "new",
      ]
    );
    return (await enquiriesDb.get(String(row!.id)))!;
  },

  async update(id: string, input: Partial<Enquiry>) {
    const existing = await enquiriesDb.get(id);
    if (!existing) return null;
    const status = (["new", "read", "replied", "archived"] as const).includes(input.status as never)
      ? input.status
      : existing.status;
    await execute("UPDATE enquiries SET status=$1, updated_at=now() WHERE id=$2", [status, existing.id]);
    return enquiriesDb.get(existing.id);
  },

  async delete(id: string) {
    return (await execute("DELETE FROM enquiries WHERE id = $1", [Number(id) || -1])) > 0;
  },
};

// ── Media ────────────────────────────────────────────────────────────────────
function rowToMedia(row: Record<string, unknown>): MediaFile {
  return {
    id: String(row.id),
    url: String(row.url),
    filename: String(row.filename),
    originalName: String(row.original_name ?? ""),
    size: asNumber(row.size),
    mimeType: String(row.mime_type ?? ""),
    kind: (row.kind as MediaFile["kind"]) ?? "image",
    width: row.width == null ? null : asNumber(row.width),
    height: row.height == null ? null : asNumber(row.height),
    duration: row.duration == null ? null : asNumber(row.duration),
    altText: String(row.alt_text ?? ""),
    caption: String(row.caption ?? ""),
    credit: String(row.credit ?? ""),
    folder: String(row.folder ?? "general"),
    posterUrl: String(row.poster_url ?? ""),
    variants: asJson(row.variants, {}),
    createdAt: iso(row.created_at),
  };
}

export const mediaDb = {
  async list(filter: { kind?: string; search?: string; folder?: string; page?: number; limit?: number } = {}) {
    const where: string[] = ["deleted_at IS NULL"];
    const params: unknown[] = [];
    if (filter.kind) { params.push(filter.kind); where.push(`kind = $${params.length}`); }
    if (filter.folder) { params.push(filter.folder); where.push(`folder = $${params.length}`); }
    if (filter.search) {
      params.push(`%${cleanText(filter.search, 100)}%`);
      where.push(`(original_name ILIKE $${params.length} OR alt_text ILIKE $${params.length} OR caption ILIKE $${params.length})`);
    }
    const limit = clampInt(filter.limit, 60, 1, 200);
    const page = clampInt(filter.page, 1, 1, 100_000);
    const count = await one<{ count: string }>(`SELECT COUNT(*)::text AS count FROM media WHERE ${where.join(" AND ")}`, params);
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM media WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );
    return { data: rows.map(rowToMedia), total: Number(count?.count ?? 0), page };
  },

  async get(id: string) {
    const row = await one<Record<string, unknown>>("SELECT * FROM media WHERE id = $1 AND deleted_at IS NULL", [Number(id) || -1]);
    return row ? rowToMedia(row) : undefined;
  },

  async add(
    file: Omit<MediaFile, "id" | "createdAt"> & {
      createdAt?: string;
      checksum?: string;
      createdBy?: number;
    }
  ): Promise<MediaFile> {
    const row = await one<{ id: number }>(
      `INSERT INTO media (url,filename,original_name,size,mime_type,kind,width,height,duration,alt_text,caption,credit,folder,checksum,poster_url,variants,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17) RETURNING id`,
      [
        file.url, file.filename, file.originalName ?? file.filename, file.size,
        file.mimeType, file.kind, file.width ?? null, file.height ?? null,
        file.duration ?? null, cleanText(file.altText, 500), cleanText(file.caption, 1_000),
        cleanText(file.credit, 200), cleanText(file.folder, 100) || "general",
        file.checksum ?? "", file.posterUrl ?? "", JSON.stringify(file.variants ?? {}),
        file.createdBy ?? null,
      ]
    );
    return (await mediaDb.get(String(row!.id)))!;
  },

  async update(id: string, input: Partial<MediaFile>) {
    const existing = await mediaDb.get(id);
    if (!existing) return null;
    await execute(
      `UPDATE media SET alt_text=$1,caption=$2,credit=$3,folder=$4 WHERE id=$5`,
      [
        cleanText(input.altText ?? existing.altText, 500),
        cleanText(input.caption ?? existing.caption, 1_000),
        cleanText(input.credit ?? existing.credit, 200),
        cleanText(input.folder ?? existing.folder, 100) || "general",
        existing.id,
      ]
    );
    return mediaDb.get(existing.id);
  },

  async delete(id: string) {
    const media = await mediaDb.get(id);
    if (!media) return false;
    const used = await one<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM venue_media WHERE media_id = $1",
      [media.id]
    );
    if (Number(used?.count ?? 0) > 0) {
      throw new ValidationError({ media: "This asset is attached to a venue. Detach it before deleting." });
    }
    return (await execute("UPDATE media SET deleted_at = now() WHERE id = $1", [media.id])) > 0;
  },

  async findByChecksum(checksum: string) {
    if (!checksum) return undefined;
    const row = await one<Record<string, unknown>>(
      "SELECT * FROM media WHERE checksum = $1 AND deleted_at IS NULL LIMIT 1",
      [checksum]
    );
    return row ? rowToMedia(row) : undefined;
  },
};

// ── Settings ─────────────────────────────────────────────────────────────────
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
  seoTitle: "Venue On My Plate — Find a venue worthy of your occasion",
  seoDescription:
    "Discover curated palaces, resorts and private estates for weddings and celebrations across India and Italy.",
  seoKeywords: "wedding venues india, venue booking, palace wedding, destination wedding",
  heroTitle: "Every Celebration Starts Here.",
  heroSubtitle: "Find the Perfect Venue in One Search.",
  heroTagline:
    "Curated palaces, lakeside estates and private resorts — every one personally visited or vetted.",
  featuredSectionTitle: "Venues, curated.",
  featuredSectionSubtitle: "Every property personally visited or vetted. No sponsored listings.",
  ctaTitle: "Can't find the right venue?",
  ctaCopy:
    "Share your date and guest count — we will send a personal shortlist within one business day.",
  currency: "INR",
  locale: "en-IN",
  timezone: "Asia/Kolkata",
  taxPct: "18",
  bookingLeadDays: "7",
  cancellationPolicy:
    "Cancellation terms are confirmed in the venue proposal before any payment.",
};

const EDITABLE_SETTING_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

export const settingsDb = {
  async get(): Promise<SiteSettings> {
    const rows = await query<{ key: string; value: string }>("SELECT key, value FROM settings");
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    return { ...DEFAULT_SETTINGS, ...map };
  },

  async update(data: Partial<SiteSettings>): Promise<SiteSettings> {
    const entries = Object.entries(data).filter(
      ([key, value]) => EDITABLE_SETTING_KEYS.has(key) && value !== undefined && value !== null
    );
    if (entries.length > 0) {
      await transaction(async (tx) => {
        for (const [key, value] of entries) {
          await tx.query(
            `INSERT INTO settings (key, value, updated_at) VALUES ($1,$2,now())
             ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()`,
            [key, cleanText(String(value), 20_000)]
          );
        }
      });
    }
    return settingsDb.get();
  },
};

// ── Admin users / auth ───────────────────────────────────────────────────────
function rowToAdmin(row: Record<string, unknown>): AdminUserRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? "Admin"),
    role: String(row.role_key ?? row.role ?? "read_only"),
    roleName: String(row.role_name ?? ""),
    permissions: asJson(row.permissions, []),
    isActive: asBool(row.is_active ?? true),
    lastLoginAt: row.last_login_at ? iso(row.last_login_at) : null,
    passwordHash: String(row.password_hash ?? ""),
    failedLoginCount: asNumber(row.failed_login_count),
    lockedUntil: row.locked_until ? iso(row.locked_until) : null,
  };
}

const ADMIN_SELECT = `
  SELECT u.*, r.key AS role_key, r.name AS role_name,
    COALESCE((SELECT json_agg(p.key) FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = u.role_id), '[]') AS permissions
  FROM admin_users u JOIN roles r ON r.id = u.role_id
`;

export const adminUsersDb = {
  async findByEmail(email: string): Promise<AdminUserRecord | undefined> {
    const row = await one<Record<string, unknown>>(
      `${ADMIN_SELECT} WHERE lower(u.email) = lower($1) LIMIT 1`,
      [cleanText(email, 320).trim()]
    );
    return row ? rowToAdmin(row) : undefined;
  },

  async get(id: string): Promise<AdminUser | undefined> {
    const row = await one<Record<string, unknown>>(`${ADMIN_SELECT} WHERE u.id = $1`, [Number(id) || -1]);
    if (!row) return undefined;
    const rec = rowToAdmin(row);
    return {
      id: rec.id, email: rec.email, name: rec.name, role: rec.role,
      roleName: rec.roleName, permissions: rec.permissions,
      isActive: rec.isActive, lastLoginAt: rec.lastLoginAt,
    };
  },

  async list() {
    const rows = await query<Record<string, unknown>>(`${ADMIN_SELECT} ORDER BY u.name ASC`);
    return rows.map((row) => {
      const rec = rowToAdmin(row);
      return {
        id: rec.id, email: rec.email, name: rec.name, role: rec.role,
        roleName: rec.roleName, permissions: rec.permissions,
        isActive: rec.isActive, lastLoginAt: rec.lastLoginAt,
      } satisfies AdminUser;
    });
  },

  async create(email: string, passwordHash: string, name = "Admin", roleKey = "admin"): Promise<void> {
    await query(
      `INSERT INTO admin_users (email,password_hash,name,role_id)
       VALUES ($1,$2,$3,(SELECT id FROM roles WHERE key = $4))`,
      [cleanText(email, 320).trim().toLowerCase(), passwordHash, cleanText(name, 150), roleKey]
    );
  },

  async updatePassword(email: string, passwordHash: string): Promise<void> {
    await execute(
      "UPDATE admin_users SET password_hash=$1, updated_at=now() WHERE lower(email)=lower($2)",
      [passwordHash, cleanText(email, 320)]
    );
  },

  async updateEmail(oldEmail: string, newEmail: string): Promise<void> {
    await execute(
      "UPDATE admin_users SET email=$1, updated_at=now() WHERE lower(email)=lower($2)",
      [cleanText(newEmail, 320).trim().toLowerCase(), cleanText(oldEmail, 320)]
    );
  },

  async updateRole(id: string, roleKey: string): Promise<void> {
    await execute(
      `UPDATE admin_users SET role_id=(SELECT id FROM roles WHERE key=$1), updated_at=now() WHERE id=$2`,
      [roleKey, Number(id) || -1]
    );
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await execute("UPDATE admin_users SET is_active=$1, updated_at=now() WHERE id=$2", [active, Number(id) || -1]);
  },

  async recordLogin(id: string): Promise<void> {
    await execute(
      "UPDATE admin_users SET failed_login_count=0, locked_until=NULL, last_login_at=now() WHERE id=$1",
      [Number(id) || -1]
    );
  },

  async recordFailure(email: string): Promise<void> {
    await execute(
      `UPDATE admin_users SET failed_login_count=failed_login_count+1,
        locked_until = CASE WHEN failed_login_count+1 >= 8 THEN now() + interval '15 minutes' ELSE locked_until END
       WHERE lower(email)=lower($1)`,
      [cleanText(email, 320)]
    );
  },

  async count(): Promise<number> {
    const row = await one<{ count: string }>("SELECT COUNT(*)::text AS count FROM admin_users");
    return Number(row?.count ?? 0);
  },

  async listRoles() {
    const rows = await query<Record<string, unknown>>(
      `SELECT r.id, r.key, r.name, r.description, r.is_system,
        COALESCE((SELECT json_agg(p.key ORDER BY p.key)
          FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
          WHERE rp.role_id = r.id), '[]') AS permissions
       FROM roles r ORDER BY r.id ASC`
    );
    return rows.map((row) => ({
      id: String(row.id),
      key: String(row.key),
      name: String(row.name),
      description: String(row.description ?? ""),
      permissions: asJson<string[]>(row.permissions, []),
    }));
  },

  async countActiveSuperAdmins(): Promise<number> {
    const row = await one<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM admin_users u JOIN roles r ON r.id = u.role_id
       WHERE r.key = 'super_admin' AND u.is_active = true`
    );
    return Number(row?.count ?? 0);
  },

  async delete(id: string): Promise<boolean> {
    return (await execute("DELETE FROM admin_users WHERE id=$1", [Number(id) || -1])) > 0;
  },
};

// ── Sessions ─────────────────────────────────────────────────────────────────
export const sessionsDb = {
  async create(input: { id: string; userId: string; tokenHash: string; expiresAt: Date; ip: string; userAgent: string }) {
    await execute(
      `INSERT INTO sessions (id,user_id,token_hash,expires_at,ip,user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [input.id, Number(input.userId), input.tokenHash, input.expiresAt, input.ip, input.userAgent.slice(0, 500)]
    );
  },

  async findValid(tokenHash: string) {
    const row = await one<Record<string, unknown>>(
      `SELECT s.*, u.email, u.name, u.is_active,
        r.key AS role_key, r.name AS role_name,
        COALESCE((SELECT json_agg(p.key) FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = u.role_id), '[]') AS permissions
       FROM sessions s
       JOIN admin_users u ON u.id = s.user_id
       JOIN roles r ON r.id = u.role_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
       LIMIT 1`,
      [tokenHash]
    );
    if (!row || !asBool(row.is_active)) return null;
    return {
      user: {
        id: String(row.user_id), email: String(row.email), name: String(row.name),
        role: String(row.role_key), roleName: String(row.role_name),
        permissions: asJson(row.permissions, []),
      } satisfies AdminUser,
      sessionId: String(row.id),
    };
  },

  async revoke(sessionId: string) {
    await execute("UPDATE sessions SET revoked_at = now() WHERE id = $1", [sessionId]);
  },

  async revokeAllForUser(userId: string) {
    await execute("UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [Number(userId) || -1]);
  },
};

// ── Audit ────────────────────────────────────────────────────────────────────
const SENSITIVE_KEYS = /pass(word)?|secret|token|authorization|card|cvv|credential|api[_-]?key/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.test(key) ? "[redacted]" : redact(val, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 2_000) return `${value.slice(0, 2_000)}…`;
  return value;
}

export const auditDb = {
  async record(input: {
    actorId?: string | null;
    actorEmail?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    outcome?: "success" | "failure";
    summary?: unknown;
    ip?: string;
  }) {
    await execute(
      `INSERT INTO audit_logs (actor_id,actor_email,action,resource_type,resource_id,outcome,summary,ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
      [
        input.actorId ? Number(input.actorId) || null : null,
        cleanText(input.actorEmail, 320),
        cleanText(input.action, 120),
        cleanText(input.resourceType, 120),
        cleanText(input.resourceId, 120),
        input.outcome ?? "success",
        JSON.stringify(redact(input.summary ?? {})),
        cleanText(input.ip, 100),
      ]
    );
  },

  async list(filter: { page?: number; limit?: number; action?: string; resourceType?: string } = {}) {
    const where: string[] = ["1=1"];
    const params: unknown[] = [];
    if (filter.action) { params.push(`%${filter.action}%`); where.push(`action ILIKE $${params.length}`); }
    if (filter.resourceType) { params.push(filter.resourceType); where.push(`resource_type = $${params.length}`); }
    const limit = clampInt(filter.limit, 50, 1, 200);
    const page = clampInt(filter.page, 1, 1, 100_000);
    const count = await one<{ count: string }>(`SELECT COUNT(*)::text AS count FROM audit_logs WHERE ${where.join(" AND ")}`, params);
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM audit_logs WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );
    return {
      data: rows.map((row) => ({
        id: String(row.id),
        actorId: row.actor_id ? String(row.actor_id) : null,
        actorEmail: String(row.actor_email ?? ""),
        action: String(row.action),
        resourceType: String(row.resource_type ?? ""),
        resourceId: String(row.resource_id ?? ""),
        outcome: String(row.outcome ?? ""),
        summary: asJson(row.summary, {}),
        ip: String(row.ip ?? ""),
        createdAt: iso(row.created_at),
      })) satisfies AuditLogEntry[],
      total: Number(count?.count ?? 0),
      page,
    };
  },
};

// ── Bookings ─────────────────────────────────────────────────────────────────
function rowToBooking(row: Record<string, unknown>): Booking {
  return {
    id: String(row.id),
    reference: String(row.reference),
    venueId: String(row.venue_id),
    venueName: row.venue_name ? String(row.venue_name) : undefined,
    spaceId: row.space_id ? String(row.space_id) : null,
    customerName: String(row.customer_name),
    customerEmail: String(row.customer_email ?? ""),
    customerPhone: String(row.customer_phone ?? ""),
    eventType: String(row.event_type ?? ""),
    eventDate: iso(row.event_date).slice(0, 10),
    startTime: row.start_time ? String(row.start_time) : null,
    endTime: row.end_time ? String(row.end_time) : null,
    timezone: String(row.timezone ?? "Asia/Kolkata"),
    guestCount: asNumber(row.guest_count),
    status: String(row.status),
    currency: String(row.currency ?? "INR").trim(),
    subtotal: asNumber(row.subtotal),
    taxes: asNumber(row.taxes),
    total: asNumber(row.total),
    depositPaid: asNumber(row.deposit_paid),
    paymentStatus: String(row.payment_status),
    internalNotes: String(row.internal_notes ?? ""),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export const bookingsDb = {
  async list(filter: { status?: string; venueId?: string; from?: string; to?: string; search?: string; page?: number; limit?: number } = {}) {
    const where: string[] = ["1=1"];
    const params: unknown[] = [];
    if (filter.status) { params.push(filter.status); where.push(`b.status = $${params.length}`); }
    if (filter.venueId) { params.push(Number(filter.venueId) || -1); where.push(`b.venue_id = $${params.length}`); }
    if (filter.from) { params.push(filter.from); where.push(`b.event_date >= $${params.length}`); }
    if (filter.to) { params.push(filter.to); where.push(`b.event_date <= $${params.length}`); }
    if (filter.search) {
      params.push(`%${cleanText(filter.search, 100)}%`);
      where.push(`(b.reference ILIKE $${params.length} OR b.customer_name ILIKE $${params.length} OR b.customer_email ILIKE $${params.length})`);
    }
    const limit = clampInt(filter.limit, 20, 1, 200);
    const page = clampInt(filter.page, 1, 1, 100_000);
    const count = await one<{ count: string }>(`SELECT COUNT(*)::text AS count FROM bookings b WHERE ${where.join(" AND ")}`, params);
    const rows = await query<Record<string, unknown>>(
      `SELECT b.*, v.name AS venue_name FROM bookings b JOIN venues v ON v.id = b.venue_id
       WHERE ${where.join(" AND ")} ORDER BY b.event_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );
    return { data: rows.map(rowToBooking), total: Number(count?.count ?? 0), page };
  },

  async get(id: string) {
    const row = await one<Record<string, unknown>>(
      "SELECT b.*, v.name AS venue_name FROM bookings b JOIN venues v ON v.id=b.venue_id WHERE b.id=$1",
      [Number(id) || -1]
    );
    return row ? rowToBooking(row) : undefined;
  },

  /** Create a booking atomically and reject overlapping confirmed/pending bookings. */
  async create(input: {
    venueId: string; spaceId?: string | null; customerName: string; customerEmail?: string;
    customerPhone?: string; eventType?: string; eventDate: string; startTime?: string;
    endTime?: string; timezone?: string; guestCount?: number; currency?: string;
    subtotal?: number; taxes?: number; total?: number; internalNotes?: string; createdBy?: number;
  }) {
    const venueId = Number(input.venueId) || -1;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)) {
      throw new ValidationError({ eventDate: "Event date is required (YYYY-MM-DD)" });
    }
    return transaction(async (tx) => {
      const venue = await tx.query<{ id: number }>(
        "SELECT id FROM venues WHERE id=$1 AND deleted_at IS NULL",
        [venueId]
      );
      if (!venue.rows[0]) throw new ValidationError({ venueId: "Venue not found" });
      const spaceId = input.spaceId ? Number(input.spaceId) || null : null;
      const conflict = await tx.query<{ id: number }>(
        `SELECT id FROM bookings
         WHERE venue_id=$1 AND event_date=$2 AND status IN ('pending','confirmed')
           AND ($3::int IS NULL OR space_id = $3::int OR space_id IS NULL)
           AND (start_time IS NULL OR end_time IS NULL OR $4::time IS NULL OR $5::time IS NULL
                OR (start_time < $5::time AND end_time > $4::time))
         LIMIT 1 FOR UPDATE`,
        [venueId, input.eventDate, spaceId, input.startTime ?? null, input.endTime ?? null]
      );
      if (conflict.rows[0]) {
        throw new ValidationError({ eventDate: "The venue is already booked for that date and time" });
      }
      const reference = `VOMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const inserted = await tx.query<{ id: number }>(
        `INSERT INTO bookings (reference,venue_id,space_id,customer_name,customer_email,customer_phone,
          event_type,event_date,start_time,end_time,timezone,guest_count,subtotal,taxes,total,
          internal_notes,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
        [
          reference, venueId, spaceId, cleanText(input.customerName, 200),
          cleanText(input.customerEmail, 320), cleanText(input.customerPhone, 40),
          cleanText(input.eventType, 120), input.eventDate, input.startTime ?? null,
          input.endTime ?? null, cleanText(input.timezone, 80) || "Asia/Kolkata",
          clampInt(input.guestCount, 0, 0), input.subtotal ?? 0, input.taxes ?? 0,
          input.total ?? 0, cleanText(input.internalNotes, 5_000), input.createdBy ?? null,
        ]
      );
      const id = String(inserted.rows[0].id);
      await tx.query(
        `INSERT INTO booking_status_history (booking_id,to_status,note,actor_id)
         VALUES ($1,'enquiry','Booking created',$2)`,
        [id, input.createdBy ?? null]
      );
      const row = await tx.query<Record<string, unknown>>("SELECT * FROM bookings WHERE id=$1", [id]);
      return rowToBooking(row.rows[0]);
    });
  },

  async setStatus(id: string, status: string, note: string, actorId?: number) {
    const allowed = ["enquiry", "pending", "confirmed", "completed", "cancelled", "no_show"];
    if (!allowed.includes(status)) throw new ValidationError({ status: "Invalid booking status" });
    return transaction(async (tx) => {
      const current = await tx.query<{ status: string }>("SELECT status FROM bookings WHERE id=$1 FOR UPDATE", [Number(id) || -1]);
      if (!current.rows[0]) return null;
      await tx.query(
        "UPDATE bookings SET status=$1, cancelled_at=CASE WHEN $1='cancelled' THEN now() ELSE cancelled_at END, updated_at=now() WHERE id=$2",
        [status, Number(id)]
      );
      await tx.query(
        `INSERT INTO booking_status_history (booking_id,from_status,to_status,note,actor_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [Number(id), current.rows[0].status, status, cleanText(note, 1_000), actorId ?? null]
      );
      const row = await tx.query<Record<string, unknown>>("SELECT * FROM bookings WHERE id=$1", [Number(id)]);
      return rowToBooking(row.rows[0]);
    });
  },

  async stats() {
    const row = await one<Record<string, string>>(
      `SELECT COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status IN ('pending','confirmed'))::text AS active,
        COUNT(*) FILTER (WHERE event_date = CURRENT_DATE)::text AS today,
        COALESCE(SUM(total) FILTER (WHERE status <> 'cancelled'),0)::text AS revenue
       FROM bookings`
    );
    return {
      total: Number(row?.total ?? 0),
      active: Number(row?.active ?? 0),
      today: Number(row?.today ?? 0),
      revenue: Number(row?.revenue ?? 0),
    };
  },
};

// ── Website pages (CMS) ──────────────────────────────────────────────────────
function rowToPage(row: Record<string, unknown>): WebsitePage {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description ?? ""),
    blocks: asJson(row.blocks, []),
    seoTitle: String(row.seo_title ?? ""),
    seoDescription: String(row.seo_description ?? ""),
    canonicalUrl: String(row.canonical_url ?? ""),
    ogImage: String(row.og_image ?? ""),
    robots: String(row.robots ?? "index,follow"),
    status: (row.status as WebsitePage["status"]) ?? "draft",
    publishedAt: row.published_at ? iso(row.published_at) : null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export const pagesDb = {
  async list(filter: { status?: string } = {}) {
    const params: unknown[] = [];
    let where = "deleted_at IS NULL";
    if (filter.status) { params.push(filter.status); where += ` AND status = $${params.length}`; }
    const rows = await query<Record<string, unknown>>(`SELECT * FROM pages WHERE ${where} ORDER BY title ASC`, params);
    return { data: rows.map(rowToPage), total: rows.length };
  },

  async get(idOrSlug: string) {
    const key = cleanText(idOrSlug, 200);
    const numericId = /^\d+$/.test(key) ? Number(key) : -1;
    const row = await one<Record<string, unknown>>("SELECT * FROM pages WHERE (id=$1 OR slug=$2) AND deleted_at IS NULL", [numericId, key]);
    return row ? rowToPage(row) : undefined;
  },

  async create(input: Partial<WebsitePage>, actorId?: number) {
    const slug = cleanSlug(input.slug || input.title || "");
    if (!input.title || !slug) throw new ValidationError({ title: "Title is required" });
    const row = await one<{ id: number }>(
      `INSERT INTO pages (slug,title,description,blocks,seo_title,seo_description,canonical_url,og_image,robots,status,published_at)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        slug, cleanText(input.title, 250), cleanText(input.description, 1_000),
        JSON.stringify(input.blocks ?? []), cleanText(input.seoTitle, 200),
        cleanText(input.seoDescription, 400), cleanText(input.canonicalUrl, 2_000),
        cleanText(input.ogImage, 2_000), cleanText(input.robots, 100) || "index,follow",
        ["draft", "published", "archived"].includes(input.status ?? "") ? input.status : "draft",
        input.status === "published" ? new Date() : null,
      ]
    );
    await execute(
      `INSERT INTO page_revisions (page_id,snapshot,created_by)
       SELECT id, to_jsonb(p), $2 FROM pages p WHERE id=$1`,
      [row!.id, actorId ?? null]
    );
    return (await pagesDb.get(String(row!.id)))!;
  },

  async update(id: string, input: Partial<WebsitePage>, actorId?: number) {
    const existing = await pagesDb.get(id);
    if (!existing) return null;
    await execute(
      `INSERT INTO page_revisions (page_id,snapshot,created_by)
       SELECT id, to_jsonb(p), $2 FROM pages p WHERE id=$1`,
      [Number(existing.id), actorId ?? null]
    );
    const merged = { ...existing, ...input };
    const slug = cleanSlug(merged.slug || merged.title);
    await execute(
      `UPDATE pages SET slug=$1,title=$2,description=$3,blocks=$4::jsonb,seo_title=$5,seo_description=$6,
        canonical_url=$7,og_image=$8,robots=$9,status=$10,
        published_at=CASE WHEN $10='published' AND published_at IS NULL THEN now() ELSE published_at END,
        updated_at=now() WHERE id=$11`,
      [
        slug, cleanText(merged.title, 250), cleanText(merged.description, 1_000),
        JSON.stringify(merged.blocks ?? []), cleanText(merged.seoTitle, 200),
        cleanText(merged.seoDescription, 400), cleanText(merged.canonicalUrl, 2_000),
        cleanText(merged.ogImage, 2_000), cleanText(merged.robots, 100) || "index,follow",
        merged.status, Number(existing.id),
      ]
    );
    return pagesDb.get(existing.id);
  },

  async delete(id: string) {
    return (await execute("UPDATE pages SET deleted_at=now(), status='archived' WHERE id=$1", [Number(id) || -1])) > 0;
  },
};

// ── Content blocks: homepage, navigation, FAQs, announcements ────────────────
export const contentDb = {
  async homepage() {
    const sections = await query<Record<string, unknown>>(
      "SELECT * FROM homepage_sections ORDER BY sort_order ASC"
    );
    return sections.map((row) => ({
      id: String(row.id),
      key: String(row.key),
      type: String(row.type),
      title: String(row.title ?? ""),
      subtitle: String(row.subtitle ?? ""),
      content: asJson(row.content, {}),
      sortOrder: asNumber(row.sort_order),
      visible: asBool(row.visible),
      background: String(row.background ?? ""),
    }));
  },

  async updateHomepageSection(key: string, input: Record<string, unknown>) {
    const existing = await one<Record<string, unknown>>("SELECT * FROM homepage_sections WHERE key=$1", [key]);
    if (!existing) return null;
    await execute(
      `UPDATE homepage_sections SET title=$1,subtitle=$2,content=$3::jsonb,sort_order=$4,visible=$5,background=$6,updated_at=now() WHERE key=$7`,
      [
        cleanText(input.title ?? existing.title, 300),
        cleanText(input.subtitle ?? existing.subtitle, 500),
        JSON.stringify(input.content ?? asJson(existing.content, {})),
        clampInt(input.sortOrder ?? existing.sort_order, 0, 0),
        input.visible === undefined ? asBool(existing.visible) : Boolean(input.visible),
        cleanText(input.background ?? existing.background, 500), key,
      ]
    );
    return (await contentDb.homepage()).find((s) => s.key === key);
  },

  async navigation(location = "header") {
    const rows = await query<Record<string, unknown>>(
      "SELECT * FROM navigation_items WHERE location=$1 ORDER BY sort_order ASC, id ASC",
      [location]
    );
    return rows.map((row) => ({
      id: String(row.id),
      label: String(row.label),
      url: String(row.url),
      sortOrder: asNumber(row.sort_order),
      visible: asBool(row.visible),
      parentId: row.parent_id ? String(row.parent_id) : null,
    }));
  },

  async faqs(publicOnly = false) {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM faqs ${publicOnly ? "WHERE visible = true" : ""} ORDER BY sort_order ASC, id ASC`
    );
    return rows.map((row) => ({
      id: String(row.id),
      question: String(row.question),
      answer: String(row.answer),
      sortOrder: asNumber(row.sort_order),
      visible: asBool(row.visible),
    }));
  },

  async announcements() {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM announcements
       WHERE visible = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now())
       ORDER BY created_at DESC`
    );
    return rows.map((row) => ({
      id: String(row.id),
      message: String(row.message),
      linkUrl: String(row.link_url ?? ""),
      linkLabel: String(row.link_label ?? ""),
    }));
  },

  async allAnnouncements() {
    const rows = await query<Record<string, unknown>>(
      "SELECT * FROM announcements ORDER BY created_at DESC"
    );
    return rows.map((row) => ({
      id: String(row.id),
      message: String(row.message),
      linkUrl: String(row.link_url ?? ""),
      linkLabel: String(row.link_label ?? ""),
      startsAt: row.starts_at ? iso(row.starts_at) : null,
      endsAt: row.ends_at ? iso(row.ends_at) : null,
      visible: asBool(row.visible),
    }));
  },

  async createAnnouncement(input: Record<string, unknown>) {
    if (!cleanText(input.message, 500).trim()) {
      throw new ValidationError({ message: "Message is required" });
    }
    const row = await one<{ id: number }>(
      `INSERT INTO announcements (message,link_url,link_label,starts_at,ends_at,visible)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [
        cleanText(input.message, 500), cleanText(input.linkUrl, 500),
        cleanText(input.linkLabel, 120), input.startsAt || null,
        input.endsAt || null, input.visible === undefined ? true : Boolean(input.visible),
      ]
    );
    return (await contentDb.allAnnouncements()).find((a) => a.id === String(row!.id));
  },

  async updateAnnouncement(id: string, input: Record<string, unknown>) {
    const existing = await one<Record<string, unknown>>(
      "SELECT * FROM announcements WHERE id=$1",
      [Number(id) || -1]
    );
    if (!existing) return null;
    await execute(
      `UPDATE announcements SET message=$1,link_url=$2,link_label=$3,starts_at=$4,ends_at=$5,visible=$6 WHERE id=$7`,
      [
        cleanText(input.message ?? existing.message, 500),
        cleanText(input.linkUrl ?? existing.link_url, 500),
        cleanText(input.linkLabel ?? existing.link_label, 120),
        input.startsAt ?? existing.starts_at ?? null,
        input.endsAt ?? existing.ends_at ?? null,
        input.visible === undefined ? asBool(existing.visible) : Boolean(input.visible),
        Number(existing.id),
      ]
    );
    return (await contentDb.allAnnouncements()).find((a) => a.id === String(existing.id));
  },

  async deleteAnnouncement(id: string) {
    return (await execute("DELETE FROM announcements WHERE id=$1", [Number(id) || -1])) > 0;
  },

  async createNav(input: Record<string, unknown>) {
    const label = cleanText(input.label, 120).trim();
    const url = cleanText(input.url, 500).trim();
    if (!label || !url) throw new ValidationError({ label: "Label and URL are required" });
    const location = input.location === "footer" ? "footer" : "header";
    const row = await one<{ id: number }>(
      `INSERT INTO navigation_items (location,label,url,sort_order,visible,parent_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [location, label, url, clampInt(input.sortOrder, 0, 0),
        input.visible === undefined ? true : Boolean(input.visible),
        input.parentId ? Number(input.parentId) : null]
    );
    return (await contentDb.navigation(location)).find((n) => n.id === String(row!.id));
  },

  async updateNav(id: string, input: Record<string, unknown>) {
    const existing = await one<Record<string, unknown>>(
      "SELECT * FROM navigation_items WHERE id=$1",
      [Number(id) || -1]
    );
    if (!existing) return null;
    await execute(
      `UPDATE navigation_items SET label=$1,url=$2,sort_order=$3,visible=$4 WHERE id=$5`,
      [
        cleanText(input.label ?? existing.label, 120),
        cleanText(input.url ?? existing.url, 500),
        clampInt(input.sortOrder ?? existing.sort_order, 0, 0),
        input.visible === undefined ? asBool(existing.visible) : Boolean(input.visible),
        Number(existing.id),
      ]
    );
    return (await contentDb.navigation(String(existing.location))).find(
      (n) => n.id === String(existing.id)
    );
  },

  async deleteNav(id: string) {
    return (await execute("DELETE FROM navigation_items WHERE id=$1", [Number(id) || -1])) > 0;
  },

  async createFaq(input: Record<string, unknown>) {
    const question = cleanText(input.question, 500).trim();
    const answer = cleanText(input.answer, 5_000).trim();
    if (!question || !answer) throw new ValidationError({ question: "Question and answer are required" });
    const row = await one<{ id: number }>(
      `INSERT INTO faqs (question,answer,sort_order,visible) VALUES ($1,$2,$3,$4) RETURNING id`,
      [question, answer, clampInt(input.sortOrder, 0, 0),
        input.visible === undefined ? true : Boolean(input.visible)]
    );
    return (await contentDb.faqs()).find((f) => f.id === String(row!.id));
  },

  async updateFaq(id: string, input: Record<string, unknown>) {
    const existing = await one<Record<string, unknown>>("SELECT * FROM faqs WHERE id=$1", [Number(id) || -1]);
    if (!existing) return null;
    await execute(
      "UPDATE faqs SET question=$1,answer=$2,sort_order=$3,visible=$4 WHERE id=$5",
      [
        cleanText(input.question ?? existing.question, 500),
        cleanText(input.answer ?? existing.answer, 5_000),
        clampInt(input.sortOrder ?? existing.sort_order, 0, 0),
        input.visible === undefined ? asBool(existing.visible) : Boolean(input.visible),
        Number(existing.id),
      ]
    );
    return (await contentDb.faqs()).find((f) => f.id === String(existing.id));
  },

  async deleteFaq(id: string) {
    return (await execute("DELETE FROM faqs WHERE id=$1", [Number(id) || -1])) > 0;
  },
};

// ── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardDb = {
  async stats() {
    const [venueStats, cityCount, countryCount, enquiryCount, bookingStats, audits] = await Promise.all([
      venuesDb.stats(),
      one<{ count: string }>("SELECT COUNT(*)::text AS count FROM cities WHERE status='published'"),
      one<{ count: string }>("SELECT COUNT(*)::text AS count FROM countries WHERE active=true"),
      one<Record<string, string>>(
        `SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE status='new')::text AS new FROM enquiries`
      ),
      bookingsDb.stats(),
      auditDb.list({ limit: 8 }),
    ]);
    return {
      totalVenues: venueStats.total,
      publishedVenues: venueStats.published,
      pendingVenues: venueStats.pending,
      draftVenues: venueStats.draft,
      archivedVenues: venueStats.archived,
      totalCities: Number(cityCount?.count ?? 0),
      activeCountries: Number(countryCount?.count ?? 0),
      totalEnquiries: Number(enquiryCount?.total ?? 0),
      newEnquiries: Number(enquiryCount?.new ?? 0),
      totalBookings: bookingStats.total,
      activeBookings: bookingStats.active,
      revenue: bookingStats.revenue,
      recentActivity: audits.data,
    };
  },
};

// ── Compatibility export used by legacy imports ─────────────────────────────
export { DEFAULT_SETTINGS };
