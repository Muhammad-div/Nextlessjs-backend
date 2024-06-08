import type { DestinationStream } from 'pino';
import pino from 'pino';
import { lambdaRequestTracker, pinoLambdaDestination } from 'pino-lambda';

import { Env } from './Env';

let destination: DestinationStream = pinoLambdaDestination();

if (Env.getValue('IS_OFFLINE', false)) {
  destination = pino.destination({
    sync: true,
  });
}

export const logger = pino(
  { base: undefined, level: process.env.PINO_LOG_LEVEL || 'info' },
  destination,
);
export const withRequest = lambdaRequestTracker();
