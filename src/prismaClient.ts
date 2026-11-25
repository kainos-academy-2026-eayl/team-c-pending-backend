import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
// import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

const prisma = new PrismaClient({
  // adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  adapter: new PrismaBetterSqlite3({
    url: 'file:./dev.db',
  }),
});

export default prisma;
