import assert from 'assert';

import { TeamModel } from '@/models/TeamModel';
import { dbClient } from '@/utils/DBClient';

import { TeamRepository } from './TeamRepository';

describe('TeamRepository', () => {
  let teamRepository: TeamRepository;

  beforeEach(() => {
    teamRepository = new TeamRepository(dbClient);
  });

  describe('Basic operation', () => {
    it("should return null when the team don't exist", async () => {
      const team = await teamRepository.findByTeamId(
        '123123123123123123123123',
      );

      expect(team).toBeNull();
    });

    it('should raise an error when updating the display name for non existing team', async () => {
      await expect(
        teamRepository.updateDisplayName(
          '123123123123123123123123',
          'team-123',
        ),
      ).rejects.toThrow('Record to update not found');
    });

    it('should create a new team, update the display name and be able to get the team from the database', async () => {
      const createdTeam =
        await teamRepository.createWithDisplayName('team-123');

      await teamRepository.updateDisplayName(createdTeam.id, 'new-team-123');

      const team = await teamRepository.findByTeamId(createdTeam.id);

      assert(team !== null, "team shouldn't be null");
      expect(team.getDisplayName()).toEqual('new-team-123');
    });

    it('should be able to save an non-existing team and be able to get the team from the database', async () => {
      const savedTeam = new TeamModel();
      savedTeam.setDisplayName('team-123');
      await teamRepository.save(savedTeam);

      const team = await teamRepository.findByTeamId(savedTeam.id);

      assert(team !== null, "team shouldn't be null");
      expect(team.getDisplayName()).toEqual('team-123');
    });

    it('should able to save an existing team', async () => {
      const createdTeam =
        await teamRepository.createWithDisplayName('team-123');

      const savedTeam = new TeamModel(createdTeam.id);
      savedTeam.setDisplayName('new-team-123');
      savedTeam.setStripeCustomerId('stripe-customer-id');
      await teamRepository.save(savedTeam);

      const team = await teamRepository.findByTeamId(createdTeam.id);
      assert(team !== null, "team shouldn't be null");
      expect(team.getDisplayName()).toEqual('new-team-123');
      expect(team.getStripeCustomerId()).toEqual('stripe-customer-id');
    });

    it("shouldn't be able to delete an non-existing team", async () => {
      const deleteResult = await teamRepository.deleteByTeamId(
        '123123123123123123123123',
      );

      expect(deleteResult).toBeFalsy();
    });

    it('should create a new team and delete the newly created team', async () => {
      const createdTeam =
        await teamRepository.createWithDisplayName('team-123');

      const deleteResult = await teamRepository.deleteByTeamId(createdTeam.id);
      expect(deleteResult).toBeTruthy();

      const team = await teamRepository.findByTeamId(createdTeam.id);
      expect(team).toBeNull();
    });

    it('should raise an error when updating the subscription for non existing team', async () => {
      await expect(
        teamRepository.updateSubscription('123123123123123123123123', {
          id: 'subscription-id',
          productId: 'product-id',
          status: 'PENDING',
        }),
      ).rejects.toThrow('Record to update not found');
    });

    it('should create a new team, update the subscription and be able to get the team from the database', async () => {
      const createdTeam =
        await teamRepository.createWithDisplayName('team-123');

      await teamRepository.updateSubscription(createdTeam.id, {
        id: 'subscription-id',
        productId: 'product-id',
        status: 'PENDING',
      });

      const team = await teamRepository.findByTeamId(createdTeam.id);

      assert(team !== null, "team shouldn't be null");
      expect(team.getSubscription()?.id).toEqual('subscription-id');
      expect(team.getSubscription()?.productId).toEqual('product-id');
      expect(team.getSubscription()?.status).toEqual('PENDING');
    });

    it('should get an empty team list in batch', async () => {
      const result = await teamRepository.findAllByTeamIdList([]);
      expect(result).toHaveLength(0);
    });

    it('should get the team list in batch', async () => {
      const list = [];

      const team1 = await teamRepository.createWithDisplayName('team-1');
      list.push(team1.id);
      const team2 = await teamRepository.createWithDisplayName('team-2');
      list.push(team2.id);
      const team3 = await teamRepository.createWithDisplayName('team-3');
      list.push(team3.id);
      const team4 = await teamRepository.createWithDisplayName('team-4');
      list.push(team4.id);
      const team5 = await teamRepository.createWithDisplayName('team-5');
      list.push(team5.id);

      const result = await teamRepository.findAllByTeamIdList(list);
      expect(result).toHaveLength(5);

      // The order should keep the same
      expect(result[0]).toEqual(team1);
      expect(result[1]).toEqual(team2);
      expect(result[2]).toEqual(team3);
      expect(result[3]).toEqual(team4);
      expect(result[4]).toEqual(team5);
    });
  });
});
