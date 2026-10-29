/**
 * Demo mode mock data — used when the backend is not yet connected.
 * Remove or disable by setting NEXT_PUBLIC_DEMO_MODE=false once the real
 * API at NEXT_PUBLIC_API_URL is available.
 */

import type {
  Venue, City, Country, BlogPost, Review, SiteSettings,
  AdminUser, LoginResponse, ApiResponse, MediaFile,
} from "@/types";

export const DEMO_TOKEN = "demo_token_vomp_2024";

export const DEMO_USER: AdminUser = {
  id: "demo-admin",
  email: "admin@demo.com",
  name: "Demo Admin",
  role: "admin",
};

export const DEMO_LOGIN: LoginResponse = {
  user: DEMO_USER,
};

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("vomp_admin_token") === DEMO_TOKEN;
}

export const DEMO_VENUES: Venue[] = [
  {
    id: "1", slug: "lake-palace-udaipur", name: "Lake Palace", country: "India",
    countryCode: "IN", city: "Udaipur", citySlug: "udaipur", area: "Lake Pichola",
    type: "Heritage Palace", setting: "Indoor + Outdoor", capacityMin: 100,
    capacityMax: 1000, priceHint: "₹15L+", image: "/images/udaipur-city.jpg",
    imageAlt: "Lake Palace Udaipur", shortDescription: "A floating palace on Lake Pichola.",
    amenities: ["Pool", "Spa", "Helipad", "Fine Dining"], featured: true,
    eventTypes: ["Wedding", "Reception", "Corporate event"],
    status: "published", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-10T10:00:00Z",
  },
  {
    id: "2", slug: "city-palace-jaipur", name: "City Palace Jaipur", country: "India",
    countryCode: "IN", city: "Jaipur", citySlug: "jaipur", area: "Old City",
    type: "Fort Venue", setting: "Outdoor", capacityMin: 200, capacityMax: 2000,
    priceHint: "₹20L+", image: "/images/udaipur-palace2.jpg", imageAlt: "City Palace Jaipur",
    shortDescription: "Royal Rajput architecture with grand courtyards.",
    amenities: ["Valet Parking", "Catering", "Decor Team"], featured: true,
    eventTypes: ["Wedding", "Reception", "Sangeet"],
    status: "published", createdAt: "2026-10-02T10:00:00Z", updatedAt: "2026-10-11T10:00:00Z",
  },
  {
    id: "3", slug: "villa-d-este-como", name: "Villa d'Este", country: "Italy",
    countryCode: "IT", city: "Como", citySlug: "como", area: "Lake Como",
    type: "Luxury Villa", setting: "Indoor + Outdoor", capacityMin: 50, capacityMax: 400,
    priceHint: "€25K+", image: "/images/hero-poster.jpg", imageAlt: "Villa d'Este Lake Como",
    shortDescription: "An iconic 19th-century villa on the shores of Lake Como.",
    amenities: ["Private Dock", "Gardens", "Michelin Chef", "Helipad"],
    featured: true, eventTypes: ["Wedding", "Private party", "Corporate event"],
    status: "published", createdAt: "2026-10-05T10:00:00Z", updatedAt: "2026-10-12T10:00:00Z",
  },
  {
    id: "4", slug: "umaid-bhawan-jodhpur", name: "Umaid Bhawan Palace", country: "India",
    countryCode: "IN", city: "Jodhpur", citySlug: "jodhpur", area: "Circuit House Road",
    type: "Heritage Palace", setting: "Indoor + Outdoor", capacityMin: 150,
    capacityMax: 1500, priceHint: "₹25L+", image: "/images/wedding-decor.jpg",
    imageAlt: "Umaid Bhawan Palace Jodhpur",
    shortDescription: "Art Deco masterpiece — one of the world's largest private homes.",
    amenities: ["Museum", "Pool", "Tennis Court", "Spa"],
    featured: false, eventTypes: ["Wedding", "Reception"],
    status: "draft", createdAt: "2026-10-08T10:00:00Z", updatedAt: "2026-10-13T10:00:00Z",
  },
  {
    id: "5", slug: "borgo-egnazia-puglia", name: "Borgo Egnazia", country: "Italy",
    countryCode: "IT", city: "Fasano", citySlug: "fasano", area: "Puglia",
    type: "Masseria Resort", setting: "Outdoor", capacityMin: 80, capacityMax: 600,
    priceHint: "€30K+", image: "/images/indian-ceremony.jpg", imageAlt: "Borgo Egnazia Puglia",
    shortDescription: "A trulli village reimagined as a five-star resort in Puglia.",
    amenities: ["Private Trulli", "Spa", "Organic Garden", "Pool"],
    featured: false, eventTypes: ["Wedding", "Private party"],
    status: "published", createdAt: "2026-10-09T10:00:00Z", updatedAt: "2026-10-14T10:00:00Z",
  },
];

export const DEMO_CITIES: City[] = [
  { id: "1", slug: "udaipur", name: "Udaipur", country: "India", countryCode: "IN", tagline: "Lakes, palaces and golden-hour pheras.", description: "India's most loved destination-wedding city.", image: "/images/udaipur-city.jpg", imageAlt: "Udaipur", venueCountLabel: "Curated venues", popularTypes: ["Palace", "Resort"], status: "published" },
  { id: "2", slug: "jaipur", name: "Jaipur", country: "India", countryCode: "IN", tagline: "Rajput grandeur, an hour from Delhi.", description: "Forts, garden resorts and city palaces.", image: "/images/udaipur-palace2.jpg", imageAlt: "Jaipur", venueCountLabel: "Curated venues", popularTypes: ["Fort", "Garden Resort"], status: "published" },
  { id: "3", slug: "como", name: "Lake Como", country: "Italy", countryCode: "IT", tagline: "Villas, gardens and Alpine panoramas.", description: "Italy's most elegant lakeside wedding destination.", image: "/images/hero-poster.jpg", imageAlt: "Lake Como", venueCountLabel: "Curated venues", popularTypes: ["Villa", "Hotel"], status: "published" },
];

export const DEMO_COUNTRIES: Country[] = [
  { id: "1", code: "IN", name: "India", flag: "🇮🇳", active: true, cityCount: 6, venueCount: 24 },
  { id: "2", code: "IT", name: "Italy", flag: "🇮🇹", active: true, cityCount: 4, venueCount: 8 },
  { id: "3", code: "FR", name: "France", flag: "🇫🇷", active: false, cityCount: 0, venueCount: 0 },
  { id: "4", code: "AE", name: "UAE", flag: "🇦🇪", active: false, cityCount: 0, venueCount: 0 },
  { id: "5", code: "TH", name: "Thailand", flag: "🇹🇭", active: false, cityCount: 0, venueCount: 0 },
];

export const DEMO_BLOGS: BlogPost[] = [
  { id: "1", slug: "how-to-choose-venue", title: "How to Choose the Perfect Wedding Venue", excerpt: "A practical guide.", category: "Planning", author: "Team VOMP", publishedOn: "2026-09-15", readingMinutes: 7, image: "/images/wedding-decor.jpg", imageAlt: "Wedding venue", body: ["The venue sets the tone for your entire celebration..."], status: "published" },
  { id: "2", slug: "italy-wedding-guide", title: "Getting Married in Italy: A Complete Guide", excerpt: "Everything you need to know.", category: "Destination", author: "Team VOMP", publishedOn: "2026-10-01", readingMinutes: 12, image: "/images/hero-poster.jpg", imageAlt: "Italy wedding", body: ["Italy has long been a dream destination for weddings..."], status: "published" },
];

export const DEMO_REVIEWS: Review[] = [
  { id: "1", name: "Priya & Arjun Sharma", context: "Wedding at Lake Palace", quote: "Absolutely magical. Every detail was perfect.", rating: 5, image: "", venueSlug: "lake-palace-udaipur", featured: true, status: "published", createdAt: "2026-09-20T10:00:00Z" },
  { id: "2", name: "Sophie & Marco Bianchi", context: "Wedding at Villa d'Este", quote: "An experience beyond words. Our guests are still talking about it.", rating: 5, image: "", venueSlug: "villa-d-este-como", featured: false, status: "draft", createdAt: "2026-10-10T10:00:00Z" },
];

export const DEMO_SETTINGS: SiteSettings = {
  brandName: "Venue On My Plate",
  tagline: "Find a venue worthy of your occasion",
  email: "hello@venueonmyplate.in",
  phone: "+91 98765 43210",
  whatsapp: "+919462460555",
  address: "Udaipur · Jaipur · Jodhpur · Jaisalmer · Goa",
  hours: "Mon–Sat, 10am–7pm IST",
  responseNote: "We respond within one business day.",
  instagram: "https://instagram.com/venueonmyplate",
  footerNote: "Luxury venue discovery across India and Italy.",
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

export const DEMO_MEDIA: MediaFile[] = [
  { id: "1", url: "/images/udaipur-city.jpg", filename: "udaipur-city.jpg", size: 245000, mimeType: "image/jpeg", kind: "image", createdAt: "2026-10-01T10:00:00Z" },
  { id: "2", url: "/images/udaipur-palace2.jpg", filename: "udaipur-palace2.jpg", size: 312000, mimeType: "image/jpeg", kind: "image", createdAt: "2026-10-02T10:00:00Z" },
  { id: "3", url: "/images/hero-poster.jpg", filename: "hero-poster.jpg", size: 198000, mimeType: "image/jpeg", kind: "image", createdAt: "2026-10-03T10:00:00Z" },
  { id: "4", url: "/images/wedding-decor.jpg", filename: "wedding-decor.jpg", size: 278000, mimeType: "image/jpeg", kind: "image", createdAt: "2026-10-04T10:00:00Z" },
];

export const DEMO_STATS = {
  totalVenues: DEMO_VENUES.length,
  publishedVenues: DEMO_VENUES.filter(v => v.status === "published").length,
  totalCities: DEMO_CITIES.length,
  activeCountries: DEMO_COUNTRIES.filter(c => c.active).length,
};

function paginate<T>(arr: T[], page = 1, limit = 20): ApiResponse<T[]> {
  const start = (page - 1) * limit;
  return { data: arr.slice(start, start + limit), total: arr.length, page };
}

/** Full mock API — mirrors every real API function */
export const demoApi = {
  login: (): LoginResponse => DEMO_LOGIN,

  venues: {
    list: (params?: Record<string, string>): ApiResponse<Venue[]> => {
      let data = [...DEMO_VENUES];
      if (params?.search) data = data.filter(v => v.name.toLowerCase().includes(params.search!.toLowerCase()));
      if (params?.country) data = data.filter(v => v.countryCode === params.country || v.country === params.country);
      if (params?.status) data = data.filter(v => v.status === params.status);
      return paginate(data, Number(params?.page ?? 1), Number(params?.limit ?? 20));
    },
    get: (id: string): Venue | undefined => DEMO_VENUES.find(v => v.id === id || v.slug === id),
  },

  cities: {
    list: (): ApiResponse<City[]> => paginate(DEMO_CITIES),
    get: (id: string): City | undefined => DEMO_CITIES.find(c => c.id === id),
  },

  countries: {
    list: (): ApiResponse<Country[]> => paginate(DEMO_COUNTRIES),
  },

  blogs: {
    list: (): ApiResponse<BlogPost[]> => paginate(DEMO_BLOGS),
    get: (id: string): BlogPost | undefined => DEMO_BLOGS.find(b => b.id === id),
  },

  reviews: {
    list: (): ApiResponse<Review[]> => paginate(DEMO_REVIEWS),
  },

  settings: {
    get: (): SiteSettings => DEMO_SETTINGS,
  },

  media: {
    list: (): ApiResponse<MediaFile[]> => paginate(DEMO_MEDIA),
  },

  dashboard: {
    stats: () => DEMO_STATS,
    recentVenues: (): ApiResponse<Venue[]> => ({ data: DEMO_VENUES.slice(0, 5), total: DEMO_VENUES.length }),
  },
};
