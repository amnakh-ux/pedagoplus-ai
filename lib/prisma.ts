import type { PrismaClient as PrismaClientType } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Next dev runs in Node.js; Cloudflare keeps its existing Worker WASM entry.
const { PrismaClient } = process.env.NODE_ENV === "development"
  ? await import("@prisma/client")
  : await import("@prisma/client/wasm.js");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL n’est pas définie.");
}

const globalForPrisma = globalThis as unknown as {
  prismaNodeDev: PrismaClientType | undefined;
};

export const prisma =
  (process.env.NODE_ENV === "development" ? globalForPrisma.prismaNodeDev : undefined) ??
  new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });

if (process.env.NODE_ENV === "development") {
  globalForPrisma.prismaNodeDev = prisma;
}
