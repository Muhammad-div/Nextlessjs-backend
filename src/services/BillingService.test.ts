import { TeamRepository } from '@/repositories/TeamRepository';
import { SubscriptionStatus } from '@/types/StripeTypes';
import { dbClient } from '@/utils/DBClient';
import { stripe } from '@/utils/Stripe';

import { BillingService } from './BillingService';

describe('BillingService', () => {
  let teamRepository: TeamRepository;

  beforeEach(() => {
    teamRepository = new TeamRepository(dbClient);
  });

  describe('BillingService exception in constructor', () => {
    it("should raise an exception when the billingEnv doesn't exist", () => {
      expect(() => {
        const billingService = new BillingService(
          teamRepository,
          stripe,
          'NON_EXISTING_BILLING_PLAN',
        );

        // Unused statement to avoid typing and linting error
        billingService.getPlanFromSubscription(null);
      }).toThrow(
        "BILLING_PLAN_ENV environment variable isn't defined correctly",
      );
    });
  });

  describe('Basic operation', () => {
    let billingService: BillingService;

    beforeEach(() => {
      billingService = new BillingService(teamRepository, stripe, 'test');
    });

    it('should return the free plan when the productId is incorrect', () => {
      const plan = billingService.getPlanFromSubscription({
        id: 'RANDOM_SUBSCRIPTION_ID',
        productId: 'INCORRECT_PRODUCT_ID',
        status: SubscriptionStatus.ACTIVE,
      });

      expect(plan.id).toEqual('FREE');
    });

    it('should return the free plan by default', () => {
      const plan = billingService.getPlanFromSubscription(null);
      expect(plan.id).toEqual('FREE');
    });

    it('should return the free plan when the status is not active', () => {
      const plan = billingService.getPlanFromSubscription({
        id: 'RANDOM_SUBSCRIPTION_ID',
        productId: 'test_MQPRO',
        status: SubscriptionStatus.PENDING,
      });

      expect(plan.id).toEqual('FREE');
    });

    it('should return the PRO plan when the subscription is active', () => {
      const plan = billingService.getPlanFromSubscription({
        id: 'RANDOM_SUBSCRIPTION_ID',
        productId: 'test_MQPRO',
        status: SubscriptionStatus.ACTIVE,
      });

      expect(plan.id).toEqual('PRO');
    });
  });
});
