import type { PrismaClient, Team } from '@prisma/client';

import { TeamModel } from '@/models/TeamModel';
import type { ISubscription } from '@/types/StripeTypes';

import { AbstractRepository } from './AbstractRepository';

export class TeamRepository extends AbstractRepository<
  PrismaClient['team'],
  Team,
  TeamModel
> {
  constructor(dbClient: PrismaClient) {
    super(dbClient.team);
  }

  async createWithDisplayName(displayName: string) {
    const team = new TeamModel();
    team.setDisplayName(displayName);

    await this.create(team);

    return team;
  }

  deleteByTeamId(teamId: string) {
    const team = new TeamModel(teamId);

    return this.delete(team);
  }

  findByTeamId(teamId: string) {
    const team = new TeamModel(teamId);

    return this.get(team);
  }

  async findAllByTeamIdList(teamIdList: string[]) {
    const promiseList = [];

    for (let i = 0; i < teamIdList.length; i += 1) {
      promiseList.push(
        this.dbClient.findUnique({
          where: {
            id: teamIdList[i],
          },
        }),
      );
    }

    const result = await Promise.all(promiseList);

    return result
      .filter((elt): elt is Team => elt !== null)
      .map((elt) => {
        const team = new TeamModel(elt.id);
        team.fromEntity(elt);
        return team;
      });
  }

  async updateDisplayName(teamId: string, displayName: string) {
    await this.dbClient.update({
      data: {
        displayName,
      },
      where: {
        id: teamId,
      },
    });
  }

  async updateSubscription(teamId: string, subscription: ISubscription) {
    await this.dbClient.update({
      data: {
        subscriptionId: subscription.id,
        subscriptionProductId: subscription.productId,
        subscriptionStatus: subscription.status,
      },
      where: {
        id: teamId,
      },
    });
  }
}
