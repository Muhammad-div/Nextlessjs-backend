import Stripe from 'stripe';

import { Env } from '@/utils/Env';

export const originalStripe = new Stripe(Env.getValue('STRIPE_SECRET_KEY'), {
  apiVersion: '2022-11-15',
  telemetry: false,
});

export const mockCustomersCreate = jest.fn();
export const mockCustomersRetrieve = jest.fn();
export const mockCheckoutSessionCreate = jest.fn();
export const mockBillingPortalSessionsCreate = jest.fn();
export const mockSubscriptionsRetrieve = jest.fn();

export default jest.fn(() => ({
  customers: {
    create: mockCustomersCreate,
    retrieve: mockCustomersRetrieve,
  },
  checkout: {
    sessions: {
      create: mockCheckoutSessionCreate,
    },
  },
  subscriptions: {
    retrieve: mockSubscriptionsRetrieve,
  },
  billingPortal: {
    sessions: {
      create: mockBillingPortalSessionsCreate,
    },
  },
  webhooks: originalStripe.webhooks,
}));
