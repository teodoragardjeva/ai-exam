import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getPool } from "@/lib/db";
import { requireEnv } from "@/lib/env";

export const STAFF_ROLES = ["agent", "manager"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

// Staff login only: there is no public sign-up. Accounts are created on startup from env
// (see bootstrapStaff) and can be disabled with approved = false.
export function authOptions(): BetterAuthOptions {
  return {
    database: getPool(),
    secret: requireEnv("BETTER_AUTH_SECRET"),
    baseURL: requireEnv("BETTER_AUTH_URL"),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 10,
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "agent", input: false },
        approved: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    session: { expiresIn: 60 * 60 * 12 },
    rateLimit: { enabled: true, window: 60, max: 20 },
    plugins: [nextCookies()],
  };
}

const globalForAuth = globalThis as unknown as { auth?: ReturnType<typeof betterAuth> };

// Created on first use, not at import time: the build has no database or secrets.
export function getAuth() {
  globalForAuth.auth ??= betterAuth(authOptions());
  return globalForAuth.auth;
}

export type StaffUser = { id: string; email: string; name: string; role: StaffRole; approved: boolean };

// Creates or updates a staff account (startup only). Uses Better Auth's own password hashing.
export async function upsertStaffUser(input: {
  email: string;
  name: string;
  password: string;
  role: StaffRole;
}): Promise<"created" | "updated"> {
  if (input.password.length < 10) {
    throw new Error(`Password for ${input.role} account is shorter than 10 characters`);
  }
  const ctx = await getAuth().$context;
  const email = input.email.toLowerCase();
  const hash = await ctx.password.hash(input.password);
  const existing = await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: true });

  if (!existing) {
    const user = await ctx.internalAdapter.createUser(
      { email, name: input.name, emailVerified: true, role: input.role, approved: true },
      { method: "admin" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hash,
    });
    return "created";
  }

  // Existing accounts keep their "approved" flag: a manager who disabled an account
  // (approved = false) must not see it re-enabled by the next deploy. The password still
  // follows the env value, so changing it in the stack and redeploying works.
  await ctx.internalAdapter.updateUser(existing.user.id, { name: input.name, role: input.role });
  const credential = existing.accounts.find((a) => a.providerId === "credential");
  if (credential) {
    await ctx.internalAdapter.updatePassword(existing.user.id, hash);
  } else {
    await ctx.internalAdapter.linkAccount({
      userId: existing.user.id,
      providerId: "credential",
      accountId: existing.user.id,
      password: hash,
    });
  }
  return "updated";
}
