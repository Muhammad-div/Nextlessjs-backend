import {
  memberRepository,
  teamRepository,
  todoRepository,
  userRepository,
} from '@/repositories';
import {
  adminService,
  billingService,
  emailService,
  teamService,
} from '@/services';

import { AdminController } from './AdminController';
import { BillingController } from './BillingController';
import { TeamController } from './TeamController';
import { TodoController } from './TodoController';
import { UserController } from './UserController';

// Manual `dependency injection` (DI) without external libraries.
// No overhead, some DI library can increase cold start in serverless architecture.
// You still get the same benefit: less complex code, decouple the code and make it easier for testing.
const adminController = new AdminController(
  teamRepository,
  memberRepository,
  adminService,
);
const userController = new UserController(
  teamService,
  userRepository,
  teamRepository,
);
const todoController = new TodoController(teamService, todoRepository);
const billingController = new BillingController(teamService, billingService);
const teamController = new TeamController(
  teamService,
  userRepository,
  memberRepository,
  teamRepository,
  billingService,
  emailService,
);

export {
  adminController,
  billingController,
  teamController,
  todoController,
  userController,
};
