import type { RequestHandler } from 'express';
import type { ZodError, ZodIssue, ZodSchema } from 'zod';

import type { ValidationError } from '@/errors/RequestError';
import { RequestError } from '@/errors/RequestError';

export declare type RequestValidation<TParams, TQuery, TBody> = {
  params?: ZodSchema<TParams>;
  query?: ZodSchema<TQuery>;
  body?: ZodSchema<TBody>;
};

/**
 * Convert Zod flatten errors to errorList. errorList will be wrapped by RequestError exception.
 * @param fieldErrors - Errors returned by Zod.
 * @returns errorList - Generated errorList from Zod flatten errors.
 */
const convertToErrorList = (fieldErrors: {
  [k: string]: string[] | undefined;
}) => {
  const errorList: ValidationError[] = [];

  Object.entries(fieldErrors).forEach(([key, value]) => {
    // React-hook-form in the frontend can only display one error.
    // The backend API only need to return the first error for each fields.
    const firstElt = value?.[0];

    if (firstElt) {
      errorList.push({
        param: key,
        type: firstElt,
      });
    }
  });

  return errorList;
};

/**
 * Add Zod errors into errorList.
 * @param errorList - The list of errors where new elements will be `concat`.
 * @param parsedError - Error generated by the Zod parser.
 * @returns errorList - The result after adding new elements from Zod parser Error.
 */
const concatErrors = (errorList: ValidationError[], parsedError: ZodError) => {
  const { fieldErrors } = parsedError.flatten((i: ZodIssue) => i.code);

  const parsedErrorList = convertToErrorList(fieldErrors);

  return errorList.concat(parsedErrorList);
};

/**
 * Validate incoming request.
 * @param schemas - Zod schema.
 * @returns handler - Return Express JS handler.
 */
export const validateRequest: <TParams = any, TQuery = any, TBody = any>(
  schemas: RequestValidation<TParams, TQuery, TBody>,
) => RequestHandler<TParams, any, TBody, TQuery> =
  ({ params, query, body }) =>
  (req, _res, next) => {
    let errorList: ValidationError[] = [];

    // Parse Express JS Params
    if (params) {
      const parsed = params.safeParse(req.params);

      if (!parsed.success) {
        errorList = concatErrors(errorList, parsed.error);
      }
    }

    // Parse Express JS Query
    if (query) {
      const parsed = query.safeParse(req.query);

      if (!parsed.success) {
        errorList = concatErrors(errorList, parsed.error);
      }
    }

    // Parse Express JS Body
    if (body) {
      const parsed = body.safeParse(req.body);

      if (!parsed.success) {
        errorList = concatErrors(errorList, parsed.error);
      }
    }

    // errorList should be empty. Otherwise, it means the incoming don't respect the expecting zod schema.
    if (errorList.length) {
      throw new RequestError(errorList);
    }

    return next();
  };
