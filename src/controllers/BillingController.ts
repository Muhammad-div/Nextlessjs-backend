import { Role } from '@prisma/client';
import type { RequestHandler } from 'express';

import { ApiError } from '@/errors/ApiError';
import { ErrorCode } from '@/errors/ErrorCode';
import type { BillingService } from '@/services/BillingService';
import type { TeamService } from '@/services/TeamService';
import type { BodyPriceHandler } from '@/validations/BillingValidation';
import type { ParamsTeamIdHandler } from '@/validations/TeamValidation';

export class BillingController {
  private teamService: TeamService;

  private billingService: BillingService;

  constructor(teamService: TeamService, billingService: BillingService) {
    this.teamService = teamService;
    this.billingService = billingService;
  }

  public createCheckoutSession: BodyPriceHandler = async (req, res) => {
    await this.teamService.requiredAuth(req.currentUserId, req.params.teamId, [
      Role.OWNER,
      Role.ADMIN,
    ]);

    const customerId = await this.billingService.createOrRetrieveCustomerId(
      req.params.teamId,
    );
    const session = await this.billingService.createCheckoutSession(
      customerId,
      req.body.priceId,
    );

    res.json({
      sessionId: session.id,
    });
  };

  public webhook: RequestHandler = async (req, res) => {
    const sig = req.headers['stripe-signature']!;

    const event = this.billingService.verifyWebhook(req.body, sig);

    await this.billingService.processEvent(event);

    res.json({ received: true });
  };

  public createCustomerPortalLink: ParamsTeamIdHandler = async (req, res) => {
    const { team } = await this.teamService.requiredAuthWithTeam(
      req.params.teamId,
      req.currentUserId,
      [Role.OWNER, Role.ADMIN],
    );

    const stripeCustomerId = team.getStripeCustomerId();

    if (!stripeCustomerId) {
      // It shouldn't happens because the user shouldn't be able to call `createCustomerPortalLink` when the `stripeCustomerId` isn't defined.
      // The option is hidden in the frontend when the `stripCustomerId` isn't defined.
      // Is it a bug? Or, someone bypassing the frontend?
      throw new ApiError(
        "Stripe customer ID shouldn't be null",
        null,
        ErrorCode.INCORRECT_DATA,
      );
    }

    const url =
      await this.billingService.createCustomerPortalLink(stripeCustomerId);

    res.send({
      url,
    });
  };
}
