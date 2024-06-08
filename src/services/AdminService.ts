import {
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { GlobalRole } from '@prisma/client';

import { ApiError } from '@/errors/ApiError';
import { ErrorCode } from '@/errors/ErrorCode';
import type { UserModel } from '@/models/UserModel';
import type { TeamRepository } from '@/repositories/TeamRepository';
import type { UserRepository } from '@/repositories/UserRepository';
import { Env } from '@/utils/Env';

import type { BillingService } from './BillingService';

export class AdminService {
  private client: CognitoIdentityProviderClient;

  private userRepository: UserRepository;

  private teamRepository: TeamRepository;

  private billingService: BillingService;

  constructor(
    userRepository: UserRepository,
    teamRepository: TeamRepository,
    billingService: BillingService,
  ) {
    this.client = new CognitoIdentityProviderClient();
    this.userRepository = userRepository;
    this.teamRepository = teamRepository;
    this.billingService = billingService;
  }

  async requireSuperAdmin(userId: string) {
    const user = await this.userRepository.strictFindByUserId(userId);

    if (user.getGlobalRole() !== GlobalRole.SUPER_ADMIN) {
      throw new ApiError(
        `The user global role ${user.getGlobalRole()} are not able to perform the action`,
        null,
        ErrorCode.INCORRECT_GLOBAL_PERMISSION,
      );
    }

    return user;
  }

  async getEstimatedNumberOfUsers() {
    const describeCommand = new DescribeUserPoolCommand({
      UserPoolId: Env.getValue('AWS_AUTH_USER_POOL_ID'),
    });
    const describeResponse = await this.client.send(describeCommand);

    if (!describeResponse.UserPool) {
      throw new ApiError('Impossible to get the estimated number of users');
    }

    return describeResponse.UserPool.EstimatedNumberOfUsers;
  }

  // eslint-disable-next-line class-methods-use-this
  getHardCodedRandomRevenue() {
    const randomValueArray = [
      105, 248, 372, 740, 580, 880, 1553, 1286, 1780, 3000, 2732, 3378,
    ];
    const today = new Date();
    const firstMonth = today.getMonth() - (randomValueArray.length - 1);

    const revenue = randomValueArray.map((value, index) => ({
      date: new Date(Date.UTC(today.getFullYear(), firstMonth + index)),
      value,
    }));

    return revenue;
  }

  async getCognitoUserList(paginationToken?: string, filter?: string) {
    const listCommand = new ListUsersCommand({
      UserPoolId: Env.getValue('AWS_AUTH_USER_POOL_ID'),
      Filter: filter,
      Limit: 20,
      PaginationToken: paginationToken,
    });
    const listResponse = await this.client.send(listCommand);

    if (!listResponse.Users) {
      throw new ApiError('Impossible to get users from AWS Cognito');
    }

    return {
      userList: listResponse.Users.map((user) => ({
        id: user.Attributes?.find((attr) => attr.Name === 'sub')?.Value,
        username: user.Username,
        email: user.Attributes?.find((attr) => attr.Name === 'email')?.Value,
        createDate: user.UserCreateDate,
        enabled: user.Enabled,
      })),
      paginationToken: listResponse.PaginationToken,
    };
  }

  async getTeamListWithSubscription(user: UserModel) {
    const teamList = await this.teamRepository.findAllByTeamIdList(
      user.getTeamList(),
    );

    return teamList.map((team) => {
      const plan = this.billingService.getPlanFromSubscription(
        team.getSubscription(),
      );

      return {
        id: team.id,
        displayName: team.getDisplayName(),
        stripeCustomerId: team.getStripeCustomerId(),
        planId: plan.id,
        planName: plan.name,
      };
    });
  }

  async getTeamListFromCognitoId(cognitoId: string | undefined) {
    if (!cognitoId) {
      return [];
    }

    const user = await this.userRepository.findByUserId(cognitoId);

    if (!user) {
      return [];
    }

    return this.getTeamListWithSubscription(user);
  }

  async getAllTeams(
    cognitoUserList: Awaited<
      ReturnType<typeof this.getCognitoUserList>
    >['userList'],
  ) {
    const teamList = [];

    // run sequentially (not in parallel) with classic loop, `forEach` is not designed for asynchronous code.
    for (const cognitoUser of cognitoUserList) {
      // eslint-disable-next-line no-await-in-loop
      const foundTeamList = await this.getTeamListFromCognitoId(cognitoUser.id);

      teamList.push(...foundTeamList);
    }

    return teamList;
  }

  async updateUserStatusInCognito(username: string, enabled: boolean) {
    let userStatusCommand: AdminEnableUserCommand | AdminDisableUserCommand;

    if (enabled) {
      userStatusCommand = new AdminEnableUserCommand({
        UserPoolId: Env.getValue('AWS_AUTH_USER_POOL_ID'),
        Username: username,
      });
    } else {
      userStatusCommand = new AdminDisableUserCommand({
        UserPoolId: Env.getValue('AWS_AUTH_USER_POOL_ID'),
        Username: username,
      });
    }

    await this.client.send(userStatusCommand);
  }
}
