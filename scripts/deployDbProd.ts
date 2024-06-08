import { Env } from '@/utils/Env';

import { prismaDbPush } from './prisma';

(async () => {
  const databaseUrl = Env.getValue('DATABASE_URL');

  process.env.MONGODB_DATABASE_ENDPOINT = databaseUrl;

  await prismaDbPush();
})();
