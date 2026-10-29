export type VenueStatus =
  | "draft"
  | "pending"
  | "published"
  | "unpublished"
  | "rejected"
  | "archived";

export type ContentStatus = "draft" | "published" | "archived";

export interface Venue {
  id: string;
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  countryId?: number;
  stateId?: number | null;
  city: string;
  citySlug: string;
  cityId?: number | null;
  area: string;
  address?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  type: string;
  setting: "Indoor" | "Outdoor" | "Indoor + Outdoor";
  capacityMin: number;
  capacityMax: number;
  indoorCapacity?: number | null;
  outdoorCapacity?: number | null;
  roomsCount?: number | null;
  parking?: boolean;
  accessible?: boolean;
  catering?: boolean;
  accommodation?: boolean;
  decoration?: boolean;
  priceHint?: string;
  startingPrice?: number | null;
  currency?: string;
  pricingUnit?: string;
  packages?: Array<Record<string, unknown>>;
  taxesPct?: number;
  securityDeposit?: number | null;
  minBookingHours?: number | null;
  bookingLeadDays?: number;
  cancellationPolicy?: string;
  rules?: string;
  openingHours?: Record<string, unknown>;
  blackoutDates?: string[];
  image: string;
  imageAlt: string;
  gallery?: string[];
  shortDescription: string;
  fullDescription?: string;
  amenities: string[];
  eventTypes: string[];
  features?: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
  robots?: string;
  internalNotes?: string;
  verificationStatus?: "unverified" | "pending" | "verified" | "rejected";
  featured: boolean;
  rank?: number;
  status: VenueStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface City {
  id: string;
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  countryId?: number;
  stateId?: number | null;
  tagline: string;
  description: string;
  image: string;
  imageAlt: string;
  venueCountLabel: string;
  popularTypes: string[];
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Country {
  id: string;
  code: string;
  iso3?: string;
  name: string;
  flag: string;
  callingCode?: string;
  currency?: string;
  active: boolean;
  cityCount?: number;
  venueCount?: number;
}

export interface State {
  id: string;
  countryId: string;
  code: string;
  name: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  publishedOn: string;
  readingMinutes: number;
  image: string;
  imageAlt: string;
  body: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  robots?: string;
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  name: string;
  context: string;
  quote: string;
  rating: number;
  image: string;
  venueSlug: string;
  featured: boolean;
  status: ContentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface SiteSettings {
  brandName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  hours: string;
  responseNote: string;
  footerNote: string;
  instagram: string;
  facebook: string;
  youtube: string;
  twitter: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  heroTitle: string;
  heroSubtitle: string;
  heroTagline: string;
  featuredSectionTitle: string;
  featuredSectionSubtitle: string;
  ctaTitle: string;
  ctaCopy: string;
  currency?: string;
  locale?: string;
  timezone?: string;
  taxPct?: string;
  bookingLeadDays?: string;
  cancellationPolicy?: string;
  [key: string]: string | undefined;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  eventType: string;
  eventDate: string;
  guestCount: string;
  message?: string;
  venueName?: string;
  source: string;
  status: "new" | "read" | "replied" | "archived";
  createdAt: string;
  updatedAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleName?: string;
  permissions?: string[];
  isActive?: boolean;
  lastLoginAt?: string | null;
}

export interface AdminUserRecord extends AdminUser {
  passwordHash: string;
  failedLoginCount: number;
  lockedUntil: string | null;
}

export interface LoginResponse {
  user: AdminUser;
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
  page?: number;
}

export interface MediaFile {
  id: string;
  url: string;
  filename: string;
  originalName?: string;
  size: number;
  mimeType: string;
  kind: "image" | "video" | "document";
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  altText?: string;
  caption?: string;
  credit?: string;
  folder?: string;
  posterUrl?: string;
  variants?: Record<string, string>;
  createdAt: string;
}

export interface Booking {
  id: string;
  reference: string;
  venueId: string;
  venueName?: string;
  spaceId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventType: string;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  timezone: string;
  guestCount: number;
  status: string;
  currency: string;
  subtotal: number;
  taxes: number;
  total: number;
  depositPaid: number;
  paymentStatus: string;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebsitePage {
  id: string;
  slug: string;
  title: string;
  description: string;
  blocks: Array<Record<string, unknown>>;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImage: string;
  robots: string;
  status: ContentStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId?: string | null;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: string;
  summary: Record<string, unknown>;
  ip: string;
  createdAt: string;
}
