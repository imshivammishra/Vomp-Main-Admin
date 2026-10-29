import type {
  Venue,
  City,
  Country,
  State,
  BlogPost,
  Review,
  SiteSettings,
  AdminUser,
  LoginResponse,
  ApiResponse,
  MediaFile,
  Enquiry,
  Booking,
  WebsitePage,
  AuditLogEntry,
  VenueStatus,
} from "@/types";

// Same-origin by default. NEXT_PUBLIC_API_URL points at the dedicated API
// sub-domain (e.g. https://dev.api.venueonmyplate.com) when the admin UI and
// API are served from different origins; the session cookie is HttpOnly and is
// shared across sub-domains via SESSION_COOKIE_DOMAIN.
const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

let redirecting = false;

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // Public endpoints use a wildcard CORS policy (Access-Control-Allow-Origin: *)
  // and require no authentication. A credentialed request against a wildcard
  // origin is rejected by the browser when cross-origin, so omit credentials for
  // public paths; admin paths still send the HttpOnly session cookie.
  const isPublic = path.startsWith("/api/v1/public/");

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      credentials: isPublic ? "omit" : "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Network error. Check your connection and try again.", 0);
  }

  if (res.status === 401) {
    if (typeof window !== "undefined" && !redirecting) {
      redirecting = true;
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${next}`;
    }
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let fields: Record<string, string> | undefined;
    try {
      const payload = await res.json();
      message = payload.error ?? payload.message ?? message;
      if (payload.fields && typeof payload.fields === "object") fields = payload.fields;
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(message, res.status, fields);
  }

  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

function qs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

// ─── Venues ──────────────────────────────────────────────────────────────────

export const venuesApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    request<ApiResponse<Venue[]>>("GET", `/api/v1/admin/venues${qs(params)}`),
  get: (id: string) => request<Venue>("GET", `/api/v1/admin/venues/${id}`),
  create: (data: Partial<Venue>) =>
    request<Venue>("POST", "/api/v1/admin/venues", data),
  update: (id: string, data: Partial<Venue>) =>
    request<Venue>("PUT", `/api/v1/admin/venues/${id}`, data),
  delete: (id: string) =>
    request<void>("DELETE", `/api/v1/admin/venues/${id}`),
  uploadImage: async (file: File): Promise<MediaFile> => mediaApi.upload(file),
};

// ─── Cities ───────────────────────────────────────────────────────────────────

export const citiesApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    request<ApiResponse<City[]>>("GET", `/api/v1/admin/cities${qs(params)}`),
  get: (id: string) => request<City>("GET", `/api/v1/admin/cities/${id}`),
  create: (data: Partial<City>) =>
    request<City>("POST", "/api/v1/admin/cities", data),
  update: (id: string, data: Partial<City>) =>
    request<City>("PUT", `/api/v1/admin/cities/${id}`, data),
  delete: (id: string) =>
    request<void>("DELETE", `/api/v1/admin/cities/${id}`),
};

// ─── Countries & geography ────────────────────────────────────────────────────

export const countriesApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    request<ApiResponse<Country[]>>("GET", `/api/v1/admin/countries${qs(params)}`),
  get: (id: string) =>
    request<Country>("GET", `/api/v1/admin/countries/${id}`),
  create: (data: Partial<Country>) =>
    request<Country>("POST", "/api/v1/admin/countries", data),
  update: (id: string, data: Partial<Country>) =>
    request<Country>("PUT", `/api/v1/admin/countries/${id}`, data),
  deactivate: (id: string) =>
    request<Country>("DELETE", `/api/v1/admin/countries/${id}`),
};

export const geoApi = {
  countries: () =>
    request<ApiResponse<Country[]>>("GET", "/api/v1/public/geo/countries"),
  states: (country: string) =>
    request<ApiResponse<State[]>>("GET", `/api/v1/public/geo/states${qs({ country })}`),
  cities: (country: string, state?: string, search?: string) =>
    request<ApiResponse<Array<{ name: string; stateCode: string }>>>(
      "GET",
      `/api/v1/public/geo/cities${qs({ country, state, search })}`
    ),
};

// ─── Blogs ────────────────────────────────────────────────────────────────────

export const blogsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    request<ApiResponse<BlogPost[]>>("GET", `/api/v1/admin/blogs${qs(params)}`),
  get: (id: string) => request<BlogPost>("GET", `/api/v1/admin/blogs/${id}`),
  create: (data: Partial<BlogPost>) =>
    request<BlogPost>("POST", "/api/v1/admin/blogs", data),
  update: (id: string, data: Partial<BlogPost>) =>
    request<BlogPost>("PUT", `/api/v1/admin/blogs/${id}`, data),
  delete: (id: string) =>
    request<void>("DELETE", `/api/v1/admin/blogs/${id}`),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviewsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    request<ApiResponse<Review[]>>("GET", `/api/v1/admin/reviews${qs(params)}`),
  get: (id: string) => request<Review>("GET", `/api/v1/admin/reviews/${id}`),
  create: (data: Partial<Review>) =>
    request<Review>("POST", "/api/v1/admin/reviews", data),
  update: (id: string, data: Partial<Review>) =>
    request<Review>("PATCH", `/api/v1/admin/reviews/${id}`, data),
  approve: (id: string) =>
    request<Review>("PATCH", `/api/v1/admin/reviews/${id}`, { status: "published" }),
  reject: (id: string) =>
    request<Review>("PATCH", `/api/v1/admin/reviews/${id}`, { status: "draft" }),
  delete: (id: string) =>
    request<void>("DELETE", `/api/v1/admin/reviews/${id}`),
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsApi = {
  get: () => request<SiteSettings>("GET", "/api/v1/admin/settings"),
  update: (data: Partial<SiteSettings>) =>
    request<SiteSettings>("PUT", "/api/v1/admin/settings", data),
};

// ─── Media ────────────────────────────────────────────────────────────────────

export const mediaApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    request<ApiResponse<MediaFile[]>>("GET", `/api/v1/admin/media${qs(params)}`),
  update: (id: string, data: Partial<MediaFile>) =>
    request<MediaFile>("PATCH", `/api/v1/admin/media/${id}`, data),
  upload: async (
    file: File,
    options: {
      folder?: string;
      altText?: string;
      caption?: string;
      credit?: string;
      duration?: number;
      signal?: AbortSignal;
      onProgress?: (percent: number) => void;
    } = {}
  ): Promise<MediaFile> => {
    const form = new FormData();
    form.append("file", file);
    if (options.folder) form.append("folder", options.folder);
    if (options.altText) form.append("altText", options.altText);
    if (options.caption) form.append("caption", options.caption);
    if (options.credit) form.append("credit", options.credit);
    if (options.duration) form.append("duration", String(options.duration));

    // Use XHR so real upload progress can be reported.
    return new Promise<MediaFile>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API}/api/v1/admin/media/upload`);
      xhr.withCredentials = true;
      xhr.responseType = "json";
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && options.onProgress) {
          options.onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onerror = () => reject(new ApiError("Upload failed. Check your connection.", 0));
      xhr.onabort = () => reject(new ApiError("Upload cancelled", 0));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response as MediaFile);
        } else if (xhr.status === 401) {
          reject(new ApiError("Your session has expired. Please sign in again.", 401));
        } else {
          const payload = xhr.response as { error?: string; message?: string } | null;
          reject(
            new ApiError(
              payload?.error ?? payload?.message ?? `Upload failed (${xhr.status})`,
              xhr.status
            )
          );
        }
      };
      if (options.signal) {
        options.signal.addEventListener("abort", () => xhr.abort());
      }
      xhr.send(form);
    });
  },
  delete: (id: string) =>
    request<void>("DELETE", `/api/v1/admin/media/${id}`),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string, remember = false): Promise<LoginResponse> =>
    request<LoginResponse>("POST", "/api/v1/admin/auth/login", { email, password, remember }),
  logout: () => request<void>("POST", "/api/v1/admin/auth/logout").catch(() => undefined),
  me: () => request<AdminUser>("GET", "/api/v1/admin/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ changed: boolean }>("POST", "/api/v1/admin/auth/change-password", {
      currentPassword,
      newPassword,
    }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalVenues: number;
  publishedVenues: number;
  pendingVenues: number;
  draftVenues: number;
  archivedVenues: number;
  totalCities: number;
  activeCountries: number;
  totalEnquiries: number;
  newEnquiries: number;
  totalBookings: number;
  activeBookings: number;
  revenue: number;
  recentActivity: AuditLogEntry[];
}

export const dashboardApi = {
  stats: () => request<DashboardStats>("GET", "/api/v1/admin/dashboard/stats"),
  recentVenues: () =>
    request<ApiResponse<Venue[]>>(
      "GET",
      "/api/v1/admin/venues?limit=5&sort=createdAt&order=desc"
    ),
};

// ─── Public-site sync & health ────────────────────────────────────────────────

export interface HealthStatus {
  status: "ok" | "degraded";
  database: {
    driver: "pg" | "pglite";
    ok: boolean;
    latencyMs: number;
    error?: string;
  };
  time: string;
}

export const syncApi = {
  run: () => request<{ synced: boolean; status: number }>("POST", "/api/v1/admin/sync"),
};

export const healthApi = {
  /** Health checks return 503 when degraded, so this never treats that as a hard error. */
  check: async (): Promise<HealthStatus> => {
    const response = await fetch(`${API}/api/health`, {
      cache: "no-store",
      credentials: "include",
    });
    return (await response.json()) as HealthStatus;
  },
};

// ─── Enquiries ────────────────────────────────────────────────────────────────

export const enquiriesApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    request<ApiResponse<Enquiry[]>>("GET", `/api/v1/admin/enquiries${qs(params)}`),
  get: (id: string) => request<Enquiry>("GET", `/api/v1/admin/enquiries/${id}`),
  update: (id: string, data: Partial<Enquiry>) =>
    request<Enquiry>("PATCH", `/api/v1/admin/enquiries/${id}`, data),
  delete: (id: string) =>
    request<void>("DELETE", `/api/v1/admin/enquiries/${id}`),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookingsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    request<ApiResponse<Booking[]>>("GET", `/api/v1/admin/bookings${qs(params)}`),
  get: (id: string) => request<Booking>("GET", `/api/v1/admin/bookings/${id}`),
  create: (data: Partial<Booking>) =>
    request<Booking>("POST", "/api/v1/admin/bookings", data),
  setStatus: (id: string, status: string, note = "") =>
    request<Booking>("PATCH", `/api/v1/admin/bookings/${id}`, { status, note }),
};

// ─── Website pages (CMS) ──────────────────────────────────────────────────────

export const pagesApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    request<ApiResponse<WebsitePage[]>>("GET", `/api/v1/admin/pages${qs(params)}`),
  get: (id: string) => request<WebsitePage>("GET", `/api/v1/admin/pages/${id}`),
  create: (data: Partial<WebsitePage>) =>
    request<WebsitePage>("POST", "/api/v1/admin/pages", data),
  update: (id: string, data: Partial<WebsitePage>) =>
    request<WebsitePage>("PUT", `/api/v1/admin/pages/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/api/v1/admin/pages/${id}`),
};

// ─── Content: homepage, navigation, FAQs, announcements ──────────────────────

export interface HomepageSection {
  id: string;
  key: string;
  type: string;
  title: string;
  subtitle: string;
  content: Record<string, unknown>;
  sortOrder: number;
  visible: boolean;
  background: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  visible: boolean;
  parentId: string | null;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  visible: boolean;
}

export interface AnnouncementItem {
  id: string;
  message: string;
  linkUrl: string;
  linkLabel: string;
  startsAt?: string | null;
  endsAt?: string | null;
  visible: boolean;
}

export const contentApi = {
  homepage: () =>
    request<ApiResponse<HomepageSection[]>>("GET", "/api/v1/admin/content/homepage"),
  updateSection: (key: string, data: Partial<HomepageSection> & Record<string, unknown>) =>
    request<HomepageSection>("PUT", "/api/v1/admin/content/homepage", { key, ...data }),

  navigation: (location: "header" | "footer" = "header") =>
    request<ApiResponse<NavigationItem[]>>(
      "GET",
      `/api/v1/admin/content/navigation${qs({ location })}`
    ),
  createNav: (data: Record<string, unknown>) =>
    request<NavigationItem>("POST", "/api/v1/admin/content/navigation", data),
  updateNav: (id: string, data: Record<string, unknown>) =>
    request<NavigationItem>("PATCH", `/api/v1/admin/content/navigation/${id}`, data),
  deleteNav: (id: string) =>
    request<void>("DELETE", `/api/v1/admin/content/navigation/${id}`),

  faqs: () => request<ApiResponse<FaqItem[]>>("GET", "/api/v1/admin/content/faqs"),
  createFaq: (data: Record<string, unknown>) =>
    request<FaqItem>("POST", "/api/v1/admin/content/faqs", data),
  updateFaq: (id: string, data: Record<string, unknown>) =>
    request<FaqItem>("PATCH", `/api/v1/admin/content/faqs/${id}`, data),
  deleteFaq: (id: string) => request<void>("DELETE", `/api/v1/admin/content/faqs/${id}`),

  announcements: () =>
    request<ApiResponse<AnnouncementItem[]>>("GET", "/api/v1/admin/content/announcements"),
  createAnnouncement: (data: Record<string, unknown>) =>
    request<AnnouncementItem>("POST", "/api/v1/admin/content/announcements", data),
  updateAnnouncement: (id: string, data: Record<string, unknown>) =>
    request<AnnouncementItem>("PATCH", `/api/v1/admin/content/announcements/${id}`, data),
  deleteAnnouncement: (id: string) =>
    request<void>("DELETE", `/api/v1/admin/content/announcements/${id}`),
};

// ─── Admin users, roles, audit ────────────────────────────────────────────────

export interface RoleRecord {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: string[];
}

export const usersApi = {
  list: () => request<ApiResponse<AdminUser[]>>("GET", "/api/v1/admin/users"),
  create: (data: { email: string; name: string; password: string; role: string }) =>
    request<AdminUser>("POST", "/api/v1/admin/users", data),
  update: (id: string, data: { role?: string; isActive?: boolean; password?: string; name?: string }) =>
    request<AdminUser>("PATCH", `/api/v1/admin/users/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/api/v1/admin/users/${id}`),
  roles: () => request<ApiResponse<RoleRecord[]>>("GET", "/api/v1/admin/roles"),
};

export const auditApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    request<ApiResponse<AuditLogEntry[]>>("GET", `/api/v1/admin/audit${qs(params)}`),
};

export const venueStatusOptions: VenueStatus[] = [
  "draft",
  "pending",
  "published",
  "unpublished",
  "rejected",
  "archived",
];
