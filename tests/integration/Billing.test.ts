import {
  mockBillingPortalSessionsCreate,
  mockCheckoutSessionCreate,
  mockCustomersCreate,
  mockCustomersRetrieve,
  mockSubscriptionsRetrieve,
  originalStripe,
} from '__mocks__/stripe';
import { InvitationStatus, Role } from '@prisma/client';
import supertest from 'supertest';

import { app } from '@/app';
import { ErrorCode } from '@/errors/ErrorCode';
import { MemberModel } from '@/models/MemberModel';
import { memberRepository } from '@/repositories';
import { SubscriptionStatus } from '@/types/StripeTypes';
import { Env } from '@/utils/Env';

describe('Billing', () => {
  let teamId: string;

  beforeEach(async () => {
    app.request.currentUserId = '123';

    const response = await supertest(app).get(
      '/user/profile?email=example@example.com',
    );
    teamId = response.body.teamList[0].id;
  });

  describe('Create checkout session', () => {
    it('should return an error with a missing priceId as a parameter. PriceId is needed to create a checkout session.', async () => {
      const response = await supertest(app).post(
        `/${teamId}/billing/create-checkout-session`,
      );

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([{ param: 'priceId', type: 'invalid_type' }]),
      );
    });

    it("shouldn't create a checkout session and return an error because the user isn't a member", async () => {
      const response = await supertest(app)
        .post('/123/billing/create-checkout-session')
        .send({
          priceId: 'PRICE_ID',
        });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });

    it('should not allow to create a checkout session with `READ_ONLY` role', async () => {
      const member = new MemberModel(teamId, '123');
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.READ_ONLY);
      await memberRepository.update(member);

      mockCustomersCreate.mockReturnValue({
        id: 'RANDOM_STRIPE_CUSTOMER_ID',
      });
      mockCheckoutSessionCreate.mockReturnValue({
        id: 'RANDOM_STRIPE_SESSION_ID',
      });

      const response = await supertest(app)
        .post(`/${teamId}/billing/create-checkout-session`)
        .send({
          priceId: 'PRICE_ID',
        });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_PERMISSION);
    });

    it('should create a Stripe customer ID for the team and return checkout session ID', async () => {
      mockCustomersCreate.mockReturnValueOnce({
        id: 'RANDOM_STRIPE_CUSTOMER_ID',
      });
      mockCheckoutSessionCreate.mockReturnValueOnce({
        id: 'RANDOM_STRIPE_SESSION_ID',
      });

      const response = await supertest(app)
        .post(`/${teamId}/billing/create-checkout-session`)
        .send({
          priceId: 'PRICE_ID',
        });

      expect(mockCustomersCreate.mock.calls[0][0].metadata.teamId).toEqual(
        teamId,
      );

      expect(response.statusCode).toEqual(200);
      expect(response.body.sessionId).toEqual('RANDOM_STRIPE_SESSION_ID');
    });

    it("should able to call 'create-checkout-session' several times without creating a new Stripe customer", async () => {
      mockCustomersCreate
        .mockReturnValueOnce({
          id: 'RANDOM_STRIPE_CUSTOMER_ID',
        })
        .mockReturnValueOnce({
          id: 'RANDOM_STRIPE_CUSTOMER_ID_2',
        });

      mockCheckoutSessionCreate
        .mockReturnValueOnce({
          id: 'RANDOM_STRIPE_SESSION_ID',
        })
        .mockReturnValueOnce({
          id: 'RANDOM_STRIPE_SESSION_ID_2',
        });

      let response = await supertest(app)
        .post(`/${teamId}/billing/create-checkout-session`)
        .send({
          priceId: 'PRICE_ID',
        });

      expect(response.statusCode).toEqual(200);
      expect(response.body.sessionId).toEqual('RANDOM_STRIPE_SESSION_ID');
      expect(mockCheckoutSessionCreate.mock.calls[0][0].customer).toEqual(
        'RANDOM_STRIPE_CUSTOMER_ID',
      );

      response = await supertest(app)
        .post(`/${teamId}/billing/create-checkout-session`)
        .send({
          priceId: 'PRICE_ID',
        });

      expect(response.statusCode).toEqual(200);
      expect(response.body.sessionId).toEqual('RANDOM_STRIPE_SESSION_ID_2');
      expect(mockCheckoutSessionCreate.mock.calls[1][0].customer).toEqual(
        'RANDOM_STRIPE_CUSTOMER_ID',
      ); // Stripe customer ID should remain the same, it needs to be reused
    });
  });

  describe('Create customer portal link', () => {
    it("shouldn't generate a customer portal link and return an error because the user isn't a member", async () => {
      const response = await supertest(app).post(
        `/123/billing/customer-portal`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });

    it("shouldn't generate a customer portal link because the user has never create checkout session", async () => {
      const response = await supertest(app).post(
        `/${teamId}/billing/customer-portal`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_DATA);
    });

    it('should create a checkout session and should not allow to generate a customer portal link with `READ_ONLY` role', async () => {
      mockCustomersCreate.mockReturnValueOnce({
        id: 'RANDOM_STRIPE_CUSTOMER_ID',
      });
      mockCheckoutSessionCreate.mockReturnValueOnce({
        id: 'RANDOM_STRIPE_SESSION_ID',
      });

      let response = await supertest(app)
        .post(`/${teamId}/billing/create-checkout-session`)
        .send({
          priceId: 'PRICE_ID',
        });

      const member = new MemberModel(teamId, '123');
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.READ_ONLY);
      await memberRepository.update(member);

      response = await supertest(app).post(
        `/${teamId}/billing/customer-portal`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_PERMISSION);
    });

    it('should create a checkout session and generate a customer portal link', async () => {
      mockCustomersCreate.mockReturnValueOnce({
        id: 'RANDOM_STRIPE_CUSTOMER_ID',
      });
      mockCheckoutSessionCreate.mockReturnValueOnce({
        id: 'RANDOM_STRIPE_SESSION_ID',
      });

      let response = await supertest(app)
        .post(`/${teamId}/billing/create-checkout-session`)
        .send({
          priceId: 'PRICE_ID',
        });

      mockBillingPortalSessionsCreate.mockReturnValueOnce({
        url: 'RANDOM_STRIPE_CUSTOMER_PORTAL_LINK',
      });

      response = await supertest(app).post(
        `/${teamId}/billing/customer-portal`,
      );

      expect(response.statusCode).toEqual(200);
      expect(response.body.url).toEqual('RANDOM_STRIPE_CUSTOMER_PORTAL_LINK');
    });
  });

  describe('Billing webhook', () => {
    it("shouldn't process the event with empty request", async () => {
      const response = await supertest(app).post('/billing/webhook');

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(
        ErrorCode.INCORRECT_STRIPE_SIGNATURE,
      );
    });

    it("shouldn't process the event without header and payload", async () => {
      const response = await supertest(app)
        .post('/billing/webhook')
        .set('Content-Type', 'application/json');

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(
        ErrorCode.INCORRECT_STRIPE_SIGNATURE,
      );
    });

    it("shouldn't process the event without payload", async () => {
      const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
      };
      const payloadString = JSON.stringify(payload, null, 2);

      const header = originalStripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: Env.getValue('STRIPE_WEBHOOK_SECRET'),
      });

      const response = await supertest(app)
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', header);

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(
        ErrorCode.INCORRECT_STRIPE_SIGNATURE,
      );
    });

    it("shouldn't process with incorrect secret", async () => {
      const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
      };
      const payloadString = JSON.stringify(payload, null, 2);

      const header = originalStripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: 'INVALID_STRIPE_SECRET',
      });

      const response = await supertest(app)
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', header)
        .send(payloadString);

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(
        ErrorCode.INCORRECT_STRIPE_SIGNATURE,
      );
    });

    it("shouldn't process with incorrect event type", async () => {
      const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'INCORRECT_TYPE',
      };
      const payloadString = JSON.stringify(payload, null, 2);

      const header = originalStripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: Env.getValue('STRIPE_WEBHOOK_SECRET'),
      });

      const response = await supertest(app)
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', header)
        .send(payloadString);

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_STRIPE_RESULT);
    });

    it('should process checkout.session.completed and not enable the user PRO subscription when in pending status', async () => {
      mockSubscriptionsRetrieve.mockReturnValueOnce({
        id: 'RANDOM_ID',
        status: SubscriptionStatus.PENDING,
        items: {
          data: [
            {
              plan: {
                product: 'prod_STRIPE_PRODUCT',
              },
            },
          ],
        },
        customer: 'RANDOM_STRIPE_CUSTOMER_ID',
      });

      mockCustomersRetrieve.mockReturnValueOnce({
        metadata: {
          teamId,
        },
      });

      const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        data: {
          object: {
            customer: 'cus_STRIPE_CUSTOMER_ID',
            subscription: 'sub_STRIPE_SUBSCRIPTION',
            mode: 'subscription',
          },
        },
        type: 'checkout.session.completed',
      };
      const payloadString = JSON.stringify(payload, null, 2);

      const header = originalStripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: Env.getValue('STRIPE_WEBHOOK_SECRET'),
      });

      let response = await supertest(app)
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', header)
        .send(payloadString);

      expect(response.statusCode).toEqual(200);
      expect(response.body.received).toBeTruthy();

      response = await supertest(app).get(`/team/${teamId}/settings`);
      expect(response.statusCode).toEqual(200);
      expect(response.body.planId).toEqual('FREE');
      expect(response.body.planName).toEqual('Free');
    });

    it('should process checkout.session.completed and enable the user PRO subscription', async () => {
      mockSubscriptionsRetrieve.mockReturnValueOnce({
        id: 'RANDOM_ID',
        status: SubscriptionStatus.ACTIVE,
        items: {
          data: [
            {
              plan: {
                product: 'test_MQPRO',
              },
            },
          ],
        },
        customer: 'RANDOM_STRIPE_CUSTOMER_ID',
      });

      mockCustomersRetrieve.mockReturnValueOnce({
        metadata: {
          teamId,
        },
      });

      const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        data: {
          object: {
            customer: 'cus_STRIPE_CUSTOMER_ID',
            subscription: 'sub_STRIPE_SUBSCRIPTION',
            mode: 'subscription',
          },
        },
        type: 'checkout.session.completed',
      };
      const payloadString = JSON.stringify(payload, null, 2);

      const header = originalStripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: Env.getValue('STRIPE_WEBHOOK_SECRET'),
      });

      let response = await supertest(app)
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', header)
        .send(payloadString);

      expect(response.statusCode).toEqual(200);
      expect(response.body.received).toBeTruthy();

      response = await supertest(app).get(`/team/${teamId}/settings`);
      expect(response.statusCode).toEqual(200);
      expect(response.body.planId).toEqual('PRO');
      expect(response.body.planName).toEqual('Pro');
    });

    it('should process customer.subscription.deleted and not enable the user PRO subscription when in delete status', async () => {
      const subscription = {
        id: 'RANDOM_ID',
        status: 'deleted',
        items: {
          data: [
            {
              plan: {
                product: 'test_MQPRO',
              },
            },
          ],
        },
        customer: 'RANDOM_STRIPE_CUSTOMER_ID',
      };

      mockSubscriptionsRetrieve.mockReturnValueOnce(subscription);

      mockCustomersRetrieve.mockReturnValueOnce({
        metadata: {
          teamId,
        },
      });

      const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        data: {
          object: subscription,
        },
        type: 'customer.subscription.deleted',
      };
      const payloadString = JSON.stringify(payload, null, 2);

      const header = originalStripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: Env.getValue('STRIPE_WEBHOOK_SECRET'),
      });

      let response = await supertest(app)
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', header)
        .send(payloadString);

      expect(response.statusCode).toEqual(200);
      expect(response.body.received).toBeTruthy();

      response = await supertest(app).get(`/team/${teamId}/settings`);
      expect(response.statusCode).toEqual(200);
      expect(response.body.planId).toEqual('FREE');
      expect(response.body.planName).toEqual('Free');
    });

    it('should process customer.subscription.created and customer.subscription.updated', async () => {
      const subscriptionCreated = {
        id: 'RANDOM_ID',
        status: SubscriptionStatus.PENDING,
        items: {
          data: [
            {
              plan: {
                product: 'test_MQPRO',
              },
            },
          ],
        },
        customer: 'RANDOM_STRIPE_CUSTOMER_ID',
      };

      const subscriptionUpdated = {
        id: 'RANDOM_ID',
        status: SubscriptionStatus.ACTIVE,
        items: {
          data: [
            {
              plan: {
                product: 'test_MQPRO',
              },
            },
          ],
        },
        customer: 'RANDOM_STRIPE_CUSTOMER_ID',
      };

      mockSubscriptionsRetrieve
        .mockReturnValueOnce(subscriptionCreated)
        .mockReturnValueOnce(subscriptionUpdated);

      mockCustomersRetrieve.mockReturnValue({
        metadata: {
          teamId,
        },
      });

      let payload = {
        id: 'evt_test_webhook',
        object: 'event',
        data: {
          object: subscriptionCreated,
        },
        type: 'customer.subscription.created',
      };
      let payloadString = JSON.stringify(payload, null, 2);

      let header = originalStripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: Env.getValue('STRIPE_WEBHOOK_SECRET'),
      });

      let response = await supertest(app)
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', header)
        .send(payloadString);

      expect(response.statusCode).toEqual(200);
      expect(response.body.received).toBeTruthy();

      response = await supertest(app).get(`/team/${teamId}/settings`);
      expect(response.statusCode).toEqual(200);
      expect(response.body.planId).toEqual('FREE');
      expect(response.body.planName).toEqual('Free');

      payload = {
        id: 'evt_test_webhook',
        object: 'event',
        data: {
          object: subscriptionUpdated,
        },
        type: 'customer.subscription.updated',
      };
      payloadString = JSON.stringify(payload, null, 2);

      header = originalStripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: Env.getValue('STRIPE_WEBHOOK_SECRET'),
      });

      response = await supertest(app)
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', header)
        .send(payloadString);

      expect(response.statusCode).toEqual(200);
      expect(response.body.received).toBeTruthy();

      response = await supertest(app).get(`/team/${teamId}/settings`);
      expect(response.statusCode).toEqual(200);
      expect(response.body.planId).toEqual('PRO');
      expect(response.body.planName).toEqual('Pro');
    });
  });
});
