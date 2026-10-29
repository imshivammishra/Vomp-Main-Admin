/** Central RBAC definitions. The database is seeded from these values. */

export const PERMISSIONS = [
  ["venues.view", "View venues"],
  ["venues.create", "Create venues"],
  ["venues.edit", "Edit venues"],
  ["venues.delete", "Delete or archive venues"],
  ["venues.publish", "Publish or unpublish venues"],
  ["media.view", "View media library"],
  ["media.upload", "Upload media"],
  ["media.delete", "Delete media"],
  ["content.view", "View website content"],
  ["content.edit", "Edit website content"],
  ["content.publish", "Publish website content"],
  ["bookings.view", "View bookings"],
  ["bookings.create", "Create bookings"],
  ["bookings.edit", "Edit or reschedule bookings"],
  ["bookings.cancel", "Cancel bookings"],
  ["finance.view", "View financial data"],
  ["finance.manage", "Manage payments and refunds"],
  ["users.view", "View admin users"],
  ["users.manage", "Manage admin users and roles"],
  ["settings.view", "View settings"],
  ["settings.manage", "Change website and business settings"],
  ["integrations.manage", "Configure integrations and secrets"],
  ["audit.view", "View audit logs"],
  ["exports.run", "Export data"],
  ["geography.manage", "Manage countries and destination cities"],
  ["system.manage", "System-level configuration"],
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number][0];

export const ROLES = [
  {
    key: "super_admin",
    name: "Super Administrator",
    description: "Unrestricted access, including system configuration.",
  },
  {
    key: "admin",
    name: "Administrator",
    description: "Manages day-to-day platform operations.",
  },
  {
    key: "venue_manager",
    name: "Venue Manager",
    description: "Creates and maintains venue listings and media.",
  },
  {
    key: "content_editor",
    name: "Content Editor",
    description: "Edits and publishes website content and blog posts.",
  },
  {
    key: "booking_manager",
    name: "Booking Manager",
    description: "Manages enquiries, bookings and availability.",
  },
  {
    key: "finance_manager",
    name: "Finance Manager",
    description: "Views and reconciles payments and refunds.",
  },
  {
    key: "support_agent",
    name: "Support Agent",
    description: "Responds to customer enquiries and supports bookings.",
  },
  {
    key: "read_only",
    name: "Read-Only Analyst",
    description: "Can view data but cannot make changes.",
  },
] as const;

const ALL = PERMISSIONS.map(([key]) => key);

const VIEW_ONLY = ALL.filter((key) => key.endsWith(".view"));

export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  super_admin: ALL,
  admin: ALL.filter((key) => key !== "system.manage"),
  venue_manager: [
    "venues.view", "venues.create", "venues.edit", "venues.delete",
    "venues.publish", "media.view", "media.upload", "media.delete",
    "content.view", "bookings.view", "exports.run",
  ],
  content_editor: [
    "content.view", "content.edit", "content.publish",
    "media.view", "media.upload", "venues.view", "geography.manage",
  ],
  booking_manager: [
    "bookings.view", "bookings.create", "bookings.edit", "bookings.cancel",
    "venues.view", "media.view", "content.view", "exports.run",
  ],
  finance_manager: [
    "finance.view", "finance.manage", "bookings.view", "exports.run",
    "content.view",
  ],
  support_agent: [
    "bookings.view", "bookings.create", "bookings.edit",
    "venues.view", "media.view", "content.view",
  ],
  read_only: VIEW_ONLY,
};

export type RoleKey = (typeof ROLES)[number]["key"];

export function isPermissionKey(value: string): value is PermissionKey {
  return ALL.includes(value as PermissionKey);
}
