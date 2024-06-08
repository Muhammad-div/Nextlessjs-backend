import { InvitationStatus, Role } from '@prisma/client';
import assert from 'assert';

import { MemberModel } from '@/models/MemberModel';
import { dbClient } from '@/utils/DBClient';

import { MemberRepository } from './MemberRepository';

describe('MemberRepository', () => {
  let memberRepository: MemberRepository;

  beforeEach(() => {
    memberRepository = new MemberRepository(dbClient);
  });

  describe('Basic operation', () => {
    it("should return null when the team member don't exist", async () => {
      const member = await memberRepository.findByKeys('team-123', 'user-123');

      expect(member).toBeNull();
    });

    it('should create a team member when saving a non-existing one and and be able to get the member from the database', async () => {
      const teamId = 'team-123';
      const userId = 'user-123';
      const savedMember = new MemberModel(teamId, userId);
      savedMember.setEmail('random@example.com');
      await memberRepository.save(savedMember);

      const member = await memberRepository.findByKeys(teamId, userId);
      assert(member !== null, "member shouldn't be null");
      expect(member.getEmail()).toEqual('random@example.com');
      expect(member.getStatus()).toEqual(InvitationStatus.PENDING);
    });

    it('should create a todo when saving a non-existing one and update when saving again', async () => {
      const teamId = 'team-123';
      const userId = 'user-123';
      const savedMember = new MemberModel(teamId, userId);
      savedMember.setEmail('random@example.com');
      await memberRepository.save(savedMember);

      savedMember.setEmail('new-random@example.com');
      await memberRepository.save(savedMember);

      const member = await memberRepository.findByKeys(teamId, userId);
      assert(member !== null, "member shouldn't be null");
      expect(member.getEmail()).toEqual('new-random@example.com');
      expect(member.getStatus()).toEqual(InvitationStatus.PENDING);
    });

    it("shouldn't be able to delete an non-existing team member", async () => {
      const deleteResult = await memberRepository.deleteByKeys(
        'team-123',
        'user-123',
      );

      expect(deleteResult).toBeFalsy();
    });

    it('should add a new team member and delete the newly created team member', async () => {
      const teamId = 'team-123';
      const userId = 'user-123';
      const savedMember = new MemberModel(teamId, userId);
      await memberRepository.save(savedMember);

      const deleteResult = await memberRepository.deleteByKeys(teamId, userId);
      expect(deleteResult).toBeTruthy();

      const member = await memberRepository.findByKeys(teamId, userId);
      expect(member).toBeNull();
    });

    it("shouldn't be able to delete an non-existing team member with deleteOnlyInPending method", async () => {
      const deleteResult = await memberRepository.deleteOnlyInPending(
        'team-123',
        'user-123',
      );

      expect(deleteResult).toBeFalsy();
    });

    it("shouldn't be able to delete when the status isn't in pending", async () => {
      const teamId = 'team-123';
      const userId = 'user-123';
      const savedMember = new MemberModel(teamId, userId);
      savedMember.setStatus(InvitationStatus.ACTIVE);
      await memberRepository.save(savedMember);

      const deleteResult = await memberRepository.deleteOnlyInPending(
        teamId,
        userId,
      );
      expect(deleteResult).toBeFalsy();

      const member = await memberRepository.findByKeys(teamId, userId);
      expect(member).not.toBeNull();
    });

    it('should be able to delete the team member in pending status', async () => {
      const teamId = 'team-123';
      const savedMember = new MemberModel(teamId);
      await memberRepository.save(savedMember);

      const deleteResult = await memberRepository.deleteOnlyInPending(
        teamId,
        savedMember.inviteCodeOrUserId,
      );
      expect(deleteResult).toBeTruthy();

      const member = await memberRepository.findByKeys(
        teamId,
        savedMember.inviteCodeOrUserId,
      );
      expect(member).toBeNull();
    });

    it('should get an empty team member list', async () => {
      const list = await memberRepository.findAllByTeamId('team-123');
      expect(list).toHaveLength(0);
    });

    it('should raise an error when updating the email for non existing member', async () => {
      await expect(
        memberRepository.updateEmail('team-123', 'user-123', 'random@example'),
      ).rejects.toThrow('Record to update not found');
    });

    it('should update the team member email', async () => {
      const teamId = 'team-123';
      const userId = 'user-123';
      const savedMember = new MemberModel(teamId, userId);
      savedMember.setEmail('random@example.com');
      await memberRepository.save(savedMember);

      await memberRepository.updateEmail(
        teamId,
        userId,
        'new-random@example.com',
      );

      const member = await memberRepository.findByKeys(teamId, userId);
      assert(member !== null, "member shouldn't be null");
      expect(member.getEmail()).toEqual('new-random@example.com');
    });

    it('should raise an error when updating the role for non existing member', async () => {
      await expect(
        memberRepository.updateRole('team-123', 'user-123', Role.ADMIN),
      ).rejects.toThrow('Record to update not found');
    });

    it('should update the team member role', async () => {
      const teamId = 'team-123';
      const userId = 'user-123';
      const savedMember = new MemberModel(teamId, userId);
      savedMember.setEmail('random@example.com');
      await memberRepository.save(savedMember);

      await memberRepository.updateRole(teamId, userId, Role.ADMIN);

      const member = await memberRepository.findByKeys(teamId, userId);
      assert(member !== null, "member shouldn't be null");
      expect(member.getRole()).toEqual(Role.ADMIN);
    });

    it('should raise an error when updating role for non existing member', async () => {
      const updateRes = await memberRepository.updateRoleIfNotOwner(
        'team-123',
        'user-123',
        Role.OWNER,
      );

      expect(updateRes).toBeNull();
    });

    it('should update the team member role to `ADMIN`', async () => {
      const teamId = 'team-123';
      const userId = 'user-123';
      const savedMember = new MemberModel(teamId, userId);
      savedMember.setRole(Role.READ_ONLY);
      savedMember.setEmail('random@example.com');
      await memberRepository.save(savedMember);

      await memberRepository.updateRoleIfNotOwner(teamId, userId, Role.ADMIN);

      const member = await memberRepository.findByKeys(teamId, userId);
      assert(member !== null, "member shouldn't be null");
      expect(member.getRole()).toEqual(Role.ADMIN);
    });

    it("shouldn't update the team member role when he is an `OWNER`", async () => {
      const teamId = 'team-123';
      const userId = 'user-123';
      const savedMember = new MemberModel(teamId, userId);
      savedMember.setRole(Role.OWNER);
      savedMember.setEmail('random@example.com');
      await memberRepository.save(savedMember);

      const updateRes = await memberRepository.updateRoleIfNotOwner(
        teamId,
        userId,
        Role.READ_ONLY,
      );
      expect(updateRes).toBeNull();
    });

    it('should return null when there is member to delete', async () => {
      const list = await memberRepository.deleteAllMembers('team-123');

      expect(list).toBeNull();
    });
  });

  describe('Batch manipulation', () => {
    const teamId = 'team-123';
    const userId = 'user-123';

    let member1: MemberModel;
    let member2: MemberModel;
    let member3: MemberModel;

    beforeEach(async () => {
      // Member 1 in pending
      member1 = new MemberModel(teamId);
      member1.setEmail('example1@example.com');
      await memberRepository.save(member1);

      // Member 2 in active
      member2 = new MemberModel(teamId, userId);
      member2.setEmail('example2@example.com');
      member2.setStatus(InvitationStatus.ACTIVE);
      await memberRepository.save(member2);

      // Member 3 in pending
      member3 = new MemberModel(teamId);
      member3.setEmail('example3@example.com');
      await memberRepository.save(member3);
    });

    it('should retrieve all team members', async () => {
      const list = await memberRepository.findAllByTeamId(teamId);
      expect(list).toHaveLength(3);

      // The order isn't always the same. So, we won't able to rely on array index.
      // `inviteCodeOrUserId` can be a userId or a random string.
      expect(list).toEqual(expect.arrayContaining([member1, member2, member3]));
    });

    it('should retrieve team members based on status', async () => {
      let list = await memberRepository.findAllByTeamId(
        teamId,
        InvitationStatus.PENDING,
      );
      expect(list).toHaveLength(2);
      expect(list).toEqual(expect.arrayContaining([member1, member3]));

      list = await memberRepository.findAllByTeamId(
        teamId,
        InvitationStatus.ACTIVE,
      );
      expect(list).toHaveLength(1);
      expect(list).toEqual(expect.arrayContaining([member2]));
    });

    it('should remove all members', async () => {
      let list = await memberRepository.findAllByTeamId(teamId);
      expect(list).toHaveLength(3);

      const deletedList = await memberRepository.deleteAllMembers(teamId);

      list = await memberRepository.findAllByTeamId(teamId);
      expect(list).toHaveLength(0);

      assert(deletedList !== null, "deletedList shouldn't be null");
      expect(deletedList).toHaveLength(3);
      expect(deletedList).toEqual(
        expect.arrayContaining([member1, member2, member3]),
      );
    });
  });
});
