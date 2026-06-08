import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaClient } from "prisma-admin-database/admin-database-client-types/client.js";

const connectionString = `${process.env.ADMIN_DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };