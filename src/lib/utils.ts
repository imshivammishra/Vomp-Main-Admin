/** Converts a string to a URL-friendly slug */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Formats a file size in bytes to a human-readable string */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Formats an ISO date string to a readable date */
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Truncates text to maxLen chars, appending ellipsis if needed */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "…";
}

export const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "GB", name: "UK", flag: "🇬🇧" },
  { code: "MV", name: "Maldives", flag: "🇲🇻" },
] as const;

export const EVENT_TYPES = [
  "Wedding",
  "Reception",
  "Sangeet",
  "Haldi",
  "Corporate event",
  "Birthday/Anniversary",
  "Private party",
  "Engagement",
] as const;

export const VENUE_TYPES = [
  "Palace",
  "Resort",
  "Hotel",
  "Banquet",
  "Beach",
  "Other",
] as const;
