/* eslint-disable no-console */
import { GlobalRole } from '@prisma/client';

import { userRepository } from '@/repositories';

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Please provide a user ID as the first argument.');
    process.exit(1);
  }

  const user = await userRepository.findOrCreate(userId);

  user.setGlobalRole(GlobalRole.SUPER_ADMIN);
  await userRepository.save(user);
}

main().catch((error) => {
  console.error('Promote user to super admin failed!');
  console.error(
    'Make sure to run the backend with "npm run dev" before running this script.',
  );
  console.error(error);
  process.exit(1);
});
