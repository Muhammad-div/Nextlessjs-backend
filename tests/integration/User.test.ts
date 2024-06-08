import { Role } from '@prisma/client';
import supertest from 'supertest';

import { app } from '@/app';

describe('User', () => {
  beforeEach(() => {
    app.request.currentUserId = '123';
  });

  describe('User profile', () => {
    it('should return an error with a missing email as parameter. Email is used to create a new team.', async () => {
      const response = await supertest(app).get('/user/profile');

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([{ param: 'email', type: 'invalid_type' }]),
      );
    });

    it('should return an error with incorrect email as parameter. Email is used to create a new team.', async () => {
      const response = await supertest(app).get('/user/profile?email=example');

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([{ param: 'email', type: 'invalid_string' }]),
      );
    });

    it('should create a new user and a new team when calling `/user/profile` for the first time', async () => {
      // Create a new user and get the newly created Team ID
      let response = await supertest(app).get(
        '/user/profile?email=example@example.com',
      );
      const teamId = response.body.teamList[0].id;

      // Verify the returned information
      expect(response.statusCode).toEqual(200);
      expect(response.body.firstSignIn.substr(0, 10)).toEqual(
        new Date().toISOString().substring(0, 10),
      ); // Compare only the date, the user should be create today
      expect(response.body.teamList[0].displayName).toEqual('New Team');

      // The user should be an active member of the team and the email address should be correct
      response = await supertest(app).get(`/team/${teamId}/list-members`);
      expect(response.body.list[0].email).toEqual('example@example.com');
      expect(response.body.list[0].role).toEqual(Role.OWNER);
    });

    it("shouldn't create a new team or a new user when calling `/user/profile` for the second time", async () => {
      const firstResponse = await supertest(app).get(
        '/user/profile?email=example@example.com',
      );

      const secondResponse = await supertest(app).get(
        '/user/profile?email=example@example.com',
      );

      expect(secondResponse.statusCode).toEqual(firstResponse.statusCode);
      expect(secondResponse.body).toEqual(firstResponse.body);
    });
  });

  describe('Update email address', () => {
    it('should return error missing the email in the body', async () => {
      const response = await supertest(app).put('/user/email-update');

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([{ param: 'email', type: 'invalid_type' }]),
      );
    });

    it('should return error with incorrect email in the body', async () => {
      const response = await supertest(app).put('/user/email-update').send({
        email: 'example',
      });

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([{ param: 'email', type: 'invalid_string' }]),
      );
    });

    it('should update the user email address', async () => {
      // Create a new user and get the newly created Team ID
      let response = await supertest(app).get(
        '/user/profile?email=example@example.com',
      );
      const teamId = response.body.teamList[0].id;

      // Update the email address
      response = await supertest(app).put('/user/email-update').send({
        email: 'newexample@example.com',
      });

      expect(response.statusCode).toEqual(200);
      expect(response.body.email).toEqual('newexample@example.com');

      // Check the email in the team he belongs and it should return the new email address
      response = await supertest(app).get(`/team/${teamId}/list-members`);
      expect(response.body.list[0].email).toEqual('newexample@example.com');
    });
  });
});
