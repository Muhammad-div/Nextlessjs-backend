import { InvitationStatus, Role } from '@prisma/client';
import assert from 'assert';

import { MemberModel } from '@/models/MemberModel';
import { UserModel } from '@/models/UserModel';
import { MemberRepository } from '@/repositories/MemberRepository';
import { TeamRepository } from '@/repositories/TeamRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { dbClient } from '@/utils/DBClient';

import { TeamService } from './TeamService';

describe('TeamService', () => {
  let teamService: TeamService;

  let teamRepository: TeamRepository;

  let userRepository: UserRepository;

  let memberRepository: MemberRepository;

  beforeEach(() => {
    teamRepository = new TeamRepository(dbClient);
    userRepository = new UserRepository(dbClient);
    memberRepository = new MemberRepository(dbClient);
    teamService = new TeamService(
      teamRepository,
      userRepository,
      memberRepository,
    );
  });

  describe('Basic operation', () => {
    it('should create a new team and add the user as a team member', async () => {
      const createdUser = await userRepository.createWithUserId('user-123');
      const createdTeam = await teamService.create(
        'team-123',
        createdUser,
        'random@example.com',
      );

      const team = await teamRepository.findByTeamId(createdTeam.id);
      assert(team !== null, "team shouldn't be null");
      expect(team.getDisplayName()).toEqual('team-123');

      const user = await userRepository.findByUserId(createdUser.providerId);
      assert(user !== null, "user shouldn't be null");
      expect(user.getTeamList()).toHaveLength(1);
      expect(user.getTeamList()[0]).toEqual(createdTeam.id);

      const member = await memberRepository.findByKeys(
        createdTeam.id,
        'user-123',
      );
      assert(member !== null, "member shouldn't be null");
      expect(member.getEmail()).toEqual('random@example.com');
      expect(member.getRole()).toEqual(Role.OWNER);
      expect(member.getStatus()).toEqual(InvitationStatus.ACTIVE);
    });

    it("should throw an exception when the user doesn't exist", async () => {
      await expect(
        teamService.requiredAuthWithTeam('team-123', 'user-123'),
      ).rejects.toThrow(/Incorrect UserID/);
    });

    it("should throw an exception when the user isn't a team member", async () => {
      const user = await userRepository.createWithUserId('user-123');
      await teamService.create(
        'team-display-name-123',
        user,
        'random@example.com',
      );

      await expect(
        teamService.requiredAuthWithTeam('team-123', user.providerId),
      ).rejects.toThrow(/isn't a team member of/);
    });

    it('should return the team when the user is a team member', async () => {
      const user = await userRepository.createWithUserId('user-123');
      const createdTeam = await teamService.create(
        'team-display-name-123',
        user,
        'random@example.com',
      );

      const { team } = await teamService.requiredAuthWithTeam(
        createdTeam.id,
        user.providerId,
      );
      assert(team !== null, "team shouldn't be null");
      expect(team.getDisplayName()).toEqual('team-display-name-123');
    });

    it("shouldn't happen: the user belongs to a team but the team doesn't exist", async () => {
      const user = new UserModel('user-123');
      user.addTeam('team-123');
      await userRepository.save(user);

      const member = new MemberModel(
        '123123123123123123123123',
        user.providerId,
      );
      member.setStatus(InvitationStatus.ACTIVE);
      await memberRepository.create(member);

      await expect(
        teamService.requiredAuthWithTeam(
          '123123123123123123123123',
          user.providerId,
        ),
      ).rejects.toThrow(/Incorrect TeamID/);
    });

    it('should update the user email in all teams', async () => {
      const user = new UserModel('user-123');
      const team1 = await teamService.create(
        'team-1',
        user,
        'random@example.com',
      );
      const team2 = await teamService.create(
        'team-2',
        user,
        'random@example.com',
      );
      const team3 = await teamService.create(
        'team-3',
        user,
        'random@example.com',
      );

      let member1 = await memberRepository.findByKeys(
        team1.id,
        user.providerId,
      );
      assert(member1 !== null, "member shouldn't be null");
      expect(member1.getEmail()).toEqual('random@example.com');

      let member2 = await memberRepository.findByKeys(
        team2.id,
        user.providerId,
      );
      assert(member2 !== null, "member shouldn't be null");
      expect(member2.getEmail()).toEqual('random@example.com');

      let member3 = await memberRepository.findByKeys(
        team3.id,
        user.providerId,
      );
      assert(member3 !== null, "member shouldn't be null");
      expect(member3.getEmail()).toEqual('random@example.com');

      await teamService.updateEmailAllTeams(user, 'new-random@example.com');

      member1 = await memberRepository.findByKeys(team1.id, user.providerId);
      assert(member1 !== null, "member shouldn't be null");
      expect(member1.getEmail()).toEqual('new-random@example.com');

      member2 = await memberRepository.findByKeys(team2.id, user.providerId);
      assert(member2 !== null, "member shouldn't be null");
      expect(member2.getEmail()).toEqual('new-random@example.com');

      member3 = await memberRepository.findByKeys(team3.id, user.providerId);
      assert(member3 !== null, "member shouldn't be null");
      expect(member3.getEmail()).toEqual('new-random@example.com');
    });

    it('should raise an error when there is no team member to delete', async () => {
      await expect(
        teamService.delete('123123123123123123123123'),
      ).rejects.toThrow(/Incorrect TeamID/);
    });

    it('should raise an error when deleting a team but there is no member. It should not happen because it should have at least the owner', async () => {
      const team = await teamRepository.createWithDisplayName('team-123');

      await expect(teamService.delete(team.id)).rejects.toThrow(
        /Nothing to delete/,
      );
    });

    it('should delete team and its member', async () => {
      const createdUser = await userRepository.createWithUserId('user-1');
      const createdTeam = await teamService.create(
        'team-123',
        createdUser,
        'random@example.com',
      );

      const createdPendingMember = new MemberModel(createdTeam.id);
      await memberRepository.create(createdPendingMember);

      const createdUser2 = await userRepository.createWithUserId('user-2');
      await teamService.join(
        createdTeam,
        createdUser2,
        'random2@example.com',
        Role.ADMIN,
      );

      expect(createdUser.getTeamList()[0]).toEqual(createdTeam.id);

      await teamService.delete(createdTeam.id);

      const team = await teamRepository.findByTeamId(createdTeam.id);
      expect(team).toBeNull();
      const member1 = await memberRepository.findByKeys(
        createdTeam.id,
        'user-1',
      );
      expect(member1).toBeNull();
      const member2 = await memberRepository.findByKeys(
        createdTeam.id,
        'user-2',
      );
      expect(member2).toBeNull();
      const pendingMember = await memberRepository.findByKeys(
        createdPendingMember.teamId,
        createdPendingMember.inviteCodeOrUserId,
      );
      expect(pendingMember).toBeNull();

      const user = await userRepository.strictFindByUserId('user-1');
      expect(user.getTeamList()).toHaveLength(0);
      const user2 = await userRepository.strictFindByUserId('user-2');
      expect(user2.getTeamList()).toHaveLength(0);
    });
  });

  describe('Team permission', () => {
    it('should not find team member with `PENDING` status', async () => {
      const createdMember = new MemberModel('team-123', 'user-123');
      await memberRepository.create(createdMember);

      const member = await teamService.findTeamMember('user-123', 'team-123');

      expect(member).toBeNull();
    });

    it('should find team member with `ACTIVE` status only', async () => {
      const createdMember = new MemberModel('team-123', 'user-123');
      createdMember.setStatus(InvitationStatus.ACTIVE);
      await memberRepository.create(createdMember);

      const member = await teamService.findTeamMember('user-123', 'team-123');

      expect(member).not.toBeNull();
    });

    it('should create a new user and should not have a team by default', async () => {
      const userId = 'user-123';
      await userRepository.createWithUserId(userId);

      await expect(
        teamService.requiredAuth('user-123', 'team-123'),
      ).rejects.toThrow("isn't a team member");
    });

    it('should join a team as a member', async () => {
      const createdUser = await userRepository.createWithUserId('user-123');
      const createdTeam =
        await teamRepository.createWithDisplayName('team-123');

      await teamService.join(
        createdTeam,
        createdUser,
        'random@example.com',
        Role.ADMIN,
      );

      const { user } = await teamService.requiredAuth(
        'user-123',
        createdTeam.id,
      );
      expect(user.providerId).toEqual('user-123');
      expect(user.getTeamList()).toHaveLength(1);
      expect(user.getTeamList()[0]).toEqual(createdTeam.id);

      const member = await memberRepository.findByKeys(
        createdTeam.id,
        'user-123',
      );
      assert(member !== null, "member shouldn't be null");
      expect(member.getEmail()).toEqual('random@example.com');
      expect(member.getRole()).toEqual(Role.ADMIN);
      expect(member.getStatus()).toEqual(InvitationStatus.ACTIVE);
    });

    it('should create a new user, make it a team member but in `PENDING` state', async () => {
      const userId = 'user-123';
      await userRepository.createWithUserId(userId);

      const member = new MemberModel('team-123', userId);
      member.setStatus(InvitationStatus.PENDING);
      await memberRepository.create(member);

      await expect(
        teamService.requiredAuth('user-123', 'team-123'),
      ).rejects.toThrow("isn't a team member");
    });

    it('should create a new user, make it a team member but incorrect permission', async () => {
      const userId = 'user-123';
      await userRepository.createWithUserId(userId);

      const member = new MemberModel('team-123', userId);
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.READ_ONLY);
      await memberRepository.create(member);

      await expect(
        teamService.requiredAuth('user-123', 'team-123', [
          Role.OWNER,
          Role.ADMIN,
        ]),
      ).rejects.toThrow('are not able to perform the action');
    });

    it('should create a new user, make it a team member but incorrect permission only owner can', async () => {
      const userId = 'user-123';
      await userRepository.createWithUserId(userId);

      const member = new MemberModel('team-123', userId);
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.ADMIN);
      await memberRepository.create(member);

      await expect(
        teamService.requiredAuth('user-123', 'team-123', [Role.OWNER]),
      ).rejects.toThrow('are not able to perform the action');
    });

    it('should create a new user with a new team and verify membership and permission', async () => {
      const createdUser = await userRepository.createWithUserId('user-123');
      const createdTeam = await teamService.create(
        'team-display-name',
        createdUser,
        'random@example.com',
      );

      const { user } = await teamService.requiredAuth(
        'user-123',
        createdTeam.id,
      );
      expect(user.providerId).toEqual('user-123');
    });

    it('should create a new user and verify he is the owner', async () => {
      const userId = 'user-123';
      await userRepository.createWithUserId(userId);

      const member = new MemberModel('team-123', userId);
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.OWNER);
      await memberRepository.create(member);

      const { user } = await teamService.requiredAuth('user-123', 'team-123', [
        Role.OWNER,
      ]);
      expect(user.providerId).toEqual('user-123');
    });

    it('should create a new user and verify he has the correct role', async () => {
      const userId = 'user-123';
      await userRepository.createWithUserId(userId);

      const member = new MemberModel('team-123', userId);
      member.setStatus(InvitationStatus.ACTIVE);
      member.setRole(Role.ADMIN);
      await memberRepository.create(member);

      const { user } = await teamService.requiredAuth('user-123', 'team-123', [
        Role.OWNER,
        Role.ADMIN,
      ]);
      expect(user.providerId).toEqual('user-123');
    });
  });
});
