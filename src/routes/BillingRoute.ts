import { Router } from 'express';

import { billingController } from '@/controllers';
import { bodyPriceValidate } from '@/validations/BillingValidation';
import { paramsTeamIdValidate } from '@/validations/TeamValidation';

const billingRouter = Router();

billingRouter.post(
  '/:teamId/billing/create-checkout-session',
  bodyPriceValidate,
  billingController.createCheckoutSession,
);

// If you changes the route, please don't forget to update the route in the head of the `handler.ts` file.
// It keeps the raw body for stripe signature:
// reference at `app.use('....', express.raw({ type: '...' }));`
// You also need to update the path in `serverless.yml`.
billingRouter.post('/billing/webhook', billingController.webhook);

billingRouter.post(
  '/:teamId/billing/customer-portal',
  paramsTeamIdValidate,
  billingController.createCustomerPortalLink,
);

export { billingRouter };
