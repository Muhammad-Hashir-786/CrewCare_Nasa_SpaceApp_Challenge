// Crew Care - Prisma client singleton
// Use a module-level singleton to avoid multiple connections in development hot-reload.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return !!url && !/yourpassword|your_postgresql|change_me/i.test(url);
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
