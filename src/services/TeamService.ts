import { InvitationStatus, Role } from '@prisma/client';

import { ApiError } from '@/errors/ApiError';
import { ErrorCode } from '@/errors/ErrorCode';
import { MemberModel } from '@/models/MemberModel';
import { TeamModel } from '@/models/TeamModel';
import type { UserModel } from '@/models/UserModel';
import type { MemberRepository } from '@/repositories/MemberRepository';
import type { TeamRepository } from '@/repositories/TeamRepository';
import type { UserRepository } from '@/repositories/UserRepository';

export class TeamService {
  private teamRepository: TeamRepository;

  private userRepository: UserRepository;

  private memberRepository: MemberRepository;

  constructor(
    teamRepository: TeamRepository,
    userRepository: UserRepository,
    memberRepository: MemberRepository,
  ) {
    this.teamRepository = teamRepository;
    this.userRepository = userRepository;
    this.memberRepository = memberRepository;
  }

  async create(displayName: string, user: UserModel, userEmail: string) {
    const team = new TeamModel();
    team.setDisplayName(displayName);
    await this.teamRepository.save(team);

    await this.join(team, user, userEmail, Role.OWNER);

    return team;
  }

  async delete(teamId: string) {
    const deleteTeamRes = await this.teamRepository.deleteByTeamId(teamId);

    if (!deleteTeamRes) {
      throw new ApiError('Incorrect TeamID', null, ErrorCode.INCORRECT_TEAM_ID);
    }

    const memberList = await this.memberRepository.deleteAllMembers(teamId);

    if (!memberList) {
      throw new ApiError(
        `Nothing to delete, the team member list was empty`,
        null,
        ErrorCode.INCORRECT_DATA,
      );
    }

    // run sequentially (not in parallel) with classic loop, `forEach` is not designed for asynchronous code.
    for (const elt of memberList) {
      if (elt.getStatus() === InvitationStatus.ACTIVE) {
        // eslint-disable-next-line no-await-in-loop
        await this.userRepository.removeTeam(elt.inviteCodeOrUserId, teamId);
      }
    }
  }

  async join(team: TeamModel, user: UserModel, userEmail: string, role: Role) {
    const member = new MemberModel(team.id, user.providerId);
    member.setEmail(userEmail);
    member.setRole(role);
    member.setStatus(InvitationStatus.ACTIVE);
    await this.memberRepository.save(member);

    user.addTeam(team.id);
    await this.userRepository.update(user);

    return member;
  }

  async findTeamMember(userId: string, teamId: string) {
    const member = await this.memberRepository.findByKeys(teamId, userId);

    if (!member || member.getStatus() !== InvitationStatus.ACTIVE) {
      return null;
    }

    return member;
  }

  async requiredAuth(
    userId: string,
    teamId: string,
    requiredRoles: Role[] = [Role.OWNER, Role.ADMIN, Role.READ_ONLY],
  ) {
    const user = await this.userRepository.strictFindByUserId(userId);
    const member = await this.findTeamMember(userId, teamId);

    if (!member) {
      throw new ApiError(
        `User ${userId} isn't a team member of ${teamId}`,
        null,
        ErrorCode.NOT_MEMBER,
      );
    }

    if (!requiredRoles.includes(member.getRole())) {
      throw new ApiError(
        `The user role ${member.getRole()} are not able to perform the action`,
        null,
        ErrorCode.INCORRECT_PERMISSION,
      );
    }

    return { user, member };
  }

  async requiredAuthWithTeam(
    teamId: string,
    userId: string,
    requiredRoles: Role[] = [Role.OWNER, Role.ADMIN, Role.READ_ONLY],
  ) {
    const { user, member } = await this.requiredAuth(
      userId,
      teamId,
      requiredRoles,
    );

    const team = await this.teamRepository.findByTeamId(teamId);

    if (!team) {
      throw new ApiError(
        `Incorrect TeamID ${teamId}`,
        null,
        ErrorCode.INCORRECT_TEAM_ID,
      );
    }

    return { user, member, team };
  }

  async updateEmailAllTeams(user: UserModel, email: string) {
    const teamList = user.getTeamList();

    // run sequentially (not in parallel) with classic loop, `forEach` is not designed for asynchronous code.
    for (const elt of teamList) {
      // eslint-disable-next-line no-await-in-loop
      await this.memberRepository.updateEmail(elt, user.providerId, email);
    }
  }
}
