import { ObjectId } from 'bson';

process.env.SITE_NAME = 'modermnmern site name';
process.env.FRONTEND_DOMAIN_URL = 'https://modernmern.com';
process.env.SENDER_EMAIL_ADDRESS = 'sender_email@example.com';
process.env.BILLING_PLAN_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'RANDOM_STRIPE_KEY';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.PINO_LOG_LEVEL = 'silent';

const databaseName = new ObjectId().toString();

process.env.MOCK_MONGODB_DATABASE_ENDPOINT =
  process.env.MOCK_MONGODB_ENDPOINT?.replace(
    '/?replicaSet=',
    `/${databaseName}?replicaSet=`,
  );
