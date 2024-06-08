import {
  memberRepository,
  teamRepository,
  userRepository,
} from '@/repositories';
import { Env } from '@/utils/Env';
import { stripe } from '@/utils/Stripe';

import { AdminService } from './AdminService';
import { BillingService } from './BillingService';
import { EmailService } from './EmailService';
import { TeamService } from './TeamService';

// Manual `dependency injection` (DI) without external libraries.
// No overhead, some DI library can increase cold start in serverless architecture.
// You still get the same benefit: less complex code, decouple the code and make it easier for testing.
const teamService = new TeamService(
  teamRepository,
  userRepository,
  memberRepository,
);
const billingService = new BillingService(
  teamRepository,
  stripe,
  Env.getValue('BILLING_PLAN_ENV'),
);
const adminService = new AdminService(
  userRepository,
  teamRepository,
  billingService,
);
const emailService = new EmailService();

export { adminService, billingService, emailService, teamService };
