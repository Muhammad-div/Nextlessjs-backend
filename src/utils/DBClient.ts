import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import { Env } from './Env';

let prismaOptions: Prisma.PrismaClientOptions = {};
const mockPrismaEndpoint = Env.getValue(
  'MOCK_MONGODB_DATABASE_ENDPOINT',
  false,
);

if (mockPrismaEndpoint) {
  prismaOptions = {
    datasources: {
      db: {
        url: mockPrismaEndpoint,
      },
    },
  };
}

export const dbClient = new PrismaClient(prismaOptions);
