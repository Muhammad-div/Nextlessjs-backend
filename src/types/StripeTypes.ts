// Subscription used by User class
export type ISubscription = {
  id: string;
  productId: string;
  status: string;
};

// Non-exhaustive attributes for Stripe Subscription status.
export enum SubscriptionStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
}
