import { z } from 'zod';

import { validateRequest } from '@/middlewares/Validation';

export const queryList = validateRequest({
  query: z.object({
    paginationToken: z.string().optional(),
  }),
});

export type QueryList = typeof queryList;

export const paramsTeamDetailsValidate = validateRequest({
  params: z.object({
    teamId: z.string().nonempty(),
  }),
});

export type ParamsTeamDetailsHandler = typeof paramsTeamDetailsValidate;

export const fullEditUserStatusValidate = validateRequest({
  params: z.object({
    username: z.string().nonempty(),
  }),
  body: z.object({
    enabled: z.coerce.boolean(),
  }),
});

export type FullEditUserStatusHandler = typeof fullEditUserStatusValidate;
