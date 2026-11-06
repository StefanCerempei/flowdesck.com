import { PrismaClient } from '@prisma/client';

// Share one pool across routes and middleware.
export const prisma = new PrismaClient();
