import { mockSendMail } from '__mocks__/nodemailer';
import { InvitationStatus, Role } from '@prisma/client';
import supertest from 'supertest';

import { app } from '@/app';
import { ErrorCode } from '@/errors/ErrorCode';
import { MemberModel } from '@/models/MemberModel';
import { memberRepository } from '@/repositories';

describe('Team', () => {
  let teamId: string;

  beforeEach(async () => {
    app.request.currentUserId = '123';

    const response = await supertest(app).get(
      '/user/profile?email=example@example.com',
    );
    teamId = response.body.teamList[0].id;
  });

  describe('Create team', () => {
    it('should return an error with missing user email and display name as a parameter. They are needed to create team.', async () => {
      const response = await supertest(app).post('/team/create');

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { param: 'displayName', type: 'invalid_type' },
          { param: 'userEmail', type: 'invalid_type' },
        ]),
      );
    });

    it('should create a team with the correct displayName', async () => {
      const response = await supertest(app).post('/team/create').send({
        userEmail: 'example@example.com',
        displayName: 'Team display name',
      });

      expect(response.statusCode).toEqual(200);
      expect(response.body.displayName).toEqual('Team display name');
    });
  });

  describe('List team members', () => {
    it("shouldn't list team members and return an error because the user isn't a team member", async () => {
      const response = await supertest(app).get(`/team/123/list-members`);

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });

    it('should list team members', async () => {
      const response = await supertest(app).get(`/team/${teamId}/list-members`);

      expect(response.body.list[0].email).toEqual('example@example.com');
      expect(response.body.list[0].role).toEqual(Role.OWNER);

      expect(response.body.inviteList.length).toEqual(0);
    });
  });

  describe('Update team name', () => {
    it('should return an error with missing display name as a parameter. Display name is needed to update team name', async () => {
      const response = await supertest(app).put(`/team/${teamId}/name`);

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { param: 'displayName', type: 'invalid_type' },
        ]),
      );
    });

    it("shouldn't update team name and return an error because the user isn't a team member", async () => {
      const response = await supertest(app).put(`/team/123/name`).send({
        displayName: 'Team display name',
      });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });

    it('should not be able to update the team name with `READ_ONLY` role', async () => {
      const member = new MemberModel(teamId, '123');
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.READ_ONLY);
      await memberRepository.update(member);

      const response = await supertest(app).put(`/team/${teamId}/name`).send({
        displayName: 'New Team display name',
      });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_PERMISSION);
    });

    it('should be able to update the team name', async () => {
      const response = await supertest(app).put(`/team/${teamId}/name`).send({
        displayName: 'New Team display name',
      });

      expect(response.statusCode).toEqual(200);
      expect(response.body.displayName).toEqual('New Team display name');
    });
  });

  describe('Delete team', () => {
    it("shouldn't delete team and return an error because the user isn't a team member", async () => {
      const response = await supertest(app).delete(`/team/123`);

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });

    it('should not allow to delete team with `READ_ONLY` role', async () => {
      const member = new MemberModel(teamId, '123');
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.READ_ONLY);
      await memberRepository.update(member);

      const response = await supertest(app).delete(`/team/${teamId}`);

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_PERMISSION);
    });

    it("should delete team and shouldn't be able to retrieve team member list", async () => {
      let response = await supertest(app).delete(`/team/${teamId}`);

      expect(response.statusCode).toEqual(200);
      expect(response.body.success).toBeTruthy();

      response = await supertest(app).get(`/team/${teamId}/list-members`);
      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });
  });

  describe('Get team settings', () => {
    it("shouldn't get the team settings and return an error because the user isn't a team member", async () => {
      const response = await supertest(app).get(`/team/123/settings`);

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });

    it('should return team settings', async () => {
      const response = await supertest(app).get(`/team/${teamId}/settings`);

      expect(response.statusCode).toEqual(200);
      expect(response.body.hasStripeCustomerId).toBeFalsy();
      expect(response.body.planId).toEqual('FREE');
    });
  });

  describe('Invite team members', () => {
    it("should return an error with missing email as a parameter. It's needed to invite team member.", async () => {
      const response = await supertest(app).post(`/team/${teamId}/invite`);

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { param: 'role', type: 'invalid_type' },
          { param: 'email', type: 'invalid_type' },
        ]),
      );
    });

    it('should return an error when the role is not the enum', async () => {
      const response = await supertest(app)
        .post(`/team/${teamId}/invite`)
        .send({
          email: 'example@example.com',
          role: 'RANDOM',
        });

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([{ param: 'role', type: 'invalid_enum_value' }]),
      );
    });

    it("shouldn't invite team member and return an error because the user isn't a team member", async () => {
      const response = await supertest(app).post(`/team/123/invite`).send({
        email: 'example@example.com',
        role: 'ADMIN',
      });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });

    it('should not allow to send invitation with OWNER role', async () => {
      const response = await supertest(app)
        .post(`/team/${teamId}/invite`)
        .send({
          email: 'example@example.com',
          role: 'OWNER',
        });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_DATA);
    });

    it('should not allow to send invitation when the user has READ_ONLY role', async () => {
      const member = new MemberModel(teamId, '123');
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.READ_ONLY);
      await memberRepository.update(member);

      const response = await supertest(app)
        .post(`/team/${teamId}/invite`)
        .send({
          email: 'example@example.com',
          role: 'READ_ONLY',
        });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_PERMISSION);
    });

    it('should send invitation by sending email with `READ_ONLY` role', async () => {
      const response = await supertest(app)
        .post(`/team/${teamId}/invite`)
        .send({
          email: 'example@example.com',
          role: 'READ_ONLY',
        });

      expect(response.statusCode).toEqual(200);
      expect(response.body.role).toEqual(Role.READ_ONLY);
      expect(response.body.status).toEqual(InvitationStatus.PENDING);

      // Verify if the email is sent
      expect(mockSendMail).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'example@example.com',
        }),
      );
    });

    it('should send invitation by sending email with `ADMIN` role', async () => {
      const response = await supertest(app)
        .post(`/team/${teamId}/invite`)
        .send({
          email: 'example@example.com',
          role: 'ADMIN',
        });

      expect(response.statusCode).toEqual(200);
      expect(response.body.role).toEqual(Role.ADMIN);
      expect(response.body.status).toEqual(InvitationStatus.PENDING);

      // Verify if the email is sent
      expect(mockSendMail).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'example@example.com',
        }),
      );
    });
  });

  describe('Get join info', () => {
    it("shouldn't return join information and return an error because the team doesn't exist.", async () => {
      const response = await supertest(app).get(
        `/team/123123123123123123123123/join/123`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_TEAM_ID);
    });

    it("shouldn't return join information and return an error with incorrect verification code.", async () => {
      const response = await supertest(app).get(
        `/team/${teamId}/join/INCORRECT`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_CODE);
    });

    it("shouldn't return team information using other existing user id and not using the correct verification code", async () => {
      const response = await supertest(app).get(`/team/${teamId}/join/123`);

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_CODE);
    });

    it('should return team information', async () => {
      let response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'example@example.com',
        role: 'ADMIN',
      });

      const verificationCode = mockSendMail.mock.calls[0][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      response = await supertest(app).get(
        `/team/${teamId}/join/${verificationCode}`,
      );

      expect(response.statusCode).toEqual(200);
      expect(response.body.displayName).toEqual('New Team');
    });
  });

  describe('Join team', () => {
    it('should return an error with missing email as a parameter. Email is needed to join team.', async () => {
      const response = await supertest(app).post(`/team/${teamId}/join/123`);

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([{ param: 'email', type: 'invalid_type' }]),
      );
    });

    it("shouldn't join team and return an error because the user is already a member.", async () => {
      let response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'example@example.com',
        role: 'ADMIN',
      });

      const verificationCode = mockSendMail.mock.calls[0][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      response = await supertest(app)
        .post(`/team/${teamId}/join/${verificationCode}`)
        .send({
          email: 'user2@example.com',
        });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.ALREADY_MEMBER);
    });

    it("shouldn't join team using other existing user id and not using the correct verification code", async () => {
      app.request.currentUserId = '125';

      let response = await supertest(app).get(
        '/user/profile?email=user2@example.com',
      );

      response = await supertest(app).post(`/team/${teamId}/join/123`).send({
        email: 'user2@example.com',
      });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_CODE);
    });

    it('should send invitation by sending email and a second user join the team', async () => {
      let response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user2@example.com',
        role: 'ADMIN',
      });

      const verificationCode = mockSendMail.mock.calls[0][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      // Using different user ID
      app.request.currentUserId = '125';

      response = await supertest(app).get(
        '/user/profile?email=user2@example.com',
      );

      response = await supertest(app)
        .post(`/team/${teamId}/join/${verificationCode}`)
        .send({
          email: 'user2@example.com',
        });

      expect(response.statusCode).toEqual(200);
      expect(response.body.role).toEqual(Role.ADMIN);
      expect(response.body.status).toEqual(InvitationStatus.ACTIVE);
    });
  });

  describe('Edit team member', () => {
    it("should return an error when the role doesn't exist", async () => {
      const response = await supertest(app).put(`/team/123/edit/123`).send({
        role: 'RANDOM',
      });

      expect(response.statusCode).toEqual(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([{ param: 'role', type: 'invalid_enum_value' }]),
      );
    });

    it("shouldn't update team member role and return an error because the user isn't a team member", async () => {
      const response = await supertest(app).put(`/team/123/edit/123`).send({
        role: 'ADMIN',
      });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });

    it("shouldn't update team member role and return an error with incorrect member id", async () => {
      const response = await supertest(app)
        .put(`/team/${teamId}/edit/INCORRECT`)
        .send({
          role: 'ADMIN',
        });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_MEMBER_ID);
    });

    it("shouldn't update the role with `READ_ONLY` role", async () => {
      const member = new MemberModel(teamId, '123');
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.READ_ONLY);
      await memberRepository.update(member);

      const response = await supertest(app)
        .put(`/team/${teamId}/edit/123`)
        .send({
          role: 'READ_ONLY',
        });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_PERMISSION);
    });

    it("shouldn't update the role when the member is the owner", async () => {
      const response = await supertest(app)
        .put(`/team/${teamId}/edit/123`)
        .send({
          role: 'READ_ONLY',
        });

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_MEMBER_ID);
    });

    it('should add a new user in team and edit his role to `READ_ONLY`', async () => {
      let response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user2@example.com',
        role: 'ADMIN',
      });

      const verificationCode = mockSendMail.mock.calls[0][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      response = await supertest(app)
        .put(`/team/${teamId}/edit/${verificationCode}`)
        .send({
          role: 'READ_ONLY',
        });

      expect(response.statusCode).toEqual(200);
      expect(response.body.role).toEqual(Role.READ_ONLY);
    });
  });

  describe('Delete team member', () => {
    it("shouldn't delete team member and return an error because the user isn't a team member", async () => {
      const response = await supertest(app).delete(`/team/123/remove/123`);

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });

    it("shouldn't delete team member and return an error with incorrect member id", async () => {
      const response = await supertest(app).delete(
        `/team/${teamId}/remove/INCORRECT`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_MEMBER_ID);
    });

    it("should send invitation and remove invitation in 'PENDING' status", async () => {
      let response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user2@example.com',
        role: 'ADMIN',
      });

      const verificationCode = mockSendMail.mock.calls[0][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      response = await supertest(app).delete(
        `/team/${teamId}/remove/${verificationCode}`,
      );

      expect(response.body.success).toBeTruthy();
    });

    it('should add a new user in team and remove it from the team', async () => {
      let response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user2@example.com',
        role: 'ADMIN',
      });

      const verificationCode = mockSendMail.mock.calls[0][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      // Using different user ID
      app.request.currentUserId = '125';

      response = await supertest(app).get(
        '/user/profile?email=user2@example.com',
      );

      response = await supertest(app)
        .post(`/team/${teamId}/join/${verificationCode}`)
        .send({
          email: 'user2@example.com',
        });

      // Back to the original user ID
      app.request.currentUserId = '123';

      response = await supertest(app).delete(`/team/${teamId}/remove/125`);

      expect(response.statusCode).toEqual(200);
      expect(response.body.success).toBeTruthy();
    });

    it('should remove the user when `READ_ONLY` role', async () => {
      const member = new MemberModel(teamId, '123');
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.READ_ONLY);
      await memberRepository.update(member);

      const response = await supertest(app).delete(
        `/team/${teamId}/remove/123`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_PERMISSION);
    });

    it('should remove the user himself from the team', async () => {
      const response = await supertest(app).delete(
        `/team/${teamId}/remove/123`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_DATA);
    });
  });

  describe('Transfer ownership', () => {
    it('should return an error when the team does not exist', async () => {
      const response = await supertest(app).put(
        `/team/123/transfer-ownership/random`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.NOT_MEMBER);
    });

    it('should return an error when the team member does not exist', async () => {
      const response = await supertest(app).put(
        `/team/${teamId}/transfer-ownership/random`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_MEMBER_ID);
    });

    it('should return an error when transfering ownership to owner', async () => {
      const response = await supertest(app).put(
        `/team/${teamId}/transfer-ownership/123`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_MEMBER_ID);
    });

    it('should not be able to transfer ownership without OWNER role', async () => {
      let response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user2@example.com',
        role: 'ADMIN',
      });

      const verificationCode = mockSendMail.mock.calls[0][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      // Using different user ID
      app.request.currentUserId = '125';

      response = await supertest(app).get(
        '/user/profile?email=user2@example.com',
      );

      response = await supertest(app)
        .post(`/team/${teamId}/join/${verificationCode}`)
        .send({
          email: 'user2@example.com',
        });

      response = await supertest(app).put(
        `/team/${teamId}/transfer-ownership/123`,
      );

      expect(response.statusCode).toEqual(500);
      expect(response.body.errors).toEqual(ErrorCode.INCORRECT_PERMISSION);
    });

    it('should able to transfer ownership to the newly invited team member', async () => {
      let response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user2@example.com',
        role: 'ADMIN',
      });

      const verificationCode = mockSendMail.mock.calls[0][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      // Using different user ID
      app.request.currentUserId = '125';

      response = await supertest(app).get(
        '/user/profile?email=user2@example.com',
      );

      response = await supertest(app)
        .post(`/team/${teamId}/join/${verificationCode}`)
        .send({
          email: 'user2@example.com',
        });

      // Back to OWNER of the team
      app.request.currentUserId = '123';

      response = await supertest(app).put(
        `/team/${teamId}/transfer-ownership/125`,
      );

      expect(response.body.success).toBeTruthy();

      response = await supertest(app).get(`/team/${teamId}/list-members`);
      expect(response.body.role).toEqual(Role.ADMIN);
      expect(response.body.list).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: 'user2@example.com',
            memberId: '125',
            role: Role.OWNER,
          }),
          expect.objectContaining({
            email: 'example@example.com',
            memberId: '123',
            role: Role.ADMIN,
          }),
        ]),
      );
    });
  });

  describe('Complex invitation workflow', () => {
    it('should send 3 invitations in PENDING status and keep the order based on date of creation', async () => {
      await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user@example.com',
        role: 'ADMIN',
      });

      await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user2@example.com',
        role: 'READ_ONLY',
      });

      await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user3@example.com',
        role: 'ADMIN',
      });

      const response = await supertest(app).get(`/team/${teamId}/list-members`);
      expect(response.body.inviteList).toEqual([
        expect.objectContaining({
          email: 'user@example.com',
          role: Role.ADMIN,
        }),
        expect.objectContaining({
          email: 'user2@example.com',
          role: Role.READ_ONLY,
        }),
        expect.objectContaining({
          email: 'user3@example.com',
          role: Role.ADMIN,
        }),
      ]);
    });

    it('should send 2 invitations with ACTIVE and PENDING status in listing', async () => {
      // Send invitation and the user accept it
      let response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user2@example.com',
        role: 'READ_ONLY',
      });

      const verificationCode = mockSendMail.mock.calls[0][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      // Using different user ID
      app.request.currentUserId = '125';

      response = await supertest(app).get(
        '/user/profile?email=user2@example.com',
      );

      response = await supertest(app)
        .post(`/team/${teamId}/join/${verificationCode}`)
        .send({
          email: 'user2@example.com',
        });

      // Back to OWNER of the team
      app.request.currentUserId = '123';

      // Edit the role in `ACTIVE` status
      response = await supertest(app).put(`/team/${teamId}/edit/125`).send({
        role: 'ADMIN',
      });

      // Send another invitation without accepting the invitation
      response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user3@example.com',
        role: 'ADMIN',
      });

      response = await supertest(app).get(`/team/${teamId}/list-members`);
      expect(response.body.list).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: 'example@example.com',
            memberId: '123',
            role: Role.OWNER,
          }),
          expect.objectContaining({
            email: 'user2@example.com',
            memberId: '125',
            role: Role.ADMIN,
          }),
        ]),
      );
      expect(response.body.inviteList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: 'user3@example.com',
            role: Role.ADMIN,
          }),
        ]),
      );
    });

    it('should send 2 invitation. Both are accepted but one of them will be removed.', async () => {
      // Send invitation and the user accept it. But, it'll be removed
      let response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user2@example.com',
        role: 'ADMIN',
      });

      const verificationCode = mockSendMail.mock.calls[0][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      // Using different user ID
      app.request.currentUserId = '125';

      response = await supertest(app).get(
        '/user/profile?email=user2@example.com',
      );

      response = await supertest(app)
        .post(`/team/${teamId}/join/${verificationCode}`)
        .send({
          email: 'user2@example.com',
        });

      // Send another invitation and the user accept it. But, it won't be removed.
      response = await supertest(app).post(`/team/${teamId}/invite`).send({
        email: 'user3@example.com',
        role: 'ADMIN',
      });

      const verificationCode2 = mockSendMail.mock.calls[1][0].text.match(
        /&verificationCode=(\S+)/,
      )[1]; // \S+ gets all characters until a whitespace, tab, new line, etc.

      // Using different user ID
      app.request.currentUserId = '126';

      response = await supertest(app).get(
        '/user/profile?email=user3@example.com',
      );

      response = await supertest(app)
        .post(`/team/${teamId}/join/${verificationCode2}`)
        .send({
          email: 'user3@example.com',
        });

      // Remove the first added user
      response = await supertest(app).delete(`/team/${teamId}/remove/125`);

      response = await supertest(app).get(`/team/${teamId}/list-members`);
      expect(response.body.list).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: 'example@example.com',
            memberId: '123',
          }),
          expect.objectContaining({
            email: 'user3@example.com',
            memberId: '126',
          }),
        ]),
      );
      expect(response.body.inviteList.length).toEqual(0);
    });
  });
});
