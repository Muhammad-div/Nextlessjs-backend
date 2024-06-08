import type { RequestHandler } from 'express';

import { ApiError } from '@/errors/ApiError';
import { ErrorCode } from '@/errors/ErrorCode';
import type { MemberRepository } from '@/repositories/MemberRepository';
import type { TeamRepository } from '@/repositories/TeamRepository';
import type { AdminService } from '@/services/AdminService';
import type {
  FullEditUserStatusHandler,
  ParamsTeamDetailsHandler,
  QueryList,
} from '@/validations/AdminValidation';

export class AdminController {
  private teamRepository: TeamRepository;

  private memberRepository: MemberRepository;

  private adminService: AdminService;

  constructor(
    teamRepository: TeamRepository,
    memberRepository: MemberRepository,
    adminService: AdminService,
  ) {
    this.teamRepository = teamRepository;
    this.memberRepository = memberRepository;
    this.adminService = adminService;
  }

  public getStats: RequestHandler = async (req, res) => {
    await this.adminService.requireSuperAdmin(req.currentUserId);

    const revenue = this.adminService.getHardCodedRandomRevenue();
    const estimatedTotalUsers =
      await this.adminService.getEstimatedNumberOfUsers();

    res.json({
      estimatedTotalUsers,
      customers: 584,
      mrr: 348,
      totalRevenue: 583,
      revenue,
    });
  };

  public listUsers: QueryList = async (req, res) => {
    await this.adminService.requireSuperAdmin(req.currentUserId);

    const cognitoUserList = await this.adminService.getCognitoUserList(
      req.query.paginationToken,
    );

    res.json({
      userList: cognitoUserList.userList,
      paginationToken: cognitoUserList.paginationToken,
    });
  };

  public editUserStatus: FullEditUserStatusHandler = async (req, res) => {
    await this.adminService.requireSuperAdmin(req.currentUserId);

    await this.adminService.updateUserStatusInCognito(
      req.params.username,
      req.body.enabled,
    );

    res.json({
      success: true,
    });
  };

  public listTeams: QueryList = async (req, res) => {
    await this.adminService.requireSuperAdmin(req.currentUserId);

    const cognitoUserList = await this.adminService.getCognitoUserList(
      req.query.paginationToken,
    );

    const teamList = await this.adminService.getAllTeams(
      cognitoUserList.userList,
    );

    res.json({
      teamList,
      paginationToken: cognitoUserList.paginationToken,
    });
  };

  public getTeam: ParamsTeamDetailsHandler = async (req, res) => {
    await this.adminService.requireSuperAdmin(req.currentUserId);

    const team = await this.teamRepository.findByTeamId(req.params.teamId);

    if (!team) {
      throw new ApiError('Incorrect TeamID', null, ErrorCode.INCORRECT_TEAM_ID);
    }

    const list = await this.memberRepository.findAllByTeamId(req.params.teamId);

    res.json({
      name: team.getDisplayName(),
      memberList: list.map((elt) => ({
        memberId: elt.inviteCodeOrUserId,
        email: elt.getEmail(),
        role: elt.getRole(),
        status: elt.getStatus(),
      })),
    });
  };
}
