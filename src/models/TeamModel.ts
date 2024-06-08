import type { Team } from '@prisma/client';
import { ObjectId } from 'bson';

import type { ISubscription } from '@/types/StripeTypes';

import { AbstractModel } from './AbstractModel';

export class TeamModel extends AbstractModel<Team> {
  public readonly id: string;

  private displayName = '';

  private stripeCustomerId: string | null = null;

  private subscription: ISubscription | null = null;

  /**
   * Constructor for Team class.
   * @constructor
   * @param id - The ID of the team.
   */
  constructor(id?: string) {
    super();

    if (id) {
      this.id = id;
    } else {
      this.id = new ObjectId().toString();
    }
  }

  setDisplayName(name: string) {
    this.displayName = name;
  }

  getDisplayName() {
    return this.displayName;
  }

  setStripeCustomerId(customerId: string) {
    this.stripeCustomerId = customerId;
  }

  getStripeCustomerId() {
    return this.stripeCustomerId;
  }

  hasStripeCustomerId() {
    return !!this.stripeCustomerId;
  }

  getSubscription() {
    return this.subscription;
  }

  keys() {
    return {
      id: this.id,
    };
  }

  toCreateEntity() {
    return {
      ...this.keys(),
      ...this.toEntity(),
    };
  }

  toEntity() {
    return {
      displayName: this.displayName,
      stripeCustomerId: this.stripeCustomerId,
      subscriptionId: this.subscription?.id,
      subscriptionProductId: this.subscription?.productId,
      subscriptionStatus: this.subscription?.status,
    };
  }

  fromEntity(entity: Team) {
    this.displayName = entity.displayName;
    this.stripeCustomerId = entity.stripeCustomerId;

    if (
      entity.subscriptionId &&
      entity.subscriptionProductId &&
      entity.subscriptionStatus
    ) {
      this.subscription = {
        id: entity.subscriptionId,
        productId: entity.subscriptionProductId,
        status: entity.subscriptionStatus,
      };
    }
  }
}
