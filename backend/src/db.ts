// Instantiating Prisma Client with PostgreSQL adapter
// https://www.prisma.io/docs/getting-started/prisma-orm/add-to-existing-project/postgresql#7-instantiate-prisma-client
import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Connects Prisma Client to PostgreSQL using the db url from .env
const connectionString = process.env.DATABASE_URL!
// allows us to use PostgreSQL with Prisma instead of just SQLite
const adapter = new PrismaPg({ connectionString })
// export one client instance to be used across the app
export const prisma = new PrismaClient({ adapter })
