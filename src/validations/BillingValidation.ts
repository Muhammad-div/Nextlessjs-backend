import { z } from 'zod';

import { validateRequest } from '@/middlewares/Validation';

export const bodyPriceValidate = validateRequest({
  params: z.object({
    teamId: z.string().nonempty(),
  }),
  body: z.object({
    priceId: z.string().nonempty(),
  }),
});

export type BodyPriceHandler = typeof bodyPriceValidate;
