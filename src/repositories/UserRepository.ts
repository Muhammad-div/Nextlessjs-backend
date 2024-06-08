import type { PrismaClient, User } from '@prisma/client';

import { ApiError } from '@/errors/ApiError';
import { ErrorCode } from '@/errors/ErrorCode';
import { UserModel } from '@/models/UserModel';

import { AbstractRepository } from './AbstractRepository';

export class UserRepository extends AbstractRepository<
  PrismaClient['user'],
  User,
  UserModel
> {
  constructor(dbClient: PrismaClient) {
    super(dbClient.user);
  }

  async createWithUserId(userId: string) {
    const user = new UserModel(userId);

    await this.create(user);

    return user;
  }

  findByUserId(userId: string) {
    const user = new UserModel(userId);

    return this.get(user);
  }

  async findOrCreate(userId: string) {
    const user = await this.findByUserId(userId);

    if (!user) {
      return this.createWithUserId(userId);
    }

    return user;
  }

  async strictFindByUserId(userId: string) {
    const user = await this.findByUserId(userId);

    if (!user) {
      throw new ApiError(
        `Incorrect UserID ${userId}`,
        null,
        ErrorCode.INCORRECT_USER_ID,
      );
    }

    return user;
  }

  async removeTeam(userId: string, teamId: string) {
    const user = await this.strictFindByUserId(userId);
    user.removeTeam(teamId);
    await this.save(user);
  }
}
