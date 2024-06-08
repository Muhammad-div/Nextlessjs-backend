import supertest from 'supertest';

import { app } from '@/app';
import { ErrorCode } from '@/errors/ErrorCode';

describe('Error', () => {
  describe('Page not found', () => {
    it('should return a not found error', async () => {
      const response = await supertest(app).get('/random-page-incorrect');

      expect(response.statusCode).toEqual(404);
      expect(response.body.errors).toEqual(ErrorCode.NOT_FOUND);
    });
  });
});
