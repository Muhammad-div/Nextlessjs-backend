import { GlobalRole, Role } from '@prisma/client';

import { MemberRepository } from '@/repositories/MemberRepository';
import { TeamRepository } from '@/repositories/TeamRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { dbClient } from '@/utils/DBClient';
import { stripe } from '@/utils/Stripe';

import { AdminService } from './AdminService';
import { BillingService } from './BillingService';
import { TeamService } from './TeamService';

describe('AdminService', () => {
  let teamService: TeamService;

  let adminService: AdminService;

  let userRepository: UserRepository;

  let teamRepository: TeamRepository;

  let memberRepository: MemberRepository;

  let billingService: BillingService;

  beforeEach(() => {
    userRepository = new UserRepository(dbClient);
    teamRepository = new TeamRepository(dbClient);
    memberRepository = new MemberRepository(dbClient);
    billingService = new BillingService(teamRepository, stripe, 'test');
    adminService = new AdminService(
      userRepository,
      teamRepository,
      billingService,
    );
    teamService = new TeamService(
      teamRepository,
      userRepository,
      memberRepository,
    );
  });

  describe('Verify super admin rights', () => {
    it("should throw an exception when the user doesn't exist", async () => {
      await expect(adminService.requireSuperAdmin('user-123')).rejects.toThrow(
        /Incorrect UserID/,
      );
    });

    it("should create a new user and verify he doesn't have super admin rights", async () => {
      const userId = 'user-123';
      await userRepository.createWithUserId(userId);

      await expect(adminService.requireSuperAdmin(userId)).rejects.toThrow(
        /are not able to perform the action/,
      );
    });

    it('should create a new user with super admin rights and verify he has the correct global role', async () => {
      const userId = 'user-123';
      const createdUser = await userRepository.createWithUserId(userId);

      createdUser.setGlobalRole(GlobalRole.SUPER_ADMIN);
      await userRepository.save(createdUser);

      const user = await adminService.requireSuperAdmin(userId);

      expect(user.providerId).toBe('user-123');
    });
  });

  describe('Get teams from Cognito ID', () => {
    it('should return an empty list when the Cognito ID is undefined', async () => {
      const teams = await adminService.getTeamListFromCognitoId(undefined);

      expect(teams).toEqual([]);
    });

    it("should return an empty list when the user doesn't in the database", async () => {
      const teams = await adminService.getTeamListFromCognitoId('user-123');

      expect(teams).toEqual([]);
    });

    it('should return the team from Cognito ID', async () => {
      const createdUser = await userRepository.createWithUserId('user-123');
      const createdTeam =
        await teamRepository.createWithDisplayName('team-123');

      await teamService.join(
        createdTeam,
        createdUser,
        'random@example.com',
        Role.ADMIN,
      );

      const teamList = await adminService.getTeamListFromCognitoId('user-123');
      expect(teamList).toHaveLength(1);
      expect(teamList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            displayName: 'team-123',
            planId: 'FREE',
            planName: 'Free',
          }),
        ]),
      );
    });
  });

  describe('Get teams', () => {
    it('should return an empty list when there is no team', async () => {
      const user = await userRepository.createWithUserId('user-123');

      const teamList = await adminService.getTeamListWithSubscription(user);
      expect(teamList).toEqual([]);
    });

    it('should return the team with subscription plan', async () => {
      const createdUser = await userRepository.createWithUserId('user-123');
      const createdTeam =
        await teamRepository.createWithDisplayName('team-123');

      await teamService.join(
        createdTeam,
        createdUser,
        'random@example.com',
        Role.ADMIN,
      );

      const teamList =
        await adminService.getTeamListWithSubscription(createdUser);
      expect(teamList).toHaveLength(1);
      expect(teamList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            displayName: 'team-123',
            planId: 'FREE',
            planName: 'Free',
          }),
        ]),
      );
    });

    it('should return an empty array when the Cognito user list is empty', async () => {
      const teamList = await adminService.getAllTeams([]);
      expect(teamList).toEqual([]);
    });

    it('should return an empty array when there is no Cognito ID', async () => {
      const teamList = await adminService.getAllTeams([
        {
          id: undefined,
          username: undefined,
          createDate: undefined,
          email: undefined,
          enabled: undefined,
        },
      ]);
      expect(teamList).toEqual([]);
    });

    it('should return an empty array when the user does not exist', async () => {
      const teamList = await adminService.getAllTeams([
        {
          id: 'user-1',
          username: 'username-1',
          createDate: new Date(),
          email: 'email-1',
          enabled: true,
        },
      ]);
      expect(teamList).toEqual([]);
    });

    it('should return all the teams with subscription plan', async () => {
      const user1 = await userRepository.createWithUserId('user-1');
      const team11 = await teamRepository.createWithDisplayName('team-11');

      await teamService.join(team11, user1, 'random@example.com', Role.ADMIN);

      const user2 = await userRepository.createWithUserId('user-2');
      const team21 = await teamRepository.createWithDisplayName('team-21');

      await teamService.join(team21, user2, 'random@example.com', Role.ADMIN);

      const team22 = await teamRepository.createWithDisplayName('team-22');

      await teamService.join(team22, user2, 'random@example.com', Role.ADMIN);

      const teamList = await adminService.getAllTeams([
        {
          id: 'user-1',
          username: 'username-1',
          createDate: new Date(),
          email: 'email-1',
          enabled: true,
        },
        {
          id: 'user-2',
          username: 'username-2',
          createDate: new Date(),
          email: 'email-2',
          enabled: true,
        },
      ]);
      expect(teamList).toHaveLength(3);
      expect(teamList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            displayName: 'team-11',
            planId: 'FREE',
            planName: 'Free',
          }),
          expect.objectContaining({
            displayName: 'team-21',
            planId: 'FREE',
            planName: 'Free',
          }),
          expect.objectContaining({
            displayName: 'team-22',
            planId: 'FREE',
            planName: 'Free',
          }),
        ]),
      );
    });
  });
});
