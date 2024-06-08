import { GlobalRole } from '@prisma/client';
import supertest from 'supertest';

import { app } from '@/app';
import { ErrorCode } from '@/errors/ErrorCode';
import { UserModel } from '@/models/UserModel';
import { userRepository } from '@/repositories';

describe('Admin', () => {
  let teamId: string;

  beforeEach(async () => {
    app.request.currentUserId = '123';

    const response = await supertest(app).get(
      '/user/profile?email=example@example.com',
    );
    teamId = response.body.teamList[0].id;
  });

  describe('Get team', () => {
    it('should not return team information without super admin rights', async () => {
      const response = await supertest(app).get(`/super-admin/team/${teamId}`);

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(
        ErrorCode.INCORRECT_GLOBAL_PERMISSION,
      );
    });

    it("should not return team information if the team doesn't exist", async () => {
      const user = new UserModel('123');
      user.setGlobalRole(GlobalRole.SUPER_ADMIN);
      await userRepository.save(user);

      const response = await supertest(app).get(
        `/super-admin/team/123123123123123123123123`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_TEAM_ID);
    });

    it('should return team information from the super admin itself', async () => {
      const user = new UserModel('123');
      user.setGlobalRole(GlobalRole.SUPER_ADMIN);
      await userRepository.save(user);

      let response = await supertest(app).put(`/team/${teamId}/name`).send({
        displayName: 'New Team display name',
      });
      expect(response.statusCode).toEqual(200);

      response = await supertest(app).get(`/super-admin/team/${teamId}`);

      expect(response.statusCode).toEqual(200);
      expect(response.body.name).toEqual('New Team display name');
    });

    it('should return team information from another user', async () => {
      const user = new UserModel('123');
      user.setGlobalRole(GlobalRole.SUPER_ADMIN);
      await userRepository.save(user);

      // Create another user
      app.request.currentUserId = '125';

      let response = await supertest(app).get(
        '/user/profile?email=user2@example.com',
      );
      const teamId2 = response.body.teamList[0].id;

      // Change the team name
      response = await supertest(app).put(`/team/${teamId2}/name`).send({
        displayName: 'New Team display name 2',
      });
      expect(response.statusCode).toEqual(200);

      // Back to the super admin
      app.request.currentUserId = '123';

      // Get the team information from another user
      response = await supertest(app).get(`/super-admin/team/${teamId2}`);

      expect(response.statusCode).toEqual(200);
      expect(response.body.name).toEqual('New Team display name 2');
    });
  });
});
