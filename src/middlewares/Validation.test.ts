import type { RequestHandler, Response } from 'express';
import httpMocks from 'node-mocks-http';
import { z } from 'zod';

import { validateRequest } from './Validation';

describe('Validation middleware', () => {
  describe('Empty object as schema', () => {
    it('should call `next` function', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/',
      });
      const response = httpMocks.createResponse();
      const next = jest.fn();

      const validate = validateRequest({});
      validate(request, response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Params request', () => {
    let validate: RequestHandler;
    let response: httpMocks.MockResponse<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      validate = validateRequest<any>({
        params: z.object({
          teamId: z.string().nonempty(),
        }),
      });
      response = httpMocks.createResponse();
      next = jest.fn();
    });

    it('should throw an exception with an incorrect params', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/',
      });

      expect(() => validate(request, response, next)).toThrow(
        expect.objectContaining({
          message: 'Error in request validation',
          errorList: [{ param: 'teamId', type: 'invalid_type' }],
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next and test `params` without errors', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/',
        params: {
          teamId: 'team-123',
        },
      });

      validate(request, response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Query request', () => {
    let validate: RequestHandler;
    let response: httpMocks.MockResponse<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      validate = validateRequest<any>({
        query: z.object({
          email: z.string().nonempty().email(),
        }),
      });
      response = httpMocks.createResponse();
      next = jest.fn();
    });

    it('should throw an exception with an incorrect query', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/',
        query: {
          email: 'example.com',
        },
      });

      expect(() => validate(request, response, next)).toThrow(
        expect.objectContaining({
          message: 'Error in request validation',
          errorList: [{ param: 'email', type: 'invalid_string' }],
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next and test `query` without errors', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/',
        query: {
          email: 'email@example.com',
        },
      });

      validate(request, response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Body request', () => {
    let validate: RequestHandler;
    let response: httpMocks.MockResponse<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      validate = validateRequest<any>({
        body: z.object({
          displayName: z.string().nonempty(),
        }),
      });
      response = httpMocks.createResponse();
      next = jest.fn();
    });

    it('should throw an exception with an incorrect query', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/',
        body: {
          displayName: '',
        },
      });

      expect(() => validate(request, response, next)).toThrow(
        expect.objectContaining({
          message: 'Error in request validation',
          errorList: [{ param: 'displayName', type: 'too_small' }],
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next and test `query` without errors', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/',
        body: {
          displayName: 'Team Name 123',
        },
      });

      validate(request, response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Full request with Params, Query and Body,', () => {
    let validate: RequestHandler;
    let response: httpMocks.MockResponse<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      validate = validateRequest<any>({
        params: z.object({
          teamId: z.string().nonempty(),
        }),
        query: z.object({
          email: z.string().nonempty().email(),
        }),
        body: z.object({
          displayName: z.string().nonempty(),
        }),
      });
      response = httpMocks.createResponse();
      next = jest.fn();
    });

    it('should throw an exception with an incorrect params', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/',
      });

      expect(() => validate(request, response, next)).toThrow(
        expect.objectContaining({
          message: 'Error in request validation',
          errorList: [
            { param: 'teamId', type: 'invalid_type' },
            { param: 'email', type: 'invalid_type' },
            { param: 'displayName', type: 'invalid_type' },
          ],
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next and test `params` without errors', () => {
      const request = httpMocks.createRequest({
        method: 'GET',
        url: '/',
        params: {
          teamId: 'team-123',
        },
        query: {
          email: 'email@example.com',
        },
        body: {
          displayName: 'Team Name 123',
        },
      });

      validate(request, response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
