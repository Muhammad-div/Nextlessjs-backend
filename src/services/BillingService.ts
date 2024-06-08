import type Stripe from 'stripe';

import { ApiError } from '@/errors/ApiError';
import { ErrorCode } from '@/errors/ErrorCode';
import type { TeamRepository } from '@/repositories/TeamRepository';
import type { ISubscription } from '@/types/StripeTypes';
import { SubscriptionStatus } from '@/types/StripeTypes';
import type { IBillingPlanEnv } from '@/utils/BillingPlan';
import { BillingPlan } from '@/utils/BillingPlan';
import { Env } from '@/utils/Env';

export class BillingService {
  private teamRepository: TeamRepository;

  private paymentSdk: Stripe;

  private billingPlanEnv: IBillingPlanEnv;

  constructor(
    teamRepository: TeamRepository,
    stripe: Stripe,
    billingEnv: string,
  ) {
    this.teamRepository = teamRepository;
    this.paymentSdk = stripe;

    const billingPlanEnv = BillingPlan[billingEnv];

    if (!billingPlanEnv) {
      throw new ApiError(
        "BILLING_PLAN_ENV environment variable isn't defined correctly",
      );
    }

    this.billingPlanEnv = billingPlanEnv;
  }

  verifyWebhook(body: string | Buffer, sig: string | string[]) {
    let event: Stripe.Event;

    try {
      event = this.paymentSdk.webhooks.constructEvent(
        body,
        sig,
        Env.getValue('STRIPE_WEBHOOK_SECRET', true),
      );
    } catch (ex: any) {
      throw new ApiError(
        'Incorrect Stripe webhook signature',
        ex,
        ErrorCode.INCORRECT_STRIPE_SIGNATURE,
      );
    }

    return event;
  }

  async processEvent(event: Stripe.Event) {
    // FYI, here is the explanation why we need these Stripe events:
    // https://github.com/stripe/stripe-firebase-extensions/issues/146
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription;

      await this.retrieveSubscriptionAndUpdate(subscription.id);
    } else if (event.type === 'checkout.session.completed') {
      const checkoutSessionEvent = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = checkoutSessionEvent.subscription;

      if (
        checkoutSessionEvent.mode !== 'subscription' ||
        typeof subscriptionId !== 'string'
      ) {
        throw new ApiError(
          'Stripe are calling with unexpected checkout session mode',
          null,
          ErrorCode.INCORRECT_STRIPE_RESULT,
        );
      }

      await this.retrieveSubscriptionAndUpdate(subscriptionId);
    } else {
      throw new ApiError(
        'Stripe are calling with unexpected events',
        null,
        ErrorCode.INCORRECT_STRIPE_RESULT,
      );
    }
  }

  private async retrieveSubscriptionAndUpdate(subscriptionId: string) {
    // `customer.subscription.updated` can be called `before customer.subscription.created`
    // what is why we need to retrieve subscription to get the latest version
    const subscription =
      await this.paymentSdk.subscriptions.retrieve(subscriptionId);
    const itemData = subscription.items.data[0];

    if (typeof subscription.customer !== 'string' || itemData === undefined) {
      throw new ApiError(
        'Incorrect Stripe Subscription format',
        null,
        ErrorCode.INCORRECT_STRIPE_RESULT,
      );
    }

    const { product } = itemData.plan;
    const customer = await this.paymentSdk.customers.retrieve(
      subscription.customer,
    );

    if (
      customer.deleted === true ||
      customer.metadata.teamId === undefined ||
      typeof product !== 'string'
    ) {
      throw new ApiError(
        'Incorrect Stripe Customer or Stripe product format',
        null,
        ErrorCode.INCORRECT_STRIPE_RESULT,
      );
    }

    await this.teamRepository.updateSubscription(customer.metadata.teamId, {
      id: subscription.id,
      productId: product,
      status: subscription.status,
    });
  }

  async createOrRetrieveCustomerId(teamId: string) {
    const team = await this.teamRepository.findByTeamId(teamId);

    if (!team) {
      throw new ApiError('Incorrect TeamID', null, ErrorCode.INCORRECT_TEAM_ID);
    }

    const customerId = team.getStripeCustomerId();

    if (customerId) {
      // Return the Stripe customer ID if the user has already one.
      return customerId;
    }

    const stripeCustomer = await this.paymentSdk.customers.create({
      metadata: {
        teamId: team.id,
      },
    });

    team.setStripeCustomerId(stripeCustomer.id);
    await this.teamRepository.save(team);

    return stripeCustomer.id;
  }

  createCheckoutSession(customerId: string, priceId: string) {
    return this.paymentSdk.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          // For metered billing, do not pass quantity
          quantity: 1,
        },
      ],
      // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      // the actual Session ID is returned in the query parameter when your customer
      // is redirected to the success page.
      success_url: `${Env.getValue(
        'FRONTEND_DOMAIN_URL',
      )}/dashboard/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Env.getValue('FRONTEND_DOMAIN_URL')}/dashboard/upgrade`,
    });
  }

  getPlanFromSubscription(subscription: ISubscription | null) {
    if (!subscription) {
      // Subscription isn't defined, it means the user is at free tier.
      return this.billingPlanEnv.free;
    }

    const pricing = this.billingPlanEnv[subscription.productId];

    // List of Stripe Subscription statuses: https://stripe.com/docs/billing/subscriptions/overview#subscription-statuses
    if (pricing && subscription.status === SubscriptionStatus.ACTIVE) {
      return pricing;
    }

    return this.billingPlanEnv.free;
  }

  async createCustomerPortalLink(customerId: string) {
    const portalSession = await this.paymentSdk.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${Env.getValue('FRONTEND_DOMAIN_URL')}/dashboard/settings`,
    });

    return portalSession.url;
  }
}
