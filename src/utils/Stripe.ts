import Stripe from 'stripe';

import { Env } from './Env';

export const stripe = new Stripe(Env.getValue('STRIPE_SECRET_KEY'), {
  apiVersion: '2022-11-15',
  telemetry: false,
});
