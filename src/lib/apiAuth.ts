import { createHash } from "crypto";
import type { AdminUser } from "@/types";

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@venueonmyplate.in";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "vomp2024";
const SECRET = process.env.ADMIN_SECRET ?? "vomp_admin_secret_xk9p2m";

export const ADMIN_USER: AdminUser = {
  id: "admin-1",
  email: EMAIL,
  name: "Admin",
  role: "admin",
};

export function validateCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === EMAIL.toLowerCase() &&
    password === PASSWORD
  );
}

export function generateToken(): string {
  return createHash("sha256")
    .update(`${EMAIL}:${PASSWORD}:${SECRET}`)
    .digest("hex");
}

export function validateToken(token: string | null | undefined): boolean {
  if (!token) return false;
  return token === generateToken();
}

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/vomp_admin_token=([^;]+)/);
  return match?.[1] ?? null;
}
