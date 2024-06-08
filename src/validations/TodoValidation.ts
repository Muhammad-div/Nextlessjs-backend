import { z } from 'zod';

import { validateRequest } from '@/middlewares/Validation';

export const paramsTodoValidate = validateRequest({
  params: z.object({
    teamId: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
});

export type ParamsTodoHandler = typeof paramsTodoValidate;

export const bodyTodoValidate = validateRequest({
  params: z.object({
    teamId: z.string().nonempty(),
  }),
  body: z.object({
    title: z.string().nonempty(),
  }),
});

export type BodyTodoHandler = typeof bodyTodoValidate;

export const fullTodoValidate = validateRequest({
  params: z.object({
    teamId: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  body: z.object({
    title: z.string().nonempty(),
  }),
});

export type FullTodoHandler = typeof fullTodoValidate;
