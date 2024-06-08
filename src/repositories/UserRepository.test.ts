import assert from 'assert';

import { UserModel } from '@/models/UserModel';
import { dbClient } from '@/utils/DBClient';

import { UserRepository } from './UserRepository';

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository(dbClient);
  });

  describe('Basic operation', () => {
    it("should return null when the user don't exist", async () => {
      const user = await userRepository.findByUserId('user-123');

      expect(user).toBeNull();
    });

    it('should not create the same user twice', async () => {
      await userRepository.createWithUserId('user-123');

      await expect(userRepository.createWithUserId('user-123')).rejects.toThrow(
        'Unique constraint failed on the',
      );
    });

    it('should create a new user and be able to get the user from the database', async () => {
      await userRepository.createWithUserId('user-123');

      const user = await userRepository.findByUserId('user-123');

      assert(user !== null, "user shouldn't be null");
      expect(user.providerId).toEqual('user-123');
    });

    it("should create a new user with `findOrCreate` because the user don't exist", async () => {
      const user = await userRepository.findOrCreate('user-123');

      assert(user !== null, "user shouldn't be null");
      expect(user.providerId).toEqual('user-123');
    });

    it("shouldn't create a new user using `findOrCreate` method", async () => {
      const userId = 'user-123';
      let user = await userRepository.createWithUserId(userId);

      userRepository.createWithUserId = jest.fn();
      user = await userRepository.findOrCreate(userId);
      assert(user !== null, "user shouldn't be null");
      expect(user.providerId).toEqual('user-123');
      expect(userRepository.createWithUserId).not.toHaveBeenCalled();
    });

    it("should throw an exception when the user don't exist", async () => {
      await expect(
        userRepository.strictFindByUserId('user-123'),
      ).rejects.toThrow(/Incorrect UserID/);
    });

    it('should remove from the team', async () => {
      const createdUser = new UserModel('user-123');
      createdUser.addTeam('team-1');
      createdUser.addTeam('team-2');
      createdUser.addTeam('team-3');
      await userRepository.create(createdUser);

      await userRepository.removeTeam('user-123', 'team-2');

      const user = await userRepository.strictFindByUserId('user-123');
      assert(user !== null, "user shouldn't be null");
      expect(user.getTeamList()).toEqual(['team-1', 'team-3']);
    });

    it('should be able to save an non-existing user and be able to get the user from the database', async () => {
      const userId = 'user-123';
      const savedUser = new UserModel(userId);
      await userRepository.save(savedUser);

      const user = await userRepository.findByUserId(userId);

      assert(user !== null, "user shouldn't be null");
      expect(user.providerId).toEqual('user-123');
    });

    it('should able to save an existing user', async () => {
      const userId = 'user-123';
      await userRepository.createWithUserId(userId);

      const savedUser = new UserModel(userId);
      savedUser.addTeam('team-1');
      savedUser.addTeam('team-2');
      savedUser.addTeam('team-3');
      await userRepository.save(savedUser);

      const user = await userRepository.findByUserId(userId);

      assert(user !== null, "user shouldn't be null");
      expect(user.getTeamList()).toEqual(['team-1', 'team-2', 'team-3']);
    });
  });
});
