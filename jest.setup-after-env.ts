/* eslint-disable import/no-extraneous-dependencies */
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { execa } from 'execa';
import pRetry from 'p-retry';

const prismaDbPush = () => {
  return execa(
    'prisma',
    ['db', 'push', '--accept-data-loss', '--force-reset', '--skip-generate'],
    {
      preferLocal: true,
      stdio: 'ignore',
      env: {
        DATABASE_URL: process.env.MOCK_MONGODB_DATABASE_ENDPOINT,
      },
    },
  );
};

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MOCK_MONGODB_DATABASE_ENDPOINT,
    },
  },
});

beforeAll(async () => {
  await pRetry(prismaDbPush, { retries: 5 });
});

afterEach(async () => {
  const deleteList: Prisma.PrismaPromise<Prisma.BatchPayload>[] = [];

  Object.getOwnPropertyNames(prisma).forEach((elt) => {
    if (
      !elt.startsWith('_') &&
      !elt.startsWith('$') &&
      elt === elt.toLowerCase()
    ) {
      // TODO: Add better typing and remove the ts-ignore
      // @ts-ignore
      deleteList.push(prisma[elt].deleteMany({}));
    }
  });

  await Promise.all(deleteList);
});
